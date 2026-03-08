import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsQuery, markNotificationRead, markAllNotificationsRead } from '@/api/queries';
import { QUERY_KEYS } from '@/lib/constants';
import { useEmployee } from '@/providers/EmployeeContext';
import { useAuthStore } from '@/stores/auth-store';

export function useNotifications() {
  const { employee } = useEmployee();

  return useQuery({
    queryKey: [...QUERY_KEYS.notifications, employee?.employee_id],
    queryFn: async () => {
      if (!employee) return [];
      const { data, error } = await notificationsQuery(employee.employee_id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!employee,
    staleTime: 60 * 1000,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  const { employee } = useEmployee();
  const setUnreadCount = useAuthStore((s) => s.setUnreadCount);

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await markNotificationRead(id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
      const cached = queryClient.getQueryData<any[]>(QUERY_KEYS.notifications);
      if (cached) {
        setUnreadCount(cached.filter((n: any) => !n.is_read).length);
      }
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  const { employee } = useEmployee();
  const setUnreadCount = useAuthStore((s) => s.setUnreadCount);

  return useMutation({
    mutationFn: async () => {
      if (!employee) return;
      const { error } = await markAllNotificationsRead(employee.employee_id);
      if (error) throw error;
    },
    onSuccess: () => {
      setUnreadCount(0);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
    },
  });
}
