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
 * Fetch initiative content for a given hotel and tab slug, ordered by sort_order.
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
