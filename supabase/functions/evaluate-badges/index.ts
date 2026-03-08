/**
 * Edge Function: evaluate-badges
 *
 * Evaluates whether users have earned any new badges.
 * Called asynchronously after actions (recognition, reaction, mood, etc.)
 * and periodically by the daily cron.
 *
 * Badge evaluation logic:
 *   - first_steps:      sent >= 1 recognition
 *   - appreciator:      sent >= 50 recognitions
 *   - culture_champion: sent >= 200 recognitions
 *   - rising_star:      appears in top 10 monthly leaderboard
 *   - streak_master:    login_streak >= 30
 *   - team_player:      received from >= 10 unique senders
 *   - mood_regular:     mood entries in last 30 days >= 30
 *   - skill_scout:      rated >= 20 unique colleagues
 *
 * Security:
 *   - Internal only: called by other Edge Functions or cron
 *   - Uses service_role
 *   - Idempotent: UNIQUE(user_id, badge_id) prevents duplicates
 */

import { createAdminClient } from "../_shared/supabase-client.ts";
import { errorResponse, jsonResponse } from "../_shared/auth-middleware.ts";
import { notify } from "../_shared/notifications.ts";

interface EvalRequest {
  userIds: string[];
  companyId: string;
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const adminClient = createAdminClient();

  let body: EvalRequest;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body");
  }

  if (!body.userIds || !body.companyId) {
    return errorResponse("userIds and companyId are required");
  }

  const awarded: Array<{ userId: string; badge: string }> = [];

  // ── Fetch all badge definitions ────────────────────────────────
  const { data: badges } = await adminClient
    .from("badges")
    .select("id, slug, name, icon, threshold")
    .eq("is_active", true)
    .or(`company_id.is.null,company_id.eq.${body.companyId}`);

  if (!badges || badges.length === 0) {
    return jsonResponse({ awarded: [], message: "No badges configured" });
  }

  const badgeMap = new Map(badges.map((b) => [b.slug, b]));

  // ── Fetch already-earned badges for these users ────────────────
  const { data: existingBadges } = await adminClient
    .from("user_badges")
    .select("user_id, badge_id")
    .in("user_id", body.userIds);

  const earnedSet = new Set(
    (existingBadges || []).map((eb) => `${eb.user_id}:${eb.badge_id}`)
  );

  function hasEarned(userId: string, badgeId: string): boolean {
    return earnedSet.has(`${userId}:${badgeId}`);
  }

  // ── Evaluate each user ─────────────────────────────────────────
  for (const userId of body.userIds) {
    // Fetch user stats in parallel
    const [
      sentCountResult,
      uniqueSendersResult,
      loginStreakResult,
      moodCountResult,
      skillRateCountResult,
      leaderboardResult,
    ] = await Promise.all([
      // Recognitions sent
      adminClient
        .from("recognitions")
        .select("id", { count: "exact", head: true })
        .eq("sender_id", userId)
        .eq("company_id", body.companyId),

      // Unique senders who recognized this user
      adminClient.rpc("count_unique_senders", { p_user_id: userId }).catch(() => ({ data: 0 })),

      // Login streak
      adminClient
        .from("profiles")
        .select("login_streak")
        .eq("id", userId)
        .single(),

      // Mood entries in last 30 days
      adminClient
        .from("mood_entries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("entry_date", new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]),

      // Unique colleagues rated on skills
      adminClient.rpc("count_unique_skill_recipients", { p_user_id: userId }).catch(() => ({ data: 0 })),

      // Leaderboard position
      adminClient
        .from("leaderboard_cache")
        .select("rank")
        .eq("user_id", userId)
        .eq("company_id", body.companyId)
        .eq("period_type", "monthly")
        .eq("period_key", new Date().toISOString().substring(0, 7))
        .single(),
    ]);

    const sentCount = sentCountResult.count || 0;
    const uniqueSenders = typeof uniqueSendersResult.data === "number" ? uniqueSendersResult.data : 0;
    const loginStreak = loginStreakResult.data?.login_streak || 0;
    const moodCount = moodCountResult.count || 0;
    const skillRateCount = typeof skillRateCountResult.data === "number" ? skillRateCountResult.data : 0;
    const leaderboardRank = leaderboardResult.data?.rank || 999;

    // ── Check each badge ───────────────────────────────────────
    const checks: Array<{ slug: string; met: boolean }> = [
      { slug: "first_steps",      met: sentCount >= 1 },
      { slug: "appreciator",      met: sentCount >= 50 },
      { slug: "culture_champion", met: sentCount >= 200 },
      { slug: "rising_star",      met: leaderboardRank <= 10 },
      { slug: "streak_master",    met: loginStreak >= 30 },
      { slug: "team_player",      met: uniqueSenders >= 10 },
      { slug: "mood_regular",     met: moodCount >= 30 },
      { slug: "skill_scout",      met: skillRateCount >= 20 },
    ];

    for (const check of checks) {
      const badge = badgeMap.get(check.slug);
      if (!badge || !check.met || hasEarned(userId, badge.id)) {
        continue;
      }

      // Award badge
      const { error: insertError } = await adminClient
        .from("user_badges")
        .insert({ user_id: userId, badge_id: badge.id })
        .single();

      // Handle race condition (UNIQUE violation = already awarded)
      if (insertError?.code === "23505") continue;
      if (insertError) {
        console.error(`Failed to award badge ${badge.slug} to ${userId}:`, insertError);
        continue;
      }

      awarded.push({ userId, badge: badge.slug });

      // Notify user
      await notify(adminClient, {
        companyId: body.companyId,
        userId,
        type: "badge_earned",
        title: `Badge earned: ${badge.name}! ${badge.icon}`,
        body: badge.name,
        referenceType: "badge",
        referenceId: badge.id,
      });
    }
  }

  return jsonResponse({
    evaluated: body.userIds.length,
    awarded,
    timestamp: new Date().toISOString(),
  });
});
