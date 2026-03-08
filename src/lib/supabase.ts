/**
 * Supabase client — hotel-session-aware.
 *
 * Every request includes x-session-token when a session is active.
 * PostgREST exposes this header via current_setting('request.headers'),
 * which current_employee_hotel() reads to enforce hotel-level RLS.
 *
 * Call setSessionToken(token) after login and setSessionToken(null) on logout.
 * The custom fetch adapter injects the header into every network request
 * without needing to recreate the client.
 */

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';
import type { Database } from '@/types/database';

const supabaseUrl    = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// ─── Session token store ──────────────────────────────────────────────────────
//
// A mutable object read by the custom fetch adapter on every request.
// Mutated by setSessionToken() — no client recreation needed.

const _sessionHeaders: Record<string, string> = {};

/**
 * Set or clear the active session token.
 * Call after login (with token) and after logout (with null).
 */
export function setSessionToken(token: string | null): void {
  if (token) {
    _sessionHeaders['x-session-token'] = token;
  } else {
    delete _sessionHeaders['x-session-token'];
  }
}

/**
 * Returns the current session token, or null if not set.
 */
export function getSessionToken(): string | null {
  return _sessionHeaders['x-session-token'] ?? null;
}

// ─── SecureStore adapter (for Supabase Auth token storage) ───────────────────

const SecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      }
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch { /* ignore */ }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch { /* ignore */ }
  },
};

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

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage:          SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession:   true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: hotelAwareFetch,
  },
});

// ─── App state — pause/resume auto-refresh ────────────────────────────────────

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
