-- ============================================================================
-- IndabaCares — Migration 009: Badge Evaluation Helper Functions
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
-- pg_cron schedules (run once in production after pg_cron is enabled)
-- ============================================================================
-- These must be run manually or via the Supabase Dashboard SQL editor
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
