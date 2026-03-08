/**
 * Audit logging helper for Edge Functions.
 * Every admin or sensitive action is recorded immutably.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AuditEntry {
  companyId: string;
  actorId: string | null;
  action: string;          // e.g. 'user.invite', 'user.role_change', 'user.deactivate'
  targetType?: string;     // e.g. 'profile', 'reward'
  targetId?: string;
  metadata?: Record<string, unknown>;  // before/after snapshots
  req?: Request;           // to extract IP and user-agent
}

export async function writeAuditLog(
  adminClient: SupabaseClient,
  entry: AuditEntry
): Promise<void> {
  const ipAddress = entry.req?.headers.get("x-forwarded-for")
    || entry.req?.headers.get("cf-connecting-ip")
    || null;
  const userAgent = entry.req?.headers.get("user-agent") || null;

  const { error } = await adminClient.from("audit_logs").insert({
    company_id: entry.companyId,
    actor_id: entry.actorId,
    action: entry.action,
    target_type: entry.targetType,
    target_id: entry.targetId,
    metadata: entry.metadata || {},
    ip_address: ipAddress,
    user_agent: userAgent,
  });

  if (error) {
    // Log but don't throw — audit failures should not break business logic
    console.error("Audit log write failed:", error);
  }
}
