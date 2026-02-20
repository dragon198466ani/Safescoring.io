/**
 * Partner API - Products Endpoint
 * GET /api/v1/partner/products - List products
 * GET /api/v1/partner/products?type=hardware_wallet - Filter by type
 */
import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { validatePartnerKey, trackUsage } from "@/libs/partner-auth";

export async function GET(request) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");

  const auth = await validatePartnerKey(request);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { 
      status: auth.retryAfter ? 429 : 401 
    });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    let query = supabase
      .from("products")
      .select("id, name, slug, product_type, logo_url, website", { count: "exact" })
      .order("name")
      .range(offset, offset + limit - 1);

    if (type) query = query.eq("product_type", type);

    const { data: products, count } = await query;

    if (!products?.length) {
      return NextResponse.json({ results: [], count: 0 });
    }

    // Get scores for all products
    const productIds = products.map(p => p.id);
    const { data: scores } = await supabase
      .from("safe_scoring_results")
      .select("product_id, note_finale, tier")
      .in("product_id", productIds)
      .order("calculated_at", { ascending: false });

    const latestScores = {};
    scores?.forEach(s => { if (!latestScores[s.product_id]) latestScores[s.product_id] = s; });

    const results = products.map(p => ({
      name: p.name,
      slug: p.slug,
      type: p.product_type,
      logo: p.logo_url,
      website: p.website,
      score: latestScores[p.id] ? Math.round(latestScores[p.id].note_finale) : null,
      tier: latestScores[p.id]?.tier || null
    }));

    await trackUsage(auth.partnerId, auth.keyId, "/v1/partner/products", 200, Date.now() - startTime);

    return NextResponse.json({
      results,
      pagination: { total: count, limit, offset, hasMore: offset + limit < count },
      ...(!auth.whiteLabel && { _source: "SafeScoring" })
    });

  } catch (error) {
    console.error("Partner products error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
