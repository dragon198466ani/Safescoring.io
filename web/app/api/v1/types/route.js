import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

/**
 * SafeScoring Public API v1 - Product Types
 *
 * GET /api/v1/types
 *
 * Returns all product categories/types with counts
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503, headers: CORS_HEADERS });
  }

  try {
    // Get all types with product counts
    const { data: types } = await supabase
      .from("product_types")
      .select("id, name, slug, description")
      .order("name");

    // Get product counts per type
    const { data: products } = await supabase
      .from("products")
      .select("type_id");

    const countMap = {};
    for (const p of products || []) {
      countMap[p.type_id] = (countMap[p.type_id] || 0) + 1;
    }

    const results = (types || []).map(t => ({
      slug: t.slug,
      name: t.name,
      description: t.description,
      productCount: countMap[t.id] || 0,
    })).filter(t => t.productCount > 0);

    return NextResponse.json(
      {
        success: true,
        data: results,
        meta: {
          apiVersion: "1.0",
          totalTypes: results.length,
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
    console.error("API v1 types error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS });
}
