/**
 * Typed PostgREST query builders.
 * All reads go direct to Supabase (benefiting from RLS) rather than Edge Functions.
 *
 * Note: Some insert/update calls use `as any` due to supabase-js v2.95 strict
 * generics not fully resolving manually-written Database types. In production,
 * generate types with `supabase gen types` for full type safety.
 */

import { supabase } from '@/lib/supabase';
import { PAGE_SIZE } from '@/lib/constants';

// ─── Feed ────────────────────────────────────────────────────────────────────

export const RECOGNITION_SELECT = `
  id, message, visibility, stars_per_recipient, image_url,
  hashtags, is_boosted, boosted_by, boosted_at, created_at,
  sender:profiles!sender_id ( id, full_name, display_name, avatar_url ),
  thumbs_up_type:thumbs_up_types ( id, name, icon, color, stars_awarded ),
  recipients:recognition_recipients (
    recipient:profiles!recipient_id ( id, full_name, display_name, avatar_url )
  ),
  reactions_count:reactions ( count ),
  comments_count:comments ( count )
` as const;

export interface RecognitionFeedItem {
  id: string;
  message: string;
  visibility: string;
  stars_per_recipient: number;
  image_url: string | null;
  hashtags: string[];
  is_boosted: boolean;
  boosted_by: string | null;
  boosted_at: string | null;
  created_at: string;
  sender: { id: string; full_name: string; display_name: string | null; avatar_url: string | null };
  thumbs_up_type: { id: string; name: string; icon: string; color: string; stars_awarded: number };
  recipients: Array<{ recipient: { id: string; full_name: string; display_name: string | null; avatar_url: string | null } }>;
  reactions_count: Array<{ count: number }>;
  comments_count: Array<{ count: number }>;
}

export function feedQuery(cursor?: string) {
  let query = supabase
    .from('recognitions')
    .select(RECOGNITION_SELECT)
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  return query as any;
}

export function recognitionDetailQuery(id: string) {
  return supabase
    .from('recognitions')
    .select(RECOGNITION_SELECT)
    .eq('id', id)
    .single() as any;
}

// ─── Reactions ──────────────────────────────────────────────────────────────

export function reactionsQuery(recognitionId: string) {
  return supabase
    .from('reactions')
    .select('id, emoji, user_id, created_at, user:profiles!user_id ( id, full_name, avatar_url )')
    .eq('recognition_id', recognitionId)
    .order('created_at', { ascending: true }) as any;
}

export function addReaction(recognitionId: string, companyId: string, emoji: string) {
  return (supabase.from('reactions') as any).insert({
    recognition_id: recognitionId,
    company_id: companyId,
    emoji,
  });
}

export function removeReaction(reactionId: string) {
  return supabase.from('reactions').delete().eq('id', reactionId);
}

// ─── Comments ───────────────────────────────────────────────────────────────

export function commentsQuery(recognitionId: string) {
  return supabase
    .from('comments')
    .select('id, body, created_at, updated_at, user:profiles!user_id ( id, full_name, display_name, avatar_url )')
    .eq('recognition_id', recognitionId)
    .order('created_at', { ascending: true }) as any;
}

export function addComment(recognitionId: string, companyId: string, body: string) {
  return (supabase.from('comments') as any).insert({
    recognition_id: recognitionId,
    company_id: companyId,
    body,
  });
}

export function deleteComment(commentId: string) {
  return supabase.from('comments').delete().eq('id', commentId);
}

// ─── Notifications ──────────────────────────────────────────────────────────

export function notificationsQuery(limit = 50) {
  return supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit) as any;
}

export function markNotificationRead(id: string) {
  return (supabase.from('notifications') as any)
    .update({ is_read: true })
    .eq('id', id);
}

export function markAllNotificationsRead(userId: string) {
  return (supabase.from('notifications') as any)
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
}

// ─── Leaderboard ────────────────────────────────────────────────────────────

export function leaderboardQuery(
  companyId: string,
  periodType: string,
  periodKey: string,
  limit = 50
) {
  return supabase
    .from('leaderboard_cache')
    .select('*, user:profiles!user_id ( id, full_name, display_name, avatar_url, department_id )')
    .eq('company_id', companyId)
    .eq('period_type', periodType)
    .eq('period_key', periodKey)
    .order('rank', { ascending: true })
    .limit(limit) as any;
}

