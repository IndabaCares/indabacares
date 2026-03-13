/**
 * Supabase client — hotel-session-aware.
 *
 * Every request includes x-session-token when a session is active.
 * PostgREST exposes this header via current_setting('request.headers'),
 * which current_employee_hotel() reads to enforce hotel-level RLS.
 *
 * Call setSessionToken(token) after login and setSessionToken(null) on logout.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl     = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// ─── Session token store ──────────────────────────────────────────────────────
//
// Mutated by setSessionToken() — no client recreation needed.

const _sessionHeaders: Record<string, string> = {};

export function setSessionToken(token: string | null): void {
  if (token) {
    _sessionHeaders['x-session-token'] = token;
  } else {
    delete _sessionHeaders['x-session-token'];
  }
}

export function getSessionToken(): string | null {
  return _sessionHeaders['x-session-token'] ?? null;
}

// ─── Custom fetch adapter ─────────────────────────────────────────────────────
//
// Injects the x-session-token header into every HTTP request.
// The header is read server-side by current_employee_hotel(), which
// drives all hotel-isolation RLS policies.

function hotelAwareFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers ?? {});
  const token = _sessionHeaders['x-session-token'];
  if (token) {
    headers.set('x-session-token', token);
  }
  return fetch(input, { ...init, headers });
}

// ─── Supabase client ──────────────────────────────────────────────────────────
//
// auth is disabled: the app uses custom employee authentication.
// Sessions are managed via employee_active_sessions + x-session-token header.

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken:   false,
    persistSession:     false,
    detectSessionInUrl: false,
  },
  global: {
    fetch: hotelAwareFetch,
  },
});
