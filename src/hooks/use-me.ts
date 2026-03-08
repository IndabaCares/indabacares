import { useQuery } from '@tanstack/react-query';
import { authMe } from '@/api/edge-functions';
import { useAuthStore } from '@/stores/auth-store';
import { QUERY_KEYS } from '@/lib/constants';

export function useMe() {
  const session = useAuthStore((s) => s.session);
  const setUserContext = useAuthStore((s) => s.setUserContext);

  return useQuery({
    queryKey: QUERY_KEYS.me,
    queryFn: async () => {
      const data = await authMe();
      setUserContext(data);
      return data;
    },
    enabled: !!session,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
