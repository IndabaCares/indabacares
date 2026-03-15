/**
 * EmployeeContext
 *
 * Provides the authenticated employee record to the entire React tree.
 *
 * Session token lifecycle:
 *   Login  → setEmployee() receives token from auth RPC → saveSession()
 *   Boot   → loadSession() restores token from AsyncStorage + reactivates header
 *   Verify → validateSessionWithDB() confirms employee is still active
 *   Logout → clearSession() revokes server-side row + clears header
 *
 * The x-session-token header is injected into every Supabase request by the
 * custom fetch adapter in src/lib/supabase.ts.  PostgreSQL RLS policies read
 * it via current_employee_hotel() to enforce hotel-level tenant isolation.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  saveSession,
  loadSession,
  clearSession,
  validateSessionWithDB,
  type EmployeeSession,
} from '@/lib/EmployeeSessionManager';
import { registerSessionExpiredHandler } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthenticatedEmployee = EmployeeSession;

interface EmployeeContextValue {
  /** The authenticated employee, or null when logged out. */
  employee: AuthenticatedEmployee | null;
  /**
   * True once the AsyncStorage read has completed.
   * AuthProvider waits for this before routing.
   */
  isLoaded: boolean;
  /**
   * Login: persists session and activates the x-session-token header.
   * Receives the full session including the token returned by the auth RPC.
   */
  setEmployee: (identity: AuthenticatedEmployee) => Promise<void>;
  /**
   * Logout: revokes the server-side session, clears AsyncStorage, and
   * removes the header.
   */
  clearEmployee: () => Promise<void>;
}

// ─── Context default ──────────────────────────────────────────────────────────

const EmployeeContext = createContext<EmployeeContextValue>({
  employee:      null,
  isLoaded:      false,
  setEmployee:   async () => {},
  clearEmployee: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function EmployeeProvider({ children }: { children: ReactNode }) {
  const [employee, setEmployeeState] = useState<AuthenticatedEmployee | null>(null);
  const [isLoaded, setIsLoaded]      = useState(false);

  // ── Boot sequence ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const session = await loadSession();

      if (cancelled) return;

      if (session) {
        setEmployeeState(session);
      }

      setIsLoaded(true);

      if (!session) return;

      const valid = await validateSessionWithDB(session);

      if (cancelled) return;

      if (!valid) {
        setEmployeeState(null);
        await clearSession(session.session_token);
      }
    }

    boot().catch(() => {
      if (!cancelled) setIsLoaded(true);
    });

    return () => { cancelled = true; };
  }, []);

  // ── setEmployee — called after successful authentication ──────────────────
  //
  // The token comes directly from the auth RPC response.
  // No separate create_employee_session call needed.

  const setEmployee = useCallback(async (identity: AuthenticatedEmployee) => {
    await saveSession(identity);
    setEmployeeState(identity);
  }, []);

  // ── clearEmployee — logout ────────────────────────────────────────────────

  const clearEmployee = useCallback(async () => {
    const token = employee?.session_token;
    setEmployeeState(null);
    await clearSession(token);
  }, [employee]);

  // ── Register auto-logout on session expiry ────────────────────────────────

  useEffect(() => {
    registerSessionExpiredHandler(() => {
      clearEmployee();
    });
  }, [clearEmployee]);

  return (
    <EmployeeContext.Provider value={{ employee, isLoaded, setEmployee, clearEmployee }}>
      {children}
    </EmployeeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useEmployee() {
  return useContext(EmployeeContext);
}
