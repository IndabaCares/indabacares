/**
 * Edge Function: auth-update-role
 *
 * Admins change a user's role within their company.
 * Updates both profiles.role AND auth.users.app_metadata so the JWT
 * carries the new role on next token refresh.
 *
 * Required role: admin
 *
 * Guardrails:
 *   - Cannot change own role
 *   - Cannot promote to super_admin (only existing super_admins can)
 *   - Cannot modify users outside own company
 *   - Cannot demote the last super_admin
 */

import {
  withAuth,
  jsonResponse,
  errorResponse,
  type AuthContext,
  type AppRole,
} from "../_shared/auth-middleware.ts";
import { writeAuditLog } from "../_shared/audit.ts";

interface UpdateRoleRequest {
  userId: string;
  newRole: AppRole;
}

Deno.serve(
  withAuth(
    async (req: Request, ctx: AuthContext): Promise<Response> => {
      if (req.method !== "POST") {
        return errorResponse("Method not allowed", 405);
      }

      const { user, adminClient } = ctx;
      const body: UpdateRoleRequest = await req.json();

      // ── Validation ───────────────────────────────────────────────
      if (!body.userId || !body.newRole) {
        return errorResponse("userId and newRole are required");
      }

      const validRoles: AppRole[] = ["employee", "manager", "admin", "super_admin"];
      if (!validRoles.includes(body.newRole)) {
        return errorResponse("Invalid role: " + body.newRole);
      }

      // Cannot change own role
      if (body.userId === user.id) {
        return errorResponse("Cannot change your own role. Ask another admin.");
      }

      // Only super_admin can promote to super_admin
      if (body.newRole === "super_admin" && user.role !== "super_admin") {
        return errorResponse("Only super_admins can promote to super_admin");
      }

      // ── Fetch target user ────────────────────────────────────────
      const { data: target, error: targetError } = await adminClient
        .from("profiles")
        .select("id, company_id, role, email, full_name")
        .eq("id", body.userId)
        .single();

      if (targetError || !target) {
        return errorResponse("User not found", 404);
      }

      // Must be same company
      if (target.company_id !== user.companyId) {
        return errorResponse("Cannot modify users outside your company", 403);
      }

      // Cannot demote if they are the last super_admin
      if (target.role === "super_admin" && body.newRole !== "super_admin") {
        const { count } = await adminClient
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("company_id", user.companyId)
          .eq("role", "super_admin")
          .eq("is_active", true);

        if ((count || 0) <= 1) {
          return errorResponse(
            "Cannot demote the last super_admin. Promote another user first."
          );
        }
      }

      // No-op if already that role
      if (target.role === body.newRole) {
        return jsonResponse({ message: "User already has this role", userId: body.userId });
      }

      // ── Update profile (triggers sync_role_to_jwt) ───────────────
      const { error: updateError } = await adminClient
        .from("profiles")
        .update({ role: body.newRole })
        .eq("id", body.userId);

      if (updateError) {
        return errorResponse("Failed to update role: " + updateError.message);
      }

      // Also update auth.users.app_metadata directly for immediate effect
      // (the DB trigger handles this too, but we double-ensure via admin API)
      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(
        body.userId,
        {
          app_metadata: {
            role: body.newRole,
          },
        }
      );

      if (authUpdateError) {
        console.error("Auth metadata update failed (DB trigger is backup):", authUpdateError);
      }

      // ── Audit ────────────────────────────────────────────────────
      await writeAuditLog(adminClient, {
        companyId: user.companyId,
        actorId: user.id,
        action: "user.role_change",
        targetType: "profile",
        targetId: body.userId,
        metadata: {
          previous_role: target.role,
          new_role: body.newRole,
          target_email: target.email,
        },
        req,
      });

      return jsonResponse({
        message: `Role updated: ${target.role} → ${body.newRole}`,
        userId: body.userId,
        previousRole: target.role,
        newRole: body.newRole,
      });
    },
    { requiredRole: "admin" }
  )
);
