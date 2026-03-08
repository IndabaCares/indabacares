/**
 * Shared Supabase client factory for Edge Functions.
 *
 * Two client types:
 *   1. User client (anon key + user JWT) — respects RLS
 *   2. Admin client (service_role key) — bypasses RLS for server-side mutations
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * Creates a Supabase client that acts as the authenticated user.
 * All queries go through RLS with the user's JWT claims.
 */
export function createUserClient(req: Request): SupabaseClient {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new AuthError("Missing Authorization header", 401);
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: authHeader },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Creates a Supabase client with service_role privileges.
 * Bypasses RLS — use only in Edge Functions for server-side mutations.
 */
export function createAdminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Structured auth error with HTTP status code.
 */
export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number = 403) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}
