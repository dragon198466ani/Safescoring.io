import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Not configured" }, { status: 503 });
    }

    const { id } = await params;

    // Get the setup
    const { data: setup, error: setupError } = await supabaseAdmin
      .from("user_setups")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

    if (setupError || !setup) {
      return NextResponse.json({ error: "Setup not found" }, { status: 404 });
    }

    const productList = setup.products || [];
    if (productList.length === 0) {
      return NextResponse.json({
        health_score: 0,
        grade: "N/A",
        weakest_pillar: null,
        recommendations: ["Add products to your setup to get a health score."],
        trend: 0,
        pillar_scores: { S: 0, A: 0, F: 0, E: 0 },
        product_count: 0,
      });
    }

    // Extract product IDs
    const productIds = productList.map((p) =>
      typeof p === "object" ? p.id || p.product_id : p
    ).filter(Boolean);

    // Get product scores
    const { data: scores } = await supabaseAdmin
      .from("safe_scoring_results")
      .select("product_id, note_finale, score_s, score_a, score_f, score_e")
      .in("product_id", productIds);

    // Get product details
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("id, name, slug, type_id")
      .in("id", productIds);

    const productMap = Object.fromEntries((products || []).map((p) => [p.id, p]));

    // Get recent incidents affecting these products
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: incidents } = await supabaseAdmin
      .from("security_incidents")
      .select("id, severity, affected_product_ids")
      .gte("created_at", threeMonthsAgo)
      .eq("is_published", true);

    const relevantIncidents = (incidents || []).filter((inc) =>
      (inc.affected_product_ids || []).some((id) => productIds.includes(id))
    );

    // Calculate health score
    let totalScore = 0, totalS = 0, totalA = 0, totalF = 0, totalE = 0, count = 0;
    const productScores = [];

    for (const pid of productIds) {
      const sc = (scores || []).find((s) => s.product_id === pid);
      if (!sc?.note_finale) continue;

      totalScore += sc.note_finale;
      totalS += sc.score_s || 0;
      totalA += sc.score_a || 0;
      totalF += sc.score_f || 0;
      totalE += sc.score_e || 0;
      count++;

      productScores.push({
        id: pid,
        name: productMap[pid]?.name || "Unknown",
        slug: productMap[pid]?.slug,
        score: sc.note_finale,
        s: sc.score_s,
        a: sc.score_a,
        f: sc.score_f,
        e: sc.score_e,
      });
    }

    if (count === 0) {
      return NextResponse.json({
        health_score: 0,
        grade: "N/A",
        weakest_pillar: null,
        recommendations: ["Products in your setup don't have scores yet."],
        trend: 0,
        pillar_scores: { S: 0, A: 0, F: 0, E: 0 },
        product_count: productIds.length,
      });
    }

    const avgScore = totalScore / count;
    const pillarScores = {
      S: totalS / count,
      A: totalA / count,
      F: totalF / count,
      E: totalE / count,
    };

    // Apply penalties
    let healthScore = avgScore;

    // Penalty for incidents
    const criticalCount = relevantIncidents.filter((i) => i.severity === "critical").length;
    const highCount = relevantIncidents.filter((i) => i.severity === "high").length;
    healthScore -= criticalCount * 8;
    healthScore -= highCount * 4;

    // Bonus for diversification (having multiple product types)
    const uniqueTypes = new Set(productIds.map((pid) => productMap[pid]?.type_id).filter(Boolean));
    if (uniqueTypes.size >= 3) healthScore += 3;
    if (uniqueTypes.size >= 5) healthScore += 2;

    // Clamp
    healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

    // Determine grade
    const grade = healthScore >= 85 ? "A+" : healthScore >= 75 ? "A" : healthScore >= 65 ? "B" : healthScore >= 55 ? "C" : healthScore >= 40 ? "D" : "F";

    // Find weakest pillar
    const pillarEntries = Object.entries(pillarScores);
    const weakest = pillarEntries.sort((a, b) => a[1] - b[1])[0];
    const pillarNames = { S: "Security", A: "Adversity", F: "Fidelity", E: "Efficiency" };

    // Generate recommendations
    const recommendations = [];

    // Weak pillar
    if (weakest[1] < 60) {
      recommendations.push(
        `Improve ${pillarNames[weakest[0]]} (${Math.round(weakest[1])}/100) - this is your weakest security dimension.`
      );
    }

    // Low scoring products
    const lowProducts = productScores.filter((p) => p.score < 50).sort((a, b) => a.score - b.score);
    if (lowProducts.length > 0) {
      recommendations.push(
        `Consider replacing ${lowProducts[0].name} (score: ${Math.round(lowProducts[0].score)}) with a higher-rated alternative.`
      );
    }

    // Incidents
    if (criticalCount > 0) {
      recommendations.push("Critical incidents detected - verify your funds and consider moving to safer alternatives.");
    }

    // Diversity
    if (uniqueTypes.size < 2 && productIds.length > 1) {
      recommendations.push("Diversify your setup with different product types for better coverage.");
    }

    // Few products
    if (productIds.length < 3) {
      recommendations.push("Add more products to your setup for a comprehensive security picture.");
    }

    // Get trend from score history
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentChanges } = await supabaseAdmin
      .from("score_history")
      .select("score_change")
      .in("product_id", productIds)
      .gte("recorded_at", oneWeekAgo);

    const trend = (recentChanges || []).reduce((sum, c) => sum + (c.score_change || 0), 0);

    return NextResponse.json({
      health_score: healthScore,
      grade,
      weakest_pillar: { code: weakest[0], name: pillarNames[weakest[0]], score: Math.round(weakest[1]) },
      strongest_pillar: (() => {
        const strongest = pillarEntries.sort((a, b) => b[1] - a[1])[0];
        return { code: strongest[0], name: pillarNames[strongest[0]], score: Math.round(strongest[1]) };
      })(),
      pillar_scores: {
        S: Math.round(pillarScores.S),
        A: Math.round(pillarScores.A),
        F: Math.round(pillarScores.F),
        E: Math.round(pillarScores.E),
      },
      recommendations: recommendations.slice(0, 5),
      trend: Math.round(trend * 10) / 10,
      product_count: count,
      incidents_count: relevantIncidents.length,
      products: productScores.sort((a, b) => b.score - a.score),
    });
  } catch (error) {
    console.error("Health score error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
