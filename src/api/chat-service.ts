/**
 * Chat Service
 *
 * Hotel-scoped real-time messaging backed by Supabase Realtime.
 *
 * Initial history  → get_chat_messages() RPC (SECURITY DEFINER, hotel-verified)
 * Send message     → direct INSERT into messages (hotel-isolation RLS applies)
 * Live updates     → supabase.channel postgres_changes filtered by hotel
 */

import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id:         string;
  body:       string;
  hotel:      string;
  created_at: string;
  sender: {
    id:       string;
    full_name: string;
    employee_code: string;
    position: string | null;
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Fetch message history for a hotel, newest-first. */
export async function getMessages(
  hotel:    string,
  limit     = 50,
): Promise<ChatMessage[]> {
  const { data, error } = await supabase.rpc('get_chat_messages', {
    p_hotel: hotel,
    p_limit: limit,
  });

  if (error) throw new Error(error.message);

  // RPC returns rows with flat sender_* columns — reshape to nested sender
  return ((data ?? []) as any[]).map(rowToMessage);
}

/** Fetch a single message by id (used after realtime INSERT event). */
export async function getMessageById(id: string): Promise<ChatMessage | null> {
  const { data, error } = await supabase.rpc('get_chat_messages', {
    p_hotel: '__any__', // hotel gate handled by RLS; we override below
    p_limit: 1,
  });

  // Fallback: direct select with join (will respect hotel RLS)
  const { data: row, error: err2 } = await supabase
    .from('messages')
    .select(`
      id, body, hotel, created_at,
      sender:employees!sender_id ( id, full_name, employee_code, position )
    `)
    .eq('id', id)
    .single();

  if (err2 || !row) return null;
  return row as unknown as ChatMessage;
}

/** Send a new message. RLS enforces hotel = current_employee_hotel(). */
export async function sendMessage(
  senderId: string,
  hotel:    string,
  body:     string,
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id: senderId, hotel, body: body.trim() })
    .select(`
      id, body, hotel, created_at,
      sender:employees!sender_id ( id, full_name, employee_code, position )
    `)
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as ChatMessage;
}

// ─── Realtime ─────────────────────────────────────────────────────────────────

/**
 * Subscribe to new messages in a hotel's chat room.
 *
 * Uses Supabase Realtime postgres_changes with a hotel filter so only
 * messages for the current hotel are streamed.  On each INSERT event the
 * full row (including sender) is fetched and passed to onMessage.
 *
 * Returns the RealtimeChannel so the caller can call .unsubscribe() on
 * component unmount.
 */
export function subscribeToMessages(
  hotel:     string,
  onMessage: (msg: ChatMessage) => void,
): RealtimeChannel {
  return supabase
    .channel(`chat:${hotel}`)
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'messages',
        filter: `hotel=eq.${hotel}`,
      },
      async (payload) => {
        const newId = payload.new?.id as string | undefined;
        if (!newId) return;

        // Fetch full row with sender join
        const msg = await getMessageById(newId);
        if (msg) onMessage(msg);
      },
    )
    .subscribe();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map a flat RPC row to a ChatMessage with a nested sender object. */
function rowToMessage(row: any): ChatMessage {
  return {
    id:         row.id,
    body:       row.body,
    hotel:      row.hotel,
    created_at: row.created_at,
    sender: {
      id:            row.sender_id,
      full_name:     row.sender_name,
      employee_code: row.sender_code,
      position:      row.sender_position ?? null,
    },
  };
}
