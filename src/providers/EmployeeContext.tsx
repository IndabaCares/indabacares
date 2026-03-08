/**
 * EmployeeContext
 *
 * Provides the authenticated employee record to the entire tree.
 *
 * Boot sequence (on mount):
 *   1. Read AsyncStorage via EmployeeSessionManager  → fast (~5 ms)
 *   2. Set employee state + mark isLoaded = true     → routing unblocks
 *   3. If session existed, validate against Supabase in the background
 *   4. If employee is now inactive → clear session → AuthProvider redirects
 *
 * This keeps cold-start feel instant and still enforces server-side
 * status changes every time the app is opened.
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
  /** Persist and activate a new employee session. */
  setEmployee: (employee: AuthenticatedEmployee) => Promise<void>;
  /**
   * Clear session and log the employee out.
   * AuthProvider's useEffect will redirect to /(auth)/employee-auth
   * which opens in Returning Login mode by default.
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
      // Step 1 — fast local read
      const session = await loadSession();

      if (cancelled) return;

      if (session) {
        // Step 2 — optimistically trust the stored session
        setEmployeeState(session);
      }

      // Step 3 — unblock routing immediately (session or not)
      setIsLoaded(true);

      if (!session) return;

      // Step 4 — background DB validation (does not block the UI)
      const valid = await validateSessionWithDB(session);

      if (cancelled) return;

      if (!valid) {
        // Employee is inactive — evict session silently
        setEmployeeState(null);
        await clearSession();
      }
    }

    boot().catch(() => {
      // Any unexpected error → treat as no session
      if (!cancelled) setIsLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // ── setEmployee ───────────────────────────────────────────────────────────

  const setEmployee = useCallback(async (emp: AuthenticatedEmployee) => {
    setEmployeeState(emp);
    await saveSession(emp);
  }, []);

  // ── clearEmployee (logout) ────────────────────────────────────────────────

  const clearEmployee = useCallback(async () => {
    setEmployeeState(null);
    await clearSession();
    // AuthProvider detects employee === null and redirects to
    // /(auth)/employee-auth, which defaults to 'returning' mode.
  }, []);

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
