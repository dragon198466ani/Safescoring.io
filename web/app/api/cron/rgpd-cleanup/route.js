/**
 * RGPD Cleanup Cron Job
 * Runs daily to clean up PII data according to retention periods
 *
 * Configure in Vercel: Settings > Cron Jobs
 * Schedule: 0 4 * * * (daily at 4 AM UTC)
 *
 * Retention periods:
 * - 24h: evaluation_votes, community_votes (ip_hash, device_fingerprint)
 * - 7 days: share_events, challenges (ip_hash, user_agent)
 * - 30 days: security_events, login_attempts, audit_logs, api_usage, honeypot_triggers, anti_copy_logs
 * - 90 days: admin_audit_logs
 */

import { NextResponse } from "next/server";
import { getSupabase } from "@/libs/supabase";
import crypto from "crypto";

/**
 * SECURITY: Constant-time comparison for cron secret
 */
function verifyCronSecret(providedSecret) {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || !providedSecret) {
    return false;
  }

  try {
    const provided = Buffer.from(providedSecret);
    const expected = Buffer.from(expectedSecret);

    if (provided.length !== expected.length) {
      crypto.timingSafeEqual(expected, expected);
      return false;
    }

    return crypto.timingSafeEqual(provided, expected);
  } catch {
    return false;
  }
}

export async function GET(request) {
  // Verify authorization with timing-safe comparison
  const cronSecret =
    request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (!verifyCronSecret(cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const results = {
    timestamp: new Date().toISOString(),
    cleanup: {},
    totals: {
      tables_processed: 0,
      rows_cleaned: 0,
    },
    errors: [],
  };

  try {
    const supabase = getSupabase();

    // Call the comprehensive cleanup function
    const { data: cleanupData, error: cleanupError } = await supabase.rpc(
      "cleanup_all_pii"
    );

    if (cleanupError) {
      // Fallback: try individual cleanup functions
      console.warn(
        "[CRON] cleanup_all_pii not found, trying individual functions:",
        cleanupError.message
      );

      // Try the basic evaluation_votes cleanup
      const { data: votesData, error: votesError } = await supabase.rpc(
        "cleanup_evaluation_votes_pii"
      );

      if (votesError) {
        results.errors.push({
          function: "cleanup_evaluation_votes_pii",
          error: votesError.message,
        });
      } else {
        results.cleanup.evaluation_votes = {
          rows_cleaned: votesData || 0,
          retention_period: "24 hours",
        };
        results.totals.rows_cleaned += votesData || 0;
        results.totals.tables_processed += 1;
      }
    } else if (cleanupData) {
      // Process results from cleanup_all_pii
      for (const row of cleanupData) {
        results.cleanup[row.table_name] = {
          rows_cleaned: row.rows_cleaned,
          retention_period: row.retention_period,
        };
        results.totals.rows_cleaned += row.rows_cleaned || 0;
        results.totals.tables_processed += 1;
      }
    }

    // Log cleanup event for audit trail
    const { error: logError } = await supabase
      .from("token_transactions")
      .insert({
        user_hash: "SYSTEM_CRON_RGPD",
        action_type: "rgpd_cleanup",
        tokens_amount: 0,
        description: JSON.stringify({
          summary: {
            tables_processed: results.totals.tables_processed,
            rows_cleaned: results.totals.rows_cleaned,
            duration_ms: Date.now() - startTime,
          },
          details: results.cleanup,
          errors: results.errors.length > 0 ? results.errors : undefined,
        }),
      });

    if (logError) {
      // Non-critical, just log
      console.warn("[CRON] Failed to log cleanup event:", logError.message);
    }

    results.duration_ms = Date.now() - startTime;
    results.success = results.errors.length === 0;

    console.log(
      `[CRON] RGPD cleanup completed: ${results.totals.rows_cleaned} rows cleaned across ${results.totals.tables_processed} tables in ${results.duration_ms}ms`
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error("[CRON] RGPD cleanup failed:", error);

    results.errors.push({ stage: "global", error: error.message });
    results.duration_ms = Date.now() - startTime;
    results.success = false;

    return NextResponse.json(results, { status: 500 });
  }
}

// Support POST for manual triggers
export async function POST(request) {
  return GET(request);
}

export const runtime = "nodejs";
export const maxDuration = 60; // Increased for multiple table cleanup
