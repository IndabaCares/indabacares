import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRewards,
  getRewardDetail,
  getEmployeePoints,
  submitRedemption,
  type RedeemResult,
} from '@/api/reward-service';
import { useEmployee } from '@/providers/EmployeeContext';

// ─── Local query key factory ──────────────────────────────────────────────────

const RK = {
  rewards:     (hotel: string)      => ['rewards', hotel]     as const,
  rewardDetail:(id: string)         => ['reward', id]         as const,
  points:      (employeeId: string) => ['points', employeeId] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useRewards() {
  const { employee } = useEmployee();

  return useQuery({
    queryKey: RK.rewards(employee?.hotel ?? ''),
    queryFn:  () => getRewards(employee!.hotel),
    enabled:  !!employee,
    staleTime: 2 * 60 * 1000,
  });
}

export function useRewardDetail(id: string) {
  return useQuery({
    queryKey: RK.rewardDetail(id),
    queryFn:  () => getRewardDetail(id),
    staleTime: 2 * 60 * 1000,
  });
}

/** Current points balance for the logged-in employee. */
export function useEmployeePoints() {
  const { employee } = useEmployee();

  return useQuery({
    queryKey: RK.points(employee?.employee_id ?? ''),
    queryFn:  () => getEmployeePoints(employee!.employee_id),
    enabled:  !!employee,
    staleTime: 30 * 1000,
  });
}

/**
 * Mutation to redeem a reward.
 * Returns the full RedeemResult — callers must check result.ok.
 */
export function useRedeemReward() {
  const queryClient = useQueryClient();
  const { employee } = useEmployee();

  return useMutation({
    mutationFn: (rewardId: string): Promise<RedeemResult> => {
      if (!employee) throw new Error('Not authenticated');
      return submitRedemption(employee.employee_id, rewardId);
    },
    onSuccess: (result) => {
      if (!result.ok || !employee) return;
      // Refresh balance + catalogue (stock changed)
      queryClient.invalidateQueries({ queryKey: RK.points(employee.employee_id) });
      queryClient.invalidateQueries({ queryKey: RK.rewards(employee.hotel) });
      queryClient.invalidateQueries({ queryKey: ['redemptions'] });
    },
  });
}

// Re-export query key helper so screens can invalidate
export { RK as REWARD_QUERY_KEYS };
