-- ============================================================================
-- IndabaCares — Migration 011: Production Hardening
-- Data retention, multi-tenant scaling indexes, feature flags enforcement,
-- white-label theming, abuse prevention, notification archival.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Data Retention: Notification archival
-- --------------------------------------------------------------------------
-- Archive read notifications older than 90 days.
-- Called by pg_cron daily. Keeps the hot table small for fast unread queries.

create table if not exists public.notifications_archive (
  like public.notifications including all
);

comment on table public.notifications_archive is
  'Archive of read notifications older than 90 days. '
  'Moved by archive_old_notifications() cron job.';

create or replace function public.archive_old_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  _moved integer;
begin
  with moved as (
    delete from public.notifications
    where is_read = true
      and created_at < now() - interval '90 days'
    returning *
  )
  insert into public.notifications_archive
  select * from moved;

  get diagnostics _moved = row_count;
  return _moved;
end;
$$;

-- --------------------------------------------------------------------------
-- 2. Data Retention: Rate limit cleanup index
-- --------------------------------------------------------------------------
create index if not exists idx_rate_limits_cleanup
  on public.auth_rate_limits(attempted_at);

-- --------------------------------------------------------------------------
-- 3. Multi-tenant Scaling: Composite indexes for hot query paths
-- --------------------------------------------------------------------------

-- Feed query: company + visibility + created_at (covers the main feed SELECT)
create index if not exists idx_recognitions_feed_composite
  on public.recognitions(company_id, visibility, created_at desc)
  where visibility = 'public';

-- Profiles lookup by company + active (used by search, presence, budget reset)
create index if not exists idx_profiles_company_active
  on public.profiles(company_id, is_active)
  where is_active = true;

-- Star transactions: user balance queries (wallet screen)
create index if not exists idx_star_tx_user_type
  on public.star_transactions(user_id, type, created_at desc);

-- Redemptions: user's active orders (orders screen)
create index if not exists idx_redemptions_user_active
  on public.redemptions(user_id, status)
  where status not in ('fulfilled', 'rejected', 'cancelled');

-- Comments/Reactions indexes already exist from migration 002

-- --------------------------------------------------------------------------
-- 4. Feature Flags: Typed JSONB schema with validation
-- --------------------------------------------------------------------------
-- Enforce that companies.settings.features contains only known boolean flags.

create or replace function public.validate_company_settings()
returns trigger
language plpgsql
as $$
declare
  _features jsonb;
  _key text;
  _allowed_features text[] := array[
    'mood_check',
    'skills_360',
    'leaderboard',
    'rewards_store',
    'peer_recognition',
    'manager_boost',
    'comment_threads',
    'presence_indicators',
    'push_notifications',
    'custom_badges',
    'data_export'
  ];
begin
  _features := new.settings -> 'features';

  -- If no features key, that's fine (defaults apply)
  if _features is null then
    return new;
  end if;

  -- Validate each key is in the allowed list
  for _key in select jsonb_object_keys(_features) loop
    if _key != all(_allowed_features) then
      raise exception 'Unknown feature flag: %. Allowed: %', _key, array_to_string(_allowed_features, ', ')
        using errcode = 'P5001';
    end if;

    -- Ensure value is boolean
    if jsonb_typeof(_features -> _key) != 'boolean' then
      raise exception 'Feature flag "%" must be a boolean', _key
        using errcode = 'P5002';
    end if;
  end loop;

  return new;
end;
$$;

create trigger trg_validate_company_settings
  before insert or update on public.companies
  for each row execute function public.validate_company_settings();

-- --------------------------------------------------------------------------
-- 5. White-Label Theming: Extended branding columns
-- --------------------------------------------------------------------------
alter table public.companies
  add column if not exists secondary_color text default '#f59e0b',
  add column if not exists font_family     text default 'System',
  add column if not exists login_banner_url text;

comment on column public.companies.secondary_color is
  'Accent/secondary color for white-label theming (hex)';
comment on column public.companies.font_family is
  'Custom font family name for white-label theming';
