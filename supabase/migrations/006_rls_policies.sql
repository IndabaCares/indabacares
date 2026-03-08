-- ============================================================================
-- IndabaCares — Migration 006: Row Level Security Policies
-- Every table gets RLS enabled + explicit policies per role.
--
-- CONVENTIONS:
--   - Tenant isolation: every SELECT/INSERT/UPDATE policy includes
--     company_id = public.current_company_id()
--   - Role checks use public.has_role() or public.current_user_role()
--   - Service-role-only tables (ledgers, recognitions INSERT) have no
--     INSERT policies for anon/authenticated — only Edge Functions
--     using the service_role key can write.
--   - "authenticated" means any logged-in user within the same company.
-- ============================================================================

-- ==========================================================================
-- COMPANIES
-- ==========================================================================
alter table public.companies enable row level security;

-- Users can read their own company
create policy "companies_select_own"
  on public.companies for select
  to authenticated
  using (id = public.current_company_id());

-- Only super_admins can update their own company
create policy "companies_update_super_admin"
  on public.companies for update
  to authenticated
  using (id = public.current_company_id() and public.has_role('super_admin'))
  with check (id = public.current_company_id() and public.has_role('super_admin'));

-- No INSERT/DELETE via client — companies are created by platform ops or signup Edge Function

-- ==========================================================================
-- DEPARTMENTS
-- ==========================================================================
alter table public.departments enable row level security;

-- All authenticated users in the company can read departments
create policy "departments_select"
  on public.departments for select
  to authenticated
  using (company_id = public.current_company_id());

-- Admins can create departments
create policy "departments_insert_admin"
  on public.departments for insert
  to authenticated
  with check (company_id = public.current_company_id() and public.has_role('admin'));

-- Admins can update departments
create policy "departments_update_admin"
  on public.departments for update
  to authenticated
  using (company_id = public.current_company_id() and public.has_role('admin'))
  with check (company_id = public.current_company_id() and public.has_role('admin'));

-- Admins can delete departments
create policy "departments_delete_admin"
  on public.departments for delete
  to authenticated
  using (company_id = public.current_company_id() and public.has_role('admin'));

-- ==========================================================================
-- PROFILES
-- ==========================================================================
alter table public.profiles enable row level security;

-- All authenticated users can read profiles within their company
-- (needed for recipient search, feed avatars, leaderboard)
create policy "profiles_select_company"
  on public.profiles for select
  to authenticated
  using (company_id = public.current_company_id());

-- Users can update their own profile (display_name, avatar_url, job_title)
-- But NOT role, company_id, balances, is_active — those are admin/system fields
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() and company_id = public.current_company_id())
  with check (
    id = auth.uid()
    and company_id = public.current_company_id()
    -- Prevent users from self-promoting or changing protected fields
    -- role, points_balance, stars_balance, giving_balance, is_active
    -- are only changeable by admin policies below
    and role = (select role from public.profiles where id = auth.uid())
    and points_balance = (select points_balance from public.profiles where id = auth.uid())
    and stars_balance = (select stars_balance from public.profiles where id = auth.uid())
    and giving_balance = (select giving_balance from public.profiles where id = auth.uid())
    and is_active = (select is_active from public.profiles where id = auth.uid())
  );

-- Admins can update any profile in their company (role changes, deactivation, etc.)
create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (company_id = public.current_company_id() and public.has_role('admin'))
  with check (company_id = public.current_company_id() and public.has_role('admin'));

-- No INSERT via client — profiles are created by the handle_new_user trigger
-- No DELETE via client — deactivation via is_active flag

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

-- No DELETE — soft-delete via is_active

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

-- SELECT: visibility-aware access
--   public  → all authenticated in company
--   team_only → sender + recipients + same department as sender
--   private → sender + recipients only
create policy "recognitions_select_public"
  on public.recognitions for select
  to authenticated
  using (
    company_id = public.current_company_id()
    and (
      -- Public: everyone in company
      visibility = 'public'
      -- Team-only: sender, recipients, or same department
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
      -- Private: sender + recipients only
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
      -- Admins can see everything in their company
      or public.has_role('admin')
    )
  );

-- INSERT: Only via Edge Function (service_role).
-- No client-side INSERT policy. The send-recognition Edge Function validates
-- business rules (budget, anti-gaming, no self-recognition) and inserts
-- using the service_role key which bypasses RLS.

-- No UPDATE except for boost (managers/admins only)
create policy "recognitions_update_boost"
  on public.recognitions for update
  to authenticated
  using (
    company_id = public.current_company_id()
    and public.has_role('manager')
    and is_boosted = false  -- can only boost un-boosted recognitions
  )
  with check (
    company_id = public.current_company_id()
    and public.has_role('manager')
    and is_boosted = true
    and boosted_by = auth.uid()
  );

