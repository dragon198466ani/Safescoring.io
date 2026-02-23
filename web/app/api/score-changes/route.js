import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

/**
 * Score Changes API — Public endpoint for weekly score changes
 *
 * GET /api/score-changes?period=7&limit=50
 *
 * Returns products whose scores changed in the last N days,
 * sorted by absolute change (biggest movers first).
 * Used by the public /changes page for "Build in Public" transparency.
 */
export async function GET(request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const period = Math.min(parseInt(searchParams.get("period") || "7", 10), 90);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

  try {
    // Get products with score history from evaluation_history or safe_scoring_results
    const cutoffDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString();

    // Try to get score changes from evaluation history
    const { data: changes, error } = await supabase
      .from("safe_scoring_results")
      .select("product_slug, overall_score, previous_score, scored_at, products(name, type, slug, logo_url)")
      .gte("scored_at", cutoffDate)
      .not("previous_score", "is", null)
      .order("scored_at", { ascending: false })
      .limit(limit * 2); // Fetch extra to deduplicate

    if (error) {
      // Fallback: get all products with scores and compute synthetic changes
      const { data: products, error: prodError } = await supabase
        .from("products")
        .select("name, slug, type, logo_url, score, previous_score, updated_at")
        .not("score", "is", null)
        .not("previous_score", "is", null)
        .order("updated_at", { ascending: false })
        .limit(limit);

      if (prodError) {
        return NextResponse.json({ error: "Failed to fetch score changes" }, { status: 500 });
      }

      const scoreChanges = (products || [])
        .map((p) => ({
          product: p.name,
          slug: p.slug,
          type: p.type,
          logoUrl: p.logo_url,
          currentScore: p.score,
          previousScore: p.previous_score,
          delta: Math.round((p.score - p.previous_score) * 10) / 10,
          direction: p.score > p.previous_score ? "up" : p.score < p.previous_score ? "down" : "stable",
          updatedAt: p.updated_at,
        }))
        .filter((c) => Math.abs(c.delta) >= 1) // Only significant changes
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, limit);

      return NextResponse.json({
        period,
        totalChanges: scoreChanges.length,
        changes: scoreChanges,
        generatedAt: new Date().toISOString(),
      });
    }

    // Deduplicate by product (keep latest change per product)
    const seen = new Set();
    const deduplicated = (changes || []).filter((c) => {
      if (seen.has(c.product_slug)) return false;
      seen.add(c.product_slug);
      return true;
    });

    const scoreChanges = deduplicated
      .map((c) => {
        const delta = Math.round(((c.overall_score || 0) - (c.previous_score || 0)) * 10) / 10;
        return {
          product: c.products?.name || c.product_slug,
          slug: c.product_slug,
          type: c.products?.type,
          logoUrl: c.products?.logo_url,
          currentScore: c.overall_score,
          previousScore: c.previous_score,
          delta,
          direction: delta > 0 ? "up" : delta < 0 ? "down" : "stable",
          updatedAt: c.scored_at,
        };
      })
      .filter((c) => Math.abs(c.delta) >= 1)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, limit);

    return NextResponse.json({
      period,
      totalChanges: scoreChanges.length,
      changes: scoreChanges,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Score changes API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
