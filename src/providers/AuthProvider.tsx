import React, { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useEmployee } from '@/providers/EmployeeContext';

/**
 * AuthProvider — route guard for the new employee authentication system.
 *
 * States:
 *   1. Context not yet loaded from AsyncStorage → wait (do nothing)
 *   2. No authenticated employee → /(auth)/employee-auth
 *   3. Employee authenticated → /(tabs)
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const segments = useSegments();
  const { employee, isLoaded } = useEmployee();

  useEffect(() => {
    if (!isLoaded) return; // wait for AsyncStorage rehydration

    const inAuthGroup = segments[0] === '(auth)';

    if (!employee) {
      // Not authenticated — send to employee auth screen
      if (!inAuthGroup) router.replace('/(auth)/employee-auth');
      return;
    }

    // Authenticated — send into the main app
    if (inAuthGroup) router.replace('/(tabs)/profile');
  }, [employee, isLoaded, segments]);

  return <>{children}</>;
}