-- No DELETE — recognitions are immutable

-- ==========================================================================
-- RECOGNITION RECIPIENTS
-- ==========================================================================
alter table public.recognition_recipients enable row level security;

-- SELECT follows the same visibility as the parent recognition
create policy "recognition_recipients_select"
  on public.recognition_recipients for select
  to authenticated
  using (
    exists (
      select 1 from public.recognitions r
      where r.id = recognition_recipients.recognition_id
      -- This implicitly checks company_id and visibility via the recognitions RLS
    )
  );

-- INSERT: Only via Edge Function (service_role)
-- No DELETE

-- ==========================================================================
-- REACTIONS
-- ==========================================================================
alter table public.reactions enable row level security;

-- Anyone in the company can see reactions on recognitions they can see
create policy "reactions_select"
  on public.reactions for select
  to authenticated
  using (
    exists (
      select 1 from public.recognitions r
      where r.id = reactions.recognition_id
    )
  );

-- Users can create reactions on recognitions they can see
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

-- Users can delete their own reactions
create policy "reactions_delete_own"
  on public.reactions for delete
  to authenticated
  using (user_id = auth.uid());

-- No UPDATE on reactions

-- ==========================================================================
-- COMMENTS
-- ==========================================================================
alter table public.comments enable row level security;

-- Anyone in the company can read comments on recognitions they can see
create policy "comments_select"
  on public.comments for select
  to authenticated
  using (
    exists (
      select 1 from public.recognitions r
      where r.id = comments.recognition_id
    )
  );

-- Users can create comments on recognitions they can see
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

-- Users can edit their own comments (body only)
create policy "comments_update_own"
  on public.comments for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Users can delete their own comments; admins can delete any in their company
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

-- Users can read their own transactions; admins can read all in company
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

-- INSERT: Only via Edge Function (service_role)
-- No UPDATE or DELETE (also enforced by trigger)

-- ==========================================================================
-- STAR TRANSACTIONS (immutable ledger)
-- ==========================================================================
alter table public.star_transactions enable row level security;

-- Users can read their own transactions; admins can read all in company
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

-- INSERT: Only via Edge Function (service_role)
-- No UPDATE or DELETE (also enforced by trigger)

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

-- Recipients can see their own aggregated ratings (but NOT the rater_id)
-- We enforce this at the query level: the SELECT policy allows access,
-- but the API layer (Edge Function) strips rater_id from responses.
-- Admins can see all ratings in the company.
create policy "skill_ratings_select_recipient"
  on public.skill_ratings for select
  to authenticated
  using (
    company_id = public.current_company_id()
    and (
      recipient_id = auth.uid()  -- see own ratings (rater anonymized at API layer)
      or rater_id = auth.uid()   -- see ratings you've given
      or public.has_role('admin')
    )
  );

-- Authenticated users can rate colleagues (enforced: no self-rating via CHECK constraint)
create policy "skill_ratings_insert"
  on public.skill_ratings for insert
  to authenticated
  with check (
    company_id = public.current_company_id()
    and rater_id = auth.uid()
    and recipient_id <> auth.uid()
  );

-- No UPDATE or DELETE — skill ratings are immutable per quarter (UNIQUE constraint handles conflicts)

-- ==========================================================================
-- MOOD ENTRIES
-- ==========================================================================
alter table public.mood_entries enable row level security;

-- Users can read their own mood history only
create policy "mood_entries_select_own"
  on public.mood_entries for select
  to authenticated
  using (
    company_id = public.current_company_id()
    and user_id = auth.uid()
  );

-- Admins can read all mood entries for Happiness Score drill-down
-- (in practice, the admin panel uses aggregated views, not individual entries)
create policy "mood_entries_select_admin"
  on public.mood_entries for select
  to authenticated
  using (
    company_id = public.current_company_id()
    and public.has_role('admin')
  );

-- Users can insert their own mood (once per day enforced by UNIQUE constraint)
create policy "mood_entries_insert_own"
  on public.mood_entries for insert
  to authenticated
  with check (
    company_id = public.current_company_id()
    and user_id = auth.uid()
  );

-- No UPDATE or DELETE — mood entries are immutable

-- ==========================================================================
-- BADGES
-- ==========================================================================
alter table public.badges enable row level security;

