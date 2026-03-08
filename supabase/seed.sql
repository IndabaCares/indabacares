-- ============================================================================
-- IndabaCares — Seed Data
-- Run locally: supabase db reset  (applies migrations then seed.sql)
-- Run on staging: supabase db seed --linked
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Demo Company
-- --------------------------------------------------------------------------
insert into public.companies (id, name, slug, primary_color, logo_url, settings)
values (
  '00000000-0000-0000-0000-000000000001',
  'Acme Corp',
  'acme-corp',
  '#6366f1',
  null,
  '{"features": {"mood_check": true, "skills_360": true, "leaderboard": true}}'::jsonb
);

-- --------------------------------------------------------------------------
-- 2. Departments
-- --------------------------------------------------------------------------
insert into public.departments (id, company_id, name) values
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001', 'Engineering'),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', 'Marketing'),
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000001', 'Human Resources'),
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000001', 'Sales');

-- --------------------------------------------------------------------------
-- 3. Thumbs Up Types (recognition categories)
-- --------------------------------------------------------------------------
insert into public.thumbs_up_types (id, company_id, name, icon, color, stars_awarded, description, sort_order) values
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-000000000001', 'Great Job',    '👍', '#22c55e', 5,  'General appreciation', 1),
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0000-000000000001', 'Innovation',   '💡', '#f59e0b', 10, 'Creative thinking and new ideas', 2),
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0000-000000000001', 'Team Player',  '🤝', '#3b82f6', 8,  'Collaboration and team spirit', 3),
  ('00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0000-000000000001', 'Above & Beyond','🚀', '#8b5cf6', 15, 'Going the extra mile', 4),
  ('00000000-0000-0000-0002-000000000005', '00000000-0000-0000-0000-000000000001', 'Customer Hero', '🦸', '#ec4899', 12, 'Exceptional customer service', 5);

-- --------------------------------------------------------------------------
-- 4. Company Values
-- --------------------------------------------------------------------------
insert into public.company_values (id, company_id, name, description, icon, sort_order) values
  ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0000-000000000001', 'Integrity',   'Do the right thing, always', '🎯', 1),
  ('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0000-000000000001', 'Innovation',   'Challenge the status quo',   '💡', 2),
  ('00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0000-000000000001', 'Teamwork',     'Together we achieve more',   '🤝', 3),
  ('00000000-0000-0000-0003-000000000004', '00000000-0000-0000-0000-000000000001', 'Excellence',   'Strive for the highest quality', '⭐', 4);

-- --------------------------------------------------------------------------
-- 5. Badges
-- --------------------------------------------------------------------------
insert into public.badges (id, company_id, slug, name, description, icon, category, threshold) values
  ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0000-000000000001', 'first_recognition', 'First Recognition', 'Sent your first recognition', '🎯', 'recognition', 1),
  ('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0000-000000000001', 'streak_7',          '7-Day Streak',      'Logged in 7 days in a row',   '🔥', 'engagement',  7),
  ('00000000-0000-0000-0004-000000000003', '00000000-0000-0000-0000-000000000001', 'streak_30',         '30-Day Streak',     'Logged in 30 days in a row',  '💎', 'engagement',  30),
  ('00000000-0000-0000-0004-000000000004', '00000000-0000-0000-0000-000000000001', 'team_player',       'Team Player',       'Recognized by 10 unique people', '🤝', 'social', 10),
  ('00000000-0000-0000-0004-000000000005', '00000000-0000-0000-0000-000000000001', 'giving_spirit',     'Giving Spirit',     'Sent 50 recognitions',        '💝', 'recognition', 50);

-- --------------------------------------------------------------------------
-- 6. Budget Configuration (company-wide default)
-- --------------------------------------------------------------------------
insert into public.budget_configs (id, company_id, role, department_id, monthly_giving_stars, max_stars_per_recognition, max_recognitions_per_day, carry_over, effective_from) values
  ('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0000-000000000001', null, null, 100, 15, 5, false, '2025-01-01'),
  ('00000000-0000-0000-0005-000000000002', '00000000-0000-0000-0000-000000000001', 'manager', null, 200, 25, 10, false, '2025-01-01');

-- --------------------------------------------------------------------------
-- 7. Reward Categories
-- --------------------------------------------------------------------------
insert into public.reward_categories (id, company_id, name, sort_order) values
  ('00000000-0000-0000-0006-000000000001', '00000000-0000-0000-0000-000000000001', 'Gift Cards',   1),
  ('00000000-0000-0000-0006-000000000002', '00000000-0000-0000-0000-000000000001', 'Merchandise',  2),
  ('00000000-0000-0000-0006-000000000003', '00000000-0000-0000-0000-000000000001', 'Experiences',  3);

