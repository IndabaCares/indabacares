/**
 * Auth middleware for Edge Functions.
 *
 * Provides:
 *   - JWT validation and user extraction
 *   - Role-based access control (RBAC)
 *   - Tenant isolation verification
 *   - Account status enforcement
 *   - CORS handling
 *   - Standardized error responses
 */

import { createUserClient, createAdminClient, AuthError } from "./supabase-client.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AppRole = "employee" | "manager" | "admin" | "super_admin";

export interface AuthenticatedUser {
  id: string;
  email: string;
  companyId: string;
  role: AppRole;
}

export interface AuthContext {
  user: AuthenticatedUser;
  userClient: SupabaseClient;   // RLS-scoped to this user
  adminClient: SupabaseClient;  // service_role for server-side writes
}

interface HandlerOptions {
  /** Minimum role required. Defaults to 'employee' (any authenticated user). */
  requiredRole?: AppRole;
  /** Allow unauthenticated access (for public endpoints like signup). */
  allowAnonymous?: boolean;
}

// ─── Role Hierarchy ──────────────────────────────────────────────────────────

const ROLE_LEVEL: Record<AppRole, number> = {
  employee: 0,
  manager: 1,
  admin: 2,
  super_admin: 3,
};

export function hasMinimumRole(userRole: AppRole, requiredRole: AppRole): boolean {
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[requiredRole];
}

// ─── CORS ────────────────────────────────────────────────────────────────────

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

function corsResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// ─── Error Response ──────────────────────────────────────────────────────────

export function errorResponse(message: string, status: number = 400): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    }
  );
}

export function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    }
  );
}

// ─── Core Middleware ─────────────────────────────────────────────────────────

/**
 * Wraps an Edge Function handler with authentication, authorization,
 * CORS handling, and error handling.
 *
 * Usage:
 *   Deno.serve(withAuth(async (req, ctx) => {
 *     const { user, adminClient } = ctx;
 *     // ... business logic ...
 *     return jsonResponse({ ok: true });
 *   }, { requiredRole: 'admin' }));
 */
export function withAuth(
  handler: (req: Request, ctx: AuthContext) => Promise<Response>,
  options: HandlerOptions = {}
): (req: Request) => Promise<Response> {
  const { requiredRole = "employee", allowAnonymous = false } = options;

  return async (req: Request): Promise<Response> => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return corsResponse();
    }

    try {
      // ── 1. Extract and validate JWT ──────────────────────────────────
      const authHeader = req.headers.get("Authorization");

      if (!authHeader && !allowAnonymous) {
        return errorResponse("Missing Authorization header", 401);
      }

      if (!authHeader && allowAnonymous) {
        // Anonymous path: only adminClient is available
        const adminClient = createAdminClient();
        const ctx: AuthContext = {
          user: { id: "", email: "", companyId: "", role: "employee" },
          userClient: adminClient,
          adminClient,
        };
        return await handler(req, ctx);
      }

      // ── 2. Get user from JWT ─────────────────────────────────────────
      const userClient = createUserClient(req);
      const { data: { user: supabaseUser }, error: authError } =
        await userClient.auth.getUser();

      if (authError || !supabaseUser) {
        return errorResponse("Invalid or expired token", 401);
      }

      // ── 3. Extract claims from app_metadata ──────────────────────────
      const appMeta = supabaseUser.app_metadata || {};
      const companyId = appMeta.company_id as string;
      const role = (appMeta.role as AppRole) || "employee";

      if (!companyId) {
        return errorResponse("User has no company assignment. Contact your administrator.", 403);
      }

      // ── 4. Check role authorization ──────────────────────────────────
      if (!hasMinimumRole(role, requiredRole)) {
        return errorResponse(
          `Insufficient permissions. Required: ${requiredRole}, current: ${role}`,
          403
        );
      }

      // ── 5. Verify account is active ──────────────────────────────────
      const adminClient = createAdminClient();
      const { data: profile, error: profileError } = await adminClient
        .from("profiles")
        .select("is_active")
        .eq("id", supabaseUser.id)
        .single();

      if (profileError || !profile) {
        return errorResponse("Profile not found", 404);
      }

      if (!profile.is_active) {
        return errorResponse("Account is deactivated. Contact your administrator.", 403);
      }

      // ── 6. Build context and call handler ────────────────────────────
      const user: AuthenticatedUser = {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        companyId,
        role,
      };

      const ctx: AuthContext = { user, userClient, adminClient };

      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof AuthError) {
        return errorResponse(err.message, err.status);
      }
      console.error("Unhandled error:", err);
      return errorResponse("Internal server error", 500);
    }
  };
}
