import { useInfiniteQuery } from '@tanstack/react-query';
import { feedQuery } from '@/api/queries';
import { QUERY_KEYS, PAGE_SIZE } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth-store';

export function useFeed() {
  const session = useAuthStore((s) => s.session);

  return useInfiniteQuery({
    queryKey: QUERY_KEYS.feed,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await feedQuery(pageParam);
      if (error) throw error;
      return data ?? [];
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return lastPage[lastPage.length - 1]?.created_at;
    },
    enabled: !!session,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
