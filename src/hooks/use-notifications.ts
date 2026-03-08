import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsQuery, markNotificationRead, markAllNotificationsRead } from '@/api/queries';
import { QUERY_KEYS } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth-store';

export function useNotifications() {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: QUERY_KEYS.notifications,
    queryFn: async () => {
      const { data, error } = await notificationsQuery();
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!session,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  const setUnreadCount = useAuthStore((s) => s.setUnreadCount);

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await markNotificationRead(id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
      // Recalculate unread count from cache
      const cached = queryClient.getQueryData<any[]>(QUERY_KEYS.notifications);
      if (cached) {
        setUnreadCount(cached.filter((n: any) => !n.is_read).length);
      }
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const setUnreadCount = useAuthStore((s) => s.setUnreadCount);

  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await markAllNotificationsRead(user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setUnreadCount(0);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
    },
  });
}
