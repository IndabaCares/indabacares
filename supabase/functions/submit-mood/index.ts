/**
 * Edge Function: submit-mood
 *
 * Daily mood check-in. Validates once-per-day, awards points,
 * and records the entry for Happiness Score aggregation.
 *
 * Security:
 *   - Authenticated users only
 *   - Once-per-day enforced at DB level (UNIQUE + procedure check)
 *   - Notes are optional and only visible to admins
 *   - Individual moods are never exposed to peers
 */

import {
  withAuth,
  jsonResponse,
  errorResponse,
  type AuthContext,
} from "../_shared/auth-middleware.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";

const VALID_MOODS = ["awful", "bad", "okay", "good", "amazing"] as const;
type MoodValue = typeof VALID_MOODS[number];

interface SubmitMoodRequest {
  mood: MoodValue;
  note?: string;
}

Deno.serve(
  withAuth(async (req: Request, ctx: AuthContext): Promise<Response> => {
    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    const { user, adminClient } = ctx;

    // ── Rate limit: max 5 mood submissions per user per hour ──
    const rateLimited = await enforceRateLimit(adminClient, {
      identifier: user.id,
      action: "submit_mood",
      maxAttempts: 5,
      windowMinutes: 60,
    });
    if (rateLimited) return rateLimited;

    const body: SubmitMoodRequest = await req.json();

    // ── Validate mood value ──────────────────────────────────────
    if (!body.mood || !VALID_MOODS.includes(body.mood)) {
      return errorResponse(
        `Invalid mood. Must be one of: ${VALID_MOODS.join(", ")}`
      );
    }

    // ── Sanitize note ────────────────────────────────────────────
    const note = body.note
      ? body.note.replace(/<[^>]*>/g, "").trim().substring(0, 500)
      : null;

    // ── Call atomic Postgres procedure ───────────────────────────
    const { data: entryId, error: procError } = await adminClient.rpc(
      "submit_mood",
      {
        p_user_id: user.id,
        p_company_id: user.companyId,
        p_mood: body.mood,
        p_note: note,
      }
    );

    if (procError) {
      if (procError.code === "P3001") {
        return errorResponse("You've already submitted your mood today", 409);
      }
      // UNIQUE violation (belt-and-suspenders)
      if (procError.code === "23505") {
        return errorResponse("You've already submitted your mood today", 409);
      }
      console.error("submit_mood failed:", procError);
      return errorResponse("Failed to submit mood", 500);
    }

    return jsonResponse({
      moodEntryId: entryId,
      mood: body.mood,
      pointsEarned: 5,
      message: "Mood recorded. Thank you for sharing!",
    }, 201);
  })
);