// ─── Rewards ────────────────────────────────────────────────────────────────

export function rewardCategoriesQuery(companyId: string) {
  return supabase
    .from('reward_categories')
    .select('*')
    .eq('company_id', companyId)
    .order('sort_order', { ascending: true }) as any;
}

export function rewardsQuery(companyId: string, categoryId?: string) {
  let query = supabase
    .from('rewards')
    .select('*, category:reward_categories ( id, name )')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true }) as any;

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  return query;
}

export function rewardDetailQuery(id: string) {
  return supabase
    .from('rewards')
    .select('*, category:reward_categories ( id, name )')
    .eq('id', id)
    .single() as any;
}

// ─── Redemptions ────────────────────────────────────────────────────────────

export function redemptionsQuery(userId: string) {
  return supabase
    .from('redemptions')
    .select('*, reward:rewards ( id, name, image_url, star_cost, reward_type )')
    .eq('user_id', userId)
    .order('created_at', { ascending: false }) as any;
}

// ─── Star Transactions ─────────────────────────────────────────────────────

export function starTransactionsQuery(userId: string, limit = 50) {
  return supabase
    .from('star_transactions')
    .select('id, type, amount, balance_after, description, reference_type, reference_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit) as any;
}

// ─── Mood ────────────────────────────────────────────────────────────────────

export function moodHistoryQuery(userId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return supabase
    .from('mood_entries')
    .select('id, mood, entry_date, created_at')
    .eq('user_id', userId)
    .gte('entry_date', since.toISOString().split('T')[0])
    .order('entry_date', { ascending: true }) as any;
}

// ─── Skills ─────────────────────────────────────────────────────────────────

export function skillCategoriesQuery(companyId: string) {
  return supabase
    .from('skill_categories')
    .select('*, indicators:skill_indicators ( id, name, description, sort_order )')
    .eq('company_id', companyId)
    .order('sort_order', { ascending: true }) as any;
}

export function mySkillScoresQuery(userId: string) {
  return supabase
    .from('skill_ratings')
    .select('indicator_id, score, indicator:skill_indicators ( id, name, category:skill_categories ( id, name ) )')
    .eq('recipient_id', userId) as any;
}

export function submitSkillRating(
  companyId: string,
  recipientId: string,
  ratings: Array<{ indicatorId: string; score: number }>
) {
  return (supabase.from('skill_ratings') as any).insert(
    ratings.map((r) => ({
      company_id: companyId,
      recipient_id: recipientId,
      indicator_id: r.indicatorId,
      score: r.score,
    }))
  );
}

// ─── Badges ─────────────────────────────────────────────────────────────────

export function badgesQuery(companyId: string) {
  return supabase
    .from('badges')
    .select('*')
    .or(`company_id.eq.${companyId},company_id.is.null`) as any;
}

export function userBadgesQuery(userId: string) {
  return supabase
    .from('user_badges')
    .select('*, badge:badges ( id, slug, name, description, icon )')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false }) as any;
}

// ─── Profiles ───────────────────────────────────────────────────────────────

export function searchProfilesQuery(companyId: string, search: string) {
  return supabase
    .from('profiles')
    .select('id, full_name, display_name, avatar_url, job_title, department_id, role')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .ilike('full_name', `%${search}%`)
    .limit(20) as any;
}

export function profileDetailQuery(id: string) {
  return supabase
    .from('profiles')
    .select('id, full_name, display_name, avatar_url, job_title, role, department_id, points_balance, created_at, departments ( id, name )')
    .eq('id', id)
    .single() as any;
}

export function updateProfile(id: string, data: { display_name?: string; job_title?: string; avatar_url?: string }) {
  return (supabase.from('profiles') as any).update(data).eq('id', id);
}

// ─── Thumbs Up Types ────────────────────────────────────────────────────────

export function thumbsUpTypesQuery(companyId: string) {
  return supabase
    .from('thumbs_up_types')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true }) as any;
}
