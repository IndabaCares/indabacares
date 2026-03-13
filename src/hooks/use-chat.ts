/**
 * useChat
 *
 * Provides message history and a send() function for the hotel chat room.
 *
 * - Initial history is fetched via the get_chat_messages() RPC.
 * - New messages arrive via Supabase Realtime (postgres_changes INSERT).
 * - Sending uses an optimistic update: the message appears immediately
 *   with a temp ID, then is replaced by the server-confirmed row.
 * - The Realtime channel deduplicates against optimistic rows by id.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  getMessages,
  sendMessage,
  subscribeToMessages,
  type ChatMessage,
} from '@/api/chat-service';
import { useEmployee } from '@/providers/EmployeeContext';

// ─── useChat ──────────────────────────────────────────────────────────────────

export function useChat() {
  const { employee } = useEmployee();
  const hotel = employee?.hotel ?? '';

  const [messages,   setMessages]   = useState<ChatMessage[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [isSending,  setIsSending]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);

  // ── Initial load ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!hotel) return;

    setIsLoading(true);
    setError(null);

    getMessages(hotel)
      .then((msgs) => setMessages(msgs))   // already newest-first from RPC
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [hotel]);

  // ── Realtime subscription ───────────────────────────────────────────────────

  useEffect(() => {
    if (!hotel) return;

    channelRef.current = subscribeToMessages(hotel, (newMsg) => {
      setMessages((prev) => {
        // Deduplicate: skip if already present (optimistic or duplicate event)
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [newMsg, ...prev];
      });
    });

    return () => {
      channelRef.current?.unsubscribe();
      channelRef.current = null;
    };
  }, [hotel]);

  // ── send ────────────────────────────────────────────────────────────────────

  const send = useCallback(
    async (body: string): Promise<void> => {
      if (!employee || !body.trim() || isSending) return;

      const tempId = `optimistic-${Date.now()}`;
      const optimistic: ChatMessage = {
        id:         tempId,
        body:       body.trim(),
        hotel,
        created_at: new Date().toISOString(),
        sender: {
          id:            employee.employee_id,
          full_name:     employee.full_name,
          employee_code: employee.employee_code,
          position:      null,
        },
      };

      // Show immediately
      setMessages((prev) => [optimistic, ...prev]);
      setIsSending(true);

      try {
        const saved = await sendMessage(employee.employee_id, hotel, body);
        // Swap optimistic row for real row
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? saved : m)),
        );
      } catch (e: any) {
        // Revert optimistic
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        throw e;
      } finally {
        setIsSending(false);
      }
    },
    [employee, hotel, isSending],
  );

  return {
    /** Newest first — invert the FlatList (inverted prop) to show oldest at bottom. */
    messages,
    isLoading,
    isSending,
    error,
    send,
    myId: employee?.employee_id ?? '',
  };
}
