import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rewardsQuery, rewardCategoriesQuery, rewardDetailQuery } from '@/api/queries';
import { redeemReward } from '@/api/edge-functions';
import { QUERY_KEYS } from '@/lib/constants';
import { useEmployee } from '@/providers/EmployeeContext';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';

export function useRewardCategories() {
  const { employee } = useEmployee();

  return useQuery({
    queryKey: ['reward-categories', employee?.hotel],
    queryFn: async () => {
      if (!employee) return [];
      const { data, error } = await rewardCategoriesQuery(employee.hotel);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!employee,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRewards(categoryId?: string) {
  const { employee } = useEmployee();

  return useQuery({
    queryKey: [...QUERY_KEYS.rewards(categoryId), employee?.hotel],
    queryFn: async () => {
      if (!employee) return [];
      const { data, error } = await rewardsQuery(employee.hotel, categoryId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!employee,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRewardDetail(id: string) {
  return useQuery({
    queryKey: ['reward', id],
    queryFn: async () => {
      const { data, error } = await rewardDetailQuery(id);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useRedeemReward() {
  const queryClient = useQueryClient();
  const updateBalances = useAuthStore((s) => s.updateBalances);
  const showToast = useUIStore((s) => s.showToast);

  return useMutation({
    mutationFn: (rewardId: string) => redeemReward({ rewardId }),
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
