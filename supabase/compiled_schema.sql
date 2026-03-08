-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  IndabaCares — Compiled Database Schema                                ║
-- ║  All 9 migrations merged into a single executable SQL file.            ║
-- ║  Run this in the Supabase SQL Editor or via `supabase db push`.        ║
-- ║                                                                        ║
-- ║  Generated: 2026-02-12                                                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ============================================================================
-- MIGRATION 001: Foundation
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
-- 6. Function to update JWT claims when role changes
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


-- ============================================================================
-- MIGRATION 002: Recognition Engine
-- Company values, thumbs-up types, recognitions, recipients, reactions, comments
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Company Values
-- --------------------------------------------------------------------------
create table public.company_values (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,
  description text,
  icon        text,          -- emoji or icon identifier
  color       text,          -- hex color for UI badge
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),

  unique (company_id, name)
);

comment on table public.company_values is
  'Organization-defined values (e.g. Teamwork, Innovation) that recognitions are tied to.';

create index idx_company_values_company on public.company_values(company_id);

-- --------------------------------------------------------------------------
-- 2. Thumbs Up Types (5 configurable recognition categories)
-- --------------------------------------------------------------------------
create table public.thumbs_up_types (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  value_id        uuid references public.company_values(id) on delete set null,
  name            text not null,            -- e.g. "Great Teamwork"
  description     text,
  icon            text not null default '👍',
  color           text not null default '#4F46E5',
  stars_awarded   integer not null default 1, -- stars per recipient on receive
  is_active       boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),

  constraint chk_stars_positive check (stars_awarded > 0),
  unique (company_id, name)
);

comment on table public.thumbs_up_types is
  'The 5 (or fewer) pre-defined recognition categories. Each awards a configurable number of stars.';

create index idx_thumbs_up_types_company on public.thumbs_up_types(company_id);

-- --------------------------------------------------------------------------
-- 3. Recognitions (core entity)
-- --------------------------------------------------------------------------
create table public.recognitions (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  thumbs_up_type_id uuid not null references public.thumbs_up_types(id),
  message         text not null,
  visibility      public.recognition_visibility not null default 'public',
  stars_per_recipient integer not null,  -- snapshot from thumbs_up_type at send time
  image_url       text,
  hashtags        text[] default '{}',
  is_boosted      boolean not null default false,
  boosted_by      uuid references public.profiles(id),
  boosted_at      timestamptz,
  reaction_count  integer not null default 0,  -- denormalized
  comment_count   integer not null default 0,  -- denormalized
  created_at      timestamptz not null default now(),

  constraint chk_message_length   check (char_length(message) >= 10),
  constraint chk_stars_snapshot   check (stars_per_recipient > 0),
  constraint chk_boost_integrity  check (
    (is_boosted = false and boosted_by is null and boosted_at is null)
    or
    (is_boosted = true and boosted_by is not null and boosted_at is not null)
  )
);

comment on table public.recognitions is
  'Immutable recognition records. A sender recognizes one or more recipients with a thumbs-up type. '
  'stars_per_recipient is snapshotted at creation so later config changes do not rewrite history.';

-- Primary feed query: newest first within a company
create index idx_recognitions_feed
  on public.recognitions(company_id, created_at desc);

-- "My sent" query
create index idx_recognitions_sender
  on public.recognitions(sender_id, created_at desc);

-- Boosted recognitions float to top (partial index)
create index idx_recognitions_boosted
  on public.recognitions(company_id, boosted_at desc)
  where is_boosted = true;

-- --------------------------------------------------------------------------
-- 4. Recognition Recipients (many-to-many)
-- --------------------------------------------------------------------------
create table public.recognition_recipients (
  id              uuid primary key default gen_random_uuid(),
  recognition_id  uuid not null references public.recognitions(id) on delete cascade,
  recipient_id    uuid not null references public.profiles(id) on delete cascade,

  unique (recognition_id, recipient_id)
);

comment on table public.recognition_recipients is
  'Junction table supporting multi-recipient recognitions.';

-- "My received" query
create index idx_recognition_recipients_user
  on public.recognition_recipients(recipient_id, recognition_id);

