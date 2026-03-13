/**
 * Feature flags.
 *
 * System 1 (Supabase Auth) provided per-company flags via company.features JSONB.
 * With System 1 removed, all features default to enabled.
 * Per-hotel flag configuration can be reintroduced by adding a `hotel_settings`
 * table scoped to System 2 (employees + hotel).
 */

export type FeatureFlag =
  | 'moods_enabled'
  | 'rewards_enabled'
  | 'skills_enabled'
  | 'leaderboards_enabled'
  | 'custom_hashtags_enabled'
  | 'boost_enabled';

const FLAG_DEFAULTS: Record<FeatureFlag, boolean> = {
  moods_enabled:           true,
  rewards_enabled:         true,
  skills_enabled:          true,
  leaderboards_enabled:    true,
  custom_hashtags_enabled: true,
  boost_enabled:           true,
};

export function useFeatureFlag(flag: FeatureFlag): boolean {
  return FLAG_DEFAULTS[flag];
}

export function useFeatureFlags(): Record<FeatureFlag, boolean> {
  return { ...FLAG_DEFAULTS };
}
