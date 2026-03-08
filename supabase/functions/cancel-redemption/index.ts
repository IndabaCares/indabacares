/**
 * Edge Function: cancel-redemption
 *
 * Allows a user to cancel their own pending redemption order.
 *   - Only pending orders can be cancelled
 *   - Stars are refunded atomically via process_refund()
 *   - Audit logged for traceability
 *
 * Security:
 *   - Authenticated users only
 *   - Users can only cancel their own orders
 *   - Rate limited to prevent abuse
 */

import {
  withAuth,
  jsonResponse,
  errorResponse,
  type AuthContext,
} from "../_shared/auth-middleware.ts";
import { notify } from "../_shared/notifications.ts";
import { writeAuditLog } from "../_shared/audit.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";

interface CancelRequest {
  redemptionId: string;
}

Deno.serve(
  withAuth(async (req: Request, ctx: AuthContext): Promise<Response> => {
    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    const { user, adminClient } = ctx;

    // ── Rate limit: max 10 cancellations per user per hour ────
    const rateLimited = await enforceRateLimit(adminClient, {
      identifier: user.id,
      action: "cancel_redemption",
      maxAttempts: 10,
      windowMinutes: 60,
    });
    if (rateLimited) return rateLimited;

    const body: CancelRequest = await req.json();

    if (!body.redemptionId) {
      return errorResponse("redemptionId is required");
    }

    // ── Fetch the redemption (must belong to this user) ────────
    const { data: redemption, error: fetchError } = await adminClient
      .from("redemptions")
      .select(`
        id, user_id, reward_id, star_cost, status,
        reward:rewards ( name )
      `)
      .eq("id", body.redemptionId)
      .eq("user_id", user.id)
      .eq("company_id", user.companyId)
      .single();

    if (fetchError || !redemption) {
      return errorResponse("Redemption not found", 404);
    }

    // ── Only pending orders can be self-cancelled ──────────────
    if (redemption.status !== "pending") {
      return errorResponse(
        `Cannot cancel an order with status "${redemption.status}". Only pending orders can be cancelled.`
      );
    }

    // ── Process refund atomically ──────────────────────────────
    const { error: refundError } = await adminClient.rpc("process_refund", {
      p_redemption_id: body.redemptionId,
      p_company_id: user.companyId,
      p_reason: "Cancelled by user",
    });

    if (refundError) {
      console.error("Refund failed:", refundError);
      return errorResponse("Failed to process refund. Please try again.", 500);
    }

    // ── Update redemption status ───────────────────────────────
    const { error: updateError } = await adminClient
      .from("redemptions")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", body.redemptionId);

    if (updateError) {
      console.error("Status update failed:", updateError);
      return errorResponse("Refund processed but status update failed.", 500);
    }

    // ── Audit log ──────────────────────────────────────────────
    await writeAuditLog(adminClient, {
      companyId: user.companyId,
      actorId: user.id,
      action: "redemption.cancel",
      targetType: "redemption",
      targetId: body.redemptionId,
      metadata: {
        star_cost: redemption.star_cost,
        reward_name: redemption.reward?.name,
      },
      req,
    });

    // ── Notify user of successful cancellation ─────────────────
    await notify(adminClient, {
      companyId: user.companyId,
      userId: user.id,
      type: "system",
      title: "Order cancelled",
      body: `Your order for "${redemption.reward?.name}" has been cancelled. ${redemption.star_cost} stars refunded.`,
      referenceType: "redemption",
      referenceId: body.redemptionId,
    });

    // ── Fetch updated balance ──────────────────────────────────
    const { data: updatedProfile } = await adminClient
      .from("profiles")
      .select("stars_balance")
      .eq("id", user.id)
      .single();

    return jsonResponse({
      redemptionId: body.redemptionId,
      status: "cancelled",
      starsRefunded: redemption.star_cost,
      starsBalance: updatedProfile?.stars_balance,
      message: `Order cancelled. ${redemption.star_cost} stars refunded to your balance.`,
    });
  })
);
