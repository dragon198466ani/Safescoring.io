/**
 * Platform Stats API
 * GET /api/platform-stats
 *
 * Returns centralized platform statistics from the platform_stats table.
 * This is the single source of truth for all stats displayed on the website.
 * Stats are auto-updated via database triggers when data changes.
 */

import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

// Cache for 5 minutes (stats don't change that often)
export const revalidate = 300;

// Default fallback values (used if Supabase is not configured or fails)
// These should match config.js fallback values
const DEFAULT_STATS = {
  totalNorms: 2376,
  totalProducts: 1535,
  totalProductTypes: 78,
  totalEvaluations: 3314065, // 1535 products × 2159 evals per product
  normsByPillar: {
    S: 872,
    A: 540,
    F: 346,
    E: 618,
  },
  productsEvaluated: 1535,
  productsPending: 0,
  scoreDistribution: {
    excellent: 190,  // ~13%
    good: 570,       // ~38%
    fair: 570,       // ~38%
    poor: 170,       // ~11%
  },
  avgScores: {
    global: 62,
    S: 65,
    A: 58,
    F: 64,
    E: 61,
  },
  lastUpdatedAt: new Date().toISOString(),
};

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      success: true,
      data: DEFAULT_STATS,
      source: "fallback",
    });
  }

  try {
    const { data, error } = await supabase
      .from("platform_stats")
      .select("*")
      .eq("id", 1)
      .single();

    if (error) {
      console.error("Error fetching platform stats:", error);
      // Try to get stats directly if table doesn't exist yet
      return await getFallbackStats();
    }

    const stats = {
      totalNorms: data.total_norms,
      totalProducts: data.total_products,
      totalProductTypes: data.total_product_types,
      totalEvaluations: data.total_evaluations,
      normsByPillar: {
        S: data.norms_security,
        A: data.norms_adversity,
        F: data.norms_fidelity,
        E: data.norms_efficiency,
      },
      productsEvaluated: data.products_evaluated,
      productsPending: data.products_pending,
      scoreDistribution: {
        excellent: data.products_excellent,
        good: data.products_good,
        fair: data.products_fair,
        poor: data.products_poor,
      },
      avgScores: {
        global: parseFloat(data.avg_score_global) || 0,
        S: parseFloat(data.avg_score_s) || 0,
        A: parseFloat(data.avg_score_a) || 0,
        F: parseFloat(data.avg_score_f) || 0,
        E: parseFloat(data.avg_score_e) || 0,
      },
      lastUpdatedAt: data.last_updated_at,
    };

    return NextResponse.json({
      success: true,
      data: stats,
      source: "database",
    }, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Platform stats API error:", error);
    return NextResponse.json({
      success: true,
      data: DEFAULT_STATS,
      source: "fallback",
    });
  }
}

/**
 * Fallback: calculate stats directly if platform_stats table doesn't exist
 */
async function getFallbackStats() {
  try {
    const [normsResult, productsResult, typesResult] = await Promise.all([
      supabase.from("norms").select("pillar", { count: "exact" }),
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("product_types").select("*", { count: "exact", head: true }),
    ]);

    const norms = normsResult.data || [];
    const normsByPillar = {
      S: norms.filter(n => n.pillar === "S").length,
      A: norms.filter(n => n.pillar === "A").length,
      F: norms.filter(n => n.pillar === "F").length,
      E: norms.filter(n => n.pillar === "E").length,
    };

    const stats = {
      totalNorms: normsResult.count || DEFAULT_STATS.totalNorms,
      totalProducts: productsResult.count || DEFAULT_STATS.totalProducts,
      totalProductTypes: typesResult.count || DEFAULT_STATS.totalProductTypes,
      totalEvaluations: DEFAULT_STATS.totalEvaluations,
      normsByPillar,
      productsEvaluated: DEFAULT_STATS.productsEvaluated,
      productsPending: DEFAULT_STATS.productsPending,
      scoreDistribution: DEFAULT_STATS.scoreDistribution,
      avgScores: DEFAULT_STATS.avgScores,
      lastUpdatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: stats,
      source: "calculated",
    });
  } catch (error) {
    console.error("Fallback stats calculation error:", error);
    return NextResponse.json({
      success: true,
      data: DEFAULT_STATS,
      source: "fallback",
    });
  }
}
