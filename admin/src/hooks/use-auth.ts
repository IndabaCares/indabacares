'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import { authMe } from '@/api/edge-functions';

export function useAuth() {
  const supabase = createClient();
  const { session, user, company, isLoading, setSession, setUserContext, setLoading, logout } =
    useAuthStore();

  // Bootstrap session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) logout();
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch user context from auth-me edge function
  const { isError } = useQuery({
    queryKey: ['admin-me'],
    queryFn: async () => {
      const data = await authMe();
      setUserContext(data.user, data.company);
      return data;
    },
    enabled: !!session,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Sign out on auth failure (deactivated account, etc.)
  useEffect(() => {
    if (isError) {
      supabase.auth.signOut();
    }
  }, [isError]);

  return {
    session,
    user,
    company,
    isLoading,
    role: user?.role ?? null,
    isSuperAdmin: user?.role === 'super_admin',
    companyId: company?.id ?? null,
  };
}
