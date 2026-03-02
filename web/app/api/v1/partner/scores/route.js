/**
 * Partner API - Scores Endpoint
 * GET /api/v1/partner/scores?slug=product-slug
 * GET /api/v1/partner/scores?slugs=slug1,slug2,slug3 (bulk)
 */
import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { validatePartnerKey, trackUsage } from "@/libs/partner-auth";
import { API_DISCLAIMER } from "@/libs/api-disclaimer";

export async function GET(request) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const slugs = searchParams.get("slugs")?.split(",").slice(0, 50);

  // Validate API key
  const auth = await validatePartnerKey(request);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { 
      status: auth.retryAfter ? 429 : 401,
      headers: auth.retryAfter ? { "Retry-After": auth.retryAfter } : {}
    });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    // Single product
    if (slug) {
      const { data: product } = await supabase
        .from("products")
        .select("id, name, slug, product_type")
        .eq("slug", slug)
        .single();

      if (!product) {
        await trackUsage(auth.partnerId, auth.keyId, "/v1/partner/scores", 404, Date.now() - startTime, slug);
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      const { data: score } = await supabase
        .from("safe_scoring_results")
        .select("note_finale, score_s, score_a, score_f, score_e, tier, calculated_at")
        .eq("product_id", product.id)
        .order("calculated_at", { ascending: false })
        .limit(1)
        .single();

      await trackUsage(auth.partnerId, auth.keyId, "/v1/partner/scores", 200, Date.now() - startTime, slug);

      const response = {
        _legal: API_DISCLAIMER,
        product: { name: product.name, slug: product.slug, type: product.product_type },
        score: score ? {
          overall: Math.round(score.note_finale),
          security: Math.round(score.score_s),
          accessibility: Math.round(score.score_a),
          fidelity: Math.round(score.score_f),
          ecosystem: Math.round(score.score_e),
          tier: score.tier,
          updatedAt: score.calculated_at
        } : null
      };

      // Add branding unless white-label
      if (!auth.whiteLabel) {
        response._source = "SafeScoring";
        response._moreInfo = `https://safescoring.io/products/${slug}`;
      }

      return NextResponse.json(response, {
        headers: {
          "X-RateLimit-Limit": auth.rateLimit.limit,
          "X-RateLimit-Remaining": auth.rateLimit.remaining
        }
      });
    }

    // Bulk products
    if (slugs && auth.features?.bulk_api) {
      const { data: products } = await supabase
        .from("products")
        .select("id, name, slug, product_type")
        .in("slug", slugs);

      if (!products?.length) {
        return NextResponse.json({ error: "No products found" }, { status: 404 });
      }

      const productIds = products.map(p => p.id);
      const { data: scores } = await supabase
        .from("safe_scoring_results")
        .select("product_id, note_finale, score_s, score_a, score_f, score_e, tier, calculated_at")
        .in("product_id", productIds)
        .order("calculated_at", { ascending: false });

      // Get latest score per product
      const latestScores = {};
      scores?.forEach(s => {
        if (!latestScores[s.product_id]) latestScores[s.product_id] = s;
      });

      const results = products.map(p => ({
        product: { name: p.name, slug: p.slug, type: p.product_type },
        score: latestScores[p.id] ? {
          overall: Math.round(latestScores[p.id].note_finale),
          security: Math.round(latestScores[p.id].score_s),
          accessibility: Math.round(latestScores[p.id].score_a),
          fidelity: Math.round(latestScores[p.id].score_f),
          ecosystem: Math.round(latestScores[p.id].score_e),
          tier: latestScores[p.id].tier
        } : null
      }));

      await trackUsage(auth.partnerId, auth.keyId, "/v1/partner/scores/bulk", 200, Date.now() - startTime);

      return NextResponse.json({
        _legal: API_DISCLAIMER,
        results,
        count: results.length,
        ...(!auth.whiteLabel && { _source: "SafeScoring" })
      });
    }

    return NextResponse.json({ error: "Missing slug parameter" }, { status: 400 });

  } catch (error) {
    console.error("Partner scores error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
