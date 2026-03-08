/**
 * Edge Function: auth-signup
 *
 * Handles two signup flows:
 *   A) Invite-based: User has an invite token → auto-assigns company/role/dept
 *   B) Company creation: New company + super_admin (self-service onboarding)
 *
 * Supports:
 *   - Email + password
 *   - Magic link (passwordless)
 *
 * Rate limited: 5 attempts per email per 15 minutes.
 */

import { createAdminClient } from "../_shared/supabase-client.ts";
import { errorResponse, jsonResponse } from "../_shared/auth-middleware.ts";
import { writeAuditLog } from "../_shared/audit.ts";

interface SignupEmailPassword {
  method: "email_password";
  email: string;
  password: string;
  fullName: string;
  inviteToken?: string;
  // For company-creation flow:
  companyName?: string;
  companySlug?: string;
}

interface SignupMagicLink {
  method: "magic_link";
  email: string;
  fullName: string;
  inviteToken?: string;
  companyName?: string;
  companySlug?: string;
}

type SignupRequest = SignupEmailPassword | SignupMagicLink;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const adminClient = createAdminClient();

  try {
    const body: SignupRequest = await req.json();

    // ── Validation ───────────────────────────────────────────────────
    if (!body.email || !body.fullName) {
      return errorResponse("email and fullName are required");
    }

    const email = body.email.toLowerCase().trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse("Invalid email format");
    }

    if (body.fullName.trim().length < 2) {
      return errorResponse("fullName must be at least 2 characters");
    }

    // ── Rate limiting ────────────────────────────────────────────────
    const { data: withinLimit } = await adminClient.rpc("check_rate_limit", {
      p_identifier: email,
      p_action: "signup",
      p_max_attempts: 5,
      p_window_minutes: 15,
    });

    if (withinLimit === false) {
      return errorResponse("Too many signup attempts. Try again later.", 429);
    }

    await adminClient.rpc("record_rate_limit", {
      p_identifier: email,
      p_action: "signup",
    });

    // ── Resolve company assignment ───────────────────────────────────
    let companyId: string;
    let role: string = "employee";
    let isNewCompany = false;

    if (body.inviteToken) {
      // Path A: Invite-based signup
      // Validate invite (the DB trigger will also validate, but we check here for better errors)
      const { data: invite, error: inviteError } = await adminClient
        .from("invite_tokens")
        .select("*")
        .eq("token", body.inviteToken)
        .eq("email", email)
        .is("claimed_at", null)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (inviteError || !invite) {
        return errorResponse("Invalid or expired invite token", 400);
      }

      companyId = invite.company_id;
      role = invite.role;

    } else if (body.companyName && body.companySlug) {
      // Path B: New company creation
      const slug = body.companySlug.toLowerCase().replace(/[^a-z0-9-]/g, "");

      if (slug.length < 3) {
        return errorResponse("Company slug must be at least 3 characters (alphanumeric and hyphens)");
      }

      // Check slug uniqueness
      const { data: existing } = await adminClient
        .from("companies")
        .select("id")
        .eq("slug", slug)
        .single();

      if (existing) {
        return errorResponse("Company slug is already taken");
      }

      // Create company
      const { data: newCompany, error: companyError } = await adminClient
        .from("companies")
        .insert({ name: body.companyName.trim(), slug })
        .select("id")
        .single();

      if (companyError || !newCompany) {
        return errorResponse("Failed to create company: " + (companyError?.message || "unknown"));
      }

      companyId = newCompany.id;
      role = "super_admin";  // First user of a new company is super_admin
      isNewCompany = true;

    } else {
      return errorResponse("Either inviteToken or (companyName + companySlug) is required");
    }

    // ── Create auth user ─────────────────────────────────────────────
    const userMetadata = {
      full_name: body.fullName.trim(),
      company_id: companyId,
      role,
      invite_token: body.inviteToken || undefined,
    };

    if (body.method === "magic_link") {
      // Magic link: sends email, user clicks to complete
      const { error: magicError } = await adminClient.auth.signInWithOtp({
        email,
        options: {
          data: userMetadata,
          shouldCreateUser: true,
        },
      });

      if (magicError) {
        return errorResponse("Failed to send magic link: " + magicError.message);
      }

      return jsonResponse({
        message: "Magic link sent. Check your email to complete signup.",
        method: "magic_link",
      });

    } else {
      // Email + password
      if (!("password" in body) || body.password.length < 8) {
        return errorResponse("Password must be at least 8 characters");
      }

      const { data: signupData, error: signupError } = await adminClient.auth.admin.createUser({
        email,
        password: body.password,
        email_confirm: true,  // Auto-confirm for admin-created users
        user_metadata: userMetadata,
        app_metadata: {
          company_id: companyId,
          role,
        },
      });

      if (signupError) {
        // Rollback company creation if signup failed
        if (isNewCompany) {
          await adminClient.from("companies").delete().eq("id", companyId);
        }
        return errorResponse("Signup failed: " + signupError.message);
      }

      // Audit log
      await writeAuditLog(adminClient, {
        companyId,
        actorId: signupData.user.id,
        action: isNewCompany ? "company.create" : "user.signup",
        targetType: isNewCompany ? "company" : "profile",
        targetId: isNewCompany ? companyId : signupData.user.id,
        metadata: {
          email,
          role,
          method: "email_password",
          invite_based: !!body.inviteToken,
        },
        req,
      });

      return jsonResponse({
        message: "Account created successfully",
        userId: signupData.user.id,
        companyId,
        role,
      }, 201);
    }
  } catch (err) {
    console.error("Signup error:", err);
    return errorResponse("Internal server error", 500);
  }
});
