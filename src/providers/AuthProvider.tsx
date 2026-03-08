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

  // Route guard
  useEffect(() => {
    if (!isHydrated) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, isHydrated, segments]);

  return <>{children}</>;
}