-- --------------------------------------------------------------------------
-- 5. Reactions
-- --------------------------------------------------------------------------
create table public.reactions (
  id              uuid primary key default gen_random_uuid(),
  recognition_id  uuid not null references public.recognitions(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  emoji           text not null,  -- 'heart', 'clap', 'fire', 'celebrate'
  created_at      timestamptz not null default now(),

  -- One of each emoji type per user per recognition
  unique (recognition_id, user_id, emoji)
);

comment on table public.reactions is
  'Emoji reactions on recognitions. Max one of each type per user.';

create index idx_reactions_recognition
  on public.reactions(recognition_id);

-- Trigger: increment/decrement denormalized reaction_count on recognitions
create or replace function public.update_reaction_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.recognitions
    set reaction_count = reaction_count + 1
    where id = new.recognition_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.recognitions
    set reaction_count = greatest(reaction_count - 1, 0)
    where id = old.recognition_id;
    return old;
  end if;
end;
$$;

create trigger trg_reaction_count
  after insert or delete on public.reactions
  for each row execute function public.update_reaction_count();

-- --------------------------------------------------------------------------
-- 6. Comments
-- --------------------------------------------------------------------------
create table public.comments (
  id              uuid primary key default gen_random_uuid(),
  recognition_id  uuid not null references public.recognitions(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  body            text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint chk_comment_not_empty check (char_length(trim(body)) > 0)
);

comment on table public.comments is
  'Threaded comments on recognitions.';

create index idx_comments_recognition
  on public.comments(recognition_id, created_at asc);

create trigger comments_updated_at
  before update on public.comments
  for each row execute function moddatetime(updated_at);

-- Trigger: increment/decrement denormalized comment_count on recognitions
create or replace function public.update_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.recognitions
    set comment_count = comment_count + 1
    where id = new.recognition_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.recognitions
    set comment_count = greatest(comment_count - 1, 0)
    where id = old.recognition_id;
    return old;
  end if;
end;
$$;

create trigger trg_comment_count
  after insert or delete on public.comments
  for each row execute function public.update_comment_count();


-- ============================================================================
-- MIGRATION 003: Immutable Ledgers
-- Point transactions & star transactions — append-only financial audit trail
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Point Transactions (leaderboard currency)
-- --------------------------------------------------------------------------
create table public.point_transactions (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  type            public.point_tx_type not null,
  amount          integer not null,                    -- positive = credit, negative = debit
  balance_after   integer not null,                    -- snapshot for audit
  reference_type  text,                                -- 'recognition', 'reaction', 'comment', 'mood', etc.
  reference_id    uuid,                                -- FK to the source entity
  description     text,                                -- human-readable reason
  idempotency_key text,                                -- prevents duplicate processing
  created_at      timestamptz not null default now(),

  constraint chk_point_amount_nonzero check (amount <> 0)
);

comment on table public.point_transactions is
  'Immutable append-only ledger for points (leaderboard currency). '
  'No UPDATE or DELETE is ever permitted.';

-- Primary query: user's transaction history
create index idx_point_tx_user_time
  on public.point_transactions(user_id, created_at desc);

-- Tenant isolation
create index idx_point_tx_company
  on public.point_transactions(company_id);

-- Idempotency lookups
create unique index idx_point_tx_idempotency
  on public.point_transactions(idempotency_key)
  where idempotency_key is not null;

-- Leaderboard aggregation (points earned in a period per user)
create index idx_point_tx_leaderboard
  on public.point_transactions(company_id, user_id, created_at)
  where amount > 0;

-- Reference lookups (find all txns for a given recognition, etc.)
create index idx_point_tx_reference
  on public.point_transactions(reference_type, reference_id)
  where reference_id is not null;

-- --------------------------------------------------------------------------
-- 2. Star Transactions (reward currency)
-- --------------------------------------------------------------------------
create table public.star_transactions (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  type            public.star_tx_type not null,
  amount          integer not null,                    -- positive = credit, negative = debit
  balance_after   integer not null,                    -- snapshot for audit
  reference_type  text,                                -- 'recognition', 'redemption', etc.
  reference_id    uuid,                                -- FK to the source entity
  description     text,
  idempotency_key text,
  created_at      timestamptz not null default now(),

  constraint chk_star_amount_nonzero check (amount <> 0)
);

comment on table public.star_transactions is
  'Immutable append-only ledger for stars (reward currency). '
  'Stars are earned by receiving thumbs-ups and spent on reward redemptions. '
  'No UPDATE or DELETE is ever permitted.';

-- Primary query: user's star history
create index idx_star_tx_user_time
  on public.star_transactions(user_id, created_at desc);

-- Tenant isolation
create index idx_star_tx_company
  on public.star_transactions(company_id);

-- Idempotency lookups
create unique index idx_star_tx_idempotency
  on public.star_transactions(idempotency_key)
  where idempotency_key is not null;

-- Reference lookups
create index idx_star_tx_reference
  on public.star_transactions(reference_type, reference_id)
  where reference_id is not null;

-- --------------------------------------------------------------------------
-- 3. Ledger Integrity Functions
-- --------------------------------------------------------------------------

-- Verify that the running balance matches the sum of all transactions.
create or replace function public.verify_point_balance(target_user_id uuid)
returns table(stored_balance integer, computed_balance bigint, is_consistent boolean)
language sql
stable
as $$
  select
    p.points_balance as stored_balance,
    coalesce(sum(pt.amount), 0)::bigint as computed_balance,
    p.points_balance = coalesce(sum(pt.amount), 0) as is_consistent
  from public.profiles p
  left join public.point_transactions pt on pt.user_id = p.id
  where p.id = target_user_id
  group by p.id, p.points_balance;
$$;

create or replace function public.verify_star_balance(target_user_id uuid)
returns table(stored_balance integer, computed_balance bigint, is_consistent boolean)
language sql
stable
as $$
  select
    p.stars_balance as stored_balance,
    coalesce(sum(st.amount), 0)::bigint as computed_balance,
    p.stars_balance = coalesce(sum(st.amount), 0) as is_consistent
  from public.profiles p
  left join public.star_transactions st on st.user_id = p.id
  where p.id = target_user_id
  group by p.id, p.stars_balance;
$$;

-- --------------------------------------------------------------------------
-- 4. Prevent mutations on ledger rows (belt-and-suspenders with RLS)
-- --------------------------------------------------------------------------
create or replace function public.prevent_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Ledger rows are immutable. UPDATE and DELETE are prohibited.';
end;
$$;

create trigger trg_point_tx_immutable
  before update or delete on public.point_transactions
  for each row execute function public.prevent_ledger_mutation();

create trigger trg_star_tx_immutable
  before update or delete on public.star_transactions
  for each row execute function public.prevent_ledger_mutation();


-- ============================================================================
-- MIGRATION 004: Skills, Mood, Gamification
-- Skill categories/indicators/ratings, mood entries, badges, user badges
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Skill Categories
-- --------------------------------------------------------------------------
create table public.skill_categories (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,        -- e.g. "Leadership", "Communication"
  description text,
  icon        text,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),

  unique (company_id, name)
);

comment on table public.skill_categories is
  'Admin-defined skill categories that employees can rate their peers on.';

create index idx_skill_categories_company
  on public.skill_categories(company_id);

-- --------------------------------------------------------------------------
-- 2. Skill Indicators (behavioral descriptors per category)
-- --------------------------------------------------------------------------
create table public.skill_indicators (
  id              uuid primary key default gen_random_uuid(),
  category_id     uuid not null references public.skill_categories(id) on delete cascade,
  company_id      uuid not null references public.companies(id) on delete cascade,
  name            text not null,    -- e.g. "Takes initiative", "Active listener"
  description     text,
  is_active       boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),

  unique (category_id, name)
);

comment on table public.skill_indicators is
  'Behavioral indicators within a skill category. Each is rated 1-5 during peer assessment.';

create index idx_skill_indicators_category
  on public.skill_indicators(category_id);

create index idx_skill_indicators_company
  on public.skill_indicators(company_id);

-- --------------------------------------------------------------------------
-- 3. Skill Ratings (private peer assessments)
-- --------------------------------------------------------------------------
create table public.skill_ratings (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  rater_id        uuid not null references public.profiles(id) on delete cascade,
  recipient_id    uuid not null references public.profiles(id) on delete cascade,
  indicator_id    uuid not null references public.skill_indicators(id) on delete cascade,
  score           smallint not null,
  quarter         text not null,    -- e.g. '2026-Q1' — one rating per rater->recipient->indicator per quarter
  created_at      timestamptz not null default now(),

  constraint chk_score_range      check (score between 1 and 5),
  constraint chk_no_self_rating   check (rater_id <> recipient_id),
  unique (rater_id, recipient_id, indicator_id, quarter)
);

comment on table public.skill_ratings is
  'Private skill assessments. Ratings are only visible to the recipient (aggregated) '
  'and admins. The rater identity is never exposed to the recipient.';

-- Recipient viewing their own aggregated scores
create index idx_skill_ratings_recipient
  on public.skill_ratings(recipient_id, indicator_id);

-- Admin heatmap queries
create index idx_skill_ratings_company_quarter
  on public.skill_ratings(company_id, quarter);

-- Enforce once-per-quarter per pair per indicator
create index idx_skill_ratings_rater_quarter
  on public.skill_ratings(rater_id, quarter);

-- --------------------------------------------------------------------------
-- 4. Mood Entries
-- --------------------------------------------------------------------------
create table public.mood_entries (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  mood        public.mood_value not null,
  note        text,                -- optional private note (visible to admins only)
  entry_date  date not null default current_date,
  created_at  timestamptz not null default now(),

  -- One mood entry per user per day
  unique (user_id, entry_date)
);

comment on table public.mood_entries is
  'Daily mood check-ins. Individual entries are private. '
  'Admins see aggregated Happiness Score, never individual moods (unless note is provided).';

-- Happiness Score aggregation by company/department/date
create index idx_mood_entries_company_date
  on public.mood_entries(company_id, entry_date desc);

-- User's own mood history
create index idx_mood_entries_user
  on public.mood_entries(user_id, entry_date desc);

-- --------------------------------------------------------------------------
-- 5. Happiness Score Materialized View
-- --------------------------------------------------------------------------
create or replace function public.mood_to_score(m public.mood_value)
returns integer
language sql
immutable
as $$
  select case m
    when 'awful'   then 0
    when 'bad'     then 25
    when 'okay'    then 50
    when 'good'    then 75
    when 'amazing' then 100
  end;
$$;

create materialized view public.happiness_scores as
select
  me.company_id,
  p.department_id,
  me.entry_date,
  count(*)::integer as submission_count,
  round(avg(public.mood_to_score(me.mood)), 1)::numeric as happiness_score
from public.mood_entries me
join public.profiles p on p.id = me.user_id
group by me.company_id, p.department_id, me.entry_date;

create unique index idx_happiness_scores_pk
  on public.happiness_scores(company_id, department_id, entry_date);

create index idx_happiness_scores_date
  on public.happiness_scores(company_id, entry_date desc);

