import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";

// Cache for 1 hour — norm counts rarely change
export const revalidate = 3600;

// GET /api/norms/stats — Returns real norm counts from the database
// This is the SINGLE SOURCE OF TRUTH for all norm-related numbers
export async function GET(request) {
  // Rate limit: public endpoint
  const protection = await quickProtect(request, "public");
  if (protection.blocked) return protection.response;
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
    // Total norm count
    const { count: totalNorms } = await supabase
      .from("norms")
      .select("*", { count: "exact", head: true });

    // Count per pillar (S, A, F, E)
    const { data: pillarCounts } = await supabase
      .from("norms")
      .select("pillar");

    const byPillar = { S: 0, A: 0, F: 0, E: 0 };
    if (pillarCounts) {
      for (const row of pillarCounts) {
        if (byPillar[row.pillar] !== undefined) {
          byPillar[row.pillar]++;
        }
      }
    }

    // Total products
    const { count: totalProducts } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });

    // Total product types
    const { count: totalProductTypes } = await supabase
      .from("product_types")
      .select("*", { count: "exact", head: true });

    // Total evaluations
    const { count: totalEvaluations } = await supabase
      .from("evaluations")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      totalNorms: totalNorms || 0,
      byPillar,
      totalProducts: totalProducts || 0,
      totalProductTypes: totalProductTypes || 0,
      totalEvaluations: totalEvaluations || 0,
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Norms stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch norm stats" },
      { status: 500 }
    );
  }
}
