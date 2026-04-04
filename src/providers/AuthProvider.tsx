import React, { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useEmployee } from '@/providers/EmployeeContext';

/**
 * AuthProvider — route guard for the employee authentication system.
 *
 * States:
 *   1. Context not yet loaded from SecureStore → wait (do nothing)
 *   2. No authenticated employee → /(auth)/employee-auth
 *   3. Employee authenticated → /(tabs)
 *
 * Note: the notification permission screen (/(screens)/notification-permission)
 * is navigated to explicitly after first login in employee-auth.tsx.
 * AuthProvider does not intercept that route.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const segments = useSegments();
  const { employee, isLoaded } = useEmployee();

  useEffect(() => {
    if (!isLoaded) return; // wait for SecureStore rehydration

    const inAuthGroup    = segments[0] === '(auth)';
    const inScreensGroup = segments[0] === '(screens)';
    // Allow authenticated employees to stay on the notification-permission screen
    const onNotifScreen  = inScreensGroup && (segments[1] as string) === 'notification-permission';

    if (!employee) {
      if (!inAuthGroup) router.replace('/(auth)/employee-auth');
      return;
    }

    // Authenticated — do not redirect if on the notification-permission screen
    if (inAuthGroup && !onNotifScreen) router.replace('/(tabs)/profile');
  }, [employee, isLoaded, segments]);

  return <>{children}</>;
}
