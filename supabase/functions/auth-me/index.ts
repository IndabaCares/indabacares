/**
 * Edge Function: auth-me
 *
 * Called on app startup after login. Returns the full user context
 * needed by the client and tracks login streaks.
 *
 * Response includes:
 *   - Profile with balances
 *   - Company info (name, branding)
 *   - Unread notification count
 *   - Login streak result
 *   - Feature flags from company settings
 */

import {
  withAuth,
  jsonResponse,
  errorResponse,
  type AuthContext,
} from "../_shared/auth-middleware.ts";

Deno.serve(
  withAuth(
    async (_req: Request, ctx: AuthContext): Promise<Response> => {
      const { user, adminClient } = ctx;

      // ── 1. Track login streak ──────────────────────────────────────
      const { data: streakResult, error: streakError } = await adminClient.rpc(
        "track_login",
        { target_user_id: user.id }
      );

      if (streakError) {
        console.error("Login tracking failed:", streakError);
      }

      // ── 2. Fetch full profile ──────────────────────────────────────
      const { data: profile, error: profileError } = await adminClient
        .from("profiles")
        .select(`
          id,
          email,
          full_name,
          display_name,
          avatar_url,
          role,
          department_id,
          manager_id,
          job_title,
          points_balance,
          stars_balance,
          giving_balance,
          login_streak,
          last_mood_date,
          is_active,
          created_at,
          departments ( id, name )
        `)
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        return errorResponse("Profile not found", 404);
      }

      // ── 3. Fetch company ───────────────────────────────────────────
      const { data: company, error: companyError } = await adminClient
        .from("companies")
        .select("id, name, slug, logo_url, primary_color, settings")
        .eq("id", user.companyId)
        .single();

      if (companyError || !company) {
        return errorResponse("Company not found", 404);
      }

      // ── 4. Unread notification count ───────────────────────────────
      const { count: unreadCount } = await adminClient
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      // ── 5. Check if mood already submitted today ───────────────────
      const today = new Date().toISOString().split("T")[0];
      const moodSubmittedToday = profile.last_mood_date === today;

      // ── 6. Earned badges ───────────────────────────────────────────
      const { data: badges } = await adminClient
        .from("user_badges")
        .select("badge_id, earned_at, badges ( slug, name, icon )")
        .eq("user_id", user.id);

      // ── 7. Build response ──────────────────────────────────────────
      return jsonResponse({
        user: {
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name,
          displayName: profile.display_name,
          avatarUrl: profile.avatar_url,
          role: profile.role,
          jobTitle: profile.job_title,
          department: profile.departments,
          managerId: profile.manager_id,
          pointsBalance: profile.points_balance,
          starsBalance: profile.stars_balance,
          givingBalance: profile.giving_balance,
          loginStreak: profile.login_streak,
          badges: badges || [],
          createdAt: profile.created_at,
        },
        company: {
          id: company.id,
          name: company.name,
          slug: company.slug,
          logoUrl: company.logo_url,
          primaryColor: company.primary_color,
          features: company.settings,
        },
        session: {
          unreadNotifications: unreadCount || 0,
          moodSubmittedToday,
          streakResult: streakResult?.[0] || null,
        },
      });
    },
    { requiredRole: "employee" }
  )
);
