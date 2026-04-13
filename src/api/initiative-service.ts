import { supabase } from '@/lib/supabase';

export interface Initiative {
  id: string;
  hotel: string;
  tab: string;
  mascot_url: string | null;
  image_urls: string[];
  video_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface InitiativeThumbnail {
  tab: string;
  mascot_url: string | null;
}

/**
 * Returns distinct hotel names that have at least one initiative row.
 * Used by the CSR hotel-picker screen.
 * Requires migration 072 (initiatives_public_read policy).
 */
export async function getInitiativeHotels(): Promise<string[]> {
  const { data, error } = await supabase
    .from('initiatives')
    .select('hotel')
    .order('hotel', { ascending: true });

  if (error) throw new Error(error.message);

  const seen = new Set<string>();
  for (const row of (data ?? []) as { hotel: string }[]) {
    seen.add(row.hotel);
  }
  return Array.from(seen);
}

/**
 * Fetch one mascot_url per tab for a hotel — used by the Indaba Cares list screen.
 */
export async function getInitiativeThumbnails(hotel: string): Promise<InitiativeThumbnail[]> {
  const { data, error } = await supabase
    .from('initiatives')
    .select('tab, mascot_url')
    .eq('hotel', hotel)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(error.message);

  // One entry per tab — first mascot_url wins
  const seen = new Set<string>();
  const result: InitiativeThumbnail[] = [];
  for (const row of (data ?? []) as InitiativeThumbnail[]) {
    if (!seen.has(row.tab)) {
      seen.add(row.tab);
      result.push(row);
    }
  }
  return result;
}

/**
 * The company-wide welcome/onboarding video stored directly in initiative-media bucket.
 * Used by the first-time welcome screen.
 */
export const WELCOME_VIDEO_URL =
  'https://typfhdrmtusmffxfclfq.supabase.co/storage/v1/object/public/initiative-media/Billy_Video.mp4';

/**
 * Returns the welcome video URL.
 * Checks the initiatives table first; falls back to the fixed bucket URL.
 */
export async function getWelcomeVideoUrl(hotel: string): Promise<string> {
  try {
    const { data } = await supabase
      .from('initiatives')
      .select('video_url')
      .eq('hotel', hotel)
      .not('video_url', 'is', null)
      .limit(1)
      .maybeSingle();

    if (data?.video_url) return data.video_url;
  } catch {
    // fall through to default
  }

  return WELCOME_VIDEO_URL;
}

/**
 * Mark the employee's welcome screen as seen.
 */
export async function markWelcomeSeen(employeeId: string): Promise<void> {
  await supabase
    .from('employees')
    .update({ has_seen_welcome: true })
    .eq('id', employeeId);
}

/**
 * Fetch initiative content for a given hotel and tab, ordered by sort_order.
 */
export async function getInitiatives(hotel: string, tab: string): Promise<Initiative[]> {
  const { data, error } = await supabase
    .from('initiatives')
    .select('id, hotel, tab, mascot_url, image_urls, video_url, sort_order, created_at')
    .eq('hotel', hotel)
    .eq('tab', tab)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Initiative[];
}
