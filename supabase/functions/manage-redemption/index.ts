/**
 * Edge Function: manage-redemption
 *
 * Admin manages reward order lifecycle:
 *   - approve:        pending → approved
 *   - prepare:        approved → in_preparation
 *   - ship:           in_preparation → shipped
 *   - fulfill:        shipped → fulfilled
 *   - reject:         pending|approved → rejected (triggers star refund)
 *
 * Security:
 *   - Admin role required
 *   - State machine enforced — no skipping steps
 *   - Rejection triggers atomic refund via process_refund()
 *   - All transitions are audit-logged
 */

import {
  withAuth,
  jsonResponse,
  errorResponse,
  type AuthContext,
} from "../_shared/auth-middleware.ts";
import { notify } from "../_shared/notifications.ts";
import { writeAuditLog } from "../_shared/audit.ts";

type Action = "approve" | "prepare" | "ship" | "fulfill" | "reject";

interface ManageRequest {
  redemptionId: string;
  action: Action;
  note?: string;
}

// Valid state transitions
const STATE_MACHINE: Record<Action, { from: string[]; to: string }> = {
  approve: { from: ["pending"], to: "approved" },
  prepare: { from: ["approved"], to: "in_preparation" },
  ship:    { from: ["in_preparation"], to: "shipped" },
  fulfill: { from: ["shipped"], to: "fulfilled" },
  reject:  { from: ["pending", "approved"], to: "rejected" },
};

const NOTIFICATION_MAP: Record<string, { type: string; title: string }> = {
  approved:       { type: "reward_approved", title: "Your reward order has been approved!" },
  in_preparation: { type: "reward_in_preparation", title: "Your reward is being prepared" },
  shipped:        { type: "reward_shipped", title: "Your reward has been shipped!" },
  fulfilled:      { type: "reward_fulfilled", title: "Your reward order is complete" },
  rejected:       { type: "reward_rejected", title: "Your reward order was declined" },
};

Deno.serve(
  withAuth(
    async (req: Request, ctx: AuthContext): Promise<Response> => {
      if (req.method !== "POST") {
        return errorResponse("Method not allowed", 405);
      }

      const { user, adminClient } = ctx;
      const body: ManageRequest = await req.json();

      // ── Validation ─────────────────────────────────────────────
      if (!body.redemptionId || !body.action) {
        return errorResponse("redemptionId and action are required");
      }

      if (!STATE_MACHINE[body.action]) {
        return errorResponse(`Invalid action. Must be: ${Object.keys(STATE_MACHINE).join(", ")}`);
      }

      if (body.action === "reject" && (!body.note || body.note.trim().length < 3)) {
        return errorResponse("A reason (note) is required when rejecting an order");
      }

      // ── Fetch redemption ───────────────────────────────────────
      const { data: redemption, error: fetchError } = await adminClient
        .from("redemptions")
        .select(`
          id, user_id, reward_id, star_cost, status,
          reward:rewards ( name )
        `)
        .eq("id", body.redemptionId)
        .eq("company_id", user.companyId)
        .single();

      if (fetchError || !redemption) {
        return errorResponse("Redemption not found", 404);
      }

      // ── Enforce state machine ──────────────────────────────────
      const transition = STATE_MACHINE[body.action];
      if (!transition.from.includes(redemption.status)) {
        return errorResponse(
          `Cannot ${body.action} an order with status "${redemption.status}". ` +
          `Allowed from: ${transition.from.join(", ")}`
        );
      }

      // ── Process rejection refund ───────────────────────────────
      if (body.action === "reject") {
        const { error: refundError } = await adminClient.rpc("process_refund", {
          p_redemption_id: body.redemptionId,
          p_company_id: user.companyId,
          p_reason: body.note || "Order rejected by admin",
        });

        if (refundError) {
          console.error("Refund failed:", refundError);
          return errorResponse("Failed to process refund. Order not rejected.", 500);
        }
      }

      // ── Update redemption status ───────────────────────────────
      const { error: updateError } = await adminClient
        .from("redemptions")
        .update({
          status: transition.to,
          admin_note: body.note || null,
          processed_by: user.id,
          processed_at: new Date().toISOString(),
        })
        .eq("id", body.redemptionId);

      if (updateError) {
        return errorResponse("Failed to update order status", 500);
      }

      // ── Audit log ──────────────────────────────────────────────
      await writeAuditLog(adminClient, {
        companyId: user.companyId,
        actorId: user.id,
        action: `redemption.${body.action}`,
        targetType: "redemption",
        targetId: body.redemptionId,
        metadata: {
          previous_status: redemption.status,
          new_status: transition.to,
          note: body.note,
          user_id: redemption.user_id,
          reward_name: redemption.reward?.name,
          star_cost: redemption.star_cost,
        },
        req,
      });

      // ── Notify the user ────────────────────────────────────────
      const notif = NOTIFICATION_MAP[transition.to];
      if (notif) {
        const bodyText = body.action === "reject"
          ? `Reason: ${body.note}. Your ${redemption.star_cost} stars have been refunded.`
          : `Your order for "${redemption.reward?.name}" is now ${transition.to.replace(/_/g, " ")}.`;

        await notify(adminClient, {
          companyId: user.companyId,
          userId: redemption.user_id,
          type: notif.type as any,
          title: notif.title,
          body: bodyText,
          referenceType: "redemption",
          referenceId: body.redemptionId,
        });
      }

      return jsonResponse({
        redemptionId: body.redemptionId,
        previousStatus: redemption.status,
        newStatus: transition.to,
        refunded: body.action === "reject",
        message: `Order ${body.action}${body.action === "reject" ? "ed. Stars refunded." : "d successfully."}`,
      });
    },
    { requiredRole: "admin" }
  )
);
