// ─── Colors ─────────────────────────────────────────────────────────────────
export const COLORS = {
  primary: '#6366f1',
  primaryLight: '#818cf8',
  primaryDark: '#4f46e5',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  background: '#f8fafc',
  surface: '#ffffff',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
} as const;

// ─── Mood Emojis ────────────────────────────────────────────────────────────
export const MOOD_MAP = {
  awful: { emoji: '😣', label: 'Awful', color: '#ef4444' },
  bad: { emoji: '😕', label: 'Bad', color: '#f97316' },
  okay: { emoji: '😐', label: 'Okay', color: '#eab308' },
  good: { emoji: '😊', label: 'Good', color: '#22c55e' },
  amazing: { emoji: '🤩', label: 'Amazing', color: '#6366f1' },
} as const;

export type MoodValue = keyof typeof MOOD_MAP;

// ─── Reaction Emojis ────────────────────────────────────────────────────────
export const REACTION_EMOJIS = [
  { emoji: '👍', label: 'Thumbs Up' },
  { emoji: '❤️', label: 'Heart' },
  { emoji: '🎉', label: 'Celebrate' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '👏', label: 'Clap' },
  { emoji: '💪', label: 'Strong' },
  { emoji: '🌟', label: 'Star' },
  { emoji: '🙏', label: 'Thanks' },
] as const;

// ─── Pagination ─────────────────────────────────────────────────────────────
export const PAGE_SIZE = 20;

// ─── Recognition Limits ─────────────────────────────────────────────────────
export const MAX_RECIPIENTS = 10;
export const MAX_HASHTAGS = 5;
export const MIN_MESSAGE_LENGTH = 10;
export const MAX_MESSAGE_LENGTH = 2000;

// ─── Redemption Status Labels ───────────────────────────────────────────────
export const REDEMPTION_STATUS = {
  pending: { label: 'Pending', color: '#f59e0b' },
  approved: { label: 'Approved', color: '#3b82f6' },
  preparing: { label: 'Preparing', color: '#8b5cf6' },
  shipped: { label: 'Shipped', color: '#6366f1' },
  fulfilled: { label: 'Fulfilled', color: '#22c55e' },
  rejected: { label: 'Rejected', color: '#ef4444' },
  cancelled: { label: 'Cancelled', color: '#94a3b8' },
} as const;

// ─── Badge Icons ────────────────────────────────────────────────────────────
export const BADGE_ICONS: Record<string, string> = {
  first_recognition: '🎯',
  streak_7: '🔥',
  streak_30: '💎',
  team_player: '🤝',
  mentor: '🧠',
  rising_star: '⭐',
  giving_spirit: '💝',
  skill_champion: '🏆',
};

// ─── Visibility Labels ─────────────────────────────────────────────────────
export const VISIBILITY_OPTIONS = [
  { value: 'public' as const, label: 'Everyone', icon: 'globe' },
  { value: 'team_only' as const, label: 'Team Only', icon: 'people' },
  { value: 'private' as const, label: 'Private', icon: 'lock-closed' },
] as const;

// ─── Query Keys ─────────────────────────────────────────────────────────────
export const QUERY_KEYS = {
  me: ['me'] as const,
  feed: ['feed'] as const,
  recognition: (id: string) => ['recognition', id] as const,
  reactions: (id: string) => ['reactions', id] as const,
  comments: (id: string) => ['comments', id] as const,
  leaderboard: (type: string, key: string) => ['leaderboard', type, key] as const,
  rewards: (categoryId?: string) => ['rewards', categoryId] as const,
  redemptions: ['redemptions'] as const,
  starTransactions: ['star-transactions'] as const,
  notifications: ['notifications'] as const,
  moodHistory: ['mood-history'] as const,
  skillCategories: ['skill-categories'] as const,
  thumbsUpTypes: ['thumbs-up-types'] as const,
  badges: ['badges'] as const,
  userBadges: (userId: string) => ['user-badges', userId] as const,
  profiles: (search: string) => ['profiles', search] as const,
  profile: (id: string) => ['profile', id] as const,
} as const;
