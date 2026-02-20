import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";
import { auth } from "@/libs/auth";
import {
  protectAuthenticatedRequest,
  sleep,
  calculatePublicDelay,
} from "@/libs/user-protection";

export const dynamic = "force-dynamic";

// GET /api/stats/moat - Get unique data statistics (competitive advantage)
// Enhanced with GPT-Proof data tracking
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
          "/api/stats/moat",
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

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    // Count daily score history snapshots
    const { count: historyCount } = await supabase
      .from("score_history")
      .select("*", { count: "exact", head: true });

    // Count hourly score snapshots (GPT-Proof enhancement)
    const { count: hourlyCount } = await supabase
      .from("score_history_hourly")
      .select("*", { count: "exact", head: true })
      .catch(() => ({ count: 0 }));

    // Count security incidents
    const { count: incidentCount } = await supabase
      .from("security_incidents")
      .select("*", { count: "exact", head: true });

    // Count evaluations
    const { count: evaluationCount } = await supabase
      .from("evaluations")
      .select("*", { count: "exact", head: true });

    // Count products
    const { count: productCount } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });

    // Count norms
    const { count: normCount } = await supabase
      .from("norms")
      .select("*", { count: "exact", head: true });

    // Count user corrections (closed-loop data)
    const { count: correctionsCount } = await supabase
      .from("user_corrections")
      .select("*", { count: "exact", head: true })
      .catch(() => ({ count: 0 }));

    // Count predictions
    const { count: predictionsCount } = await supabase
      .from("prediction_accuracy")
      .select("*", { count: "exact", head: true })
      .catch(() => ({ count: 0 }));

    // Count correct predictions
    const { count: correctPredictions } = await supabase
      .from("prediction_accuracy")
      .select("*", { count: "exact", head: true })
      .eq("prediction_accuracy", "correct_positive")
      .catch(() => ({ count: 0 }));

    // Get date of first score history record
    const { data: firstHistory } = await supabase
      .from("score_history")
      .select("recorded_at")
      .order("recorded_at", { ascending: true })
      .limit(1);

    // Get date of first incident
    const { data: firstIncident } = await supabase
      .from("security_incidents")
      .select("incident_date")
      .order("incident_date", { ascending: true })
      .limit(1);

    // Calculate days of tracking
    const trackingStartDate = firstHistory?.[0]?.recorded_at;
    const daysTracking = trackingStartDate
      ? Math.floor((Date.now() - new Date(trackingStartDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Total unique data points
    const totalUniqueData =
      (historyCount || 0) +
      (hourlyCount || 0) +
      (incidentCount || 0) +
      (evaluationCount || 0) +
      (correctionsCount || 0) +
      (predictionsCount || 0);

    // Calculate moat strength
    let moatStrength = "STARTING";
    if (totalUniqueData >= 50000 && daysTracking >= 365) {
      moatStrength = "FORTRESS";
    } else if (totalUniqueData >= 20000 && daysTracking >= 180) {
      moatStrength = "STRONG";
    } else if (totalUniqueData >= 5000 && daysTracking >= 90) {
      moatStrength = "BUILDING";
    } else if (totalUniqueData >= 1000) {
      moatStrength = "EMERGING";
    }

    return NextResponse.json({
      uniqueData: {
        dailySnapshots: historyCount || 0,
        hourlySnapshots: hourlyCount || 0,
        securityIncidents: incidentCount || 0,
        productEvaluations: evaluationCount || 0,
        userCorrections: correctionsCount || 0,
        predictions: predictionsCount || 0,
        total: totalUniqueData,
      },
      coverage: {
        products: productCount || 0,
        norms: normCount || 0,
        avgEvaluationsPerProduct:
          productCount > 0
            ? Math.round((evaluationCount || 0) / productCount)
            : 0,
      },
      tracking: {
        historyStartDate: firstHistory?.[0]?.recorded_at || null,
        incidentTrackingStartDate: firstIncident?.[0]?.incident_date || null,
        daysOfData: daysTracking,
        hasHistoricalData: (historyCount || 0) > 0,
        hasHourlyData: (hourlyCount || 0) > 0,
        hasIncidentData: (incidentCount || 0) > 0,
      },
      predictions: {
        total: predictionsCount || 0,
        correct: correctPredictions || 0,
        accuracyRate: predictionsCount > 0
          ? Math.round((correctPredictions / predictionsCount) * 100)
          : null,
      },
      moat: {
        strength: moatStrength,
        competitorCatchUpTime: `${daysTracking} days minimum`,
        dataPointsPerDay: daysTracking > 0
          ? Math.round(totalUniqueData / daysTracking)
          : totalUniqueData,
      },
      competitiveAdvantage: {
        historicalTracking: (historyCount || 0) > 0,
        hourlyGranularity: (hourlyCount || 0) > 0,
        incidentIntelligence: (incidentCount || 0) > 0,
        predictionTracking: (predictionsCount || 0) > 0,
        communityFeedback: (correctionsCount || 0) > 0,
        deepEvaluations: (evaluationCount || 0) > 10000,
        comprehensiveCoverage: (productCount || 0) > 100,
      },
      message: `SafeScoring possesses ${totalUniqueData.toLocaleString()} unique data points that cannot be replicated by competitors. Moat strength: ${moatStrength}`,
      messageFr: `SafeScoring possède ${totalUniqueData.toLocaleString()} points de données uniques impossibles à reproduire. Force du moat: ${moatStrength}`,
    });
  } catch (error) {
    console.error("Error fetching moat stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
