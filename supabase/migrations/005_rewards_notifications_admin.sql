-- ============================================================================
-- IndabaCares — Migration 005: Rewards, Notifications, Budgets, Leaderboard, Audit
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
  sort_order      integer not null default 0,
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
-- Returns the applicable budget config for a given user, resolved by specificity.
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

-- --------------------------------------------------------------------------
-- 9. Storage Buckets (created via Supabase dashboard or CLI, documented here)
-- --------------------------------------------------------------------------
-- These are created by supabase CLI `supabase storage create` or dashboard.
-- Documenting the expected configuration:
--
-- Bucket: avatars
--   - Public: true (public read)
--   - File size limit: 2MB
--   - Allowed MIME: image/jpeg, image/png, image/webp
--   - RLS: authenticated users can upload to their own path (user_id/*)
--
-- Bucket: recognition-images
--   - Public: true
--   - File size limit: 5MB
--   - Allowed MIME: image/jpeg, image/png, image/webp, image/gif
--   - RLS: authenticated users can upload, public read
--
-- Bucket: reward-images
--   - Public: true
--   - File size limit: 5MB
--   - Allowed MIME: image/jpeg, image/png, image/webp
--   - RLS: admin only upload, public read
