import { useEffect, useState, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { recognitionDetailQuery } from '@/api/queries';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { QUERY_KEYS } from '@/lib/constants';
import { notificationHaptic } from '@/lib/haptics';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Global realtime subscriptions.
 * Mounted once in RealtimeProvider.
 *
 * Channels:
 * 1. feed-realtime      — new recognitions → prepend to cache + banner
 * 2. notifications-rt   — new notifications → toast + badge + haptic
 * 3. leaderboard-rt     — leaderboard changes → invalidate queries
 *
 * Also tracks connection status for reconnection UI.
 */
export function useGlobalRealtime() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const company = useAuthStore((s) => s.company);
  const incrementUnread = useAuthStore((s) => s.incrementUnread);
  const incrementNewFeedItems = useUIStore((s) => s.incrementNewFeedItems);
  const showToast = useUIStore((s) => s.showToast);
  const setRealtimeStatus = useUIStore((s) => s.setRealtimeStatus);

  useEffect(() => {
    if (!user || !company) return;

    let disconnectTimer: ReturnType<typeof setTimeout> | null = null;

    // ── Channel 1: Feed (new recognitions) ────────────────────────────────
    const feedChannel = supabase
      .channel('feed-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'recognitions',
          filter: `company_id=eq.${company.id}`,
        },
        async (payload) => {
          // Always increment the "new items" counter for the banner
          if (payload.new.sender_id !== user.id) {
            incrementNewFeedItems();
          }

          // Prepend the full recognition to feed cache for instant display
          if (payload.new.sender_id !== user.id) {
            try {
              const { data } = await recognitionDetailQuery(payload.new.id);
              if (data) {
                queryClient.setQueryData(QUERY_KEYS.feed, (old: any) => {
                  if (!old?.pages?.[0]) return old;
                  return {
                    ...old,
                    pages: [[data, ...old.pages[0]], ...old.pages.slice(1)],
                  };
                });
              }
            } catch {
              // Fallback: just show banner, user can pull to refresh
            }
          }
        }
      )
      .subscribe((status) => {
        handleChannelStatus(status, setRealtimeStatus, disconnectTimer, queryClient);
      });

    // ── Channel 2: Notifications ──────────────────────────────────────────
    const notifChannel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          incrementUnread();
          showToast({
            type: 'info',
            message: payload.new.title,
            duration: 4000,
          });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });

          // Haptic feedback when app is active
          if (AppState.currentState === 'active') {
            notificationHaptic();
          }
        }
      )
      .subscribe();

    // ── Channel 3: Leaderboard ────────────────────────────────────────────
    const leaderboardChannel = supabase
      .channel('leaderboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leaderboard_cache',
          filter: `company_id=eq.${company.id}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ['leaderboard'],
            exact: false,
          });
        }
      )
      .subscribe();

    return () => {
      if (disconnectTimer) clearTimeout(disconnectTimer);
      supabase.removeChannel(feedChannel);
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(leaderboardChannel);
    };
  }, [user?.id, company?.id]);
}

/**
 * Per-recognition realtime subscriptions (reactions + comments + typing).
 * Mounted on recognition detail screen.
 */
export function useRecognitionRealtime(recognitionId: string) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [typingUsers, setTypingUsers] = useState<
    Array<{ userId: string; fullName: string }>
  >([]);
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!recognitionId) return;

    const channel = supabase
      .channel(`recognition-${recognitionId}`)
      // Reactions changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions',
          filter: `recognition_id=eq.${recognitionId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.reactions(recognitionId) });
        }
      )
      // Comments changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `recognition_id=eq.${recognitionId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.comments(recognitionId) });
        }
      )
      // Typing indicators via broadcast
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { userId, fullName } = payload.payload as {
          userId: string;
          fullName: string;
        };
        // Ignore own typing
        if (userId === user?.id) return;

        // Add or refresh this user's typing state
        setTypingUsers((prev) => {
          const exists = prev.some((t) => t.userId === userId);
          if (!exists) return [...prev, { userId, fullName }];
          return prev;
        });

        // Clear previous timer for this user
        const existingTimer = typingTimers.current.get(userId);
        if (existingTimer) clearTimeout(existingTimer);

        // Auto-expire after 3 seconds
        const timer = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((t) => t.userId !== userId));
          typingTimers.current.delete(userId);
        }, 3000);
        typingTimers.current.set(userId, timer);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      // Clean up all typing timers
      typingTimers.current.forEach((timer) => clearTimeout(timer));
      typingTimers.current.clear();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [recognitionId, user?.id]);

  // Broadcast typing event (called from CommentInput)
  const sendTyping = useCallback(() => {
    if (!channelRef.current || !user) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.id, fullName: user.fullName },
    });
  }, [user?.id, user?.fullName]);

  return { typingUsers, sendTyping };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function handleChannelStatus(
  status: string,
  setRealtimeStatus: (s: 'connecting' | 'connected' | 'reconnecting' | 'disconnected') => void,
  disconnectTimer: ReturnType<typeof setTimeout> | null,
  queryClient: ReturnType<typeof useQueryClient>
) {
  switch (status) {
    case 'SUBSCRIBED':
      setRealtimeStatus('connected');
      if (disconnectTimer) clearTimeout(disconnectTimer);
      // Invalidate queries on reconnect to catch missed events
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'], exact: false });
      break;
    case 'CHANNEL_ERROR':
    case 'TIMED_OUT':
      setRealtimeStatus('reconnecting');
      // After 30s of failure, show "disconnected" state
      disconnectTimer = setTimeout(() => {
        setRealtimeStatus('disconnected');
      }, 30000);
      break;
    case 'CLOSED':
      setRealtimeStatus('disconnected');
      break;
  }
}
