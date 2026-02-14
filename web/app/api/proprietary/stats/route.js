import { NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";
import { auth } from "@/libs/auth";
import {
  protectAuthenticatedRequest,
  sleep,
  calculatePublicDelay,
} from "@/libs/user-protection";

/**
 * GET /api/proprietary/stats
 * Returns proprietary data statistics (public - shows moat value)
 *
 * This endpoint demonstrates to users (and competitors)
 * the unique data SafeScoring has collected.
 */
export async function GET(request) {
  try {
    // Check authentication first
    let isAuthenticated = false;
    let isPaid = false;

    try {
      const session = await auth();
      if (session?.user?.id) {
        isAuthenticated = true;
        isPaid = session.user.hasAccess || false;

        // Check user-level rate limiting
        const userProtection = await protectAuthenticatedRequest(
          session.user.id,
          "/api/proprietary/stats",
          { isPaid }
        );

        if (!userProtection.allowed) {
          return NextResponse.json(
            {
              error: userProtection.message,
              reason: userProtection.reason,
              retryAfter: userProtection.retryAfter,
            },
            {
              status: userProtection.status,
              headers: { "Retry-After": String(userProtection.retryAfter || 60) },
            }
          );
        }

        // Apply artificial delay for authenticated users
        if (userProtection.delay > 0) {
          await sleep(userProtection.delay);
        }
      }
    } catch (_e) {
      // Auth failed, continue as unauthenticated
    }

    // IP-level protection for unauthenticated requests
    if (!isAuthenticated) {
      const protection = await quickProtect(request, "public");
      if (protection.blocked) {
        return protection.response;
      }

      // Apply artificial delay for unauthenticated users
      const publicDelay = calculatePublicDelay(protection.clientId, false);
      await sleep(publicDelay);
    }

    if (!isSupabaseConfigured() || !supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Collect proprietary metrics
    const [
      incidentsResult,
      scoreHistoryResult,
      productsResult,
      onchainResult,
    ] = await Promise.all([
      // Total incidents tracked
      supabaseAdmin
        .from("security_incidents")
        .select("*", { count: "exact", head: true }),

      // Score history records
      supabaseAdmin
        .from("score_history")
        .select("recorded_at", { count: "exact" })
        .order("recorded_at", { ascending: true })
        .limit(1),

      // Products evaluated
      supabaseAdmin
        .from("products")
        .select("*", { count: "exact", head: true }),

      // On-chain snapshots (if table exists)
      supabaseAdmin
        .from("onchain_snapshots")
        .select("*", { count: "exact", head: true })
        .catch(() => ({ count: 0 })),
    ]);

    // Get earliest tracking date
    let trackingSince = null;
    if (scoreHistoryResult.data && scoreHistoryResult.data.length > 0) {
      trackingSince = scoreHistoryResult.data[0].recorded_at;
    }

    // Calculate days of tracking
    const daysTracking = trackingSince
      ? Math.floor((Date.now() - new Date(trackingSince).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Get recent incidents for "freshness" indicator
    const { data: recentIncidents } = await supabaseAdmin
      .from("security_incidents")
      .select("incident_date, title, severity, funds_lost_usd")
      .order("incident_date", { ascending: false })
      .limit(5);

    // Calculate total funds tracked
    const { data: fundsData } = await supabaseAdmin
      .from("security_incidents")
      .select("funds_lost_usd");

    const totalFundsTracked = fundsData?.reduce(
      (sum, inc) => sum + (parseFloat(inc.funds_lost_usd) || 0),
      0
    ) || 0;

    const stats = {
      // Core metrics
      totalIncidentsTracked: incidentsResult.count || 0,
      totalScoreHistoryRecords: scoreHistoryResult.count || 0,
      totalProductsEvaluated: productsResult.count || 0,
      totalOnchainSnapshots: onchainResult?.count || 0,

      // Moat indicators
      trackingSince,
      daysOfHistoricalData: daysTracking,
      totalFundsTrackedUsd: totalFundsTracked,

      // Freshness
      recentIncidents: recentIncidents?.map((inc) => ({
        title: inc.title?.substring(0, 100),
        severity: inc.severity,
        fundsLost: inc.funds_lost_usd,
        date: inc.incident_date,
      })) || [],

      // Data uniqueness message
      moatMessage: `${daysTracking} days of historical data that cannot be replicated by competitors starting today.`,

      // Last updated
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Proprietary stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
