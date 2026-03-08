/**
 * EmployeeSessionManager
 *
 * Manages two layers of session state:
 *
 *   1. AsyncStorage — persists { employee_id, full_name, employee_code, hotel }
 *      across app restarts. Read on boot; written on login; cleared on logout.
 *
 *   2. Supabase session token — a UUID created by create_employee_session() RPC,
 *      sent as x-session-token on every Supabase request.  This is the key that
 *      current_employee_hotel() reads server-side to enforce hotel RLS policies.
 *      Also persisted in AsyncStorage so it survives app restarts.
 *
 * Boot sequence (handled by EmployeeProvider):
 *   a. loadSession()                    → restore employee + token from AsyncStorage
 *   b. setSessionToken(token)           → inject header into Supabase client
 *   c. validateSessionWithDB(session)   → confirm employee still active in DB
 *   d. If invalid → clearSession()      → wipe both AsyncStorage and header
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, setSessionToken } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmployeeSession {
  employee_id:   string;
  full_name:     string;
  employee_code: string;
  hotel:         string;
  session_token: string;   // Supabase RLS session token (UUID)
}

// ─── Keys ─────────────────────────────────────────────────────────────────────

const SESSION_KEY = '@indabacares/employee';

// ─── createSession ────────────────────────────────────────────────────────────

/**
 * Called immediately after a successful login.
 *   1. Creates a server-side session row (returns UUID token).
 *   2. Persists the full session to AsyncStorage.
 *   3. Activates the token in the Supabase client fetch adapter.
 *
 * Returns the complete EmployeeSession or throws on error.
 */
export async function createSession(
  employee_id:   string,
  full_name:     string,
  employee_code: string,
  hotel:         string,
): Promise<EmployeeSession> {
  // Create server-side session row
  const { data, error } = await supabase.rpc('create_employee_session', {
    p_employee_id: employee_id,
    p_hotel:       hotel,
  });

  if (error) throw new Error(error.message || 'Failed to create session.');
  if (!data?.ok) throw new Error(data?.error || 'Failed to create session.');

  const session: EmployeeSession = {
    employee_id,
    full_name,
    employee_code,
    hotel,
    session_token: data.token as string,
  };

  // Persist and activate
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  setSessionToken(session.session_token);

  return session;
}

// ─── loadSession ─────────────────────────────────────────────────────────────

/**
 * Restores a persisted session from AsyncStorage.
 * Also activates the stored token in the Supabase client.
 * Returns null if no session is stored or the stored value is corrupt.
 */
export async function loadSession(): Promise<EmployeeSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw) as EmployeeSession;

    // Reactivate the token so subsequent requests are authenticated
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

/**
 * Full logout:
 *   1. Revokes the server-side session row (token immediately invalidated).
 *   2. Removes the session from AsyncStorage.
 *   3. Clears the token from the Supabase client.
 */
export async function clearSession(token?: string): Promise<void> {
  // Revoke server-side session (best-effort — don't block logout on failure)
  if (token) {
    await supabase
      .rpc('revoke_employee_session', { p_token: token })
      .catch(() => null);
  }

  await AsyncStorage.removeItem(SESSION_KEY).catch(() => null);
  setSessionToken(null);
}

// ─── validateSessionWithDB ────────────────────────────────────────────────────

/**
 * Background validation on every app launch.
 * Confirms the employee is still active AND the session token is still valid.
 *
 * Fail-open on network error (offline-friendly): returns true so the cached
 * session is kept when there is no connectivity.
 *
 * Returns false when:
 *   - employee.status is not 'active'
 *   - The session token has expired or been revoked
 *   - DB returns an error that is not a network error
 */
export async function validateSessionWithDB(
  session: EmployeeSession,
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('id, status')
      .eq('id', session.employee_id)
      .single();

    // Offline / unreachable — keep session
    if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
      return true;
    }

    if (error || !data) return false;

    return (data as { id: string; status: string }).status === 'active';
  } catch {
    // Network unavailable — keep session
    return true;
  }
}

// ─── logout ───────────────────────────────────────────────────────────────────

/**
 * Convenience wrapper: clear session + call EmployeeContext's clearEmployee.
 * AuthProvider detects employee === null and redirects to /(auth)/employee-auth.
 */
export async function logout(
  session: EmployeeSession | null,
  clearEmployee: () => Promise<void>,
): Promise<void> {
  await clearSession(session?.session_token);
  await clearEmployee();
}
