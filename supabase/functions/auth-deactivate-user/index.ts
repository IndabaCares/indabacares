/**
 * Edge Function: auth-deactivate-user
 *
 * Admins activate or deactivate a user account.
 * Deactivation:
 *   - Sets profiles.is_active = false
 *   - Bans the user at auth level (prevents new sessions)
 *   - Does NOT delete data (soft deactivation, fully reversible)
 *
 * Required role: admin
 */

import {
  withAuth,
  jsonResponse,
  errorResponse,
  type AuthContext,
} from "../_shared/auth-middleware.ts";
import { writeAuditLog } from "../_shared/audit.ts";

interface DeactivateRequest {
  userId: string;
  active: boolean;  // true = reactivate, false = deactivate
  reason?: string;
}

Deno.serve(
  withAuth(
    async (req: Request, ctx: AuthContext): Promise<Response> => {
      if (req.method !== "POST") {
        return errorResponse("Method not allowed", 405);
      }

      const { user, adminClient } = ctx;
      const body: DeactivateRequest = await req.json();

      // ── Validation ───────────────────────────────────────────────
      if (!body.userId || typeof body.active !== "boolean") {
        return errorResponse("userId and active (boolean) are required");
      }

      // Cannot deactivate yourself
      if (body.userId === user.id) {
        return errorResponse("Cannot deactivate your own account");
      }

      // ── Fetch target user ────────────────────────────────────────
      const { data: target, error: targetError } = await adminClient
        .from("profiles")
        .select("id, company_id, role, email, is_active")
        .eq("id", body.userId)
        .single();

      if (targetError || !target) {
        return errorResponse("User not found", 404);
      }

      if (target.company_id !== user.companyId) {
        return errorResponse("Cannot modify users outside your company", 403);
      }

      // Cannot deactivate a super_admin unless you are super_admin
      if (target.role === "super_admin" && user.role !== "super_admin") {
        return errorResponse("Only super_admins can deactivate other super_admins", 403);
      }

      // Cannot deactivate the last super_admin
      if (!body.active && target.role === "super_admin") {
        const { count } = await adminClient
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("company_id", user.companyId)
          .eq("role", "super_admin")
          .eq("is_active", true);

        if ((count || 0) <= 1) {
          return errorResponse("Cannot deactivate the last super_admin");
        }
      }

      // No-op check
      if (target.is_active === body.active) {
        return jsonResponse({
          message: `User is already ${body.active ? "active" : "deactivated"}`,
        });
      }

      // ── Update profile ───────────────────────────────────────────
      const { error: profileError } = await adminClient
        .from("profiles")
        .update({ is_active: body.active })
        .eq("id", body.userId);

      if (profileError) {
        return errorResponse("Failed to update profile: " + profileError.message);
      }

      // ── Ban/unban at auth level ──────────────────────────────────
      if (!body.active) {
        // Ban: prevents login and invalidates refresh tokens
        const { error: banError } = await adminClient.auth.admin.updateUserById(
          body.userId,
          { ban_duration: "876600h" }  // ~100 years = effectively permanent
        );
        if (banError) {
          console.error("Auth ban failed:", banError);
        }
      } else {
        // Unban: restore access
        const { error: unbanError } = await adminClient.auth.admin.updateUserById(
          body.userId,
          { ban_duration: "none" }
        );
        if (unbanError) {
          console.error("Auth unban failed:", unbanError);
        }
      }

      // ── Audit ────────────────────────────────────────────────────
      await writeAuditLog(adminClient, {
        companyId: user.companyId,
        actorId: user.id,
        action: body.active ? "user.reactivate" : "user.deactivate",
        targetType: "profile",
        targetId: body.userId,
        metadata: {
          target_email: target.email,
          reason: body.reason || null,
        },
        req,
      });

      return jsonResponse({
        message: `User ${body.active ? "reactivated" : "deactivated"} successfully`,
        userId: body.userId,
        isActive: body.active,
      });
    },
    { requiredRole: "admin" }
  )
);
