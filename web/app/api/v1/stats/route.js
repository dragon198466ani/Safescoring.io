import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { checkRateLimit, getClientId } from "@/libs/rate-limit";

/**
 * SafeScoring Public API v1 - Global Statistics
 *
 * GET /api/v1/stats
 *
 * Returns aggregate statistics about:
 * - Total products evaluated
 * - Score distribution
 * - Products by type
 * - Recent incidents summary
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};

export async function GET(request) {
  const clientId = getClientId(request);
  const rateCheck = checkRateLimit(clientId, "public");

  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: CORS_HEADERS }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503, headers: CORS_HEADERS });
  }

  try {
    // Run all queries in parallel for better performance
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      productsResult,
      scoresResult,
      typeDataResult,
      productTypesResult,
      incidentsResult,
      normsResult,
    ] = await Promise.all([
      // Get total products
      supabase.from("products").select("*", { count: "exact", head: true }),
      // Get products with scores
      supabase.from("safe_scoring_results").select("product_id, note_finale").order("calculated_at", { ascending: false }),
      // Products by type
      supabase.from("products").select("type_id, product_types(name, slug)"),
      // Total product types
      supabase.from("product_types").select("*", { count: "exact", head: true }),
      // Recent incidents (last 30 days)
      supabase.from("security_incidents").select("severity, funds_lost_usd", { count: "exact" }).eq("is_published", true).gte("incident_date", thirtyDaysAgo.toISOString()),
      // Total norms
      supabase.from("norms").select("*", { count: "exact", head: true }),
    ]);

    const totalProducts = productsResult.count;
    const scores = scoresResult.data;
    const typeData = typeDataResult.data;
    const totalProductTypes = productTypesResult.count;
    const recentIncidents = incidentsResult.data;
    const totalIncidents = incidentsResult.count;
    const totalNorms = normsResult.count;

    // Deduplicate to get latest score per product
    const latestScores = {};
    for (const s of scores || []) {
      if (!latestScores[s.product_id]) {
        latestScores[s.product_id] = s.note_finale;
      }
    }
    const scoreValues = Object.values(latestScores);

    // Score distribution
    const scoreDistribution = {
      excellent: scoreValues.filter(s => s >= 80).length,
      good: scoreValues.filter(s => s >= 60 && s < 80).length,
      fair: scoreValues.filter(s => s >= 40 && s < 60).length,
      poor: scoreValues.filter(s => s < 40).length,
    };

    // Average score
    const avgScore = scoreValues.length > 0
      ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length)
      : 0;

    const byType = {};
    for (const p of typeData || []) {
      const typeName = p.product_types?.name || "Other";
      byType[typeName] = (byType[typeName] || 0) + 1;
    }

    const incidentStats = {
      last30Days: recentIncidents?.length || 0,
      totalTracked: totalIncidents || 0,
      totalFundsLost: (recentIncidents || []).reduce((sum, i) => sum + (i.funds_lost_usd || 0), 0),
      bySeverity: {
        critical: recentIncidents?.filter(i => i.severity === "critical").length || 0,
        high: recentIncidents?.filter(i => i.severity === "high").length || 0,
        medium: recentIncidents?.filter(i => i.severity === "medium").length || 0,
        low: recentIncidents?.filter(i => i.severity === "low").length || 0,
      }
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          products: {
            total: totalProducts || 0,
            evaluated: scoreValues.length,
            averageScore: avgScore,
            scoreDistribution,
            byType,
            totalProductTypes: totalProductTypes || 88,
          },
          methodology: {
            totalNorms: totalNorms || 1100,
            pillars: ["Security", "Adversity", "Fidelity", "Efficiency"],
            version: "2.0",
          },
          incidents: incidentStats,
          lastUpdated: new Date().toISOString(),
        },
        meta: {
          apiVersion: "1.0",
          timestamp: new Date().toISOString(),
        }
      },
      {
        headers: {
          ...CORS_HEADERS,
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        }
      }
    );

  } catch (error) {
    console.error("API v1 stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS });
}
