/**
 * EmployeeSessionManager
 *
 * Manages two layers of session state:
 *
 *   1. AsyncStorage — persists { employee_id, full_name, employee_code, hotel,
 *      session_token } across app restarts.
 *
 *   2. x-session-token header — injected into every Supabase request so that
 *      current_employee_hotel() (server-side RLS) can identify the employee.
 *
 * Session tokens are created by the auth RPCs (authenticate_employee /
 * first_time_authenticate) and returned directly — there is no separate
 * create_employee_session call.
 *
 * Boot sequence (handled by EmployeeProvider):
 *   a. loadSession()               → restore employee + token from AsyncStorage
 *   b. setSessionToken(token)      → inject header into Supabase client
 *   c. validateSessionWithDB()     → confirm employee still active in DB
 *   d. If invalid → clearSession() → wipe both AsyncStorage and header
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, setSessionToken } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmployeeSession {
  employee_id:   string;
  full_name:     string;
  employee_code: string;
  hotel:         string;
  department:    string | null;
  session_token: string;   // UUID returned by the auth RPC
}

// ─── Keys ─────────────────────────────────────────────────────────────────────

const SESSION_KEY = '@indabacares/employee';

// ─── saveSession ──────────────────────────────────────────────────────────────
//
// Persists the session to AsyncStorage and activates the token header.
// Called immediately after a successful auth RPC response.

export async function saveSession(session: EmployeeSession): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  setSessionToken(session.session_token);
}

// ─── loadSession ─────────────────────────────────────────────────────────────
//
// Restores a persisted session from AsyncStorage.
// Also activates the stored token in the Supabase client.
// Returns null if no session is stored or the stored value is corrupt.

export async function loadSession(): Promise<EmployeeSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw) as EmployeeSession;

    if (session.session_token) {
      setSessionToken(session.session_token);
    }

    return session;
  } catch {
    await AsyncStorage.removeItem(SESSION_KEY).catch(() => null);
    return null;
  }
}

// ─── clearSession ─────────────────────────────────────────────────────────────
//
// Full logout:
//   1. Revokes the server-side session row (token immediately invalidated).
//   2. Removes the session from AsyncStorage.
//   3. Clears the token from the Supabase client.

export async function clearSession(token?: string): Promise<void> {
  if (token) {
    try {
      await supabase.rpc('revoke_employee_session', { p_token: token });
    } catch {
      // best-effort revocation — proceed with local logout regardless
    }
  }

  try { await AsyncStorage.removeItem(SESSION_KEY); } catch {}
  setSessionToken(null);
}

// ─── validateSessionWithDB ────────────────────────────────────────────────────
//
// Background validation on every app launch.
// Confirms the employee is still active AND the session token is still valid.
//
// Fail-open on network error (offline-friendly): returns true so the cached
// session is kept when there is no connectivity.

export async function validateSessionWithDB(
  session: EmployeeSession,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('validate_session', {
      p_session_token: session.session_token,
    });

    if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
      return true; // fail-open when offline
    }

    if (error || !data) return false;

    return (data as { ok: boolean }).ok === true;
  } catch {
    return true; // fail-open on unexpected errors
  }
}
