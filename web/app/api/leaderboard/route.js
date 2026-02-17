import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

export const revalidate = 300;

/**
 * GET /api/leaderboard
 * Get top products leaderboard (product-only, no personal data)
 */
export async function GET(request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

    // Only return product scores — no user/person data
    const { data: products, error } = await supabase
      .from("safe_scoring_results")
      .select(`
        product_id,
        note_finale,
        score_s,
        score_a,
        score_f,
        score_e,
        products!inner (
          id,
          name,
          slug
        )
      `)
      .not("note_finale", "is", null)
      .order("note_finale", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching leaderboard:", error);
      return NextResponse.json(
        { error: "Failed to fetch leaderboard" },
        { status: 500 }
      );
    }

    const formattedProducts = (products || []).map((item, index) => ({
      rank: index + 1,
      name: item.products.name,
      slug: item.products.slug,
      score: Math.round(item.note_finale || 0),
      scores: {
        s: Math.round(item.score_s || 0),
        a: Math.round(item.score_a || 0),
        f: Math.round(item.score_f || 0),
        e: Math.round(item.score_e || 0),
      },
    }));

    // Aggregated anonymous stats only
    const { count: totalCorrections } = await supabase
      .from("user_corrections")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved");

    return NextResponse.json(
      {
        leaderboard: formattedProducts,
        stats: {
          totalProducts: formattedProducts.length,
          totalApprovedCorrections: totalCorrections || 0,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
