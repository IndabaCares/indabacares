import { useQuery } from '@tanstack/react-query';
import { leaderboardQuery } from '@/api/queries';
import { QUERY_KEYS } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth-store';

export function useLeaderboard(periodType: string, periodKey: string) {
  const company = useAuthStore((s) => s.company);

  return useQuery({
    queryKey: QUERY_KEYS.leaderboard(periodType, periodKey),
    queryFn: async () => {
      if (!company) return [];
      const { data, error } = await leaderboardQuery(company.id, periodType, periodKey);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!company,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