-- All authenticated can read badges (global or their company's)
create policy "badges_select"
  on public.badges for select
  to authenticated
  using (company_id is null or company_id = public.current_company_id());

-- Admin can create company-specific badges
create policy "badges_insert_admin"
  on public.badges for insert
  to authenticated
  with check (
    company_id = public.current_company_id()
    and public.has_role('admin')
  );

-- Admin can update company-specific badges
create policy "badges_update_admin"
  on public.badges for update
  to authenticated
  using (company_id = public.current_company_id() and public.has_role('admin'))
  with check (company_id = public.current_company_id() and public.has_role('admin'));

-- ==========================================================================
-- USER BADGES
-- ==========================================================================
alter table public.user_badges enable row level security;

-- All authenticated in company can see who earned badges (social proof)
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

-- INSERT: Only via Edge Function (service_role) — badge logic is server-side

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

-- All authenticated can browse active rewards
create policy "rewards_select"
  on public.rewards for select
  to authenticated
  using (company_id = public.current_company_id());

-- Admins can create rewards
create policy "rewards_insert_admin"
  on public.rewards for insert
  to authenticated
  with check (company_id = public.current_company_id() and public.has_role('admin'));

-- Admins can update rewards (price, stock, active status, etc.)
create policy "rewards_update_admin"
  on public.rewards for update
  to authenticated
  using (company_id = public.current_company_id() and public.has_role('admin'))
  with check (company_id = public.current_company_id() and public.has_role('admin'));

-- No DELETE — soft-delete via is_active

-- ==========================================================================
-- REDEMPTIONS
-- ==========================================================================
alter table public.redemptions enable row level security;

-- Users can see their own redemptions; admins see all in company
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

-- INSERT: Only via Edge Function (service_role) — atomic with star debit

-- Users can cancel their own pending redemptions
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

-- Admins can update redemption status (approve, reject, fulfill, etc.)
create policy "redemptions_update_admin"
  on public.redemptions for update
  to authenticated
  using (company_id = public.current_company_id() and public.has_role('admin'))
  with check (company_id = public.current_company_id() and public.has_role('admin'));

-- No DELETE

-- ==========================================================================
-- NOTIFICATIONS
-- ==========================================================================
alter table public.notifications enable row level security;

-- Users can only read their own notifications
create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (
    company_id = public.current_company_id()
    and user_id = auth.uid()
  );

-- INSERT: Only via Edge Function (service_role)

-- Users can mark their own notifications as read
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
    -- Only allow changing is_read to true
    and is_read = true
  );

-- No DELETE

-- ==========================================================================
-- BUDGET CONFIGS
-- ==========================================================================
alter table public.budget_configs enable row level security;

-- Admins can read budget configs
create policy "budget_configs_select_admin"
  on public.budget_configs for select
  to authenticated
  using (company_id = public.current_company_id() and public.has_role('admin'));

-- Admins can create budget configs
create policy "budget_configs_insert_admin"
  on public.budget_configs for insert
  to authenticated
  with check (company_id = public.current_company_id() and public.has_role('admin'));

-- Admins can update budget configs
create policy "budget_configs_update_admin"
  on public.budget_configs for update
  to authenticated
  using (company_id = public.current_company_id() and public.has_role('admin'))
  with check (company_id = public.current_company_id() and public.has_role('admin'));

-- Admins can delete budget configs
create policy "budget_configs_delete_admin"
  on public.budget_configs for delete
  to authenticated
  using (company_id = public.current_company_id() and public.has_role('admin'));

-- ==========================================================================
-- LEADERBOARD CACHE
-- ==========================================================================
alter table public.leaderboard_cache enable row level security;

-- All authenticated users can read the leaderboard for their company
create policy "leaderboard_cache_select"
  on public.leaderboard_cache for select
  to authenticated
  using (company_id = public.current_company_id());

-- INSERT/UPDATE/DELETE: Only via Edge Function (service_role) cron job

-- ==========================================================================
-- AUDIT LOGS
-- ==========================================================================
alter table public.audit_logs enable row level security;

-- Only super_admins can read audit logs
create policy "audit_logs_select_super_admin"
  on public.audit_logs for select
  to authenticated
  using (
    company_id = public.current_company_id()
    and public.has_role('super_admin')
  );

-- INSERT: Only via Edge Function (service_role)
-- No UPDATE or DELETE (also enforced by trigger from migration 003)

-- ==========================================================================
-- HAPPINESS SCORES (materialized view — no RLS, access controlled at query level)
-- ==========================================================================
-- Materialized views don't support RLS. Access is controlled by:
--   1. Only queried from Edge Functions or admin API endpoints
--   2. Edge Functions filter by company_id from JWT
--   3. Manager endpoints additionally filter by department_id

-- ==========================================================================
-- REALTIME SUBSCRIPTIONS
-- ==========================================================================
-- Enable Supabase Realtime for tables that need live updates.
-- Realtime respects RLS, so users only receive rows they can SELECT.

alter publication supabase_realtime add table public.recognitions;
alter publication supabase_realtime add table public.reactions;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.leaderboard_cache;
