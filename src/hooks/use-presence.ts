import { useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';

/**
 * Tracks online presence for the current company.
 * Mounted once in RealtimeProvider.
 */
export function usePresence() {
  const user = useAuthStore((s) => s.user);
  const company = useAuthStore((s) => s.company);
  const setOnlineUsers = useUIStore((s) => s.setOnlineUsers);

  useEffect(() => {
    if (!user || !company) return;

    const channel = supabase.channel(`presence:company-${company.id}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const userIds = new Set<string>(Object.keys(state));
        setOnlineUsers(userIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId: user.id });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, company?.id]);
}

/**
 * Check if a specific user is currently online.
 * Uses Zustand selector for minimal re-renders.
 */
export function useIsOnline(userId: string | undefined): boolean {
  const onlineUsers = useUIStore((s) => s.onlineUsers);
  return useMemo(() => {
    if (!userId) return false;
    return onlineUsers.has(userId);
  }, [onlineUsers, userId]);
}
