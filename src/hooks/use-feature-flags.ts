import { useAuthStore } from '@/stores/auth-store';

/**
 * Known feature flags. Each maps to a boolean in company.features JSONB.
 * Must match the check constraint in 011_production_hardening.sql.
 */
export type FeatureFlag =
  | 'moods_enabled'
  | 'rewards_enabled'
  | 'skills_enabled'
  | 'leaderboards_enabled'
  | 'custom_hashtags_enabled'
  | 'boost_enabled';

const FLAG_DEFAULTS: Record<FeatureFlag, boolean> = {
  moods_enabled: true,
  rewards_enabled: true,
  skills_enabled: true,
  leaderboards_enabled: true,
  custom_hashtags_enabled: true,
  boost_enabled: true,
};

/**
 * Returns whether a feature flag is enabled for the current company.
 * Falls back to `true` for unknown/unset flags (opt-out model).
 */
export function useFeatureFlag(flag: FeatureFlag): boolean {
  const features = useAuthStore((s) => s.company?.features);
  if (!features) return FLAG_DEFAULTS[flag];
  const value = features[flag];
  return typeof value === 'boolean' ? value : FLAG_DEFAULTS[flag];
}

/**
 * Returns all feature flags as a typed object.
 */
export function useFeatureFlags(): Record<FeatureFlag, boolean> {
  const features = useAuthStore((s) => s.company?.features);
  const result = { ...FLAG_DEFAULTS };
  if (features) {
    for (const key of Object.keys(FLAG_DEFAULTS) as FeatureFlag[]) {
      const value = features[key];
      if (typeof value === 'boolean') result[key] = value;
    }
  }
  return result;
}
