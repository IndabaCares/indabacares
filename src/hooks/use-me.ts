import { useQuery } from '@tanstack/react-query';
import { authMe } from '@/api/edge-functions';
import { useAuthStore } from '@/stores/auth-store';
import { QUERY_KEYS } from '@/lib/constants';

export function useMe() {
  const session = useAuthStore((s) => s.session);
  const setUserContext = useAuthStore((s) => s.setUserContext);

  // Only fetch user context when the session has a company_id.
  // Unlinked users (no company_id in JWT) cannot call auth-me — it would
  // return 403 and trigger a sign-out. The query is enabled only after the
  // employee code has been claimed and the session has been refreshed.
  const isLinked = !!session?.user?.app_metadata?.company_id;

  return useQuery({
    queryKey: QUERY_KEYS.me,
    queryFn: async () => {
      const data = await authMe();
      setUserContext(data);
      return data;
    },
    enabled: isLinked,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
