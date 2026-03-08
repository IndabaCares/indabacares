/**
 * Edge Function: reset-budgets
 *
 * Monthly cron job that allocates giving stars to all active users
 * based on their applicable budget configuration.
 *
 * Schedule: 1st of every month at 00:05 UTC
 *   pg_cron: SELECT cron.schedule('reset-budgets', '5 0 1 * *', $$
 *     SELECT net.http_post(
 *       url := '<supabase-url>/functions/v1/reset-budgets',
 *       headers := '{"Authorization": "Bearer <service_role_key>"}'::jsonb
 *     )$$);
 *
 * Security:
 *   - Service role key required (cron invocation)
 *   - Idempotent per month (idempotency keys include YYYY-MM)
 */

import { createAdminClient } from "../_shared/supabase-client.ts";
import { errorResponse, jsonResponse } from "../_shared/auth-middleware.ts";
import { notifyMany } from "../_shared/notifications.ts";

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

  // Optionally accept a specific company_id
  let targetCompanyId: string | null = null;
  try {
    const body = await req.json();
    targetCompanyId = body.companyId || null;
  } catch {
    // No body — process all
  }

  try {
    // ── 1. Get active companies ────────────────────────────────────
    let query = adminClient
      .from("companies")
      .select("id, name")
      .eq("is_active", true);

    if (targetCompanyId) {
      query = query.eq("id", targetCompanyId);
    }

    const { data: companies, error: companyError } = await query;

    if (companyError || !companies) {
      return errorResponse("Failed to fetch companies", 500);
    }

    const results: Array<{
      companyId: string;
      companyName: string;
      usersUpdated: number;
      status: string;
    }> = [];

    for (const company of companies) {
      try {
        // ── 2. Call atomic budget reset procedure ───────────────────
        const { data: usersUpdated, error: resetError } = await adminClient.rpc(
          "reset_monthly_budgets",
          { p_company_id: company.id }
        );

        if (resetError) {
          results.push({
            companyId: company.id,
            companyName: company.name,
            usersUpdated: 0,
            status: `error: ${resetError.message}`,
          });
          continue;
        }

        // ── 3. Notify all active users ─────────────────────────────
        const { data: activeUsers } = await adminClient
          .from("profiles")
          .select("id, giving_balance")
          .eq("company_id", company.id)
          .eq("is_active", true);

        if (activeUsers && activeUsers.length > 0) {
          const notifications = activeUsers.map((u) => ({
            companyId: company.id,
            userId: u.id,
            type: "budget_reset" as const,
            title: "Monthly giving budget refreshed!",
            body: `You have ${u.giving_balance} stars to give this month. Recognize your colleagues!`,
          }));

          await notifyMany(adminClient, notifications);
        }

        results.push({
          companyId: company.id,
          companyName: company.name,
          usersUpdated: usersUpdated || 0,
          status: "ok",
        });
      } catch (e) {
        results.push({
          companyId: company.id,
          companyName: company.name,
          usersUpdated: 0,
          status: `exception: ${e instanceof Error ? e.message : String(e)}`,
        });
      }
    }

    return jsonResponse({
      period: new Date().toISOString().substring(0, 7), // YYYY-MM
      companiesProcessed: results.length,
      totalUsersUpdated: results.reduce((sum, r) => sum + r.usersUpdated, 0),
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Budget reset failed:", err);
    return errorResponse("Internal server error", 500);
  }
});
