import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { QUERY_KEYS } from '@/lib/constants';
import { claimEmployeeCode } from '@/api/edge-functions';
import type { EmployeeCodeInput } from '@/utils/validation';

/**
 * Step 1 of onboarding: validate and claim the employee code.
 *
 * Calls the Edge Function which atomically claims the code and writes
 * company_id to the profile. Returns company info for the confirmation
 * screen. Does NOT refresh the session — the JWT still has no company_id
 * at this point, so the AuthProvider keeps the user in the onboarding
 * group. Session refresh happens in useConfirmHotel (step 2).
 */
export function useClaimEmployeeCode() {
  return useMutation({
    mutationFn: async (input: EmployeeCodeInput) => {
      return claimEmployeeCode({ employee_code: input.code });
    },
  });
}

/**
 * Step 2 of onboarding: refresh the session after the user confirms.
 *
 * At this point company_id is already written in the database (step 1
 * did that). Refreshing the session causes Supabase to reissue the JWT
 * with company_id in app_metadata. The AuthProvider detects isLinked = true
 * and routes the user to (tabs) — no explicit navigation needed here.
 */
export function useConfirmHotel() {
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.auth.refreshSession();

      if (error || !data.session) {
        throw new Error('Session refresh failed. Please log out and log in again.');
      }

      const companyId = data.session.user.app_metadata?.company_id;
      if (!companyId) {
        throw new Error(
          'Hotel assignment was not confirmed in the session. Please contact support.'
        );
      }

      setSession(data.session);
      return data.session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.me });
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
