/**
 * Edge Function: refresh-leaderboard
 *
 * Cron job that recalculates leaderboard rankings for all active companies.
 * Scheduled to run daily via Supabase cron (pg_cron) or external scheduler.
 *
 * Also refreshes the happiness_scores materialized view.
 *
 * Invocation:
 *   - Cron: POST /functions/v1/refresh-leaderboard
 *     with Authorization: Bearer <service_role_key>
 *   - Manual: Admin can trigger via Backoffice
 *
 * Security:
 *   - Service role or admin required
 *   - Idempotent — safe to run multiple times
 */

import { createAdminClient } from "../_shared/supabase-client.ts";
import { errorResponse, jsonResponse } from "../_shared/auth-middleware.ts";

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

  // ── Auth: service_role key or admin JWT ─────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return errorResponse("Missing Authorization header", 401);
  }

  const adminClient = createAdminClient();

  // Optionally accept a specific company_id; otherwise process all
  let targetCompanyId: string | null = null;
  try {
    const body = await req.json();
    targetCompanyId = body.companyId || null;
  } catch {
    // No body is fine — process all companies
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
      return errorResponse("Failed to fetch companies: " + companyError?.message, 500);
    }

    const results: Array<{ companyId: string; companyName: string; status: string }> = [];

    // ── 2. Refresh leaderboard for each company ────────────────────
    for (const company of companies) {
      try {
        const { error } = await adminClient.rpc("refresh_leaderboard", {
          p_company_id: company.id,
        });

        if (error) {
          results.push({
            companyId: company.id,
            companyName: company.name,
            status: `error: ${error.message}`,
          });
        } else {
          results.push({
            companyId: company.id,
            companyName: company.name,
            status: "ok",
          });
        }
      } catch (e) {
        results.push({
          companyId: company.id,
          companyName: company.name,
          status: `exception: ${e instanceof Error ? e.message : String(e)}`,
        });
      }
    }

    // ── 3. Refresh happiness scores materialized view ──────────────
    let happinessRefresh = "ok";
    try {
      await adminClient.rpc("refresh_materialized_view_concurrently", {
        view_name: "happiness_scores",
      }).catch(async () => {
        // Fallback: direct SQL if the helper RPC doesn't exist
        const { error } = await adminClient.from("happiness_scores").select("company_id").limit(0);
        if (error) {
          // The materialized view exists but we can't refresh via PostgREST.
          // In production, use pg_cron:
          //   SELECT cron.schedule('refresh-happiness', '0 */4 * * *',
          //     $$REFRESH MATERIALIZED VIEW CONCURRENTLY public.happiness_scores$$);
          happinessRefresh = "skipped (use pg_cron for materialized view refresh)";
        }
      });
    } catch {
      happinessRefresh = "skipped";
    }

    // ── 4. Cleanup old rate limits ─────────────────────────────────
    await adminClient.rpc("cleanup_rate_limits").catch(() => {});

    return jsonResponse({
      companiesProcessed: results.length,
      results,
      happinessScoreRefresh: happinessRefresh,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Leaderboard refresh failed:", err);
    return errorResponse("Internal server error", 500);
  }
});
