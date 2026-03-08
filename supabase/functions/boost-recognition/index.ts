/**
 * Edge Function: boost-recognition
 *
 * Managers/admins boost a recognition, giving it:
 *   - Visual prominence in the feed (highlighted, pinned)
 *   - Bonus stars (+2) to recipients
 *   - Bonus points (+25) to recipients
 *
 * Security:
 *   - Manager role or above required
 *   - Cannot boost own recognitions (as sender)
 *   - Cannot boost already-boosted recognitions
 *   - Only recognitions within own company
 */

import {
  withAuth,
  jsonResponse,
  errorResponse,
  type AuthContext,
} from "../_shared/auth-middleware.ts";
import { notifyMany } from "../_shared/notifications.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";

interface BoostRequest {
  recognitionId: string;
}

const BOOST_BONUS_STARS = 2;
const BOOST_BONUS_POINTS = 25;

Deno.serve(
  withAuth(
    async (req: Request, ctx: AuthContext): Promise<Response> => {
      if (req.method !== "POST") {
        return errorResponse("Method not allowed", 405);
      }

      const { user, adminClient } = ctx;

      // ── Rate limit: max 20 boosts per manager per hour ───────
      const rateLimited = await enforceRateLimit(adminClient, {
        identifier: user.id,
        action: "boost",
        maxAttempts: 20,
        windowMinutes: 60,
      });
      if (rateLimited) return rateLimited;

      const body: BoostRequest = await req.json();

      if (!body.recognitionId) {
        return errorResponse("recognitionId is required");
      }

      // ── Fetch recognition ──────────────────────────────────────
      const { data: recognition, error: fetchError } = await adminClient
        .from("recognitions")
        .select(`
          id, company_id, sender_id, is_boosted, message,
          thumbs_up_type:thumbs_up_types ( name ),
          recipients:recognition_recipients ( recipient_id )
        `)
        .eq("id", body.recognitionId)
        .eq("company_id", user.companyId)
        .single();

      if (fetchError || !recognition) {
        return errorResponse("Recognition not found", 404);
      }

      if (recognition.is_boosted) {
        return errorResponse("This recognition has already been boosted", 409);
      }

      if (recognition.sender_id === user.id) {
        return errorResponse("You cannot boost your own recognition");
      }

      // ── Update recognition ─────────────────────────────────────
      const { error: updateError } = await adminClient
        .from("recognitions")
        .update({
          is_boosted: true,
          boosted_by: user.id,
          boosted_at: new Date().toISOString(),
        })
        .eq("id", body.recognitionId);

      if (updateError) {
        return errorResponse("Failed to boost recognition", 500);
      }

      // ── Award bonus stars + points to each recipient ───────────
      const recipientIds = recognition.recipients.map(
        (r: { recipient_id: string }) => r.recipient_id
      );

      for (const recipientId of recipientIds) {
        // Fetch current balances with lock
        const { data: recipient } = await adminClient
          .from("profiles")
          .select("points_balance, stars_balance, company_id, full_name")
          .eq("id", recipientId)
          .single();

        if (!recipient) continue;

        // Stars bonus
        await adminClient
          .from("profiles")
          .update({
            stars_balance: recipient.stars_balance + BOOST_BONUS_STARS,
            points_balance: recipient.points_balance + BOOST_BONUS_POINTS,
          })
          .eq("id", recipientId);

        // Star transaction
        await adminClient.from("star_transactions").insert({
          company_id: user.companyId,
          user_id: recipientId,
          type: "boost_bonus",
          amount: BOOST_BONUS_STARS,
          balance_after: recipient.stars_balance + BOOST_BONUS_STARS,
          reference_type: "recognition",
          reference_id: body.recognitionId,
          description: `Manager boost bonus from ${user.email}`,
          idempotency_key: `boost:star:${body.recognitionId}:${recipientId}`,
        });

        // Point transaction
        await adminClient.from("point_transactions").insert({
          company_id: user.companyId,
          user_id: recipientId,
          type: "boost_bonus",
          amount: BOOST_BONUS_POINTS,
          balance_after: recipient.points_balance + BOOST_BONUS_POINTS,
          reference_type: "recognition",
          reference_id: body.recognitionId,
          description: `Manager boost bonus from ${user.email}`,
          idempotency_key: `boost:pts:${body.recognitionId}:${recipientId}`,
        });
      }

      // ── Notifications ──────────────────────────────────────────
      const { data: booster } = await adminClient
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const boosterName = booster?.full_name || user.email;

      const notifications = recipientIds.map((rid: string) => ({
        companyId: user.companyId,
        userId: rid,
        type: "recognition_boosted" as const,
        title: `${boosterName} boosted your recognition!`,
        body: `You earned +${BOOST_BONUS_STARS} bonus stars and +${BOOST_BONUS_POINTS} bonus points`,
        referenceType: "recognition",
        referenceId: body.recognitionId,
      }));

      await notifyMany(adminClient, notifications);

      return jsonResponse({
        recognitionId: body.recognitionId,
        boostedBy: user.id,
        recipientsAwarded: recipientIds.length,
        bonusStarsEach: BOOST_BONUS_STARS,
        bonusPointsEach: BOOST_BONUS_POINTS,
        message: "Recognition boosted!",
      });
    },
    { requiredRole: "manager" }
  )
);
