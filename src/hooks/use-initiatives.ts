import { useQuery } from '@tanstack/react-query';
import { getInitiatives } from '@/api/initiative-service';
import { useEmployee } from '@/providers/EmployeeContext';

export function useInitiatives(tab: string) {
  const { employee } = useEmployee();

  return useQuery({
    queryKey: ['initiatives', employee?.hotel ?? '', tab],
    queryFn: () => getInitiatives(employee!.hotel, tab),
    enabled: !!employee && !!tab,
    staleTime: 5 * 60 * 1000,
  });
}
