import { z } from 'zod';

// ─── Auth ──────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

// ─── Users ─────────────────────────────────────────────────────────────────────

export const inviteRowSchema = z.object({
  email: z.string().email('Enter a valid email'),
  role: z.enum(['employee', 'manager', 'admin', 'super_admin']),
  departmentId: z.string().optional(),
});

export const inviteFormSchema = z.object({
  invites: z.array(inviteRowSchema).min(1, 'Add at least one invite'),
});

// ─── Departments ───────────────────────────────────────────────────────────────

export const departmentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
});

// ─── Thumbs Up Types ──────────────────────────────────────────────────────────

export const thumbsUpTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  description: z.string().max(255).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(20).optional(),
  stars_awarded: z.coerce.number().int().min(0),
  sort_order: z.coerce.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});

// ─── Company Values ────────────────────────────────────────────────────────────

export const companyValueSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  sort_order: z.coerce.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});

// ─── Badges ────────────────────────────────────────────────────────────────────

export const badgeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z.string().min(1, 'Slug is required').max(100),
  description: z.string().max(500).optional(),
  icon_url: z.string().max(500).optional(),
  category: z.string().max(50).optional(),
  threshold: z.coerce.number().int().min(0).default(0),
});

// ─── Skill Categories ──────────────────────────────────────────────────────────

export const skillCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  sort_order: z.coerce.number().int().min(0).default(0),
});

export const skillIndicatorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  max_level: z.coerce.number().int().min(1).max(10).default(5),
  sort_order: z.coerce.number().int().min(0).default(0),
});

// ─── Budget Configs ────────────────────────────────────────────────────────────

export const budgetConfigSchema = z.object({
  role: z.enum(['employee', 'manager', 'admin', 'super_admin']).optional(),
  department_id: z.string().uuid().optional().nullable(),
  monthly_giving_budget: z.coerce.number().int().min(0),
  effective_from: z.string().min(1, 'Start date is required'),
  effective_to: z.string().optional().nullable(),
  carry_over: z.boolean().default(false),
});

// ─── Rewards ───────────────────────────────────────────────────────────────────

export const rewardSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  category_id: z.string().uuid().optional().nullable(),
  star_cost: z.coerce.number().int().min(1, 'Cost must be at least 1'),
  stock: z.coerce.number().int().min(0).default(0),
  image_url: z.string().max(500).optional(),
  is_active: z.boolean().default(true),
});

export const rewardCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  sort_order: z.coerce.number().int().min(0).default(0),
});

// ─── Company Settings ──────────────────────────────────────────────────────────

export const companySettingsSchema = z.object({
  name: z.string().min(1, 'Company name is required').max(200),
  logo_url: z.string().url().optional().or(z.literal('')),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color'),
});

// ─── Type exports ──────────────────────────────────────────────────────────────

export type LoginFormData = z.infer<typeof loginSchema>;
export type InviteRowData = z.infer<typeof inviteRowSchema>;
export type DepartmentFormData = z.infer<typeof departmentSchema>;
export type ThumbsUpTypeFormData = z.infer<typeof thumbsUpTypeSchema>;
export type CompanyValueFormData = z.infer<typeof companyValueSchema>;
export type BadgeFormData = z.infer<typeof badgeSchema>;
export type SkillCategoryFormData = z.infer<typeof skillCategorySchema>;
export type SkillIndicatorFormData = z.infer<typeof skillIndicatorSchema>;
export type BudgetConfigFormData = z.infer<typeof budgetConfigSchema>;
export type RewardFormData = z.infer<typeof rewardSchema>;
export type RewardCategoryFormData = z.infer<typeof rewardCategorySchema>;
export type CompanySettingsFormData = z.infer<typeof companySettingsSchema>;
