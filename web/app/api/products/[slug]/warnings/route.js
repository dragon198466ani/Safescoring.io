import { getSupabaseServer } from "@/libs/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/products/[slug]/warnings
 * Returns real-time risk warnings for a product
 * Structure: pillars (S/A/F/E) with positive/negative points based on evaluations
 */
export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    const supabase = getSupabaseServer();

    // Get product by slug
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, slug, type_id, safe_priority_pillar, safe_priority_reason")
      .eq("slug", slug)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Get evaluations for this product
    const { data: evaluations, error: evalError } = await supabase
      .from("evaluations")
      .select("norm_id, result, why_this_result")
      .eq("product_id", product.id)
      .limit(5000);

    if (evalError) {
      return NextResponse.json(
        { error: "Failed to load evaluations" },
        { status: 500 }
      );
    }

    if (!evaluations || evaluations.length === 0) {
      return NextResponse.json({
        product_id: product.id,
        product_name: product.name,
        has_evaluations: false,
        message: "No evaluations available for this product yet"
      });
    }

    // Get norm details for all evaluation norm_ids
    const normIds = [...new Set(evaluations.map(e => e.norm_id))];
    const { data: norms, error: normError } = await supabase
      .from("norms")
      .select("id, code, title, pillar, is_essential, official_link, official_doc_summary")
      .in("id", normIds);

    if (normError) {
      return NextResponse.json(
        { error: "Failed to load norms" },
        { status: 500 }
      );
    }

    // Create norm lookup
    const normMap = {};
    for (const norm of norms || []) {
      normMap[norm.id] = norm;
    }

    // Group evaluations by pillar and result
    const pillarResults = {
      S: { yes: [], no: [], tbd: [] },
      A: { yes: [], no: [], tbd: [] },
      F: { yes: [], no: [], tbd: [] },
      E: { yes: [], no: [], tbd: [] }
    };

    for (const ev of evaluations) {
      const norm = normMap[ev.norm_id];
      if (!norm || !norm.pillar || !pillarResults[norm.pillar]) continue;

      const result = (ev.result || "").toUpperCase();
      const entry = {
        norm_code: norm.code,
        title: norm.title,
        is_essential: norm.is_essential,
        official_link: norm.official_link || null,
        reason: ev.why_this_result?.substring(0, 200) || null
      };

      if (result === "YES" || result === "YESP") {
        pillarResults[norm.pillar].yes.push(entry);
      } else if (result === "NO" || result === "N") {
        pillarResults[norm.pillar].no.push(entry);
      } else if (result === "N/A" || result === "NA") {
        // N/A = not applicable — excluded from score calculation
        continue;
      } else {
        pillarResults[norm.pillar].tbd.push(entry);
      }
    }

    // Build warnings response
    const pillarNames = {
      S: { name: "Security", context: "En cas de piratage ou d'attaque" },
      A: { name: "Adversity", context: "Si le service fait faillite ou est compromis" },
      F: { name: "Fidelity", context: "Pour garder le controle total de vos fonds" },
      E: { name: "Efficiency", context: "Pour l'utilisation quotidienne" }
    };

    const pillars = {};
    let totalYes = 0, totalNo = 0, totalTbd = 0;

    for (const [pillar, results] of Object.entries(pillarResults)) {
      const yesCount = results.yes.length;
      const noCount = results.no.length;
      const tbdCount = results.tbd.length;
      const total = yesCount + noCount + tbdCount;

      if (total === 0) continue;

      totalYes += yesCount;
      totalNo += noCount;
      totalTbd += tbdCount;

      // Score = YES / (YES + NO) — TBD excluded (matches backend formula)
      const scoreBase = yesCount + noCount;
      const score = scoreBase > 0 ? (yesCount / scoreBase) * 100 : 0;
      let riskLevel, riskLabel;

      if (score >= 90) {
        riskLevel = "low";
        riskLabel = "Faible risque";
      } else if (score >= 70) {
        riskLevel = "medium";
        riskLabel = "Risque modéré";
      } else if (score >= 50) {
        riskLevel = "elevated";
        riskLabel = "Risque élevé";
      } else {
        riskLevel = "high";
        riskLabel = "Risque critique";
      }

      // Sort by is_essential (essential first)
      const sortByEssential = (a, b) => (b.is_essential ? 1 : 0) - (a.is_essential ? 1 : 0);

      pillars[pillar] = {
        name: pillarNames[pillar].name,
        context: pillarNames[pillar].context,
        score: Math.round(score * 10) / 10,
        risk_level: riskLevel,
        risk_label: riskLabel,
        counts: {
          passed: yesCount,
          failed: noCount,
          pending: tbdCount,
          total: total
        },
        positive_points: results.yes.sort(sortByEssential).slice(0, 5).map(p => ({
          title: p.title,
          code: p.norm_code,
          is_essential: p.is_essential
        })),
        negative_points: results.no.sort(sortByEssential).slice(0, 5).map(p => ({
          title: p.title,
          code: p.norm_code,
          is_essential: p.is_essential,
          reason: p.reason
        })),
        unknown_points: results.tbd.slice(0, 3).map(p => ({
          title: p.title,
          code: p.norm_code
        }))
      };
    }

    // Calculate overall score and risk
    const totalChecks = totalYes + totalNo + totalTbd;
    // Overall score = YES / (YES + NO) — TBD excluded (matches backend formula)
    const overallScoreBase = totalYes + totalNo;
    const overallScore = overallScoreBase > 0 ? (totalYes / overallScoreBase) * 100 : 0;

    let overallRiskLevel, overallRiskLabel;
    if (overallScore >= 90) {
      overallRiskLevel = "low";
      overallRiskLabel = "Faible risque global";
    } else if (overallScore >= 70) {
      overallRiskLevel = "medium";
      overallRiskLabel = "Risque global modéré";
    } else if (overallScore >= 50) {
      overallRiskLevel = "elevated";
      overallRiskLabel = "Risque global élevé";
    } else {
      overallRiskLevel = "high";
      overallRiskLabel = "Risque global critique";
    }

    // Get top 3 critical issues across all pillars
    const allNegatives = [];
    for (const [pillar, results] of Object.entries(pillarResults)) {
      for (const item of results.no) {
        allNegatives.push({
          pillar,
          ...item
        });
      }
    }
    const criticalWarnings = allNegatives
      .sort((a, b) => (b.is_essential ? 1 : 0) - (a.is_essential ? 1 : 0))
      .slice(0, 3);

    // Build recommendation
    let recommendation;
    if (overallScore >= 90) {
      recommendation = "Produit bien note. Verifiez les details avant utilisation.";
    } else if (overallScore >= 70) {
      recommendation = "Quelques points d'attention. Lisez les avertissements ci-dessous.";
    } else if (overallScore >= 50) {
      recommendation = "Plusieurs risques identifies. Utilisez avec precaution.";
    } else {
      recommendation = "Risques significatifs. Considerez des alternatives plus sures.";
    }

    return NextResponse.json({
      product_id: product.id,
      product_name: product.name,
      product_slug: product.slug,
      has_evaluations: true,
      generated_at: new Date().toISOString(),
      summary: {
        overall_score: Math.round(overallScore * 10) / 10,
        risk_level: overallRiskLevel,
        risk_label: overallRiskLabel,
        total_checks: totalChecks,
        passed: totalYes,
        failed: totalNo,
        pending: totalTbd,
        critical_warnings: criticalWarnings.map(w => ({
          pillar: w.pillar,
          title: w.title,
          code: w.norm_code
        })),
        recommendation: recommendation
      },
      pillars: pillars,
      priority_pillar: product.safe_priority_pillar,
      advice: product.safe_priority_reason
    });
  } catch (error) {
    console.error("Error in warnings API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
