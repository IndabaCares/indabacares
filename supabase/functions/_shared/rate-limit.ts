/**
 * Shared rate limiting helper for Edge Functions.
 *
 * Uses the auth_rate_limits table + check_rate_limit()/record_rate_limit()
 * Postgres functions for atomic, distributed rate limiting.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { errorResponse } from "./auth-middleware.ts";

interface RateLimitConfig {
  /** Unique identifier (usually user.id, or email for auth flows) */
  identifier: string;
  /** Action name (e.g., 'send_recognition', 'redeem') */
  action: string;
  /** Maximum attempts within the window */
  maxAttempts: number;
  /** Window size in minutes */
  windowMinutes: number;
}

/**
 * Check rate limit and record the attempt.
 * Returns null if within limit, or an error Response if exceeded.
 */
export async function enforceRateLimit(
  adminClient: SupabaseClient,
  config: RateLimitConfig
): Promise<Response | null> {
  const { data: withinLimit } = await adminClient.rpc("check_rate_limit", {
    p_identifier: config.identifier,
    p_action: config.action,
    p_max_attempts: config.maxAttempts,
    p_window_minutes: config.windowMinutes,
  });

  if (withinLimit === false) {
    return errorResponse("Too many requests. Please try again later.", 429);
  }

  await adminClient.rpc("record_rate_limit", {
    p_identifier: config.identifier,
    p_action: config.action,
  });

  return null;
}
