/**
 * Typed PostgREST query builders — hotel-scoped.
 *
 * All queries that return multi-tenant data now accept a `hotel` string
 * (from EmployeeContext) and filter rows with .eq('hotel', hotel).
 *
 * Queries scoped to a single employee (mood, redemptions, etc.) accept
 * `employeeId` (employee.employee_id from EmployeeContext).
 *
 * The admin dashboard has its own queries.ts and is unaffected.
 */

import { supabase } from '@/lib/supabase';
import { PAGE_SIZE } from '@/lib/constants';

// ─── Feed ─────────────────────────────────────────────────────────────────────

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

/** Feed scoped to the employee's hotel. */
export function feedQuery(hotel: string, cursor?: string) {
  let query = supabase
    .from('recognitions')
    .select(RECOGNITION_SELECT)
    .eq('hotel', hotel)
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

// ─── Reactions ────────────────────────────────────────────────────────────────

export function reactionsQuery(recognitionId: string) {
  return supabase
    .from('reactions')
    .select('id, emoji, user_id, created_at, user:profiles!user_id ( id, full_name, avatar_url )')
    .eq('recognition_id', recognitionId)
    .order('created_at', { ascending: true }) as any;
}

/** hotel replaces the old company_id on the insert row. */
export function addReaction(recognitionId: string, hotel: string, emoji: string) {
  return (supabase.from('reactions') as any).insert({
    recognition_id: recognitionId,
    hotel,
    emoji,
  });
}

export function removeReaction(reactionId: string) {
  return supabase.from('reactions').delete().eq('id', reactionId);
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export function commentsQuery(recognitionId: string) {
  return supabase
    .from('comments')
    .select('id, body, created_at, updated_at, user:profiles!user_id ( id, full_name, display_name, avatar_url )')
    .eq('recognition_id', recognitionId)
    .order('created_at', { ascending: true }) as any;
}

/** hotel replaces the old company_id on the insert row. */
export function addComment(recognitionId: string, hotel: string, body: string) {
  return (supabase.from('comments') as any).insert({
    recognition_id: recognitionId,
    hotel,
    body,
  });
}

export function deleteComment(commentId: string) {
  return supabase.from('comments').delete().eq('id', commentId);
}

// ─── Notifications ────────────────────────────────────────────────────────────

/** Notifications scoped to the logged-in employee. */
export function notificationsQuery(employeeId: string, limit = 50) {
  return supabase
    .from('notifications')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(limit) as any;
}

export function markNotificationRead(id: string) {
  return (supabase.from('notifications') as any)
    .update({ is_read: true })
    .eq('id', id);
}

export function markAllNotificationsRead(employeeId: string) {
  return (supabase.from('notifications') as any)
    .update({ is_read: true })
    .eq('employee_id', employeeId)
    .eq('is_read', false);
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

/** Leaderboard filtered to the employee's hotel. */
export function leaderboardQuery(
  hotel: string,
  periodType: string,
  periodKey: string,
  limit = 50,
) {
  return supabase
    .from('leaderboard_cache')
    .select('*, user:profiles!user_id ( id, full_name, display_name, avatar_url, department_id )')
    .eq('hotel', hotel)
    .eq('period_type', periodType)
    .eq('period_key', periodKey)
    .order('rank', { ascending: true })
    .limit(limit) as any;
}

// ─── Rewards ──────────────────────────────────────────────────────────────────

/** Reward categories scoped to the employee's hotel. */
export function rewardCategoriesQuery(hotel: string) {
  return supabase
    .from('reward_categories')
    .select('*')
    .eq('hotel', hotel)
    .order('sort_order', { ascending: true }) as any;
}

/** Rewards scoped to the employee's hotel, optionally filtered by category. */
export function rewardsQuery(hotel: string, categoryId?: string) {
  let query = supabase
    .from('rewards')
    .select('*, category:reward_categories ( id, name )')
    .eq('hotel', hotel)
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

// ─── Redemptions ──────────────────────────────────────────────────────────────

/** Redemptions for the authenticated employee. */
export function redemptionsQuery(employeeId: string) {
  return supabase
    .from('redemptions')
    .select('*, reward:rewards ( id, name, image_url, star_cost, reward_type )')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false }) as any;
}

// ─── Star Transactions ────────────────────────────────────────────────────────

/** Star transaction history for the authenticated employee. */
export function starTransactionsQuery(employeeId: string, limit = 50) {
  return supabase
    .from('star_transactions')
    .select('id, type, amount, balance_after, description, reference_type, reference_id, created_at')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(limit) as any;
}

// ─── Mood ─────────────────────────────────────────────────────────────────────

/** Mood history for the authenticated employee. */
export function moodHistoryQuery(employeeId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return supabase
    .from('mood_entries')
    .select('id, mood, entry_date, created_at')
    .eq('employee_id', employeeId)
    .gte('entry_date', since.toISOString().split('T')[0])
    .order('entry_date', { ascending: true }) as any;
}

// ─── Skills ───────────────────────────────────────────────────────────────────

/** Skill categories and indicators scoped to the employee's hotel. */
export function skillCategoriesQuery(hotel: string) {
  return supabase
    .from('skill_categories')
    .select('*, indicators:skill_indicators ( id, name, description, sort_order )')
    .eq('hotel', hotel)
    .order('sort_order', { ascending: true }) as any;
}

/** Skill scores received by the authenticated employee. */
export function mySkillScoresQuery(employeeId: string) {
  return supabase
    .from('skill_ratings')
    .select('indicator_id, score, indicator:skill_indicators ( id, name, category:skill_categories ( id, name ) )')
    .eq('recipient_id', employeeId) as any;
}

/** Submit skill ratings. hotel replaces the old company_id. */
export function submitSkillRating(
  hotel: string,
  recipientId: string,
  ratings: Array<{ indicatorId: string; score: number }>,
) {
  return (supabase.from('skill_ratings') as any).insert(
    ratings.map((r) => ({
      hotel,
      recipient_id: recipientId,
      indicator_id: r.indicatorId,
      score: r.score,
    }))
  );
}

// ─── Badges ───────────────────────────────────────────────────────────────────

/** Badges scoped to the employee's hotel (plus global badges with null hotel). */
export function badgesQuery(hotel: string) {
  return supabase
    .from('badges')
    .select('*')
    .or(`hotel.eq.${hotel},hotel.is.null`) as any;
}

/** Badges earned by a specific employee. */
export function userBadgesQuery(employeeId: string) {
  return supabase
    .from('user_badges')
    .select('*, badge:badges ( id, slug, name, description, icon )')
    .eq('employee_id', employeeId)
    .order('earned_at', { ascending: false }) as any;
}

// ─── Employees (search / profile) ────────────────────────────────────────────

/**
 * Search employees within the same hotel.
 * Replaces the old searchProfilesQuery which queried the `profiles` table
 * and scoped by company_id.
 */
export function searchEmployeesQuery(hotel: string, search: string) {
  return supabase
    .from('employees')
    .select('id, full_name, employee_code, hotel, position, department')
    .eq('hotel', hotel)
    .eq('status', 'active')
    .ilike('full_name', `%${search}%`)
    .limit(20) as any;
}

export function employeeDetailQuery(id: string) {
  return supabase
    .from('employees')
    .select('id, full_name, employee_code, hotel, position, department, status')
    .eq('id', id)
    .single() as any;
}

export function updateEmployeeProfile(
  id: string,
  data: { display_name?: string; position?: string; avatar_url?: string },
) {
  return (supabase.from('employees') as any).update(data).eq('id', id);
}

// ─── Thumbs Up Types ──────────────────────────────────────────────────────────

/** Recognition types scoped to the employee's hotel. */
export function thumbsUpTypesQuery(hotel: string) {
  return supabase
    .from('thumbs_up_types')
    .select('*')
    .eq('hotel', hotel)
    .eq('is_active', true)
    .order('sort_order', { ascending: true }) as any;
}
