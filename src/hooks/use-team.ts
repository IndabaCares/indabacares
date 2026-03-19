import { useQuery } from '@tanstack/react-query';
import { getTeamByDepartment, getDepartments } from '@/api/team-service';
import { useEmployee } from '@/providers/EmployeeContext';

export function useDepartments() {
  const { employee } = useEmployee();

  return useQuery({
    queryKey: ['departments', employee?.hotel ?? ''],
    queryFn:  () => getDepartments(employee!.hotel),
    enabled:  !!employee,
    staleTime: 10 * 60 * 1000,
  });
}

export function useTeamByDepartment(department: string) {
  const { employee } = useEmployee();

  return useQuery({
    queryKey: ['team', employee?.hotel ?? '', department],
    queryFn:  () => getTeamByDepartment(employee!.hotel, department),
    enabled:  !!employee && !!department,
    staleTime: 5 * 60 * 1000,
  });
}
