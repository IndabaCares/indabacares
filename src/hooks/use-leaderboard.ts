import { useQuery } from '@tanstack/react-query';
import { leaderboardQuery } from '@/api/queries';
import { QUERY_KEYS } from '@/lib/constants';
import { useEmployee } from '@/providers/EmployeeContext';

export function useLeaderboard(periodType: string, periodKey: string) {
  const { employee } = useEmployee();

  return useQuery({
    queryKey: [...QUERY_KEYS.leaderboard(periodType, periodKey), employee?.hotel],
    queryFn: async () => {
      if (!employee) return [];
      const { data, error } = await leaderboardQuery(employee.hotel, periodType, periodKey);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!employee,
    staleTime: 10 * 60 * 1000,
  });
}