-- --------------------------------------------------------------------------
-- 6. Badges (achievement definitions)
-- --------------------------------------------------------------------------
create table public.badges (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references public.companies(id) on delete cascade, -- NULL = global/system badge
  slug        text not null unique,          -- e.g. 'first_steps', 'culture_champion'
  name        text not null,                 -- display name
  description text not null,                 -- how to earn it
  icon        text not null,                 -- emoji or icon identifier
  category    text not null default 'achievement', -- 'achievement', 'streak', 'milestone'
  threshold   integer,                       -- numeric trigger value (e.g. 50 for "Send 50 thumbs ups")
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

comment on table public.badges is
  'Achievement definitions. company_id = NULL means system-wide badge available to all companies.';

-- --------------------------------------------------------------------------
-- 7. User Badges (earned achievements)
-- --------------------------------------------------------------------------
create table public.user_badges (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  badge_id    uuid not null references public.badges(id) on delete cascade,
  earned_at   timestamptz not null default now(),

  unique (user_id, badge_id)
);

comment on table public.user_badges is
  'Tracks which badges each user has earned. Populated by Edge Functions that evaluate triggers.';

create index idx_user_badges_user
  on public.user_badges(user_id);

-- --------------------------------------------------------------------------
-- 8. Seed System Badges
-- --------------------------------------------------------------------------
insert into public.badges (slug, name, description, icon, category, threshold) values
  ('first_steps',      'First Steps',      'Send your first Thumbs Up',                    '👍', 'milestone',   1),
  ('appreciator',      'Appreciator',      'Send 50 Thumbs Ups',                           '🌟', 'milestone',   50),
  ('culture_champion', 'Culture Champion', 'Send 200 Thumbs Ups',                          '🏅', 'milestone',   200),
  ('rising_star',      'Rising Star',      'Reach Top 10 on the monthly leaderboard',      '⭐', 'achievement', 10),
  ('streak_master',    'Streak Master',    'Maintain a 30-day login streak',                '🔥', 'streak',      30),
  ('team_player',      'Team Player',      'Receive recognition from 10+ unique colleagues','🤝', 'achievement', 10),
  ('mood_regular',     'Mood Regular',     'Submit mood for 30 consecutive days',           '💚', 'streak',      30),
  ('skill_scout',      'Skill Scout',      'Rate 20+ colleagues'' skills',                 '🔍', 'achievement', 20);


-- ============================================================================
-- MIGRATION 005: Rewards, Notifications, Budgets, Leaderboard, Audit
-- (BUG FIX: sort_order included in CREATE TABLE instead of separate ALTER TABLE)
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Reward Categories
-- --------------------------------------------------------------------------
create table public.reward_categories (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,        -- e.g. "Gift Cards", "Experiences", "Merch"
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),

  unique (company_id, name)
);

create index idx_reward_categories_company
  on public.reward_categories(company_id);

-- --------------------------------------------------------------------------
-- 2. Rewards (catalog items)
-- --------------------------------------------------------------------------
create table public.rewards (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  category_id     uuid not null references public.reward_categories(id) on delete cascade,
  name            text not null,
  description     text,
  image_url       text,              -- Supabase Storage path
  star_cost       integer not null,
  stock           integer,           -- NULL = unlimited
  sort_order      integer not null default 0,  -- FIX: included in CREATE TABLE (was ALTER TABLE)
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint chk_star_cost_positive check (star_cost > 0),
  constraint chk_stock_non_negative check (stock is null or stock >= 0)
);

comment on table public.rewards is
  'Reward catalog items. Employees exchange stars for rewards. stock = NULL means unlimited.';

create index idx_rewards_company
  on public.rewards(company_id);

create index idx_rewards_category
  on public.rewards(category_id);

-- Active rewards for catalog browsing
create index idx_rewards_active
  on public.rewards(company_id, is_active, sort_order)
  where is_active = true;

create trigger rewards_updated_at
  before update on public.rewards
  for each row execute function moddatetime(updated_at);

-- --------------------------------------------------------------------------
-- 3. Redemptions (reward orders)
-- --------------------------------------------------------------------------
create table public.redemptions (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  reward_id       uuid not null references public.rewards(id) on delete cascade,
  star_cost       integer not null,                   -- snapshot at redemption time
  status          public.redemption_status not null default 'pending',
  admin_note      text,                                -- rejection reason or fulfillment details
  processed_by    uuid references public.profiles(id), -- admin who handled the order
  processed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint chk_redemption_cost check (star_cost > 0),
  constraint chk_process_integrity check (
    (status in ('pending') and processed_by is null and processed_at is null)
    or
    (status not in ('pending') and processed_by is not null and processed_at is not null)
    or
    (status = 'cancelled')  -- user self-cancels, no admin needed
  )
);

comment on table public.redemptions is
  'Reward redemption orders. Stars are debited atomically at creation. '
  'Rejection/cancellation triggers a refund via star_transactions.';

-- Admin order queue
create index idx_redemptions_company_status
  on public.redemptions(company_id, status, created_at desc);

-- User's own orders
create index idx_redemptions_user
  on public.redemptions(user_id, created_at desc);

create trigger redemptions_updated_at
  before update on public.redemptions
  for each row execute function moddatetime(updated_at);

-- --------------------------------------------------------------------------
-- 4. Notifications
-- --------------------------------------------------------------------------
create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  type            public.notification_type not null,
  title           text not null,
  body            text,
  reference_type  text,              -- 'recognition', 'redemption', 'badge', etc.
  reference_id    uuid,
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);

comment on table public.notifications is
  'In-app notifications. Delivered via Supabase Realtime subscription + optional push via Edge Function.';

-- Unread notifications (most common query)
create index idx_notifications_user_unread
  on public.notifications(user_id, created_at desc)
  where is_read = false;

-- All notifications for a user
create index idx_notifications_user
  on public.notifications(user_id, created_at desc);

-- Tenant isolation
create index idx_notifications_company
  on public.notifications(company_id);

-- --------------------------------------------------------------------------
-- 5. Budget Configurations
-- --------------------------------------------------------------------------
create table public.budget_configs (
  id                          uuid primary key default gen_random_uuid(),
  company_id                  uuid not null references public.companies(id) on delete cascade,
  role                        public.app_role,           -- NULL = all roles
  department_id               uuid references public.departments(id) on delete cascade, -- NULL = all departments
  monthly_giving_stars        integer not null,           -- stars to give per month
  max_stars_per_recognition   integer not null,           -- cap per single thumbs up
  max_recognitions_per_day    integer not null default 5, -- anti-gaming
  carry_over                  boolean not null default false,
  effective_from              date not null,
  effective_to                date,                        -- NULL = no end date
  created_at                  timestamptz not null default now(),

  constraint chk_giving_positive    check (monthly_giving_stars > 0),
  constraint chk_max_stars_positive check (max_stars_per_recognition > 0),
  constraint chk_max_recog_positive check (max_recognitions_per_day > 0),
  constraint chk_date_range         check (effective_to is null or effective_to > effective_from)
);

comment on table public.budget_configs is
  'Defines how many stars each user can give per month. '
  'Resolution: department+role > department > role > company-wide (most specific wins).';

create index idx_budget_configs_company
  on public.budget_configs(company_id);

-- Lookup for budget resolution
create index idx_budget_configs_lookup
  on public.budget_configs(company_id, effective_from, effective_to);

-- --------------------------------------------------------------------------
-- 6. Budget Resolution Function
-- --------------------------------------------------------------------------
create or replace function public.resolve_budget(
  target_user_id uuid
)
returns public.budget_configs
language sql
stable
as $$
  select bc.*
  from public.budget_configs bc
  join public.profiles p on p.company_id = bc.company_id
  where p.id = target_user_id
    and current_date >= bc.effective_from
    and (bc.effective_to is null or current_date <= bc.effective_to)
    and (bc.department_id is null or bc.department_id = p.department_id)
    and (bc.role is null or bc.role = p.role)
  order by
    -- Most specific first: dept+role > dept > role > global
    (case when bc.department_id is not null and bc.role is not null then 0
          when bc.department_id is not null then 1
          when bc.role is not null then 2
          else 3
    end),
    bc.effective_from desc
  limit 1;
