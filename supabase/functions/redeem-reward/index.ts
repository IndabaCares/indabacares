/**
 * Edge Function: redeem-reward
 *
 * Processes a reward redemption:
 *   1. Validates reward exists, is active, has stock
 *   2. Validates user has sufficient star balance
 *   3. Calls process_redemption() — atomic debit + stock decrement + order
 *   4. Notifies admins of pending order
 *
 * Security:
 *   - Authenticated users only
 *   - Inventory lock via SELECT ... FOR UPDATE prevents overselling
 *   - Star debit + order creation is a single Postgres transaction
 *   - Idempotency prevents double-spending on network retries
 */

import {
  withAuth,
  jsonResponse,
  errorResponse,
  type AuthContext,
} from "../_shared/auth-middleware.ts";
import { notify, notifyAdmins } from "../_shared/notifications.ts";

interface RedeemRequest {
  rewardId: string;
}

Deno.serve(
  withAuth(async (req: Request, ctx: AuthContext): Promise<Response> => {
    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    const { user, adminClient } = ctx;
    const body: RedeemRequest = await req.json();

    if (!body.rewardId) {
      return errorResponse("rewardId is required");
    }

    // ── Rate limit: max 5 redemptions per hour per user ──────────
    const { data: withinLimit } = await adminClient.rpc("check_rate_limit", {
      p_identifier: user.id,
      p_action: "redeem",
      p_max_attempts: 5,
      p_window_minutes: 60,
    });

    if (withinLimit === false) {
      return errorResponse("Too many redemption attempts. Try again later.", 429);
    }

    await adminClient.rpc("record_rate_limit", {
      p_identifier: user.id,
      p_action: "redeem",
    });

    // ── Call atomic Postgres procedure ───────────────────────────
    const { data: redemptionId, error: procError } = await adminClient.rpc(
      "process_redemption",
      {
        p_user_id: user.id,
        p_company_id: user.companyId,
        p_reward_id: body.rewardId,
      }
    );

    if (procError) {
      const errorMap: Record<string, { msg: string; status: number }> = {
        P2001: { msg: "Reward not found or no longer available", status: 404 },
        P2002: { msg: "This reward is out of stock", status: 409 },
        P2003: { msg: procError.message, status: 400 },
      };

      const mapped = errorMap[procError.code || ""];
      if (mapped) {
        return errorResponse(mapped.msg, mapped.status);
      }

      console.error("process_redemption failed:", procError);
      return errorResponse("Redemption failed. Please try again.", 500);
    }

    // ── Fetch the created redemption for response ────────────────
    const { data: redemption } = await adminClient
      .from("redemptions")
      .select(`
        id, star_cost, status, created_at,
        reward:rewards ( id, name, image_url, star_cost )
      `)
      .eq("id", redemptionId)
      .single();

    // ── Notify user ──────────────────────────────────────────────
    await notify(adminClient, {
      companyId: user.companyId,
      userId: user.id,
      type: "system",
      title: "Reward redeemed!",
      body: `Your order for "${redemption?.reward?.name}" is pending admin approval.`,
      referenceType: "redemption",
      referenceId: redemptionId,
    });

    // ── Notify admins ────────────────────────────────────────────
    const { data: userProfile } = await adminClient
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    await notifyAdmins(adminClient, user.companyId, {
      type: "manager_alert",
      title: "New reward redemption",
      body: `${userProfile?.full_name || user.email} redeemed "${redemption?.reward?.name}" (${redemption?.star_cost} stars)`,
      referenceType: "redemption",
      referenceId: redemptionId,
    });

    // ── Fetch updated balance ────────────────────────────────────
    const { data: updatedProfile } = await adminClient
      .from("profiles")
      .select("stars_balance")
      .eq("id", user.id)
      .single();

    return jsonResponse({
      redemption,
      starsBalance: updatedProfile?.stars_balance,
      message: "Reward redeemed! Your order is pending approval.",
    }, 201);
  })
);
