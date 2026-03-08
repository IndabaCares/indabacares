import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { QUERY_KEYS } from '@/lib/constants';
import { authSignUp } from '@/api/edge-functions';
import type { LoginInput, SignUpInput } from '@/utils/validation';

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.me });
    },
  });
}

export function useSignUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SignUpInput) => {
      // Derive companySlug from companyName (lowercase, spaces→hyphens, strip special chars)
      const companySlug = input.companyName
        ? input.companyName
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
        : undefined;

      // Call the auth-signup edge function (server-side user + company creation)
      await authSignUp({
        method: 'email_password',
        email: input.email,
        password: input.password,
        fullName: input.fullName,
        companyName: input.companyName,
        companySlug,
        inviteToken: input.inviteToken,
      });

      // Auto-login after successful signup
      const { data, error } = await supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.me });
    },
  });
}

export function useMagicLink() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: 'indabacares://auth/callback',
        },
      });
      if (error) throw error;
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'indabacares://auth/callback',
      });
      if (error) throw error;
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      logout();
      queryClient.clear();
    },
  });
}