$$;

-- --------------------------------------------------------------------------
-- 7. Leaderboard Cache
-- --------------------------------------------------------------------------
create table public.leaderboard_cache (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  period_type     text not null,      -- 'monthly', 'quarterly', 'annual'
  period_key      text not null,      -- '2026-02', '2026-Q1', '2026'
  total_points    integer not null default 0,
  rank            integer not null default 0,
  rank_change     integer not null default 0,  -- vs previous period: +2 means climbed 2 spots
  refreshed_at    timestamptz not null default now(),

  unique (company_id, user_id, period_type, period_key)
);

comment on table public.leaderboard_cache is
  'Pre-computed leaderboard positions. Refreshed by daily Edge Function cron. '
  'Avoids expensive aggregation on every leaderboard view.';

create index idx_leaderboard_cache_ranking
  on public.leaderboard_cache(company_id, period_type, period_key, rank asc);

-- --------------------------------------------------------------------------
-- 8. Audit Logs
-- --------------------------------------------------------------------------
create table public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  actor_id    uuid references public.profiles(id),   -- NULL for system actions
  action      text not null,                           -- e.g. 'reward.create', 'user.deactivate'
  target_type text,                                    -- 'profile', 'reward', 'recognition', etc.
  target_id   uuid,
  metadata    jsonb default '{}'::jsonb,               -- before/after snapshots, extra context
  ip_address  inet,                                    -- captured from Edge Function request headers
  user_agent  text,
  created_at  timestamptz not null default now()
);

comment on table public.audit_logs is
  'Immutable audit trail for all admin and system actions. '
  'No UPDATE or DELETE permitted. Only super_admins can read.';

create index idx_audit_logs_company_time
  on public.audit_logs(company_id, created_at desc);

create index idx_audit_logs_actor
  on public.audit_logs(actor_id, created_at desc)
  where actor_id is not null;

create index idx_audit_logs_target
  on public.audit_logs(target_type, target_id)
  where target_id is not null;

-- Prevent mutations on audit logs
create trigger trg_audit_logs_immutable
  before update or delete on public.audit_logs
  for each row execute function public.prevent_ledger_mutation();


-- ============================================================================
-- MIGRATION 006: Row Level Security Policies
-- ============================================================================

-- ==========================================================================
-- COMPANIES
-- ==========================================================================
alter table public.companies enable row level security;

create policy "companies_select_own"
  on public.companies for select
  to authenticated
  using (id = public.current_company_id());

create policy "companies_update_super_admin"
  on public.companies for update
  to authenticated
  using (id = public.current_company_id() and public.has_role('super_admin'))
  with check (id = public.current_company_id() and public.has_role('super_admin'));

-- ==========================================================================
-- DEPARTMENTS
-- ==========================================================================
alter table public.departments enable row level security;

create policy "departments_select"
  on public.departments for select
  to authenticated
  using (company_id = public.current_company_id());

create policy "departments_insert_admin"
  on public.departments for insert
  to authenticated
  with check (company_id = public.current_company_id() and public.has_role('admin'));

create policy "departments_update_admin"
  on public.departments for update
  to authenticated
  using (company_id = public.current_company_id() and public.has_role('admin'))
  with check (company_id = public.current_company_id() and public.has_role('admin'));

create policy "departments_delete_admin"
  on public.departments for delete
  to authenticated
  using (company_id = public.current_company_id() and public.has_role('admin'));

-- ==========================================================================
-- PROFILES
-- ==========================================================================
alter table public.profiles enable row level security;

create policy "profiles_select_company"
  on public.profiles for select
  to authenticated
  using (company_id = public.current_company_id());

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() and company_id = public.current_company_id())
  with check (
    id = auth.uid()
    and company_id = public.current_company_id()
    and role = (select role from public.profiles where id = auth.uid())
    and points_balance = (select points_balance from public.profiles where id = auth.uid())
    and stars_balance = (select stars_balance from public.profiles where id = auth.uid())
    and giving_balance = (select giving_balance from public.profiles where id = auth.uid())
    and is_active = (select is_active from public.profiles where id = auth.uid())
  );

create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (company_id = public.current_company_id() and public.has_role('admin'))
  with check (company_id = public.current_company_id() and public.has_role('admin'));

-- ==========================================================================
-- COMPANY VALUES
-- ==========================================================================
alter table public.company_values enable row level security;

create policy "company_values_select"
  on public.company_values for select
  to authenticated
  using (company_id = public.current_company_id());

create policy "company_values_insert_admin"
  on public.company_values for insert
  to authenticated
  with check (company_id = public.current_company_id() and public.has_role('admin'));

create policy "company_values_update_admin"
  on public.company_values for update
  to authenticated
  using (company_id = public.current_company_id() and public.has_role('admin'))
  with check (company_id = public.current_company_id() and public.has_role('admin'));

-- ==========================================================================
-- THUMBS UP TYPES
-- ==========================================================================
alter table public.thumbs_up_types enable row level security;

create policy "thumbs_up_types_select"
  on public.thumbs_up_types for select
  to authenticated
  using (company_id = public.current_company_id());

create policy "thumbs_up_types_insert_admin"
  on public.thumbs_up_types for insert
  to authenticated
  with check (company_id = public.current_company_id() and public.has_role('admin'));

create policy "thumbs_up_types_update_admin"
  on public.thumbs_up_types for update
  to authenticated
  using (company_id = public.current_company_id() and public.has_role('admin'))
  with check (company_id = public.current_company_id() and public.has_role('admin'));

-- ==========================================================================
-- RECOGNITIONS
-- ==========================================================================
alter table public.recognitions enable row level security;

create policy "recognitions_select_public"
  on public.recognitions for select
  to authenticated
  using (
    company_id = public.current_company_id()
    and (
      visibility = 'public'
      or (
        visibility = 'team_only'
        and (
          sender_id = auth.uid()
          or exists (
            select 1 from public.recognition_recipients rr
            where rr.recognition_id = recognitions.id and rr.recipient_id = auth.uid()
          )
          or exists (
            select 1 from public.profiles sender_p, public.profiles viewer_p
            where sender_p.id = recognitions.sender_id
              and viewer_p.id = auth.uid()
              and sender_p.department_id is not null
              and sender_p.department_id = viewer_p.department_id
          )
        )
      )
      or (
        visibility = 'private'
        and (
          sender_id = auth.uid()
          or exists (
            select 1 from public.recognition_recipients rr
            where rr.recognition_id = recognitions.id and rr.recipient_id = auth.uid()
          )
        )
      )
      or public.has_role('admin')
    )
  );

create policy "recognitions_update_boost"
  on public.recognitions for update
  to authenticated
  using (
    company_id = public.current_company_id()
    and public.has_role('manager')
    and is_boosted = false
  )
  with check (
    company_id = public.current_company_id()
    and public.has_role('manager')
    and is_boosted = true
    and boosted_by = auth.uid()
  );

-- ==========================================================================
-- RECOGNITION RECIPIENTS
-- ==========================================================================
alter table public.recognition_recipients enable row level security;

create policy "recognition_recipients_select"
  on public.recognition_recipients for select
  to authenticated
  using (
    exists (
      select 1 from public.recognitions r
      where r.id = recognition_recipients.recognition_id
    )
  );

