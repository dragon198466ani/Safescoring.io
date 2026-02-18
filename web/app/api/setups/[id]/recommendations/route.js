import { NextResponse } from "next/server";
import { supabase } from "@/libs/supabase";
import { auth } from "@/libs/auth";

/**
 * GET /api/setups/[id]/recommendations
 * Returns product recommendations to improve weakest pillar
 */
export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const setupId = params.id;
    const { searchParams } = new URL(request.url);
    const requestedPillar = searchParams.get("pillar");

    // Get setup with products
    const { data: setup, error: setupError } = await supabase
      .from("user_setups")
      .select("id, user_id, products")
      .eq("id", setupId)
      .single();

    if (setupError || !setup) {
      return NextResponse.json({ error: "Setup not found" }, { status: 404 });
    }

    if (setup.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get product IDs already in setup
    const setupProductIds = (setup.products || []).map((p) => p.product_id);

    // Fetch full product details for score calculation
    const { data: setupProducts } = await supabase
      .from("products")
      .select("id, score_s, score_a, score_f, score_e, note_finale")
      .in("id", setupProductIds.length > 0 ? setupProductIds : [-1]);

    // Calculate current pillar scores
    const pillarScores = calculatePillarScores(setupProducts || []);

    // Determine target pillar (weakest or requested)
    const targetPillar = requestedPillar || findWeakestPillar(pillarScores);

    // Fetch recommended products
    const pillarColumn = "score_" + targetPillar.toLowerCase();
    
    let query = supabase
      .from("products")
      .select("id, name, slug, logo_url, type, score_s, score_a, score_f, score_e, note_finale")
      .gte(pillarColumn, 70)
      .order(pillarColumn, { ascending: false })
      .limit(10);

    if (setupProductIds.length > 0) {
      query = query.not("id", "in", "(" + setupProductIds.join(",") + ")");
    }

    const { data: recommendedProducts, error: recError } = await query;

    if (recError) {
      console.error("Error fetching recommendations:", recError);
      return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 });
    }

    // Transform and add reason
    const recommendations = (recommendedProducts || []).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      logoUrl: p.logo_url,
      type: p.type,
      scores: {
        total: p.note_finale,
        S: p.score_s,
        A: p.score_a,
        F: p.score_f,
        E: p.score_e,
      },
      targetPillarScore: p[pillarColumn],
      reason: getRecommendationReason(p, targetPillar, pillarScores, pillarColumn),
    }));

    // All pillars with their scores
    const allPillars = [
      { pillar: "S", score: pillarScores.S, name: "Security" },
      { pillar: "A", score: pillarScores.A, name: "Adversity" },
      { pillar: "F", score: pillarScores.F, name: "Fidelity" },
      { pillar: "E", score: pillarScores.E, name: "Efficiency" },
    ].sort((a, b) => a.score - b.score);

    return NextResponse.json({
      recommendations,
      targetPillar,
      currentScores: pillarScores,
      allPillars,
    });
  } catch (error) {
    console.error("Recommendations API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

function calculatePillarScores(products) {
  if (!products || products.length === 0) {
    return { S: 0, A: 0, F: 0, E: 0, total: 0 };
  }

  const sums = { S: 0, A: 0, F: 0, E: 0 };
  products.forEach((p) => {
    sums.S += p.score_s || 0;
    sums.A += p.score_a || 0;
    sums.F += p.score_f || 0;
    sums.E += p.score_e || 0;
  });

  const count = products.length;
  return {
    S: Math.round(sums.S / count),
    A: Math.round(sums.A / count),
    F: Math.round(sums.F / count),
    E: Math.round(sums.E / count),
    total: Math.round((sums.S + sums.A + sums.F + sums.E) / (count * 4)),
  };
}

function findWeakestPillar(scores) {
  const pillars = [
    { key: "S", value: scores.S },
    { key: "A", value: scores.A },
    { key: "F", value: scores.F },
    { key: "E", value: scores.E },
  ];
  return pillars.reduce((min, p) => (p.value < min.value ? p : min)).key;
}

function getRecommendationReason(product, targetPillar, currentScores, pillarColumn) {
  const pillarNames = { S: "Security", A: "Adversity", F: "Fidelity", E: "Efficiency" };
  const productScore = product[pillarColumn];
  const currentScore = currentScores[targetPillar];

  if (productScore > currentScore + 20) {
    return "Excellent " + pillarNames[targetPillar] + " score (+" + (productScore - currentScore) + " vs your average)";
  } else if (productScore > currentScore + 10) {
    return "Strong " + pillarNames[targetPillar] + " to boost your stack";
  }
  return "Above average " + pillarNames[targetPillar] + " performance";
}
