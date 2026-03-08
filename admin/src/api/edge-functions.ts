import { createClient } from '@/lib/supabase/client';
import type {
  AuthMeResponse,
  InviteRequest,
  InviteResponse,
  UpdateRoleResponse,
  DeactivateUserResponse,
  RedemptionAction,
  ManageRedemptionResponse,
  EdgeFunctionError,
} from '@/types/api';

class EdgeFunctionCallError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'EdgeFunctionCallError';
    this.status = status;
  }
}

async function invoke<T>(
  functionName: string,
  body?: unknown,
  method: 'GET' | 'POST' = 'POST'
): Promise<T> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: body ? JSON.stringify(body) : undefined,
    method,
  });

  if (error) {
    throw new EdgeFunctionCallError(
      error.message || 'Edge function call failed',
      (error as { status?: number }).status || 500
    );
  }

  if (data && typeof data === 'object' && 'error' in data) {
    const errData = data as EdgeFunctionError;
    throw new EdgeFunctionCallError(errData.error, 400);
  }

  return data as T;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export function authMe() {
  return invoke<AuthMeResponse>('auth-me', undefined, 'GET');
}

// ─── User Management ────────────────────────────────────────────────────────

export function inviteUsers(invites: InviteRequest[]) {
  return invoke<InviteResponse>('auth-invite', { invites });
}

export function updateUserRole(userId: string, newRole: string) {
  return invoke<UpdateRoleResponse>('auth-update-role', { userId, newRole });
}

export function deactivateUser(userId: string, active: boolean, reason?: string) {
  return invoke<DeactivateUserResponse>('auth-deactivate-user', {
    userId,
    active,
    reason,
  });
}

// ─── Redemption Management ──────────────────────────────────────────────────

export function manageRedemption(
  redemptionId: string,
  action: RedemptionAction,
  note?: string
) {
  return invoke<ManageRedemptionResponse>('manage-redemption', {
    redemptionId,
    action,
    note,
  });
}
