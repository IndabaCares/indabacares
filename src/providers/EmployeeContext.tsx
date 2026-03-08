/**
 * EmployeeContext
 *
 * Provides the authenticated employee record to the entire React tree.
 *
 * Session token lifecycle:
 *   Login  → createSession() creates a Supabase session row + persists token
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
  createSession,
  loadSession,
  clearSession,
  validateSessionWithDB,
  type EmployeeSession,
} from '@/lib/EmployeeSessionManager';

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
   * Login: creates a server-side session, persists it, and activates the
   * x-session-token header on the Supabase client.
   */
  setEmployee: (
    identity: Omit<AuthenticatedEmployee, 'session_token'>
  ) => Promise<void>;
  /**
   * Logout: revokes the server-side session, clears AsyncStorage, and
   * removes the header.  AuthProvider redirects to /(auth)/employee-auth.
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
      // Step 1 — fast local read (~5 ms); also reactivates x-session-token header
      const session = await loadSession();

      if (cancelled) return;

      if (session) {
        // Step 2 — optimistically trust the stored session
        setEmployeeState(session);
      }

      // Step 3 — unblock routing immediately
      setIsLoaded(true);

      if (!session) return;

      // Step 4 — background DB validation
      const valid = await validateSessionWithDB(session);

      if (cancelled) return;

      if (!valid) {
        // Employee inactive or token expired — evict session
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

  const setEmployee = useCallback(
    async (identity: Omit<AuthenticatedEmployee, 'session_token'>) => {
      // createSession: makes server-side row, persists to AsyncStorage,
      // and activates the token in the Supabase fetch adapter
      const session = await createSession(
        identity.employee_id,
        identity.full_name,
        identity.employee_code,
        identity.hotel,
      );
      setEmployeeState(session);
    },
    [],
  );

  // ── clearEmployee — logout ────────────────────────────────────────────────

  const clearEmployee = useCallback(async () => {
    const token = employee?.session_token;
    setEmployeeState(null);
    // clearSession: revokes server-side row, removes AsyncStorage, clears header
    await clearSession(token);
  }, [employee]);

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
