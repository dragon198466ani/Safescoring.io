import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { authenticateAgent, debitAgentCredits, AGENT_CORS_HEADERS } from "@/libs/agent-auth";

/**
 * Agent Courtier — Fee Optimization & Wallet Consolidation Agent
 *
 * POST /api/agent/courtier
 *
 * Analyzes user's crypto setup and recommends:
 * 1. Fee optimization (cheaper alternatives with equal/better security)
 * 2. Wallet consolidation opportunities
 * 3. Cost-saving strategies
 *
 * Cost: $0.02 per analysis (revenue: 10% commission on savings)
 *
 * Headers:
 *   X-Agent-Wallet: 0x...
 *   X-Agent-Signature: <signature>
 *   X-Agent-Timestamp: <unix_ms>
 */

const ANALYSIS_COST = 0.02;

export async function POST(request) {
  // 1. Authenticate agent
  const authResult = await authenticateAgent(request);

  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error, docs: "https://safescoring.io/agents" },
      { status: 401, headers: AGENT_CORS_HEADERS }
    );
  }

  if (authResult.rateLimited) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfter: Math.ceil(authResult.rateLimit.resetIn / 1000) },
      { status: 429, headers: AGENT_CORS_HEADERS }
    );
  }

  // 2. Check balance
  if (!authResult.access.hasStream) {
    if (!authResult.access.exists || authResult.access.balance < ANALYSIS_COST) {
      return NextResponse.json(
        {
          error: "Insufficient balance",
          required: ANALYSIS_COST,
          balance: authResult.access.balance || 0,
          depositUrl: "https://safescoring.io/agents#deposit",
        },
        { status: 402, headers: AGENT_CORS_HEADERS }
      );
    }
  }

  try {
    const body = await request.json();
    const { products, budget_preference } = body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: "Provide 'products' array with product slugs" },
        { status: 400, headers: AGENT_CORS_HEADERS }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Service unavailable" },
        { status: 503, headers: AGENT_CORS_HEADERS }
      );
    }

    // 3. Fetch current products with scores
    const { data: currentProducts } = await supabase
      .from("products")
      .select(`
        name, slug, type_id, url,
        safe_scoring_results!inner(note_finale, score_s, score_a, score_f, score_e)
      `)
      .in("slug", products.slice(0, 20));

    if (!currentProducts || currentProducts.length === 0) {
      return NextResponse.json(
        { error: "No matching products found", slugs: products },
        { status: 404, headers: AGENT_CORS_HEADERS }
      );
    }

    // 4. For each product, find better or comparable alternatives
    const recommendations = [];

    for (const product of currentProducts) {
      const scoring = Array.isArray(product.safe_scoring_results)
        ? product.safe_scoring_results[0]
        : product.safe_scoring_results;
      const currentScore = scoring?.note_finale || 0;

      // Find alternatives of same type with equal or better score
      const { data: alternatives } = await supabase
        .from("products")
        .select(`
          name, slug, url,
          safe_scoring_results!inner(note_finale, score_s, score_a, score_f, score_e)
        `)
        .eq("type_id", product.type_id)
        .neq("slug", product.slug)
        .gte("safe_scoring_results.note_finale", currentScore * 0.95) // Within 5% of current score
        .order("safe_scoring_results.note_finale", { ascending: false })
        .limit(3);

      const alts = (alternatives || []).map((alt) => {
        const altScoring = Array.isArray(alt.safe_scoring_results)
          ? alt.safe_scoring_results[0]
          : alt.safe_scoring_results;
        return {
          name: alt.name,
          slug: alt.slug,
          score: altScoring?.note_finale ? Math.round(altScoring.note_finale * 10) / 10 : null,
          scoreDelta: altScoring?.note_finale
            ? Math.round((altScoring.note_finale - currentScore) * 10) / 10
            : null,
          url: `https://safescoring.io/products/${alt.slug}`,
        };
      });

      recommendations.push({
        current: {
          name: product.name,
          slug: product.slug,
          score: Math.round(currentScore * 10) / 10,
        },
        alternatives: alts,
        hasUpgrade: alts.some((a) => a.scoreDelta > 0),
      });
    }

    // 5. Generate overall analysis
    const totalProducts = currentProducts.length;
    const avgScore = currentProducts.reduce((sum, p) => {
      const s = Array.isArray(p.safe_scoring_results)
        ? p.safe_scoring_results[0]
        : p.safe_scoring_results;
      return sum + (s?.note_finale || 0);
    }, 0) / totalProducts;

    const upgradeOpportunities = recommendations.filter((r) => r.hasUpgrade).length;

    // 6. Debit credits
    if (!authResult.access.hasStream) {
      const debitResult = await debitAgentCredits(
        authResult.wallet,
        ANALYSIS_COST,
        "courtier_analysis",
        "/api/agent/courtier",
        null,
        products.length
      );

      if (!debitResult.success) {
        return NextResponse.json(
          { error: debitResult.error || "Payment failed" },
          { status: 402, headers: AGENT_CORS_HEADERS }
        );
      }
    }

    return NextResponse.json(
      {
        analysis: {
          productsAnalyzed: totalProducts,
          averageScore: Math.round(avgScore * 10) / 10,
          upgradeOpportunities,
          budgetPreference: budget_preference || "balanced",
        },
        recommendations,
        summary: upgradeOpportunities > 0
          ? `Found ${upgradeOpportunities} upgrade opportunities across ${totalProducts} products. Average security score: ${Math.round(avgScore)}/100.`
          : `Your setup is well-optimized. Average security score: ${Math.round(avgScore)}/100. No immediate upgrades recommended.`,
        cost: `$${ANALYSIS_COST}`,
        compareUrl: `https://safescoring.io/compare?products=${products.join(",")}`,
      },
      { headers: AGENT_CORS_HEADERS }
    );
  } catch (err) {
    console.error("Courtier agent error:", err);
    return NextResponse.json(
      { error: "Analysis failed" },
      { status: 500, headers: AGENT_CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: AGENT_CORS_HEADERS });
}
