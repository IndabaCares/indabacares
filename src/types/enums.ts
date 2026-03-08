/**
 * Client-side enum mirrors for Supabase database enums.
 * Keep in sync with migration 001_foundation.sql.
 */

export const APP_ROLES = ['employee', 'manager', 'admin', 'super_admin'] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const VISIBILITY_VALUES = ['public', 'team_only', 'private'] as const;
export type Visibility = (typeof VISIBILITY_VALUES)[number];

export const MOOD_VALUES = ['awful', 'bad', 'okay', 'good', 'amazing'] as const;
export type MoodValue = (typeof MOOD_VALUES)[number];

export const REDEMPTION_STATUSES = [
  'pending',
  'approved',
  'preparing',
  'shipped',
  'fulfilled',
  'rejected',
  'cancelled',
] as const;
export type RedemptionStatus = (typeof REDEMPTION_STATUSES)[number];

export const NOTIFICATION_TYPES = [
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
  'system',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
