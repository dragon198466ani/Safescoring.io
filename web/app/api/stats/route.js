import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Lazy initialization to avoid build-time errors
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export const revalidate = 3600; // Cache 1 hour

export async function GET() {
  try {
    // Get all products with scores
    const { data: products, error } = await getSupabase()
      .from("products")
      .select("id, name, slug, type_id, product_types(name)")
      .order("name");

    if (error) throw error;

    // Get scores from safe_scoring_results
    const { data: scores, error: scoresError } = await getSupabase()
      .from("safe_scoring_results")
      .select("product_id, note_finale, score_s, score_a, score_f, score_e, total_yes, total_no, total_na");

    if (scoresError) throw scoresError;

    // Create score map
    const scoreMap = {};
    scores?.forEach(s => {
      scoreMap[s.product_id] = s;
    });

    // Calculate distribution
    const distribution = {
      excellent: [], // 90-100
      good: [],      // 70-89
      average: [],   // 50-69
      poor: [],      // 30-49
      critical: []   // 0-29
    };

    const allScores = [];
    const pillarStats = { S: [], A: [], F: [], E: [] };

    products?.forEach(product => {
      const score = scoreMap[product.id];
      if (score && score.note_finale !== null) {
        const finalScore = score.note_finale;
        allScores.push(finalScore);

        const productData = {
          name: product.name,
          slug: product.slug,
          type: product.product_types?.name || "Unknown",
          score: finalScore,
          s: score.score_s,
          a: score.score_a,
          f: score.score_f,
          e: score.score_e
        };

        // Categorize
        if (finalScore >= 90) distribution.excellent.push(productData);
        else if (finalScore >= 70) distribution.good.push(productData);
        else if (finalScore >= 50) distribution.average.push(productData);
        else if (finalScore >= 30) distribution.poor.push(productData);
        else distribution.critical.push(productData);

        // Pillar stats
        if (score.score_s !== null) pillarStats.S.push(score.score_s);
        if (score.score_a !== null) pillarStats.A.push(score.score_a);
        if (score.score_f !== null) pillarStats.F.push(score.score_f);
        if (score.score_e !== null) pillarStats.E.push(score.score_e);
      }
    });

    // Calculate statistics
    const calcStats = (arr) => {
      if (arr.length === 0) return { avg: 0, min: 0, max: 0, count: 0 };
      const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
      return {
        avg: Math.round(avg * 10) / 10,
        min: Math.min(...arr),
        max: Math.max(...arr),
        count: arr.length
      };
    };

    // Sort each category by score
    Object.keys(distribution).forEach(key => {
      distribution[key].sort((a, b) => b.score - a.score);
    });

    const stats = {
      total_products: allScores.length,
      global: calcStats(allScores),
      pillars: {
        S: calcStats(pillarStats.S),
        A: calcStats(pillarStats.A),
        F: calcStats(pillarStats.F),
        E: calcStats(pillarStats.E)
      },
      distribution: {
        excellent: { count: distribution.excellent.length, products: distribution.excellent.slice(0, 5) },
        good: { count: distribution.good.length, products: distribution.good.slice(0, 5) },
        average: { count: distribution.average.length, products: distribution.average.slice(0, 5) },
        poor: { count: distribution.poor.length, products: distribution.poor.slice(0, 5) },
        critical: { count: distribution.critical.length, products: distribution.critical.slice(0, 5) }
      },
      // Sample products at different score levels for credibility
      samples: {
        top_5: distribution.excellent.slice(0, 5),
        bottom_5: [...distribution.critical, ...distribution.poor].slice(-5).reverse(),
        middle_5: distribution.average.slice(0, 5)
      },
      updated_at: new Date().toISOString()
    };

    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "Failed to load statistics" },
      { status: 500 }
    );
  }
}