-- ==========================================================================
-- REACTIONS
-- ==========================================================================
alter table public.reactions enable row level security;

create policy "reactions_select"
  on public.reactions for select
  to authenticated
  using (
    exists (
      select 1 from public.recognitions r
      where r.id = reactions.recognition_id
    )
  );

create policy "reactions_insert"
  on public.reactions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.recognitions r
      where r.id = reactions.recognition_id
    )
  );

create policy "reactions_delete_own"
  on public.reactions for delete
  to authenticated
  using (user_id = auth.uid());

-- ==========================================================================
-- COMMENTS
-- ==========================================================================
alter table public.comments enable row level security;

create policy "comments_select"
  on public.comments for select
  to authenticated
  using (
    exists (
      select 1 from public.recognitions r
      where r.id = comments.recognition_id
    )
  );

create policy "comments_insert"
  on public.comments for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.recognitions r
      where r.id = comments.recognition_id
    )
  );

create policy "comments_update_own"
  on public.comments for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "comments_delete"
  on public.comments for delete
  to authenticated
  using (
    user_id = auth.uid()
    or (
      public.has_role('admin')
      and exists (
        select 1 from public.recognitions r
        where r.id = comments.recognition_id
          and r.company_id = public.current_company_id()
      )
    )
  );

-- ==========================================================================
-- POINT TRANSACTIONS (immutable ledger)
-- ==========================================================================
alter table public.point_transactions enable row level security;

create policy "point_tx_select"
  on public.point_transactions for select
  to authenticated
  using (
    company_id = public.current_company_id()
    and (
      user_id = auth.uid()
      or public.has_role('admin')
    )
  );

-- ==========================================================================
-- STAR TRANSACTIONS (immutable ledger)
-- ==========================================================================
alter table public.star_transactions enable row level security;

create policy "star_tx_select"
  on public.star_transactions for select
  to authenticated
  using (
    company_id = public.current_company_id()
    and (
      user_id = auth.uid()
      or public.has_role('admin')
    )
  );

-- ==========================================================================
-- SKILL CATEGORIES
-- ==========================================================================
alter table public.skill_categories enable row level security;

create policy "skill_categories_select"
  on public.skill_categories for select
  to authenticated
  using (company_id = public.current_company_id());

create policy "skill_categories_insert_admin"
  on public.skill_categories for insert
  to authenticated
  with check (company_id = public.current_company_id() and public.has_role('admin'));

create policy "skill_categories_update_admin"
  on public.skill_categories for update
  to authenticated
  using (company_id = public.current_company_id() and public.has_role('admin'))
  with check (company_id = public.current_company_id() and public.has_role('admin'));

-- ==========================================================================
-- SKILL INDICATORS
-- ==========================================================================
alter table public.skill_indicators enable row level security;

create policy "skill_indicators_select"
  on public.skill_indicators for select
  to authenticated
  using (company_id = public.current_company_id());

create policy "skill_indicators_insert_admin"
  on public.skill_indicators for insert
  to authenticated
  with check (company_id = public.current_company_id() and public.has_role('admin'));

create policy "skill_indicators_update_admin"
  on public.skill_indicators for update
  to authenticated
  using (company_id = public.current_company_id() and public.has_role('admin'))
  with check (company_id = public.current_company_id() and public.has_role('admin'));

-- ==========================================================================
-- SKILL RATINGS (private peer assessments)
-- ==========================================================================
alter table public.skill_ratings enable row level security;

create policy "skill_ratings_select_recipient"
  on public.skill_ratings for select
  to authenticated
  using (
    company_id = public.current_company_id()
    and (
      recipient_id = auth.uid()
      or rater_id = auth.uid()
      or public.has_role('admin')
    )
  );

create policy "skill_ratings_insert"
  on public.skill_ratings for insert
  to authenticated
  with check (
    company_id = public.current_company_id()
    and rater_id = auth.uid()
    and recipient_id <> auth.uid()
  );

-- ==========================================================================
-- MOOD ENTRIES
-- ==========================================================================
alter table public.mood_entries enable row level security;

create policy "mood_entries_select_own"
  on public.mood_entries for select
  to authenticated
  using (
    company_id = public.current_company_id()
    and user_id = auth.uid()
  );

create policy "mood_entries_select_admin"
  on public.mood_entries for select
  to authenticated
  using (
    company_id = public.current_company_id()
    and public.has_role('admin')
  );

create policy "mood_entries_insert_own"
  on public.mood_entries for insert
  to authenticated
  with check (
    company_id = public.current_company_id()
    and user_id = auth.uid()
  );

-- ==========================================================================
-- BADGES
-- ==========================================================================
alter table public.badges enable row level security;

create policy "badges_select"
  on public.badges for select
  to authenticated
  using (company_id is null or company_id = public.current_company_id());

create policy "badges_insert_admin"
  on public.badges for insert
  to authenticated
  with check (
    company_id = public.current_company_id()
    and public.has_role('admin')
  );

create policy "badges_update_admin"
  on public.badges for update
  to authenticated
  using (company_id = public.current_company_id() and public.has_role('admin'))
  with check (company_id = public.current_company_id() and public.has_role('admin'));

-- ==========================================================================
-- USER BADGES
-- ==========================================================================
alter table public.user_badges enable row level security;

create policy "user_badges_select"
  on public.user_badges for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = user_badges.user_id
        and p.company_id = public.current_company_id()
    )
  );

-- ==========================================================================
-- REWARD CATEGORIES
-- ==========================================================================
alter table public.reward_categories enable row level security;

create policy "reward_categories_select"
  on public.reward_categories for select
  to authenticated
  using (company_id = public.current_company_id());

create policy "reward_categories_insert_admin"
  on public.reward_categories for insert
  to authenticated
  with check (company_id = public.current_company_id() and public.has_role('admin'));

create policy "reward_categories_update_admin"
  on public.reward_categories for update
  to authenticated
  using (company_id = public.current_company_id() and public.has_role('admin'))
  with check (company_id = public.current_company_id() and public.has_role('admin'));

-- ==========================================================================
-- REWARDS
-- ==========================================================================
alter table public.rewards enable row level security;

create policy "rewards_select"
  on public.rewards for select
  to authenticated
  using (company_id = public.current_company_id());

create policy "rewards_insert_admin"
  on public.rewards for insert
  to authenticated
  with check (company_id = public.current_company_id() and public.has_role('admin'));

create policy "rewards_update_admin"
  on public.rewards for update
  to authenticated
  using (company_id = public.current_company_id() and public.has_role('admin'))
  with check (company_id = public.current_company_id() and public.has_role('admin'));

-- ==========================================================================
-- REDEMPTIONS
-- ==========================================================================
alter table public.redemptions enable row level security;

create policy "redemptions_select"
  on public.redemptions for select
  to authenticated
  using (
    company_id = public.current_company_id()
    and (
      user_id = auth.uid()
      or public.has_role('admin')
    )
  );

create policy "redemptions_update_cancel"
  on public.redemptions for update
  to authenticated
  using (
    company_id = public.current_company_id()
    and user_id = auth.uid()
    and status = 'pending'
  )
  with check (
    company_id = public.current_company_id()
    and user_id = auth.uid()
    and status = 'cancelled'
  );

create policy "redemptions_update_admin"
  on public.redemptions for update
  to authenticated
  using (company_id = public.current_company_id() and public.has_role('admin'))
  with check (company_id = public.current_company_id() and public.has_role('admin'));

-- ==========================================================================
-- NOTIFICATIONS
-- ==========================================================================
alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (
    company_id = public.current_company_id()
    and user_id = auth.uid()
  );

