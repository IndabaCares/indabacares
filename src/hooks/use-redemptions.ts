import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { redemptionsQuery } from '@/api/queries';
import { cancelRedemption } from '@/api/edge-functions';
import { QUERY_KEYS } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';

export function useRedemptions() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: QUERY_KEYS.redemptions,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await redemptionsQuery(user.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useCancelRedemption() {
  const queryClient = useQueryClient();
  const updateBalances = useAuthStore((s) => s.updateBalances);
  const showToast = useUIStore((s) => s.showToast);

  return useMutation({
    mutationFn: (redemptionId: string) => cancelRedemption({ redemptionId }),
    onSuccess: (data) => {
      updateBalances({ starsBalance: data.starsBalance });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.redemptions });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.me });
      showToast({ type: 'success', message: data.message });
    },
    onError: (error: Error) => {
      showToast({ type: 'error', message: error.message });
    },
  });
}