-- --------------------------------------------------------------------------
-- 8. Rewards
-- --------------------------------------------------------------------------
insert into public.rewards (id, company_id, category_id, name, description, star_cost, stock, sort_order, reward_type, fulfillment_instructions) values
  ('00000000-0000-0000-0007-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0006-000000000001', 'R50 Coffee Voucher',    'Redeemable at any Vida e Caffe',             25,  null, 1, 'digital',     'Generate voucher code from Vida portal'),
  ('00000000-0000-0000-0007-000000000002', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0006-000000000001', 'R200 Takealot Voucher', 'Online shopping voucher',                    100, null, 2, 'digital',     'Order from Takealot bulk voucher dashboard'),
  ('00000000-0000-0000-0007-000000000003', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0006-000000000002', 'Company Hoodie',        'Premium branded hoodie (S/M/L/XL)',          75,  50,  1, 'physical',    'Ship from warehouse. Ask size in admin note.'),
  ('00000000-0000-0000-0007-000000000004', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0006-000000000002', 'Wireless Earbuds',      'JBL Tune 230NC TWS',                         200, 20,  2, 'physical',    'Order from supplier, 3-5 day delivery'),
  ('00000000-0000-0000-0007-000000000005', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0006-000000000003', 'Extra Day Off',         'One additional paid leave day',               300, null, 1, 'experience',  'Coordinate with HR to add to leave balance'),
  ('00000000-0000-0000-0007-000000000006', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0006-000000000003', 'Team Lunch',            'Lunch for you and 3 colleagues (up to R500)', 150, null, 2, 'experience',  'Approve budget with finance, schedule via Office Manager');

-- --------------------------------------------------------------------------
-- 9. Skill Categories & Indicators
-- --------------------------------------------------------------------------
insert into public.skill_categories (id, company_id, name, description, sort_order) values
  ('00000000-0000-0000-0008-000000000001', '00000000-0000-0000-0000-000000000001', 'Leadership',      'Ability to lead and inspire',     1),
  ('00000000-0000-0000-0008-000000000002', '00000000-0000-0000-0000-000000000001', 'Communication',   'Clear and effective communication', 2),
  ('00000000-0000-0000-0008-000000000003', '00000000-0000-0000-0000-000000000001', 'Technical Skills', 'Domain-specific expertise',        3);

insert into public.skill_indicators (id, category_id, company_id, name, description, sort_order) values
  ('00000000-0000-0000-0009-000000000001', '00000000-0000-0000-0008-000000000001', '00000000-0000-0000-0000-000000000001', 'Decision Making',  'Makes timely and sound decisions',     1),
  ('00000000-0000-0000-0009-000000000002', '00000000-0000-0000-0008-000000000001', '00000000-0000-0000-0000-000000000001', 'Mentoring',        'Coaches and develops others',           2),
  ('00000000-0000-0000-0009-000000000003', '00000000-0000-0000-0008-000000000002', '00000000-0000-0000-0000-000000000001', 'Presentation',     'Delivers clear and engaging presentations', 1),
  ('00000000-0000-0000-0009-000000000004', '00000000-0000-0000-0008-000000000002', '00000000-0000-0000-0000-000000000001', 'Written Clarity',  'Writes concise and clear documents',    2),
  ('00000000-0000-0000-0009-000000000005', '00000000-0000-0000-0008-000000000003', '00000000-0000-0000-0000-000000000001', 'Problem Solving',  'Analyses and resolves complex issues',  1),
  ('00000000-0000-0000-0009-000000000006', '00000000-0000-0000-0008-000000000003', '00000000-0000-0000-0000-000000000001', 'Code Quality',     'Produces clean, maintainable code',     2);

-- --------------------------------------------------------------------------
-- NOTE: User profiles are created by the auth-signup / auth-invite Edge
-- Functions, which set app_metadata.company_id and app_metadata.role on
-- the Supabase Auth user and insert into profiles.
--
-- To create a demo super_admin for local development:
--   1. Start local Supabase:  supabase start
--   2. Sign up via the app or call the auth-signup Edge Function
--   3. Promote to super_admin in Studio SQL Editor:
--
--   UPDATE auth.users SET raw_app_meta_data =
--     raw_app_meta_data || '{"role":"super_admin"}'::jsonb
--   WHERE email = 'admin@acme.com';
--
--   UPDATE public.profiles SET role = 'super_admin'
--   WHERE email = 'admin@acme.com';
-- --------------------------------------------------------------------------
