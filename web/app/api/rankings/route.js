import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { API_DISCLAIMER } from "@/libs/api-disclaimer";

/**
 * Product Rankings API
 * GET /api/rankings?category=hardware-wallets&limit=10
 *
 * Returns top-rated products by security score
 */

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 50);

  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET",
    "Cache-Control": "public, max-age=3600, s-maxage=3600",
  };

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500, headers }
    );
  }

  try {
    // Get type if category specified
    let typeId = null;
    let categoryName = "All Products";

    if (category) {
      const { data: typeData } = await supabase
        .from("product_types")
        .select("id, name")
        .eq("slug", category)
        .maybeSingle();

      if (typeData) {
        typeId = typeData.id;
        categoryName = typeData.name;
      }
    }

    // Get products
    let query = supabase
      .from("products")
      .select(`
        id,
        name,
        slug,
        type_id,
        product_types (name)
      `);

    if (typeId) {
      query = query.eq("type_id", typeId);
    }

    const { data: products, error: productsError } = await query;

    if (productsError) {
      console.error("Products query error:", productsError);
      return NextResponse.json(
        { error: "Failed to fetch products" },
        { status: 500, headers }
      );
    }

    if (!products || products.length === 0) {
      return NextResponse.json(
        {
          category: categoryName,
          products: [],
        },
        { headers }
      );
    }

    // Get latest scores for all products
    const productIds = products.map(p => p.id);

    const { data: allScores } = await supabase
      .from("safe_scoring_results")
      .select("product_id, note_finale, score_s, score_a, score_f, score_e, calculated_at")
      .in("product_id", productIds)
      .order("calculated_at", { ascending: false });

    // Get latest score per product
    const scoreMap = {};
    allScores?.forEach(s => {
      if (!scoreMap[s.product_id]) {
        scoreMap[s.product_id] = {
          score: Math.round(s.note_finale || 0),
          scores: {
            s: Math.round(s.score_s || 0),
            a: Math.round(s.score_a || 0),
            f: Math.round(s.score_f || 0),
            e: Math.round(s.score_e || 0),
          },
          lastUpdated: s.calculated_at,
        };
      }
    });

    // Build rankings
    const rankings = products
      .filter(p => scoreMap[p.id]) // Only products with scores
      .map(p => ({
        slug: p.slug,
        name: p.name,
        type: p.product_types?.name || "Unknown",
        ...scoreMap[p.id],
        detailsUrl: `https://safescoring.io/products/${p.slug}`,
      }))
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .slice(0, limit) // Apply limit
      .map((item, idx) => ({
        rank: idx + 1,
        ...item,
      }));

    return NextResponse.json(
      {
        _legal: API_DISCLAIMER,
        category: categoryName,
        categorySlug: category || null,
        products: rankings,
        total: rankings.length,
      },
      { headers }
    );
  } catch (error) {
    console.error("Rankings API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
