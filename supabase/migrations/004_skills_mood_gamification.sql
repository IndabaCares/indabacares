-- ============================================================================
-- IndabaCares — Migration 004: Skills, Mood, Gamification
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
  quarter         text not null,    -- e.g. '2026-Q1' — one rating per rater→recipient→indicator per quarter
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
-- This view computes the daily happiness score per company and department.
-- Refresh via Edge Function cron (daily) or on-demand.
-- Score formula: awful=0, bad=25, okay=50, good=75, amazing=100

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
