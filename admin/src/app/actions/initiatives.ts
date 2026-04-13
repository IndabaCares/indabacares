'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InitiativeRow {
  id:         string;
  hotel:      string;
  tab:        string;
  mascot_url: string | null;
  image_urls: string[];
  video_url:  string | null;
  sort_order: number;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Upload a single File to the initiative-media bucket, return public URL. */
async function uploadFile(file: File, path: string): Promise<string> {
  const db = createAdminClient();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await db.storage
    .from('initiative-media')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = db.storage.from('initiative-media').getPublicUrl(path);
  return data.publicUrl;
}

function storagePath(hotel: string, tab: string, filename: string) {
  // Sanitise for storage path: lowercase, spaces → dashes
  const h = hotel.toLowerCase().replace(/\s+/g, '-');
  const t = tab.toLowerCase().replace(/\s+/g, '-');
  return `${h}/${t}/${filename}`;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function createInitiative(formData: FormData): Promise<{ error?: string }> {
  try {
    const hotel      = formData.get('hotel')      as string;
    const tab        = formData.get('tab')        as string;
    const sortOrder  = parseInt(formData.get('sort_order') as string || '0', 10);
    const mascotFile = formData.get('mascot')     as File | null;
    const videoFile  = formData.get('video')      as File | null;
    const galleryFiles = formData.getAll('gallery') as File[];

    if (!hotel || !tab) return { error: 'Hotel and initiative name are required.' };

    const db = createAdminClient();
    const ts = Date.now();

    // Upload mascot
    let mascot_url: string | null = null;
    if (mascotFile && mascotFile.size > 0) {
      mascot_url = await uploadFile(
        mascotFile,
        storagePath(hotel, tab, `mascot-${ts}.${mascotFile.name.split('.').pop()}`),
      );
    }

    // Upload video
    let video_url: string | null = null;
    if (videoFile && videoFile.size > 0) {
      video_url = await uploadFile(
        videoFile,
        storagePath(hotel, tab, `video-${ts}.${videoFile.name.split('.').pop()}`),
      );
    }

    // Upload gallery images
    const image_urls: string[] = [];
    for (let i = 0; i < galleryFiles.length; i++) {
      const f = galleryFiles[i];
      if (f && f.size > 0) {
        const url = await uploadFile(
          f,
          storagePath(hotel, tab, `gallery-${ts}-${i}.${f.name.split('.').pop()}`),
        );
        image_urls.push(url);
      }
    }

    const { error } = await db.from('initiatives').insert({
      hotel,
      tab,
      mascot_url,
      image_urls,
      video_url,
      sort_order: sortOrder,
    });

    if (error) return { error: error.message };

    revalidatePath('/initiatives');
    return {};
  } catch (err: any) {
    return { error: err.message ?? 'Create failed.' };
  }
}

export async function updateInitiative(id: string, formData: FormData): Promise<{ error?: string }> {
  try {
    const hotel      = formData.get('hotel')      as string;
    const tab        = formData.get('tab')        as string;
    const sortOrder  = parseInt(formData.get('sort_order') as string || '0', 10);
    const mascotFile = formData.get('mascot')     as File | null;
    const videoFile  = formData.get('video')      as File | null;
    const galleryFiles = formData.getAll('gallery') as File[];

    if (!hotel || !tab) return { error: 'Hotel and initiative name are required.' };

    const db = createAdminClient();
    const ts = Date.now();

    // Fetch current row to preserve existing URLs when no new file provided
    const { data: current } = await db
      .from('initiatives')
      .select('mascot_url, video_url, image_urls')
      .eq('id', id)
      .single();

    let mascot_url = current?.mascot_url ?? null;
    if (mascotFile && mascotFile.size > 0) {
      mascot_url = await uploadFile(
        mascotFile,
        storagePath(hotel, tab, `mascot-${ts}.${mascotFile.name.split('.').pop()}`),
      );
    }

    let video_url = current?.video_url ?? null;
    if (videoFile && videoFile.size > 0) {
      video_url = await uploadFile(
        videoFile,
        storagePath(hotel, tab, `video-${ts}.${videoFile.name.split('.').pop()}`),
      );
    }

    // New gallery images append to existing
    const image_urls: string[] = [...(current?.image_urls ?? [])];
    for (let i = 0; i < galleryFiles.length; i++) {
      const f = galleryFiles[i];
      if (f && f.size > 0) {
        const url = await uploadFile(
          f,
          storagePath(hotel, tab, `gallery-${ts}-${i}.${f.name.split('.').pop()}`),
        );
        image_urls.push(url);
      }
    }

    const { error } = await db.from('initiatives').update({
      hotel,
      tab,
      mascot_url,
      image_urls,
      video_url,
      sort_order: sortOrder,
    }).eq('id', id);

    if (error) return { error: error.message };

    revalidatePath('/initiatives');
    return {};
  } catch (err: any) {
    return { error: err.message ?? 'Update failed.' };
  }
}

export async function deleteInitiative(id: string): Promise<{ error?: string }> {
  try {
    const db = createAdminClient();
    const { error } = await db.from('initiatives').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidatePath('/initiatives');
    return {};
  } catch (err: any) {
    return { error: err.message ?? 'Delete failed.' };
  }
}

export async function removeGalleryImage(id: string, imageUrl: string): Promise<{ error?: string }> {
  try {
    const db = createAdminClient();
    const { data: row } = await db
      .from('initiatives')
      .select('image_urls')
      .eq('id', id)
      .single();

    const updated = (row?.image_urls ?? []).filter((u: string) => u !== imageUrl);

    const { error } = await db.from('initiatives').update({ image_urls: updated }).eq('id', id);
    if (error) return { error: error.message };

    revalidatePath('/initiatives');
    return {};
  } catch (err: any) {
    return { error: err.message ?? 'Remove failed.' };
  }
}
