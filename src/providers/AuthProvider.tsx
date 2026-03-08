import React, { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { useMe } from '@/hooks/use-me';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const session = useAuthStore((s) => s.session);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const setSession = useAuthStore((s) => s.setSession);
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const logout = useAuthStore((s) => s.logout);

  // Bootstrap: fetch user context whenever session is valid
  const { isError, error } = useMe();

  // Listen for auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setHydrated(true);
    }).catch((err) => {
      console.error('Failed to get session:', err);
      setHydrated(true);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!session) {
          logout();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Handle deactivated account (auth-me returns 403)
  useEffect(() => {
    if (isError && error) {
      const status = (error as any)?.status;
      if (status === 403) {
        supabase.auth.signOut();
      }
    }
  }, [isError, error]);

  // Route guard — three exclusive states:
  //
  //   1. No session
  //      → (auth) group: login, signup, forgot-password
  //
  //   2. Session exists but company_id absent from JWT
  //      → (onboarding) group: employee-code → confirm-hotel
  //        The user stays here until useConfirmHotel refreshes the session.
  //
  //   3. Session exists and company_id present in JWT
  //      → (tabs) group: main application
  //
  useEffect(() => {
    if (!isHydrated) return;

    const inAuthGroup       = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';
    const isLinked          = !!session?.user?.app_metadata?.company_id;

    if (!session) {
      if (!inAuthGroup) router.replace('/(auth)/login');
      return;
    }

    if (!isLinked) {
      if (!inOnboardingGroup) router.replace('/(onboarding)/employee-code');
      return;
    }

    // Linked — push into main app
    if (inAuthGroup || inOnboardingGroup) router.replace('/(tabs)');
  }, [session, isHydrated, segments]);

  return <>{children}</>;
}
