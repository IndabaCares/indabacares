import { useQuery } from '@tanstack/react-query';
import { starTransactionsQuery } from '@/api/queries';
import { QUERY_KEYS } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth-store';

export interface StarTransaction {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
}

export function useStarTransactions() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: QUERY_KEYS.starTransactions,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await starTransactionsQuery(user.id);
      if (error) throw error;
      return (data ?? []) as StarTransaction[];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });
}
