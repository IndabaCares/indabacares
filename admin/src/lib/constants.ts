export const PAGE_SIZE = 20;

export const QUERY_KEYS = {
  me: ['admin-me'] as const,
  users: (params?: Record<string, unknown>) => ['admin-users', params] as const,
  user: (id: string) => ['admin-user', id] as const,
  departments: ['admin-departments'] as const,
  recognitions: (params?: Record<string, unknown>) => ['admin-recognitions', params] as const,
  moodAnalytics: (params?: Record<string, unknown>) => ['admin-mood', params] as const,
  moodEntries: (params?: Record<string, unknown>) => ['admin-mood-entries', params] as const,
  happinessScores: (params?: Record<string, unknown>) => ['admin-happiness', params] as const,
  activeUserCount: ['admin-active-users'] as const,
  thumbsUpTypes: ['admin-thumbs-up-types'] as const,
  companyValues: ['admin-company-values'] as const,
  badges: ['admin-badges'] as const,
  skillCategories: ['admin-skill-categories'] as const,
  budgetConfigs: ['admin-budget-configs'] as const,
  rewards: ['admin-rewards'] as const,
  rewardCategories: ['admin-reward-categories'] as const,
  redemptions: (params?: Record<string, unknown>) => ['admin-redemptions', params] as const,
  auditLogs: (params?: Record<string, unknown>) => ['admin-audit-logs', params] as const,
  inviteTokens: ['admin-invite-tokens'] as const,
} as const;

export const ROLE_LABELS: Record<string, string> = {
  employee: 'Employee',
  manager: 'Manager',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

export const ROLE_COLORS: Record<string, string> = {
  employee: 'bg-slate-100 text-slate-700',
  manager: 'bg-blue-100 text-blue-700',
  admin: 'bg-purple-100 text-purple-700',
  super_admin: 'bg-amber-100 text-amber-700',
};

export const MOOD_MAP: Record<string, { label: string; color: string }> = {
  awful: { label: 'Awful', color: '#ef4444' },
  bad: { label: 'Bad', color: '#f97316' },
  okay: { label: 'Okay', color: '#eab308' },
  good: { label: 'Good', color: '#22c55e' },
  amazing: { label: 'Amazing', color: '#06b6d4' },
};

export const REDEMPTION_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-700' },
  in_preparation: { label: 'Preparing', color: 'bg-indigo-100 text-indigo-700' },
  shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-700' },
  fulfilled: { label: 'Fulfilled', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700' },
};
