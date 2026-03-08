-- ============================================================================
-- IndabaCares — Migration 007: Auth Hardening
-- Session management, deactivation enforcement, login tracking, rate limiting
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Prevent deactivated users from accessing anything
-- --------------------------------------------------------------------------
-- This function is called by a Postgres hook on every authenticated request.
-- If the user's profile is_active = false, it raises an exception that
-- Supabase translates to a 403.

create or replace function public.enforce_active_user()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _is_active boolean;
begin
  -- Skip check for service_role (Edge Functions)
  if current_setting('request.jwt.claim.role', true) = 'service_role' then
    return;
  end if;

  select is_active into _is_active
  from public.profiles
  where id = auth.uid();

  if _is_active is distinct from true then
    raise exception 'Account is deactivated. Contact your administrator.'
      using errcode = 'P0001';
  end if;
end;
$$;

-- --------------------------------------------------------------------------
-- 2. Login streak tracking
-- --------------------------------------------------------------------------
-- Called by the auth-me Edge Function on each app session start.
-- Updates login_streak and last_login_date atomically.

create or replace function public.track_login(target_user_id uuid)
returns table(
  current_streak integer,
  points_earned integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  _profile       public.profiles%rowtype;
  _new_streak    integer;
  _points        integer := 0;
  _today         date := current_date;
begin
  select * into _profile
  from public.profiles
  where id = target_user_id
  for update;  -- row lock to prevent race conditions

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  -- Calculate streak
  if _profile.last_login_date = _today then
    -- Already logged in today, no change
    _new_streak := _profile.login_streak;
    _points := 0;
  elsif _profile.last_login_date = _today - interval '1 day' then
    -- Consecutive day: increment streak
    _new_streak := _profile.login_streak + 1;
    _points := least(_new_streak, 7);  -- 1pt per day, max 7
  else
    -- Streak broken: reset to 1
    _new_streak := 1;
    _points := 1;
  end if;

  -- Update profile
  update public.profiles
  set login_streak   = _new_streak,
      last_login_date = _today,
      points_balance  = points_balance + _points
  where id = target_user_id;

  -- Record points transaction if earned
  if _points > 0 then
    insert into public.point_transactions (
      company_id, user_id, type, amount, balance_after,
      reference_type, description, idempotency_key
    ) values (
      _profile.company_id,
      target_user_id,
      'login_streak',
      _points,
      _profile.points_balance + _points,
      'login',
      format('Day %s login streak (+%s pts)', _new_streak, _points),
      format('login:%s:%s', target_user_id, _today)
    )
    on conflict (idempotency_key) do nothing;  -- idempotent
  end if;

  return query select _new_streak, _points;
end;
$$;

-- --------------------------------------------------------------------------
-- 3. Rate limiting table for auth operations
-- --------------------------------------------------------------------------
create table public.auth_rate_limits (
  id          uuid primary key default gen_random_uuid(),
  identifier  text not null,          -- email, IP, or user_id
  action      text not null,          -- 'signup', 'magic_link', 'password_reset', 'invite'
  attempted_at timestamptz not null default now(),

  -- Composite for lookups
  constraint uq_rate_limit unique (identifier, action, attempted_at)
);

create index idx_rate_limits_lookup
  on public.auth_rate_limits(identifier, action, attempted_at desc);

-- Cleanup function: remove entries older than 1 hour
create or replace function public.cleanup_rate_limits()
returns void
language sql
security definer
as $$
  delete from public.auth_rate_limits
  where attempted_at < now() - interval '1 hour';
$$;

-- Check rate limit: returns true if under limit
create or replace function public.check_rate_limit(
  p_identifier text,
  p_action     text,
  p_max_attempts integer,
  p_window_minutes integer
)
returns boolean
language sql
stable
security definer
as $$
  select count(*) < p_max_attempts
  from public.auth_rate_limits
  where identifier = p_identifier
    and action = p_action
    and attempted_at > now() - (p_window_minutes || ' minutes')::interval;
$$;

-- Record an attempt
create or replace function public.record_rate_limit(
  p_identifier text,
  p_action     text
)
returns void
language sql
security definer
as $$
  insert into public.auth_rate_limits (identifier, action)
  values (p_identifier, p_action);
$$;

-- No RLS on rate_limits — only accessed by security definer functions

-- --------------------------------------------------------------------------
-- 4. Company-scoped invite tokens
-- --------------------------------------------------------------------------
create table public.invite_tokens (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  email       text not null,
  role        public.app_role not null default 'employee',
  department_id uuid references public.departments(id) on delete set null,
  manager_id  uuid references public.profiles(id) on delete set null,
  token       text not null unique default encode(extensions.gen_random_bytes(32), 'hex'),
  invited_by  uuid not null references public.profiles(id),
  expires_at  timestamptz not null default now() + interval '7 days',
  claimed_at  timestamptz,  -- set when the user signs up with this token
  created_at  timestamptz not null default now()
);

comment on table public.invite_tokens is
  'Pre-authorized signup tokens. Admins invite users by email. '
  'Token is sent via email; the signup flow validates it to auto-assign company/role/dept.';

create index idx_invite_tokens_email
  on public.invite_tokens(email)
  where claimed_at is null;

create index idx_invite_tokens_token
  on public.invite_tokens(token)
  where claimed_at is null;

create index idx_invite_tokens_company
  on public.invite_tokens(company_id);

alter table public.invite_tokens enable row level security;

-- Only admins can read invite tokens for their company
create policy "invite_tokens_select_admin"
  on public.invite_tokens for select
  to authenticated
  using (company_id = public.current_company_id() and public.has_role('admin'));

-- INSERT/UPDATE: Only via Edge Function (service_role)

-- --------------------------------------------------------------------------
-- 5. Enhanced profile trigger: accept invite tokens at signup
-- --------------------------------------------------------------------------
-- Replace the original handle_new_user to support invite-based signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _company_id    uuid;
  _full_name     text;
  _role          public.app_role;
  _department_id uuid;
  _manager_id    uuid;
  _invite        public.invite_tokens%rowtype;
  _invite_token  text;
begin
  _invite_token := new.raw_user_meta_data ->> 'invite_token';
  _full_name    := coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1));

  -- Path A: Invite-based signup (preferred for existing companies)
  if _invite_token is not null then
    select * into _invite
    from public.invite_tokens
    where token = _invite_token
      and email = new.email
      and claimed_at is null
      and expires_at > now();

    if not found then
      raise exception 'Invalid or expired invite token'
        using errcode = 'P0003';
    end if;

    _company_id    := _invite.company_id;
    _role          := _invite.role;
    _department_id := _invite.department_id;
    _manager_id    := _invite.manager_id;

    -- Mark invite as claimed
    update public.invite_tokens
    set claimed_at = now()
    where id = _invite.id;

  -- Path B: Direct signup (new company creation or open registration)
  else
    _company_id := (new.raw_user_meta_data ->> 'company_id')::uuid;
    _role       := coalesce((new.raw_user_meta_data ->> 'role')::public.app_role, 'employee');

    if _company_id is null then
      raise exception 'company_id or invite_token is required for signup'
        using errcode = 'P0004';
    end if;
  end if;

  -- Create profile
  insert into public.profiles (
    id, company_id, email, full_name, role, department_id, manager_id
  ) values (
    new.id, _company_id, new.email, _full_name, _role, _department_id, _manager_id
  );

  -- Write claims into app_metadata for JWT
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('company_id', _company_id::text)
    || jsonb_build_object('role', _role::text)
  where id = new.id;

  return new;
end;
$$;
