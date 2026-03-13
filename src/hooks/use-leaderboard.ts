import { useQuery } from '@tanstack/react-query';
import { getLeaderboard, type PeriodType } from '@/api/leaderboard-service';
import { useEmployee } from '@/providers/EmployeeContext';

export function useLeaderboard(period: PeriodType) {
  const { employee } = useEmployee();

  return useQuery({
    queryKey: ['leaderboard', employee?.hotel, period],
    queryFn:  () => getLeaderboard(employee!.hotel, period),
    enabled:  !!employee,
    staleTime: 5 * 60 * 1000,
  });
}
