import type { AppRole } from './database';

// ─── auth-me ────────────────────────────────────────────────────────────────

export interface AuthMeResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: AppRole;
    jobTitle: string | null;
    department: { id: string; name: string } | null;
    managerId: string | null;
    pointsBalance: number;
    starsBalance: number;
    givingBalance: number;
    loginStreak: number;
    badges: Array<{
      badge_id: string;
      earned_at: string;
      badges: { slug: string; name: string; icon: string };
    }>;
    createdAt: string;
  };
  company: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    primaryColor: string;
    features: Record<string, unknown>;
  };
  session: {
    unreadNotifications: number;
    moodSubmittedToday: boolean;
    streakResult: unknown;
  };
}

// ─── Admin Edge Function Types ──────────────────────────────────────────────

export interface InviteRequest {
  email: string;
  role?: 'employee' | 'manager' | 'admin';
  fullName?: string;
  departmentId?: string;
  managerId?: string;
}

export interface InviteResponse {
  total: number;
  invited: number;
  results: Array<{ email: string; status: string; token?: string }>;
}

export interface UpdateRoleResponse {
  message: string;
  previousRole: string;
  newRole: string;
}

export interface DeactivateUserResponse {
  message: string;
  isActive: boolean;
}

export type RedemptionAction = 'approve' | 'prepare' | 'ship' | 'fulfill' | 'reject';

export interface ManageRedemptionResponse {
  redemptionId: string;
  previousStatus: string;
  newStatus: string;
  refunded: boolean;
  message: string;
}

export interface EdgeFunctionError {
  error: string;
}
