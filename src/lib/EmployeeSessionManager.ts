/**
 * EmployeeSessionManager
 *
 * Single source of truth for employee session persistence.
 *
 * Responsibilities:
 *   - Read / write / clear the AsyncStorage session record
 *   - Validate the stored session against the database on every app launch
 *   - Provide a typed logout helper
 *
 * Boot strategy — optimistic + background validation:
 *   1. Read AsyncStorage (fast, ~5 ms)  → unblock routing immediately
 *   2. If session found, validate against Supabase in the background
 *   3. If the employee is now inactive, evict the session silently
 *
 * This keeps cold-start feel instant while still enforcing server-side
 * status changes (e.g. HR deactivates an account).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmployeeSession {
  employee_id:   string;
  full_name:     string;
  employee_code: string;
  hotel:         string;
}

// ─── Storage key ──────────────────────────────────────────────────────────────

const SESSION_KEY = '@indabacares/employee';

// ─── saveSession ──────────────────────────────────────────────────────────────

/**
 * Persist an employee session to AsyncStorage.
 * Called immediately after a successful login or first authentication.
 */
export async function saveSession(session: EmployeeSession): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

// ─── loadSession ──────────────────────────────────────────────────────────────

/**
 * Read the stored session from AsyncStorage.
 * Returns null if no session exists or the stored value is corrupt.
 */
export async function loadSession(): Promise<EmployeeSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EmployeeSession;
  } catch {
    // Corrupt storage — treat as no session
    await AsyncStorage.removeItem(SESSION_KEY).catch(() => null);
    return null;
  }
}

// ─── clearSession ─────────────────────────────────────────────────────────────

/**
 * Remove the employee session from AsyncStorage.
 * Safe to call even when no session exists.
 */
export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

// ─── validateSessionWithDB ────────────────────────────────────────────────────

/**
 * Background validation — confirms the employee is still active in Supabase.
 *
 * Queries by employee_id only (primary key → fastest path).
 * Returns false if:
 *   - The row no longer exists
 *   - employee.status is not 'active'
 *   - Any network / DB error (fail-open: keeps session on error to support offline use)
 *
 * Callers should treat a false result as "force logout".
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

    if (error || !data) return false;
    return (data as { id: string; status: string }).status === 'active';
  } catch {
    // Network unavailable — keep session (offline-friendly)
    return true;
  }
}

// ─── logout ───────────────────────────────────────────────────────────────────

/**
 * Full logout:
 *   1. Remove session from AsyncStorage
 *   2. Call the context's clearEmployee callback so React state is wiped
 *
 * AuthProvider's useEffect will detect employee === null and redirect
 * automatically to /(auth)/employee-auth (which defaults to 'returning' mode).
 */
export async function logout(clearEmployee: () => Promise<void>): Promise<void> {
  await clearSession();
  await clearEmployee();
}
