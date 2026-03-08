/**
 * Edge Function: send-recognition
 *
 * The most critical function in the platform. Orchestrates:
 *   1. Input validation & sanitization
 *   2. Calls process_recognition() — atomic Postgres procedure that handles
 *      all anti-fraud checks, balance mutations, and ledger entries
 *   3. Dispatches notifications to all recipients
 *   4. Triggers badge evaluation
 *
 * Security:
 *   - Authenticated users only (any role)
 *   - process_recognition() runs as SECURITY DEFINER with row-level locks
 *   - All writes use service_role (bypass RLS) via the Postgres procedure
 *   - Idempotency keys prevent double-processing
 */

import {
  withAuth,
  jsonResponse,
  errorResponse,
  type AuthContext,
} from "../_shared/auth-middleware.ts";
import { notify, notifyMany } from "../_shared/notifications.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";

interface SendRecognitionRequest {
  recipientIds: string[];
  thumbsUpTypeId: string;
  message: string;
  visibility?: "public" | "team_only" | "private";
  imageUrl?: string;
  hashtags?: string[];
}

Deno.serve(
  withAuth(async (req: Request, ctx: AuthContext): Promise<Response> => {
    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    const { user, adminClient } = ctx;

    // ── Rate limit: max 10 recognitions per user per hour ──────
    const rateLimited = await enforceRateLimit(adminClient, {
      identifier: user.id,
      action: "send_recognition",
      maxAttempts: 10,
      windowMinutes: 60,
    });
    if (rateLimited) return rateLimited;

    // ── Abuse scoring ──────────────────────────────────────────
    const { data: abuseScore } = await adminClient.rpc("check_abuse_score", {
      p_user_id: user.id,
      p_company_id: user.companyId,
    });
    if (abuseScore && abuseScore >= 50) {
      return errorResponse(
        "Your account has been temporarily restricted due to unusual activity. Please contact support.",
        403
      );
    }

    const body: SendRecognitionRequest = await req.json();

    // ── Input validation ─────────────────────────────────────────
    if (!body.recipientIds || !Array.isArray(body.recipientIds) || body.recipientIds.length === 0) {
      return errorResponse("At least one recipientId is required");
    }

    if (body.recipientIds.length > 10) {
      return errorResponse("Maximum 10 recipients per recognition");
    }

    // Deduplicate
    const recipientIds = [...new Set(body.recipientIds)];

    if (!body.thumbsUpTypeId) {
      return errorResponse("thumbsUpTypeId is required");
    }

    if (!body.message || body.message.trim().length < 10) {
      return errorResponse("Message must be at least 10 characters");
    }

    if (body.message.length > 2000) {
      return errorResponse("Message must be 2000 characters or fewer");
    }

    // Sanitize: strip HTML tags from message
    const message = body.message
      .replace(/<[^>]*>/g, "")
      .trim();

    const visibility = body.visibility || "public";
    if (!["public", "team_only", "private"].includes(visibility)) {
      return errorResponse("Invalid visibility. Must be: public, team_only, or private");
    }

    // Validate hashtags
    const hashtags = (body.hashtags || [])
      .slice(0, 5)  // max 5 hashtags
      .map((h: string) => h.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())
      .filter((h: string) => h.length > 0);

    // ── Call atomic Postgres procedure ───────────────────────────
    const { data: recognitionId, error: procError } = await adminClient.rpc(
      "process_recognition",
      {
        p_sender_id: user.id,
        p_company_id: user.companyId,
        p_recipient_ids: recipientIds,
        p_thumbs_up_type_id: body.thumbsUpTypeId,
        p_message: message,
        p_visibility: visibility,
        p_image_url: body.imageUrl || null,
        p_hashtags: hashtags,
      }
    );

    if (procError) {
      // Map Postgres error codes to user-friendly messages
      const errorMap: Record<string, { msg: string; status: number }> = {
        P1001: { msg: "Invalid or inactive thumbs-up type", status: 400 },
        P1002: { msg: "You cannot recognize yourself", status: 400 },
        P1003: { msg: procError.message, status: 429 },
        P1004: { msg: "You already sent a similar recognition recently. Please wait.", status: 429 },
        P1005: { msg: "One or more recipients are invalid or inactive", status: 400 },
        P1006: { msg: procError.message, status: 400 },
        P1007: { msg: procError.message, status: 400 },
      };

      const code = procError.code || "";
      const mapped = errorMap[code];
      if (mapped) {
        return errorResponse(mapped.msg, mapped.status);
      }

      console.error("process_recognition failed:", procError);
      return errorResponse("Failed to send recognition. Please try again.", 500);
    }

    // ── Fetch created recognition for response ───────────────────
    const { data: recognition } = await adminClient
      .from("recognitions")
      .select(`
        id, message, visibility, stars_per_recipient, image_url,
        hashtags, created_at,
        sender:profiles!sender_id ( id, full_name, avatar_url ),
        thumbs_up_type:thumbs_up_types ( id, name, icon, color ),
        recipients:recognition_recipients ( recipient:profiles ( id, full_name, avatar_url ) )
      `)
      .eq("id", recognitionId)
      .single();

    // ── Notifications ────────────────────────────────────────────
    const senderName = recognition?.sender?.full_name || user.email;
    const typeName = recognition?.thumbs_up_type?.name || "Thumbs Up";

    const notifications = recipientIds.map((rid: string) => ({
      companyId: user.companyId,
      userId: rid,
      type: "recognition_received" as const,
      title: `${senderName} recognized you!`,
      body: `"${typeName}" — ${message.substring(0, 100)}${message.length > 100 ? "..." : ""}`,
      referenceType: "recognition",
      referenceId: recognitionId,
    }));

    await notifyMany(adminClient, notifications);

    // ── Trigger badge evaluation (fire-and-forget) ───────────────
    // We call the evaluate-badges function asynchronously.
    // In production, use Supabase's pg_net extension or a queue.
    try {
      const evalUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/evaluate-badges`;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      // Fire and forget — don't await
      fetch(evalUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userIds: [user.id, ...recipientIds],
          companyId: user.companyId,
        }),
      }).catch((e) => console.error("Badge eval trigger failed:", e));
    } catch {
      // Non-critical — badge eval failure should not affect the response
    }

    return jsonResponse({
      recognition,
      message: "Recognition sent successfully",
    }, 201);
  })
);
