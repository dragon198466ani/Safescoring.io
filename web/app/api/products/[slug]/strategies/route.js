import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

/**
 * GET /api/products/[slug]/strategies
 * Fetches SAFE improvement strategies for a product
 */
export async function GET(request, { params }) {
  const { slug } = await params;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    // Get product ID from slug
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id")
      .eq("slug", slug)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Fetch strategies
    const { data: strategies, error: strategiesError } = await supabase
      .from("product_strategies")
      .select("*")
      .eq("product_id", product.id)
      .eq("is_active", true)
      .order("pillar")
      .order("priority", { ascending: true });

    if (strategiesError) {
      console.error("[API] Error fetching strategies:", strategiesError);
      return NextResponse.json({ error: "Failed to fetch strategies" }, { status: 500 });
    }

    // If no strategies exist, generate fallback from evaluations
    if (!strategies || strategies.length === 0) {
      const fallbackStrategies = await generateFallbackStrategies(product.id);
      return NextResponse.json({
        strategies: fallbackStrategies,
        generated: true,
      });
    }

    return NextResponse.json({
      strategies,
      generated: false,
    });
  } catch (error) {
    console.error("[API] Strategies error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Generate fallback strategies from evaluations when no stored strategies exist
 */
async function generateFallbackStrategies(productId) {
  const strategies = [];

  // Get failed evaluations grouped by pillar
  const { data: evaluations } = await supabase
    .from("evaluations")
    .select(`
      result, why_this_result,
      norms (code, pillar, title, is_essential)
    `)
    .eq("product_id", productId)
    .in("result", ["NO", "N"]);

  if (!evaluations || evaluations.length === 0) {
    return strategies;
  }

  // Group by pillar
  const byPillar = { S: [], A: [], F: [], E: [] };
  evaluations.forEach((e) => {
    const pillar = e.norms?.pillar;
    if (pillar && byPillar[pillar]) {
      byPillar[pillar].push({
        code: e.norms.code,
        title: e.norms.title,
        reason: e.why_this_result,
        isEssential: e.norms.is_essential,
      });
    }
  });

  // Generate strategies for each pillar
  const pillarNames = {
    S: "Security",
    A: "Adversity",
    F: "Fidelity",
    E: "Efficiency",
  };

  Object.entries(byPillar).forEach(([pillar, failed]) => {
    if (failed.length === 0) return;

    // Sort by essential first
    failed.sort((a, b) => (b.isEssential ? 1 : 0) - (a.isEssential ? 1 : 0));

    // Take top 3 issues
    failed.slice(0, 3).forEach((issue, idx) => {
      strategies.push({
        pillar,
        priority: idx + 1,
        strategy_title: `Improve ${issue.title}`,
        strategy_description: issue.reason || `Address this ${pillarNames[pillar].toLowerCase()} requirement to improve your score.`,
        risk_level: pillar === "S" ? "high" : pillar === "A" ? "medium" : "low",
        action_items: [],
      });
    });
  });

  return strategies;
}
