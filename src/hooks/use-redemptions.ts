import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { redemptionsQuery } from '@/api/queries';
import { cancelRedemption } from '@/api/edge-functions';
import { QUERY_KEYS } from '@/lib/constants';
import { useEmployee } from '@/providers/EmployeeContext';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';

export function useRedemptions() {
  const { employee } = useEmployee();

  return useQuery({
    queryKey: [...QUERY_KEYS.redemptions, employee?.employee_id],
    queryFn: async () => {
      if (!employee) return [];
      const { data, error } = await redemptionsQuery(employee.employee_id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!employee,
    staleTime: 2 * 60 * 1000,
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
