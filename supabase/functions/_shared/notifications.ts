/**
 * Notification dispatch helper.
 *
 * Creates in-app notifications (stored in DB, delivered via Supabase Realtime)
 * and optionally dispatches push notifications via FCM/APNs.
 *
 * Realtime delivery: The notifications table is in the supabase_realtime
 * publication. Clients subscribe to `notifications:{user_id}` and receive
 * INSERTs automatically (filtered by RLS).
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type NotificationType =
  | "recognition_received"
  | "recognition_boosted"
  | "reaction"
  | "comment"
  | "reward_approved"
  | "reward_in_preparation"
  | "reward_shipped"
  | "reward_fulfilled"
  | "reward_rejected"
  | "budget_reset"
  | "badge_earned"
  | "manager_alert"
  | "system";

interface NotificationPayload {
  companyId: string;
  userId: string;          // recipient of the notification
  type: NotificationType;
  title: string;
  body?: string;
  referenceType?: string;  // 'recognition', 'redemption', 'badge'
  referenceId?: string;
}

/**
 * Create a single in-app notification.
 * The row is automatically broadcast to the user's Realtime channel.
 */
export async function notify(
  adminClient: SupabaseClient,
  payload: NotificationPayload
): Promise<void> {
  const { error } = await adminClient.from("notifications").insert({
    company_id: payload.companyId,
    user_id: payload.userId,
    type: payload.type,
    title: payload.title,
    body: payload.body || null,
    reference_type: payload.referenceType || null,
    reference_id: payload.referenceId || null,
  });

  if (error) {
    console.error(`Notification failed for user ${payload.userId}:`, error);
  }

  // ── Push notification (FCM/APNs) ─────────────────────────────
  // In production, dispatch to your push service here.
  // Example:
  //
  // const pushToken = await getPushToken(adminClient, payload.userId);
  // if (pushToken) {
  //   await sendPush({
  //     token: pushToken,
  //     title: payload.title,
  //     body: payload.body,
  //     data: {
  //       type: payload.type,
  //       referenceType: payload.referenceType,
  //       referenceId: payload.referenceId,
  //     },
  //   });
  // }
}

/**
 * Create notifications for multiple users at once.
 */
export async function notifyMany(
  adminClient: SupabaseClient,
  payloads: NotificationPayload[]
): Promise<void> {
  if (payloads.length === 0) return;

  const rows = payloads.map((p) => ({
    company_id: p.companyId,
    user_id: p.userId,
    type: p.type,
    title: p.title,
    body: p.body || null,
    reference_type: p.referenceType || null,
    reference_id: p.referenceId || null,
  }));

  const { error } = await adminClient.from("notifications").insert(rows);

  if (error) {
    console.error(`Bulk notification failed (${rows.length} rows):`, error);
  }
}

/**
 * Notify all admins in a company (e.g., new redemption pending approval).
 */
export async function notifyAdmins(
  adminClient: SupabaseClient,
  companyId: string,
  notification: Omit<NotificationPayload, "companyId" | "userId">
): Promise<void> {
  const { data: admins } = await adminClient
    .from("profiles")
    .select("id")
    .eq("company_id", companyId)
    .in("role", ["admin", "super_admin"])
    .eq("is_active", true);

  if (!admins || admins.length === 0) return;

  const payloads: NotificationPayload[] = admins.map((a) => ({
    companyId,
    userId: a.id,
    ...notification,
  }));

  await notifyMany(adminClient, payloads);
}

/**
 * Notify a user's manager (e.g., team member hasn't been recognized).
 */
export async function notifyManager(
  adminClient: SupabaseClient,
  userId: string,
  companyId: string,
  notification: Omit<NotificationPayload, "companyId" | "userId">
): Promise<void> {
  const { data: user } = await adminClient
    .from("profiles")
    .select("manager_id")
    .eq("id", userId)
    .single();

  if (user?.manager_id) {
    await notify(adminClient, {
      companyId,
      userId: user.manager_id,
      ...notification,
    });
  }
}