create policy "notifications_update_read"
  on public.notifications for update
  to authenticated
  using (
    company_id = public.current_company_id()
    and user_id = auth.uid()
  )
  with check (
    company_id = public.current_company_id()
    and user_id = auth.uid()
    and is_read = true
  );

-- ==========================================================================
-- BUDGET CONFIGS
-- ==========================================================================
alter table public.budget_configs enable row level security;

create policy "budget_configs_select_admin"
  on public.budget_configs for select
  to authenticated
  using (company_id = public.current_company_id() and public.has_role('admin'));

create policy "budget_configs_insert_admin"
  on public.budget_configs for insert
  to authenticated
  with check (company_id = public.current_company_id() and public.has_role('admin'));

create policy "budget_configs_update_admin"
  on public.budget_configs for update
  to authenticated
  using (company_id = public.current_company_id() and public.has_role('admin'))
  with check (company_id = public.current_company_id() and public.has_role('admin'));

create policy "budget_configs_delete_admin"
  on public.budget_configs for delete
  to authenticated
  using (company_id = public.current_company_id() and public.has_role('admin'));

-- ==========================================================================
-- LEADERBOARD CACHE
-- ==========================================================================
alter table public.leaderboard_cache enable row level security;

create policy "leaderboard_cache_select"
  on public.leaderboard_cache for select
  to authenticated
  using (company_id = public.current_company_id());

-- ==========================================================================
-- AUDIT LOGS
-- ==========================================================================
alter table public.audit_logs enable row level security;

create policy "audit_logs_select_super_admin"
  on public.audit_logs for select
  to authenticated
  using (
    company_id = public.current_company_id()
    and public.has_role('super_admin')
  );

-- ==========================================================================
-- INVITE TOKENS (from Migration 007, RLS defined here for consistency)
-- Will be created after the table in Migration 007 section below.
-- ==========================================================================

-- ==========================================================================
-- REALTIME SUBSCRIPTIONS
-- ==========================================================================
alter publication supabase_realtime add table public.recognitions;
alter publication supabase_realtime add table public.reactions;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.leaderboard_cache;


-- ============================================================================
-- MIGRATION 007: Auth Hardening
-- Session management, deactivation enforcement, login tracking, rate limiting
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Prevent deactivated users from accessing anything
-- --------------------------------------------------------------------------
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
  for update;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  if _profile.last_login_date = _today then
    _new_streak := _profile.login_streak;
    _points := 0;
  elsif _profile.last_login_date = _today - interval '1 day' then
    _new_streak := _profile.login_streak + 1;
    _points := least(_new_streak, 7);
  else
    _new_streak := 1;
    _points := 1;
  end if;

  update public.profiles
  set login_streak   = _new_streak,
      last_login_date = _today,
      points_balance  = points_balance + _points
  where id = target_user_id;

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
    on conflict (idempotency_key) do nothing;
  end if;

  return query select _new_streak, _points;
end;
$$;

-- --------------------------------------------------------------------------
-- 3. Rate limiting table for auth operations
-- --------------------------------------------------------------------------
create table public.auth_rate_limits (
  id          uuid primary key default gen_random_uuid(),
  identifier  text not null,
  action      text not null,
  attempted_at timestamptz not null default now(),

  constraint uq_rate_limit unique (identifier, action, attempted_at)
);

create index idx_rate_limits_lookup
  on public.auth_rate_limits(identifier, action, attempted_at desc);

create or replace function public.cleanup_rate_limits()
returns void
language sql
security definer
as $$
  delete from public.auth_rate_limits
  where attempted_at < now() - interval '1 hour';
$$;

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
  token       text not null unique default encode(gen_random_bytes(32), 'hex'),
  invited_by  uuid not null references public.profiles(id),
  expires_at  timestamptz not null default now() + interval '7 days',
  claimed_at  timestamptz,
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

create policy "invite_tokens_select_admin"
  on public.invite_tokens for select
  to authenticated
  using (company_id = public.current_company_id() and public.has_role('admin'));

-- --------------------------------------------------------------------------
-- 5. Enhanced profile trigger: accept invite tokens at signup
-- --------------------------------------------------------------------------
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

