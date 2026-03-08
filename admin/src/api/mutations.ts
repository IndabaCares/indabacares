import { createClient } from '@/lib/supabase/client';

function supabase() {
  return createClient();
}

// ─── Departments ────────────────────────────────────────────────────────────

export function createDepartment(data: { company_id: string; name: string }) {
  return (supabase().from('departments') as any).insert(data).select().single();
}

export function updateDepartment(id: string, data: { name: string }) {
  return (supabase().from('departments') as any).update(data).eq('id', id);
}

export function deleteDepartment(id: string) {
  return (supabase().from('departments') as any).delete().eq('id', id);
}

// ─── Thumbs Up Types ────────────────────────────────────────────────────────

export function createThumbsUpType(data: {
  company_id: string;
  name: string;
  icon: string;
  color: string;
  stars_awarded: number;
  description?: string;
  sort_order: number;
  is_active?: boolean;
}) {
  return (supabase().from('thumbs_up_types') as any).insert(data).select().single();
}

export function updateThumbsUpType(
  id: string,
  data: Partial<{
    name: string;
    icon: string;
    color: string;
    stars_awarded: number;
    description: string;
    sort_order: number;
    is_active: boolean;
  }>
) {
  return (supabase().from('thumbs_up_types') as any).update(data).eq('id', id);
}

// ─── Company Values ─────────────────────────────────────────────────────────

export function createCompanyValue(data: {
  company_id: string;
  name: string;
  description?: string;
  icon: string;
  sort_order: number;
  is_active?: boolean;
}) {
  return (supabase().from('company_values') as any).insert(data).select().single();
}

export function updateCompanyValue(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    icon: string;
    sort_order: number;
    is_active: boolean;
  }>
) {
  return (supabase().from('company_values') as any).update(data).eq('id', id);
}

// ─── Badges ─────────────────────────────────────────────────────────────────

export function createBadge(data: {
  company_id: string;
  slug: string;
  name: string;
  description?: string;
  icon: string;
  category?: string;
  threshold?: number;
  is_active?: boolean;
}) {
  return (supabase().from('badges') as any).insert(data).select().single();
}

export function updateBadge(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    icon: string;
    category: string;
    threshold: number;
    is_active: boolean;
  }>
) {
  return (supabase().from('badges') as any).update(data).eq('id', id);
}

// ─── Skill Categories ───────────────────────────────────────────────────────

export function createSkillCategory(data: {
  company_id: string;
  name: string;
  description?: string;
  icon?: string;
  sort_order: number;
}) {
  return (supabase().from('skill_categories') as any).insert(data).select().single();
}

export function updateSkillCategory(
  id: string,
  data: Partial<{ name: string; description: string; icon: string; sort_order: number; is_active: boolean }>
) {
  return (supabase().from('skill_categories') as any).update(data).eq('id', id);
}

// ─── Skill Indicators ──────────────────────────────────────────────────────

export function createSkillIndicator(data: {
  category_id: string;
  company_id: string;
  name: string;
  description?: string;
  sort_order: number;
}) {
  return (supabase().from('skill_indicators') as any).insert(data).select().single();
}

export function updateSkillIndicator(
  id: string,
  data: Partial<{ name: string; description: string; sort_order: number; is_active: boolean }>
) {
  return (supabase().from('skill_indicators') as any).update(data).eq('id', id);
}

// ─── Budget Configs ─────────────────────────────────────────────────────────

export function createBudgetConfig(data: {
  company_id: string;
  role?: string | null;
  department_id?: string | null;
  monthly_giving_stars: number;
  max_stars_per_recognition: number;
  max_recognitions_per_day?: number;
  carry_over?: boolean;
  effective_from: string;
  effective_to?: string | null;
}) {
  return (supabase().from('budget_configs') as any).insert(data).select().single();
}

export function updateBudgetConfig(
  id: string,
  data: Partial<{
    monthly_giving_stars: number;
    max_stars_per_recognition: number;
    max_recognitions_per_day: number;
    carry_over: boolean;
    effective_from: string;
    effective_to: string | null;
  }>
) {
  return (supabase().from('budget_configs') as any).update(data).eq('id', id);
}

export function deleteBudgetConfig(id: string) {
  return (supabase().from('budget_configs') as any).delete().eq('id', id);
}

// ─── Rewards ────────────────────────────────────────────────────────────────

export function createReward(data: {
  company_id: string;
  category_id: string;
  name: string;
  description?: string;
  image_url?: string;
  star_cost: number;
  stock?: number | null;
  sort_order: number;
  is_active?: boolean;
  reward_type?: string;
  fulfillment_instructions?: string;
  digital_content?: string;
}) {
  return (supabase().from('rewards') as any).insert(data).select().single();
}

export function updateReward(
  id: string,
  data: Partial<{
    category_id: string;
    name: string;
    description: string;
    image_url: string;
    star_cost: number;
    stock: number | null;
    sort_order: number;
    is_active: boolean;
    reward_type: string;
    fulfillment_instructions: string;
    digital_content: string;
  }>
) {
  return (supabase().from('rewards') as any).update(data).eq('id', id);
}

// ─── Reward Categories ──────────────────────────────────────────────────────

export function createRewardCategory(data: {
  company_id: string;
  name: string;
  sort_order: number;
}) {
  return (supabase().from('reward_categories') as any).insert(data).select().single();
}

export function updateRewardCategory(
  id: string,
  data: Partial<{ name: string; sort_order: number }>
) {
  return (supabase().from('reward_categories') as any).update(data).eq('id', id);
}

// ─── Company Settings ───────────────────────────────────────────────────────

export function updateCompany(
  id: string,
  data: Partial<{
    name: string;
    logo_url: string;
    primary_color: string;
    settings: Record<string, unknown>;
  }>
) {
  return (supabase().from('companies') as any).update(data).eq('id', id);
}

// ─── Profile Update (admin) ─────────────────────────────────────────────────

export function updateProfileAdmin(
  id: string,
  data: Partial<{
    department_id: string | null;
    manager_id: string | null;
    job_title: string | null;
  }>
) {
  return (supabase().from('profiles') as any).update(data).eq('id', id);
}
