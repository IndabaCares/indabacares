import { useQuery } from '@tanstack/react-query';
import { starTransactionsQuery } from '@/api/queries';
import { QUERY_KEYS } from '@/lib/constants';
import { useEmployee } from '@/providers/EmployeeContext';

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
  const { employee } = useEmployee();

  return useQuery({
    queryKey: [...QUERY_KEYS.starTransactions, employee?.employee_id],
    queryFn: async () => {
      if (!employee) return [];
      const { data, error } = await starTransactionsQuery(employee.employee_id);
      if (error) throw error;
      return (data ?? []) as StarTransaction[];
    },
    enabled: !!employee,
    staleTime: 2 * 60 * 1000,
  });
}
