import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthenticatedEmployee {
  employee_id:   string;
  full_name:     string;
  employee_code: string;
  hotel:         string;
}

interface EmployeeContextValue {
  /** The authenticated employee, or null if not authenticated. */
  employee:    AuthenticatedEmployee | null;
  /** True once the persisted value has been read from AsyncStorage. */
  isLoaded:    boolean;
  /** Store the authenticated employee (also persists to AsyncStorage). */
  setEmployee: (employee: AuthenticatedEmployee | null) => Promise<void>;
  /** Clear the employee session (logout). */
  clearEmployee: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = '@indabacares/employee';

const EmployeeContext = createContext<EmployeeContextValue>({
  employee:     null,
  isLoaded:     false,
  setEmployee:  async () => {},
  clearEmployee: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function EmployeeProvider({ children }: { children: ReactNode }) {
  const [employee, setEmployeeState] = useState<AuthenticatedEmployee | null>(null);
  const [isLoaded, setIsLoaded]      = useState(false);

  // Rehydrate from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          setEmployeeState(JSON.parse(stored));
        }
      })
      .catch(() => {
        // Ignore read errors — treat as no employee
      })
      .finally(() => {
        setIsLoaded(true);
      });
  }, []);

  const setEmployee = useCallback(async (emp: AuthenticatedEmployee | null) => {
    setEmployeeState(emp);
    if (emp) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(emp));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const clearEmployee = useCallback(async () => {
    setEmployeeState(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
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
