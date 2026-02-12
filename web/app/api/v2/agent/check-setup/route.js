import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/libs/supabase";

export const dynamic = "force-dynamic";

/**
 * Agent-Friendly Setup Check Endpoint
 * POST /api/v2/agent/check-setup
 * Body: { "products": ["ledger-nano-x", "metamask", "aave"] }
 *
 * Returns aggregated health check for a set of products.
 */
export async function POST(request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({
      error: "Invalid JSON body",
      usage: 'POST /api/v2/agent/check-setup with body: { "products": ["slug1", "slug2"] }',
    }, { status: 400 });
  }

  const { products } = body;

  if (!products || !Array.isArray(products) || products.length === 0) {
    return NextResponse.json({
      error: "products array required",
      usage: '{ "products": ["ledger-nano-x", "metamask"] }',
    }, { status: 400 });
  }

  if (products.length > 20) {
    return NextResponse.json({ error: "Maximum 20 products per request" }, { status: 400 });
  }

  try {
    // Find products by slug
    const { data: productData } = await supabaseAdmin
      .from("products")
      .select("id, name, slug, type_id, product_types:type_id(name)")
      .in("slug", products)
      .eq("is_active", true);

    if (!productData || productData.length === 0) {
      return NextResponse.json({ error: "No matching products found", queried: products }, { status: 404 });
    }

    const productIds = productData.map((p) => p.id);

    // Get scores
    const { data: scores } = await supabaseAdmin
      .from("safe_scoring_results")
      .select("product_id, note_finale, score_s, score_a, score_f, score_e")
      .in("product_id", productIds);

    const scoreMap = Object.fromEntries((scores || []).map((s) => [s.product_id, s]));

    // Calculate aggregated scores
    let totalS = 0, totalA = 0, totalF = 0, totalE = 0, totalScore = 0, count = 0;
    const productResults = [];

    for (const p of productData) {
      const sc = scoreMap[p.id];
      const safeScore = sc?.note_finale || 0;
      if (sc) {
        totalS += sc.score_s || 0;
        totalA += sc.score_a || 0;
        totalF += sc.score_f || 0;
        totalE += sc.score_e || 0;
        totalScore += safeScore;
        count++;
      }
      productResults.push({
        slug: p.slug,
        name: p.name,
        type: p.product_types?.name || "Unknown",
        safe_score: Math.round(safeScore),
        has_score: !!sc,
      });
    }

    const healthScore = count > 0 ? Math.round(totalScore / count) : 0;
    const pillarAvg = count > 0 ? {
      security: Math.round(totalS / count),
      adversity: Math.round(totalA / count),
      fidelity: Math.round(totalF / count),
      efficiency: Math.round(totalE / count),
    } : { security: 0, adversity: 0, fidelity: 0, efficiency: 0 };

    // Find weakest pillar
    const pillarEntries = Object.entries(pillarAvg);
    const weakest = pillarEntries.sort((a, b) => a[1] - b[1])[0];
    const strongest = pillarEntries.sort((a, b) => b[1] - a[1])[0];

    // Find top risk (lowest scoring product)
    const sortedProducts = [...productResults].filter((p) => p.has_score).sort((a, b) => a.safe_score - b.safe_score);
    const topRisk = sortedProducts[0] || null;

    // Get recent incidents
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: incidents } = await supabaseAdmin
      .from("security_incidents")
      .select("title, severity, affected_product_ids")
      .gte("created_at", threeMonthsAgo)
      .eq("is_published", true);

    const relevantIncidents = (incidents || []).filter((inc) =>
      (inc.affected_product_ids || []).some((id) => productIds.includes(id))
    );

    // Generate recommendation
    let recommendation = "";
    if (healthScore >= 80) {
      recommendation = "Strong setup. Your crypto stack has good security coverage.";
    } else if (healthScore >= 60) {
      recommendation = `Decent setup. Focus on improving ${weakest[0]} (${weakest[1]}/100) to strengthen your security.`;
    } else if (topRisk) {
      recommendation = `${topRisk.name} (score: ${topRisk.safe_score}) is your weakest link. Consider a higher-rated alternative.`;
    } else {
      recommendation = "Low overall security. Review and upgrade your crypto product choices.";
    }

    return NextResponse.json({
      health_score: healthScore,
      security_level: healthScore >= 80 ? "HIGH" : healthScore >= 60 ? "MEDIUM" : healthScore >= 40 ? "LOW" : "CRITICAL",
      weakest_pillar: { name: weakest[0], score: weakest[1] },
      strongest_pillar: { name: strongest[0], score: strongest[1] },
      pillar_scores: pillarAvg,
      top_risk: topRisk ? { product: topRisk.name, slug: topRisk.slug, score: topRisk.safe_score } : null,
      recent_incidents: relevantIncidents.length,
      products: productResults,
      products_found: productData.length,
      products_queried: products.length,
      recommendation,
      source: "SafeScoring.io",
    }, {
      headers: {
        "X-SafeScoring-Agent": "true",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Agent check-setup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
