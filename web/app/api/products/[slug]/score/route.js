import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/libs/supabase";

/**
 * Product Score API
 * Returns score data for a product by slug
 *
 * GET /api/products/[slug]/score
 *
 * Used by:
 * - Chrome extension
 * - Badge widget
 * - Third-party integrations
 */

export async function GET(request, { params }) {
  const { slug } = await params;

  // CORS headers for extension access
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET",
    "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=172800",
  };

  try {
    const supabase = getSupabaseServer();

    // Fetch product
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, slug, url, type_id")
      .eq("slug", slug)
      .maybeSingle();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404, headers }
      );
    }

    // Fetch type
    let typeName = "Crypto Product";
    if (product.type_id) {
      const { data: typeData } = await supabase
        .from("product_types")
        .select("name")
        .eq("id", product.type_id)
        .maybeSingle();
      if (typeData) typeName = typeData.name;
    }

    // Fetch latest score
    const { data: scoreData } = await supabase
      .from("safe_scoring_results")
      .select("note_finale, score_s, score_a, score_f, score_e, calculated_at")
      .eq("product_id", product.id)
      .order("calculated_at", { ascending: false })
      .limit(1);

    const latestScore = scoreData?.[0];

    if (!latestScore) {
      return NextResponse.json(
        {
          slug: product.slug,
          name: product.name,
          type: typeName,
          score: null,
          scores: null,
          message: "Product not yet evaluated"
        },
        { headers }
      );
    }

    // Return score data
    return NextResponse.json(
      {
        slug: product.slug,
        name: product.name,
        type: typeName,
        url: product.url,
        score: Math.round(latestScore.note_finale || 0),
        scores: {
          s: Math.round(latestScore.score_s || 0),
          a: Math.round(latestScore.score_a || 0),
          f: Math.round(latestScore.score_f || 0),
          e: Math.round(latestScore.score_e || 0),
        },
        lastUpdated: latestScore.calculated_at,
        detailsUrl: `https://safescoring.io/products/${product.slug}`,
      },
      { headers }
    );

  } catch (error) {
    console.error("Error fetching product score:", error);
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
