import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRedemptions,
  approveRedemption,
  rejectRedemption,
  fulfillRedemption,
} from '@/api/reward-service';
import { REWARD_QUERY_KEYS } from '@/hooks/use-rewards';
import { useEmployee } from '@/providers/EmployeeContext';

// ─── Employee hooks ───────────────────────────────────────────────────────────

export function useRedemptions() {
  const { employee } = useEmployee();

  return useQuery({
    queryKey: ['redemptions', employee?.employee_id],
    queryFn:  () => getRedemptions(employee!.employee_id),
    enabled:  !!employee,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Admin hooks ──────────────────────────────────────────────────────────────

function useAdminMutation(
  fn: (id: string, extra?: string) => Promise<{ ok: boolean; error?: string }>,
) {
  const queryClient = useQueryClient();
  const { employee } = useEmployee();

  return useMutation({
    mutationFn: ({ redemptionId, reason }: { redemptionId: string; reason?: string }) =>
      fn(redemptionId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redemptions'] });
      if (employee) {
        // Balance may have changed on reject
        queryClient.invalidateQueries({
          queryKey: REWARD_QUERY_KEYS.points(employee.employee_id),
        });
        queryClient.invalidateQueries({
          queryKey: REWARD_QUERY_KEYS.rewards(employee.hotel),
        });
      }
    },
  });
}

export function useApproveRedemption() {
  return useAdminMutation((id) => approveRedemption(id));
}

export function useRejectRedemption() {
  return useAdminMutation((id, reason) => rejectRedemption(id, reason));
}

export function useFulfillRedemption() {
  return useAdminMutation((id) => fulfillRedemption(id));
}