-- Create the auth trigger (replaces the one from Migration 001)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================================
-- MIGRATION 008: Server-Side Business Procedures
-- Atomic Postgres functions called by Edge Functions inside transactions.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. process_recognition — Atomic recognition + point/star allocation
-- --------------------------------------------------------------------------
create or replace function public.process_recognition(
  p_sender_id          uuid,
  p_company_id         uuid,
  p_recipient_ids      uuid[],
  p_thumbs_up_type_id  uuid,
  p_message            text,
  p_visibility         public.recognition_visibility,
  p_image_url          text default null,
  p_hashtags           text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _sender         public.profiles%rowtype;
  _thumbs_up      public.thumbs_up_types%rowtype;
  _budget         public.budget_configs%rowtype;
  _recognition_id uuid;
  _recipient_id   uuid;
  _recipient      public.profiles%rowtype;
  _total_stars    integer;
  _sender_points  integer := 10;
  _today_count    integer;
begin
  select * into strict _sender
  from public.profiles
  where id = p_sender_id and company_id = p_company_id
  for update;

  select * into strict _thumbs_up
  from public.thumbs_up_types
  where id = p_thumbs_up_type_id
    and company_id = p_company_id
    and is_active = true;

  if not found then
    raise exception 'Invalid or inactive thumbs-up type'
      using errcode = 'P1001';
  end if;

  if p_sender_id = any(p_recipient_ids) then
    raise exception 'Cannot recognize yourself'
      using errcode = 'P1002';
  end if;

  _budget := public.resolve_budget(p_sender_id);

  select count(*) into _today_count
  from public.recognitions
  where sender_id = p_sender_id
    and created_at >= current_date
    and created_at < current_date + interval '1 day';

  if _today_count >= coalesce(_budget.max_recognitions_per_day, 5) then
    raise exception 'Daily recognition limit reached (%)', coalesce(_budget.max_recognitions_per_day, 5)
      using errcode = 'P1003';
  end if;

  if exists (
    select 1
    from public.recognitions r
    join public.recognition_recipients rr on rr.recognition_id = r.id
    where r.sender_id = p_sender_id
      and r.thumbs_up_type_id = p_thumbs_up_type_id
      and r.created_at > now() - interval '1 hour'
      and rr.recipient_id = any(p_recipient_ids)
  ) then
    raise exception 'Duplicate recognition detected. Wait before sending similar recognition.'
      using errcode = 'P1004';
  end if;

  if (
    select count(*)
    from public.profiles
    where id = any(p_recipient_ids)
      and company_id = p_company_id
      and is_active = true
  ) <> array_length(p_recipient_ids, 1) then
    raise exception 'One or more recipients are invalid or inactive'
      using errcode = 'P1005';
  end if;

  _total_stars := _thumbs_up.stars_awarded * array_length(p_recipient_ids, 1);

  if _sender.giving_balance < _total_stars then
    raise exception 'Insufficient giving balance. Have %, need %', _sender.giving_balance, _total_stars
      using errcode = 'P1006';
  end if;

  if _budget.max_stars_per_recognition is not null
     and _thumbs_up.stars_awarded > _budget.max_stars_per_recognition then
    raise exception 'Stars per recognition exceeds maximum (%)', _budget.max_stars_per_recognition
      using errcode = 'P1007';
  end if;

  -- Create recognition
  insert into public.recognitions (
    id, company_id, sender_id, thumbs_up_type_id, message,
    visibility, stars_per_recipient, image_url, hashtags
  ) values (
    gen_random_uuid(), p_company_id, p_sender_id, p_thumbs_up_type_id,
    p_message, p_visibility, _thumbs_up.stars_awarded, p_image_url, p_hashtags
  )
  returning id into _recognition_id;

  insert into public.recognition_recipients (recognition_id, recipient_id)
  select _recognition_id, unnest(p_recipient_ids);

  -- Debit sender giving balance
  update public.profiles
  set giving_balance = giving_balance - _total_stars
  where id = p_sender_id;

  -- Credit sender points
  update public.profiles
  set points_balance = points_balance + _sender_points
  where id = p_sender_id;

  insert into public.point_transactions (
    company_id, user_id, type, amount, balance_after,
    reference_type, reference_id, description, idempotency_key
  ) values (
    p_company_id, p_sender_id, 'give', _sender_points,
    _sender.points_balance + _sender_points,
    'recognition', _recognition_id,
    format('Sent recognition to %s colleague(s)', array_length(p_recipient_ids, 1)),
    format('recog:send:%s', _recognition_id)
  );

  -- Credit each recipient: stars + points
  foreach _recipient_id in array p_recipient_ids loop
    select * into _recipient
    from public.profiles
    where id = _recipient_id
    for update;

    update public.profiles
    set stars_balance = stars_balance + _thumbs_up.stars_awarded
    where id = _recipient_id;

    insert into public.star_transactions (
      company_id, user_id, type, amount, balance_after,
      reference_type, reference_id, description, idempotency_key
    ) values (
      p_company_id, _recipient_id, 'receive', _thumbs_up.stars_awarded,
      _recipient.stars_balance + _thumbs_up.stars_awarded,
      'recognition', _recognition_id,
      format('Received "%s" from %s', _thumbs_up.name, _sender.full_name),
      format('recog:star:%s:%s', _recognition_id, _recipient_id)
    );

    update public.profiles
    set points_balance = points_balance + 15
    where id = _recipient_id;

    insert into public.point_transactions (
      company_id, user_id, type, amount, balance_after,
      reference_type, reference_id, description, idempotency_key
    ) values (
      p_company_id, _recipient_id, 'receive', 15,
      _recipient.points_balance + 15,
      'recognition', _recognition_id,
      format('Received "%s" from %s', _thumbs_up.name, _sender.full_name),
      format('recog:recv:%s:%s', _recognition_id, _recipient_id)
    );
  end loop;

  return _recognition_id;
end;
$$;

-- --------------------------------------------------------------------------
-- 2. process_redemption — Atomic star debit + order creation + stock lock
-- --------------------------------------------------------------------------
create or replace function public.process_redemption(
  p_user_id    uuid,
  p_company_id uuid,
  p_reward_id  uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _user       public.profiles%rowtype;
  _reward     public.rewards%rowtype;
  _redemption_id uuid;
begin
  select * into strict _user
  from public.profiles
  where id = p_user_id and company_id = p_company_id
  for update;

  select * into strict _reward
  from public.rewards
  where id = p_reward_id
    and company_id = p_company_id
    and is_active = true
  for update;

  if not found then
    raise exception 'Reward not found or inactive'
      using errcode = 'P2001';
  end if;

  if _reward.stock is not null and _reward.stock <= 0 then
    raise exception 'Reward is out of stock'
      using errcode = 'P2002';
  end if;

  if _user.stars_balance < _reward.star_cost then
    raise exception 'Insufficient star balance. Have %, need %', _user.stars_balance, _reward.star_cost
      using errcode = 'P2003';
  end if;

  update public.profiles
  set stars_balance = stars_balance - _reward.star_cost
  where id = p_user_id;

  insert into public.star_transactions (
    company_id, user_id, type, amount, balance_after,
    reference_type, reference_id, description, idempotency_key
  ) values (
    p_company_id, p_user_id, 'redeem', -_reward.star_cost,
    _user.stars_balance - _reward.star_cost,
    'reward', p_reward_id,
    format('Redeemed "%s"', _reward.name),
    format('redeem:%s:%s:%s', p_user_id, p_reward_id, now()::text)
  );

  if _reward.stock is not null then
    update public.rewards
    set stock = stock - 1
    where id = p_reward_id;
  end if;

  insert into public.redemptions (
    company_id, user_id, reward_id, star_cost, status
  ) values (
    p_company_id, p_user_id, p_reward_id, _reward.star_cost, 'pending'
  )
  returning id into _redemption_id;

  return _redemption_id;
end;
$$;

-- --------------------------------------------------------------------------
-- 3. process_refund — Atomic star refund for rejected/cancelled orders
-- --------------------------------------------------------------------------
create or replace function public.process_refund(
  p_redemption_id uuid,
  p_company_id    uuid,
  p_reason        text default 'Order cancelled/rejected'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _redemption public.redemptions%rowtype;
  _user       public.profiles%rowtype;
  _reward     public.rewards%rowtype;
begin
  select * into strict _redemption
  from public.redemptions
  where id = p_redemption_id and company_id = p_company_id
  for update;

  if _redemption.status not in ('pending', 'approved', 'rejected', 'cancelled') then
    raise exception 'Cannot refund a % order', _redemption.status
      using errcode = 'P2010';
  end if;

  if exists (
    select 1 from public.star_transactions
    where reference_type = 'redemption'
      and reference_id = p_redemption_id
      and type = 'refund'
  ) then
    raise exception 'Refund already processed for this order'
      using errcode = 'P2011';
  end if;

  select * into strict _user
  from public.profiles where id = _redemption.user_id for update;

  update public.profiles
  set stars_balance = stars_balance + _redemption.star_cost
  where id = _redemption.user_id;

  insert into public.star_transactions (
    company_id, user_id, type, amount, balance_after,
    reference_type, reference_id, description, idempotency_key
  ) values (
    p_company_id, _redemption.user_id, 'refund', _redemption.star_cost,
    _user.stars_balance + _redemption.star_cost,
    'redemption', p_redemption_id,
    p_reason,
    format('refund:%s', p_redemption_id)
  );

  select * into _reward
  from public.rewards where id = _redemption.reward_id;

  if _reward.stock is not null then
    update public.rewards
    set stock = stock + 1
    where id = _redemption.reward_id;
  end if;
end;
$$;

-- --------------------------------------------------------------------------
-- 4. submit_mood — Validates once-per-day + awards points
-- --------------------------------------------------------------------------
create or replace function public.submit_mood(
  p_user_id    uuid,
  p_company_id uuid,
  p_mood       public.mood_value,
  p_note       text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _user     public.profiles%rowtype;
  _entry_id uuid;
  _points   integer := 5;
begin
  select * into strict _user
  from public.profiles
  where id = p_user_id and company_id = p_company_id
  for update;

  if _user.last_mood_date = current_date then
    raise exception 'Mood already submitted today'
      using errcode = 'P3001';
  end if;

  insert into public.mood_entries (
    company_id, user_id, mood, note, entry_date
  ) values (
    p_company_id, p_user_id, p_mood, p_note, current_date
  )
  returning id into _entry_id;

  update public.profiles
  set last_mood_date  = current_date,
      points_balance  = points_balance + _points
  where id = p_user_id;

  insert into public.point_transactions (
    company_id, user_id, type, amount, balance_after,
    reference_type, reference_id, description, idempotency_key
  ) values (
    p_company_id, p_user_id, 'mood', _points,
    _user.points_balance + _points,
    'mood', _entry_id,
    'Daily mood check-in',
    format('mood:%s:%s', p_user_id, current_date)
  );

  return _entry_id;
end;
$$;

-- --------------------------------------------------------------------------
-- 5. refresh_leaderboard — Recalculates rankings for all periods
-- --------------------------------------------------------------------------
create or replace function public.refresh_leaderboard(p_company_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _period record;
begin
  for _period in
    select * from (values
      ('monthly',   to_char(current_date, 'YYYY-MM'),
                    date_trunc('month', current_date),
                    date_trunc('month', current_date) + interval '1 month'),
      ('quarterly', to_char(current_date, 'YYYY') || '-Q' || to_char(current_date, 'Q'),
                    date_trunc('quarter', current_date),
                    date_trunc('quarter', current_date) + interval '3 months'),
      ('annual',    to_char(current_date, 'YYYY'),
                    date_trunc('year', current_date),
                    date_trunc('year', current_date) + interval '1 year')
    ) as t(period_type, period_key, start_date, end_date)
  loop
    with ranked as (
      select
        pt.user_id,
        sum(pt.amount) as total_points,
        row_number() over (order by sum(pt.amount) desc) as rank
      from public.point_transactions pt
      join public.profiles p on p.id = pt.user_id
      where pt.company_id = p_company_id
        and pt.amount > 0
        and pt.created_at >= _period.start_date::timestamptz
        and pt.created_at < _period.end_date::timestamptz
        and p.is_active = true
      group by pt.user_id
    ),
    previous_ranks as (
      select user_id, rank
      from public.leaderboard_cache
      where company_id = p_company_id
        and period_type = _period.period_type
        and period_key = _period.period_key
    )
    insert into public.leaderboard_cache (
      company_id, user_id, period_type, period_key,
      total_points, rank, rank_change, refreshed_at
    )
    select
      p_company_id,
      r.user_id,
      _period.period_type,
      _period.period_key,
      r.total_points::integer,
      r.rank::integer,
      coalesce(pr.rank - r.rank, 0)::integer,
      now()
    from ranked r
    left join previous_ranks pr on pr.user_id = r.user_id
    on conflict (company_id, user_id, period_type, period_key)
    do update set
      total_points = excluded.total_points,
      rank = excluded.rank,
      rank_change = excluded.rank_change,
      refreshed_at = excluded.refreshed_at;
  end loop;
end;
$$;

-- --------------------------------------------------------------------------
-- 6. award_reaction_points — Points for reacting to recognitions
-- --------------------------------------------------------------------------
create or replace function public.award_reaction_points(
  p_user_id        uuid,
  p_company_id     uuid,
  p_recognition_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _user   public.profiles%rowtype;
  _points integer := 2;
begin
  select * into strict _user
  from public.profiles
  where id = p_user_id and company_id = p_company_id
  for update;

  update public.profiles
  set points_balance = points_balance + _points
  where id = p_user_id;

  insert into public.point_transactions (
    company_id, user_id, type, amount, balance_after,
    reference_type, reference_id, description, idempotency_key
  ) values (
    p_company_id, p_user_id, 'react', _points,
    _user.points_balance + _points,
    'recognition', p_recognition_id,
    'Reacted to a recognition',
    format('react:%s:%s', p_user_id, p_recognition_id)
  )
  on conflict (idempotency_key) do nothing;
end;
$$;

-- --------------------------------------------------------------------------
-- 7. award_comment_points — Points for commenting on recognitions
-- --------------------------------------------------------------------------
create or replace function public.award_comment_points(
  p_user_id        uuid,
  p_company_id     uuid,
  p_comment_id     uuid,
  p_recognition_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _user   public.profiles%rowtype;
  _points integer := 3;
begin
  select * into strict _user
  from public.profiles
  where id = p_user_id and company_id = p_company_id
  for update;

  update public.profiles
  set points_balance = points_balance + _points
  where id = p_user_id;

  insert into public.point_transactions (
    company_id, user_id, type, amount, balance_after,
    reference_type, reference_id, description, idempotency_key
  ) values (
    p_company_id, p_user_id, 'comment', _points,
    _user.points_balance + _points,
    'comment', p_comment_id,
    'Commented on a recognition',
    format('comment:%s:%s', p_user_id, p_comment_id)
  )
  on conflict (idempotency_key) do nothing;
end;
$$;

-- --------------------------------------------------------------------------
-- 8. reset_monthly_budgets — Cron job: allocate giving stars
-- --------------------------------------------------------------------------
create or replace function public.reset_monthly_budgets(p_company_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  _user      record;
  _budget    public.budget_configs%rowtype;
  _new_giving integer;
  _count     integer := 0;
begin
  for _user in
    select id, giving_balance, points_balance, role, department_id
    from public.profiles
    where company_id = p_company_id and is_active = true
    for update
  loop
    _budget := public.resolve_budget(_user.id);

    if _budget.id is null then
      continue;
    end if;

    if _budget.carry_over then
      _new_giving := _user.giving_balance + _budget.monthly_giving_stars;
    else
      _new_giving := _budget.monthly_giving_stars;
    end if;

    update public.profiles
    set giving_balance = _new_giving,
        points_balance = points_balance + 5
    where id = _user.id;

    insert into public.point_transactions (
      company_id, user_id, type, amount, balance_after,
      reference_type, description, idempotency_key
    ) values (
      p_company_id, _user.id, 'budget_reset', 5,
      _user.points_balance + 5,
      'budget', format('Monthly budget reset: %s giving stars allocated', _new_giving),
      format('budget_reset:%s:%s', _user.id, to_char(current_date, 'YYYY-MM'))
    )
    on conflict (idempotency_key) do nothing;

    _count := _count + 1;
  end loop;

  return _count;
end;
$$;


-- ============================================================================
-- MIGRATION 009: Badge Evaluation Helper Functions
-- Used by the evaluate-badges Edge Function.
-- ============================================================================

-- Count unique senders who have recognized a given user
create or replace function public.count_unique_senders(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct r.sender_id)::integer
  from public.recognition_recipients rr
  join public.recognitions r on r.id = rr.recognition_id
  where rr.recipient_id = p_user_id;
$$;

-- Count unique colleagues a user has rated on skills
create or replace function public.count_unique_skill_recipients(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct recipient_id)::integer
  from public.skill_ratings
  where rater_id = p_user_id;
$$;


-- ============================================================================
-- pg_cron schedules (run MANUALLY in production after enabling pg_cron)
-- ============================================================================
-- These must be run manually via the Supabase Dashboard SQL editor
-- after enabling the pg_cron extension.
--
-- Enable pg_cron:
--   CREATE EXTENSION IF NOT EXISTS pg_cron;
--   GRANT USAGE ON SCHEMA cron TO postgres;
--
-- Daily leaderboard refresh (every day at 02:00 UTC):
--   SELECT cron.schedule('refresh-leaderboard', '0 2 * * *', $$
--     SELECT net.http_post(
--       url := current_setting('app.settings.supabase_url') || '/functions/v1/refresh-leaderboard',
--       headers := jsonb_build_object(
--         'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
--         'Content-Type', 'application/json'
--       )
--     )
--   $$);
--
-- Monthly budget reset (1st of month at 00:05 UTC):
--   SELECT cron.schedule('reset-budgets', '5 0 1 * *', $$
--     SELECT net.http_post(
--       url := current_setting('app.settings.supabase_url') || '/functions/v1/reset-budgets',
--       headers := jsonb_build_object(
--         'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
--         'Content-Type', 'application/json'
--       )
--     )
--   $$);
--
-- Happiness score materialized view refresh (every 4 hours):
--   SELECT cron.schedule('refresh-happiness', '0 */4 * * *', $$
--     REFRESH MATERIALIZED VIEW CONCURRENTLY public.happiness_scores
--   $$);
--
-- Rate limit cleanup (every hour):
--   SELECT cron.schedule('cleanup-rate-limits', '0 * * * *', $$
--     SELECT public.cleanup_rate_limits()
--   $$);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  END OF COMPILED SCHEMA                                                ║
-- ║  22 tables, 1 materialized view, 20+ functions, 60+ RLS policies      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
