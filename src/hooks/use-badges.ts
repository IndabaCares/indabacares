import { useQuery } from '@tanstack/react-query';
import { badgesQuery, userBadgesQuery } from '@/api/queries';
import { QUERY_KEYS } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth-store';

export function useAllBadges() {
  const company = useAuthStore((s) => s.company);

  return useQuery({
    queryKey: QUERY_KEYS.badges,
    queryFn: async () => {
      if (!company) return [];
      const { data, error } = await badgesQuery(company.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!company,
    staleTime: Infinity,
  });
}

export function useUserBadges(userId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.userBadges(userId),
    queryFn: async () => {
      const { data, error } = await userBadgesQuery(userId);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
