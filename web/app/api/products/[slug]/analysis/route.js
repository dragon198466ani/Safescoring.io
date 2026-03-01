/**
 * Product Analysis API
 * GET /api/products/[slug]/analysis
 *
 * Returns comprehensive pillar-by-pillar analysis including:
 * - Pillar narratives (security strategy, worst-case scenarios)
 * - Overall risk analysis
 * - Per-norm justifications (for authenticated users)
 */

import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { auth } from "@/libs/auth";

// Revalidate every 5 minutes
export const revalidate = 300;

export async function GET(request, { params }) {
  const { slug } = await params;

  if (!slug) {
    return NextResponse.json({ error: "Slug required" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    // Get product by slug
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, slug, type_id")
      .eq("slug", slug)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Get scores from safe_scoring_results (scores are NOT on the products table)
    const { data: scoring } = await supabase
      .from("safe_scoring_results")
      .select("note_finale, score_s, score_a, score_f, score_e")
      .eq("product_id", product.id)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .single();

    // Get pillar narratives
    const { data: narratives, error: narrativesError } = await supabase
      .from("product_pillar_narratives")
      .select("*")
      .eq("product_id", product.id);

    // Get overall risk analysis
    const { data: riskAnalysis, error: riskError } = await supabase
      .from("product_risk_analysis")
      .select("*")
      .eq("product_id", product.id)
      .single();

    // Check if user is authenticated (for detailed justifications)
    const session = await auth();
    let evaluationDetails = null;

    if (session?.user) {
      // Get per-norm evaluations with justifications
      const { data: evaluations } = await supabase
        .from("evaluations")
        .select(`
          id,
          result,
          why_this_result,
          evaluation_date,
          norms (
            id,
            code,
            title,
            pillar,
            description,
            is_essential,
            official_link,
            official_doc_summary
          )
        `)
        .eq("product_id", product.id)
        .order("norms(pillar)", { ascending: true });

      if (evaluations) {
        // Group by pillar
        evaluationDetails = {
          S: evaluations.filter(e => e.norms?.pillar === "S"),
          A: evaluations.filter(e => e.norms?.pillar === "A"),
          F: evaluations.filter(e => e.norms?.pillar === "F"),
          E: evaluations.filter(e => e.norms?.pillar === "E"),
        };
      }
    }

    // Format pillar narratives
    const pillarAnalysis = {};
    const pillarNames = { S: "Security", A: "Adversity", F: "Fidelity", E: "Efficiency" };

    for (const pillar of ["S", "A", "F", "E"]) {
      const narrative = narratives?.find(n => n.pillar === pillar);

      pillarAnalysis[pillar] = {
        name: pillarNames[pillar],
        score: scoring?.[`score_${pillar.toLowerCase()}`] || 0,

        // Narrative content
        summary: narrative?.narrative_summary || "Analysis pending...",
        strengths: narrative?.key_strengths || null,
        weaknesses: narrative?.key_weaknesses || null,
        securityStrategy: narrative?.security_strategy || null,

        // Risk analysis
        worstCase: narrative?.worst_case_scenario || null,
        riskLevel: narrative?.risk_level || "unknown",
        mitigation: narrative?.mitigation_advice || null,

        // Evaluation stats
        evaluatedCount: narrative?.evaluated_norms_count || 0,
        failedCount: narrative?.failed_norms_count || 0,

        // Per-norm details (authenticated only)
        evaluations: evaluationDetails?.[pillar] || null,

        // Metadata
        lastUpdated: narrative?.last_updated_at || null,
        aiModel: narrative?.ai_model || null,
      };
    }

    // Format response
    const response = {
      success: true,
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        type_id: product.type_id,
        overallScore: scoring?.note_finale || 0,
      },

      pillarAnalysis,

      riskAnalysis: riskAnalysis ? {
        overallRisk: riskAnalysis.overall_risk_level,
        narrative: riskAnalysis.overall_risk_narrative,
        combinedWorstCase: riskAnalysis.combined_worst_case,
        attackVectors: riskAnalysis.attack_vectors || [],
        priorityMitigations: riskAnalysis.priority_mitigations || [],
        lastUpdated: riskAnalysis.last_updated_at,
      } : null,

      // Metadata
      authenticated: !!session?.user,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=172800",
      },
    });

  } catch (error) {
    console.error("Product analysis API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analysis" },
      { status: 500 }
    );
  }
}
