/**
 * Edge Function: auth-invite
 *
 * Admins invite new users to their company.
 * Creates an invite token and (optionally) sends an email.
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
import { enforceRateLimit } from "../_shared/rate-limit.ts";

interface InviteRequest {
  email: string;
  role?: "employee" | "manager" | "admin";
  fullName?: string;
  departmentId?: string;
  managerId?: string;
}

interface BulkInviteRequest {
  invites: InviteRequest[];
}

Deno.serve(
  withAuth(
    async (req: Request, ctx: AuthContext): Promise<Response> => {
      if (req.method !== "POST") {
        return errorResponse("Method not allowed", 405);
      }

      const { user, adminClient } = ctx;

      // ── Rate limit: max 100 invites per admin per hour ──────
      const rateLimited = await enforceRateLimit(adminClient, {
        identifier: user.id,
        action: "invite",
        maxAttempts: 100,
        windowMinutes: 60,
      });
      if (rateLimited) return rateLimited;

      const body = await req.json();

      // Support both single and bulk invites
      const invites: InviteRequest[] = body.invites || [body];

      if (invites.length === 0) {
        return errorResponse("At least one invite is required");
      }

      if (invites.length > 50) {
        return errorResponse("Maximum 50 invites per request");
      }

      const results: Array<{ email: string; status: string; token?: string }> = [];

      for (const invite of invites) {
        const email = invite.email?.toLowerCase().trim();

        // Validate email
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          results.push({ email: email || "invalid", status: "invalid_email" });
          continue;
        }

        // Validate role (admins cannot invite super_admins)
        const role = invite.role || "employee";
        if (!["employee", "manager", "admin"].includes(role)) {
          results.push({ email, status: "invalid_role" });
          continue;
        }

        // Non-super_admins cannot invite admins
        if (role === "admin" && user.role !== "super_admin") {
          results.push({ email, status: "insufficient_permissions" });
          continue;
        }

        // Check if user already exists in this company
        const { data: existingProfile } = await adminClient
          .from("profiles")
          .select("id")
          .eq("company_id", user.companyId)
          .eq("email", email)
          .single();

        if (existingProfile) {
          results.push({ email, status: "already_exists" });
          continue;
        }

        // Check for existing unclaimed invite
        const { data: existingInvite } = await adminClient
          .from("invite_tokens")
          .select("id")
          .eq("company_id", user.companyId)
          .eq("email", email)
          .is("claimed_at", null)
          .gt("expires_at", new Date().toISOString())
          .single();

        if (existingInvite) {
          results.push({ email, status: "already_invited" });
          continue;
        }

        // Create invite token
        const { data: token, error: tokenError } = await adminClient
          .from("invite_tokens")
          .insert({
            company_id: user.companyId,
            email,
            role,
            department_id: invite.departmentId || null,
            manager_id: invite.managerId || null,
            invited_by: user.id,
          })
          .select("token")
          .single();

        if (tokenError || !token) {
          results.push({ email, status: "error", });
          continue;
        }

        // Audit
        await writeAuditLog(adminClient, {
          companyId: user.companyId,
          actorId: user.id,
          action: "user.invite",
          targetType: "invite",
          targetId: undefined,
          metadata: { email, role, department_id: invite.departmentId },
          req,
        });

        results.push({ email, status: "invited", token: token.token });

        // ── Email sending would go here ──────────────────────────────
        // In production, call your email provider (Resend, SendGrid, etc.)
        // with a template containing the signup link:
        //   ${APP_URL}/signup?token=${token.token}&email=${email}
        //
        // Example with Resend:
        // await resend.emails.send({
        //   from: 'IndabaCares <noreply@indabacares.com>',
        //   to: email,
        //   subject: `${user.email} invited you to IndabaCares`,
        //   html: renderInviteEmail({ inviterName: user.email, token: token.token, email }),
        // });
      }

      return jsonResponse({
        total: invites.length,
        invited: results.filter((r) => r.status === "invited").length,
        results,
      });
    },
    { requiredRole: "admin" }
  )
);
