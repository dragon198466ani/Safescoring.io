/**
 * Security Cleanup Cron Job
 * Runs daily to clean up old security data and generate reports
 *
 * Configure in Vercel: Settings > Cron Jobs
 * Schedule: 0 3 * * * (daily at 3 AM UTC)
 */

import { NextResponse } from "next/server";
import { getSupabase } from "@/libs/supabase";
import { SecurityAlerts } from "@/libs/security-alerts";
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
  const cronSecret = request.headers.get("x-cron-secret") || request.headers.get("authorization")?.replace("Bearer ", "");

  if (!verifyCronSecret(cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const results = {
    timestamp: new Date().toISOString(),
    cleanup: {},
    report: null,
    errors: [],
  };

  try {
    const supabase = getSupabase();

    // 1. Run cleanup function
    const { data: cleanupData, error: cleanupError } = await supabase.rpc(
      "cleanup_security_tables"
    );

    if (cleanupError) {
      results.errors.push({ stage: "cleanup", error: cleanupError.message });
    } else {
      results.cleanup = cleanupData?.reduce((acc, row) => {
        acc[row.table_name] = row.rows_deleted;
        return acc;
      }, {}) || {};
    }

    // 2. Generate security report
    const { data: reportData, error: reportError } = await supabase.rpc(
      "generate_security_report",
      { report_period: "24 hours" }
    );

    if (reportError) {
      results.errors.push({ stage: "report", error: reportError.message });
    } else {
      results.report = reportData;
    }

    // 3. Check for critical issues and send alerts
    if (results.report) {
      const summary = results.report.summary;

      // Alert if critical events
      if (summary.critical_events > 0) {
        await SecurityAlerts.dataBreachAttempt({
          critical_events: summary.critical_events,
          period: "24 hours",
          report: results.report,
        });
      }

      // Alert if many blocked IPs
      if (summary.blocked_ips > 10) {
        await SecurityAlerts.bruteForceDetected({
          blocked_ips: summary.blocked_ips,
          period: "24 hours",
        });
      }
    }

    // 4. Verify data integrity
    const { data: integrityData, error: integrityError } = await supabase.rpc(
      "verify_integrity",
      { target_table: "products" }
    );

    if (integrityError) {
      results.errors.push({ stage: "integrity", error: integrityError.message });
    } else if (integrityData?.[0]?.status === "DATA_LOSS_DETECTED") {
      // CRITICAL: Data loss detected
      await SecurityAlerts.massDeleteAttempt({
        status: integrityData[0].status,
        current_count: integrityData[0].current_count,
        last_checkpoint_count: integrityData[0].last_checkpoint_count,
        difference: integrityData[0].difference,
      });
      results.integrityAlert = true;
    }

    // 5. Create new integrity checkpoints
    await supabase.rpc("create_integrity_checkpoint", { target_table: "products" });
    await supabase.rpc("create_integrity_checkpoint", { target_table: "users" });

    results.duration_ms = Date.now() - startTime;
    results.success = results.errors.length === 0;

    // Log the results
    await supabase.from("security_events").insert({
      event_type: "CRON_CLEANUP_COMPLETED",
      severity: results.errors.length > 0 ? "medium" : "low",
      details: results,
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("[CRON] Security cleanup failed:", error);

    results.errors.push({ stage: "global", error: error.message });
    results.duration_ms = Date.now() - startTime;
    results.success = false;

    return NextResponse.json(results, { status: 500 });
  }
}

// Also support POST for manual triggers
export async function POST(request) {
  return GET(request);
}

export const runtime = "nodejs";
export const maxDuration = 60;