comment on column public.companies.login_banner_url is
  'Custom banner image for the login screen';

-- --------------------------------------------------------------------------
-- 6. Abuse Prevention: Content moderation helper
-- --------------------------------------------------------------------------
-- Flag recognitions or comments for review. Admins can moderate.

create table if not exists public.content_flags (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  reporter_id     uuid not null references public.profiles(id),
  content_type    text not null check (content_type in ('recognition', 'comment')),
  content_id      uuid not null,
  reason          text not null check (char_length(reason) >= 3),
  status          text not null default 'pending' check (status in ('pending', 'reviewed', 'actioned', 'dismissed')),
  reviewed_by     uuid references public.profiles(id),
  reviewed_at     timestamptz,
  admin_note      text,
  created_at      timestamptz not null default now(),

  -- Prevent duplicate flags from same user
  unique (reporter_id, content_type, content_id)
);

create index idx_content_flags_pending
  on public.content_flags(company_id, status, created_at desc)
  where status = 'pending';

alter table public.content_flags enable row level security;

-- Users can report content
create policy "content_flags_insert_authenticated"
  on public.content_flags for insert
  to authenticated
  with check (
    company_id = public.current_company_id()
    and reporter_id = auth.uid()
  );

-- Admins can read all flags for their company
create policy "content_flags_select_admin"
  on public.content_flags for select
  to authenticated
  using (
    company_id = public.current_company_id()
    and public.has_role('admin')
  );

-- Admins can update flags (review/action)
create policy "content_flags_update_admin"
  on public.content_flags for update
  to authenticated
  using (
    company_id = public.current_company_id()
    and public.has_role('admin')
  )
  with check (
    company_id = public.current_company_id()
    and public.has_role('admin')
  );

-- --------------------------------------------------------------------------
-- 7. Abuse Prevention: Recognition spam scoring
-- --------------------------------------------------------------------------
-- Tracks suspicious patterns per user per day for automated throttling.

create or replace function public.check_abuse_score(
  p_user_id uuid,
  p_company_id uuid
)
returns integer  -- score: 0 = clean, higher = more suspicious
language sql
stable
security definer
set search_path = public
as $$
  with stats as (
    select
      -- Recognitions in last hour
      (select count(*) from recognitions
       where sender_id = p_user_id and created_at > now() - interval '1 hour')
       as recog_hour,
      -- Unique recipients in last hour
      (select count(distinct rr.recipient_id)
       from recognition_recipients rr
       join recognitions r on r.id = rr.recognition_id
       where r.sender_id = p_user_id and r.created_at > now() - interval '1 hour')
       as unique_recipients_hour,
      -- Content flags received
      (select count(*) from content_flags
       where content_id in (select id from recognitions where sender_id = p_user_id)
         and status = 'actioned')
       as flags_actioned
  )
  select
    case
      when s.recog_hour >= 4 then 30     -- high volume
      when s.recog_hour >= 2 then 10
      else 0
    end
    + case
      when s.unique_recipients_hour <= 1 and s.recog_hour >= 2 then 20  -- spamming same person
      else 0
    end
    + (s.flags_actioned * 25)  -- previous flags weigh heavily
  from stats s;
$$;

-- --------------------------------------------------------------------------
-- 8. Multi-tenant: Row count estimates for admin dashboard
-- --------------------------------------------------------------------------
create or replace function public.tenant_stats(p_company_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'active_users',    (select count(*) from profiles where company_id = p_company_id and is_active = true),
    'total_recognitions', (select count(*) from recognitions where company_id = p_company_id),
    'total_redemptions',  (select count(*) from redemptions where company_id = p_company_id),
    'pending_redemptions', (select count(*) from redemptions where company_id = p_company_id and status = 'pending'),
    'pending_flags',      (select count(*) from content_flags where company_id = p_company_id and status = 'pending'),
    'total_stars_issued',  (select coalesce(sum(amount), 0) from star_transactions where company_id = p_company_id and amount > 0)
  );
$$;
