'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// ─── Auth context ─────────────────────────────────────────────────────────────

export async function getChannelAdminContext() {
  const sb = await createServerSupabaseClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/login');

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  return {
    userId:       user.id,
    isSuperAdmin: !!meta.is_super_admin,
    hotel:        (meta.hotel as string) ?? null,
  };
}

// ─── Create post ─────────────────────────────────────────────────────────────

const createSchema = z.object({
  hotel:         z.string().min(1),
  post_type:     z.enum(['photo', 'video', 'text']),
  media_url:     z.string().url().nullable().optional(),
  media_path:    z.string().nullable().optional(),
  thumbnail_url: z.string().url().nullable().optional(),
  caption:       z.string().max(2000).nullable().optional(),
});

export async function createChannelPost(raw: unknown): Promise<void> {
  const sb = await createServerSupabaseClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const payload = createSchema.parse(raw);
  const db = createAdminClient();

  const { error } = await db.from('channel_posts').insert({
    hotel:         payload.hotel,
    post_type:     payload.post_type,
    media_url:     payload.media_url    ?? null,
    media_path:    payload.media_path   ?? null,
    thumbnail_url: payload.thumbnail_url ?? null,
    caption:       payload.caption      ?? null,
    created_by:    user.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath('/channel');
}

// ─── Delete post ──────────────────────────────────────────────────────────────

export async function deleteChannelPost(id: string, mediaPath: string | null): Promise<void> {
  const sb = await createServerSupabaseClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const db = createAdminClient();

  // Remove storage object first (non-fatal if missing)
  if (mediaPath) {
    await db.storage.from('channel-media').remove([mediaPath]);
  }

  const { error } = await db.from('channel_posts').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/channel');
}

// ─── Fetch posts ──────────────────────────────────────────────────────────────

export async function getPostsForHotel(hotel: string) {
  const db = createAdminClient();
  const { data, error } = await db
    .from('channel_posts')
    .select('id, hotel, post_type, media_url, media_path, thumbnail_url, caption, created_at, is_published')
    .eq('hotel', hotel)
    .order('created_at', { ascending: false })
    .limit(60);

  if (error) throw new Error(error.message);
  return data ?? [];
}
