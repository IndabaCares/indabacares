-- ============================================================================
-- IndabaCares — Migration 001: Foundation
-- Enums, companies, profiles, departments, helper functions
-- ============================================================================

-- --------------------------------------------------------------------------
-- 0. Extensions
-- --------------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "moddatetime"; -- auto-update updated_at

-- --------------------------------------------------------------------------
-- 1. Enum Types
-- --------------------------------------------------------------------------
create type public.app_role as enum (
  'employee',
  'manager',
  'admin',
  'super_admin'
);

create type public.point_tx_type as enum (
  'give',            -- earned by sending a thumbs up
  'receive',         -- earned by receiving a thumbs up
  'react',           -- earned by reacting to a recognition
  'comment',         -- earned by commenting
  'mood',            -- earned by submitting daily mood
  'skill_rate',      -- earned by rating a colleague's skills
  'login_streak',    -- daily login bonus
  'boost_bonus',     -- bonus when recognition is boosted
  'budget_reset',    -- monthly budget allocation
  'adjust'           -- manual admin adjustment
);

create type public.star_tx_type as enum (
  'receive',         -- earned by receiving a thumbs up
  'boost_bonus',     -- bonus when recognition is boosted
  'redeem',          -- spent on reward redemption
  'refund',          -- refunded from rejected/cancelled order
  'adjust'           -- manual admin adjustment
);

create type public.redemption_status as enum (
  'pending',
  'approved',
  'in_preparation',
  'shipped',
  'fulfilled',
  'rejected',
  'cancelled'
);

create type public.notification_type as enum (
  'recognition_received',
  'recognition_boosted',
  'reaction',
  'comment',
  'reward_approved',
  'reward_in_preparation',
  'reward_shipped',
  'reward_fulfilled',
  'reward_rejected',
  'budget_reset',
  'badge_earned',
  'manager_alert',
  'system'
);

create type public.recognition_visibility as enum (
  'public',
  'team_only',
  'private'
);

create type public.mood_value as enum (
  'awful',       -- 0
  'bad',         -- 25
  'okay',        -- 50
  'good',        -- 75
  'amazing'      -- 100
);

-- --------------------------------------------------------------------------
-- 2. Helper Functions (used by RLS policies)
-- --------------------------------------------------------------------------

-- Returns the company_id from the current user's JWT custom claims.
-- Every RLS policy that enforces tenant isolation calls this.
create or replace function public.current_company_id()
returns uuid
language sql
stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid
  );
$$;

-- Returns the app_role from the current user's JWT custom claims.
create or replace function public.current_user_role()
returns public.app_role
language sql
stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role')::public.app_role,
    'employee'::public.app_role
  );
$$;

-- Convenience: is the current user at least the given role?
create or replace function public.has_role(required_role public.app_role)
returns boolean
language sql
stable
as $$
  select case required_role
    when 'employee'    then true
    when 'manager'     then public.current_user_role() in ('manager', 'admin', 'super_admin')
    when 'admin'       then public.current_user_role() in ('admin', 'super_admin')
    when 'super_admin' then public.current_user_role() = 'super_admin'
  end;
$$;

-- --------------------------------------------------------------------------
-- 3. Companies (multi-tenant root)
-- --------------------------------------------------------------------------
create table public.companies (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,  -- url-friendly identifier
  logo_url      text,
  primary_color text default '#4F46E5',
  is_active     boolean not null default true,
  settings      jsonb not null default '{}'::jsonb,  -- flexible config bag
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.companies is 'Root tenant table. Every entity belongs to exactly one company.';

create trigger companies_updated_at
  before update on public.companies
  for each row execute function moddatetime(updated_at);

-- --------------------------------------------------------------------------
-- 4. Departments
-- --------------------------------------------------------------------------
create table public.departments (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  name          text not null,
  parent_id     uuid references public.departments(id) on delete set null,
  created_at    timestamptz not null default now(),

  unique (company_id, name)
);

comment on table public.departments is 'Organizational units within a company. Supports hierarchy via parent_id.';

create index idx_departments_company on public.departments(company_id);

-- --------------------------------------------------------------------------
-- 5. Profiles (extends auth.users)
-- --------------------------------------------------------------------------
create table public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  company_id          uuid not null references public.companies(id) on delete cascade,
  email               text not null,
  full_name           text not null,
  display_name        text,
  avatar_url          text,
  role                public.app_role not null default 'employee',
  department_id       uuid references public.departments(id) on delete set null,
  manager_id          uuid references public.profiles(id) on delete set null,
  job_title           text,
  points_balance      integer not null default 0,
  stars_balance       integer not null default 0,
  giving_balance      integer not null default 0,  -- monthly allowance of stars to give
  is_active           boolean not null default true,
  last_mood_date      date,  -- tracks last mood submission to enforce once-per-day
  login_streak        integer not null default 0,
  last_login_date     date,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint chk_points_non_negative  check (points_balance  >= 0),
  constraint chk_stars_non_negative   check (stars_balance    >= 0),
  constraint chk_giving_non_negative  check (giving_balance   >= 0),
  constraint chk_no_self_manager      check (manager_id <> id)
);

comment on table public.profiles is
  'Extended user profile. Balances are denormalized here for read performance '
  'but only mutated by server-side functions within transactions.';

create index idx_profiles_company    on public.profiles(company_id);
create index idx_profiles_department on public.profiles(department_id);
create index idx_profiles_manager    on public.profiles(manager_id);
create index idx_profiles_role       on public.profiles(company_id, role);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function moddatetime(updated_at);

-- --------------------------------------------------------------------------
-- 6. Auto-create profile on signup
-- --------------------------------------------------------------------------
-- This trigger fires after a new user is created in auth.users.
-- The signup process must pass company_id, full_name in user_metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _company_id uuid;
  _full_name  text;
  _role       public.app_role;
begin
  _company_id := (new.raw_user_meta_data ->> 'company_id')::uuid;
  _full_name  := coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1));
  _role       := coalesce((new.raw_user_meta_data ->> 'role')::public.app_role, 'employee');

  insert into public.profiles (id, company_id, email, full_name, role)
  values (new.id, _company_id, new.email, _full_name, _role);

  -- Write company_id and role into app_metadata so JWT carries them.
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('company_id', _company_id::text)
    || jsonb_build_object('role', _role::text)
  where id = new.id;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --------------------------------------------------------------------------
-- 7. Function to update JWT claims when role changes
-- --------------------------------------------------------------------------
create or replace function public.sync_role_to_jwt()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role then
    update auth.users
    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', new.role::text)
    where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_profile_role_change
  after update of role on public.profiles
  for each row execute function public.sync_role_to_jwt();
