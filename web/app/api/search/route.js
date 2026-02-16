import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";
import { searchQuerySchema, validateSearchParams } from "@/libs/validations";
import config from "@/config";

/**
 * Product Search API
 * GET /api/search?q=wallet&type=hardware&limit=10
 */

export async function GET(request) {
  // Rate limiting
  const protection = await quickProtect(request, "public");
  if (protection.blocked) return protection.response;

  const { searchParams } = new URL(request.url);

  // CORS headers - restrict to allowed origins
  const allowedOrigin = process.env.ALLOWED_ORIGINS?.split(",")[0]?.trim() || "https://safescoring.io";
  const headers = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET",
    "Cache-Control": "public, max-age=300, s-maxage=300",
  };

  // Validate inputs
  const validation = validateSearchParams(searchParams, searchQuerySchema);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400, headers }
    );
  }

  const { q: query, type, limit } = validation.data;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500, headers }
    );
  }

  try {
    // Build query
    let dbQuery = supabase
      .from("products")
      .select(`
        id,
        name,
        slug,
        url,
        type_id,
        product_types (name)
      `)
      .ilike("name", `%${query}%`)
      .limit(limit);

    // Filter by type if provided
    if (type) {
      const { data: typeData } = await supabase
        .from("product_types")
        .select("id")
        .ilike("slug", type)
        .maybeSingle();

      if (typeData) {
        dbQuery = dbQuery.eq("type_id", typeData.id);
      }
    }

    const { data: products, error } = await dbQuery;

    if (error) {
      console.error("Search error:", error);
      return NextResponse.json(
        { error: "Search failed" },
        { status: 500, headers }
      );
    }

    // Get scores for found products
    const productIds = products.map(p => p.id);
    const scoreMap = {};

    if (productIds.length > 0) {
      const { data: scores } = await supabase
        .from("safe_scoring_results")
        .select("product_id, note_finale")
        .in("product_id", productIds)
        .order("calculated_at", { ascending: false });

      // Create score map (latest score per product)
      scores?.forEach(s => {
        if (!scoreMap[s.product_id]) {
          scoreMap[s.product_id] = Math.round(s.note_finale || 0);
        }
      });
    }

    // Format results
    const results = products.map(p => ({
      slug: p.slug,
      name: p.name,
      type: p.product_types?.name || "Unknown",
      url: p.url,
      score: scoreMap[p.id] || null,
      detailsUrl: `https://${config.domainName}/products/${p.slug}`,
    }));

    // Sort by score (highest first), then by name
    results.sort((a, b) => {
      if (a.score === null && b.score === null) return a.name.localeCompare(b.name);
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      return b.score - a.score;
    });

    return NextResponse.json(
      {
        query,
        results,
        total: results.length,
      },
      { headers }
    );
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  const allowedOrigin = process.env.ALLOWED_ORIGINS?.split(",")[0]?.trim() || "https://safescoring.io";
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
