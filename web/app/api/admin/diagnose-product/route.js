import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { requireAdmin } from "@/libs/admin-auth";

export const dynamic = "force-dynamic";


/**
 * GET /api/admin/diagnose-product?slug=eigenlayer
 * Diagnose scoring issues for a product
 */
export async function GET(request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { error: "Missing slug parameter" },
        { status: 400 }
      );
    }

    // 1. Get product info
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, slug, type_id")
      .eq("slug", slug)
      .maybeSingle();

    if (productError || !product) {
      if (productError) console.error("Product lookup error:", productError.message);
      return NextResponse.json({
        error: "Product not found",
        slug,
      }, { status: 404 });
    }

    // 2. Get evaluations count
    const { data: evaluations, error: evalError } = await supabase
      .from("evaluations")
      .select("id, norm_id, result, why_this_result")
      .eq("product_id", product.id);

    // 3. Get safe_scoring_results
    const { data: scoringResults, error: scoringError } = await supabase
      .from("safe_scoring_results")
      .select("*")
      .eq("product_id", product.id)
      .maybeSingle();

    // 4. Get norms info for evaluations
    let evaluationsWithNorms = [];
    if (evaluations && evaluations.length > 0) {
      const normIds = [...new Set(evaluations.map(e => e.norm_id))];
      const { data: norms } = await supabase
        .from("norms")
        .select("id, code, pillar, title")
        .in("id", normIds);

      const normsMap = {};
      if (norms) {
        norms.forEach(n => { normsMap[n.id] = n; });
      }

      evaluationsWithNorms = evaluations.map(e => ({
        ...e,
        norm: normsMap[e.norm_id] || null,
      }));
    }

    // 5. Count by result type
    const resultCounts = {
      YES: 0,
      YESp: 0,
      NO: 0,
      "N/A": 0,
      TBD: 0,
      other: 0,
    };

    const pillarCounts = {
      S: { yes: 0, no: 0, na: 0, tbd: 0 },
      A: { yes: 0, no: 0, na: 0, tbd: 0 },
      F: { yes: 0, no: 0, na: 0, tbd: 0 },
      E: { yes: 0, no: 0, na: 0, tbd: 0 },
    };

    evaluationsWithNorms.forEach(e => {
      const result = e.result?.toUpperCase();
      if (result === "YES" || result === "YESP") {
        resultCounts.YES++;
      } else if (result === "NO") {
        resultCounts.NO++;
      } else if (result === "N/A" || result === "NA") {
        resultCounts["N/A"]++;
      } else if (result === "TBD") {
        resultCounts.TBD++;
      } else {
        resultCounts.other++;
      }

      // Count by pillar
      const pillar = e.norm?.pillar;
      if (pillar && pillarCounts[pillar]) {
        if (result === "YES" || result === "YESP") {
          pillarCounts[pillar].yes++;
        } else if (result === "NO") {
          pillarCounts[pillar].no++;
        } else if (result === "N/A" || result === "NA") {
          pillarCounts[pillar].na++;
        } else if (result === "TBD") {
          pillarCounts[pillar].tbd++;
        }
      }
    });

    // 6. Check safe_scoring_definitions
    const { data: definitions, error: defError } = await supabase
      .from("safe_scoring_definitions")
      .select("norm_id, is_essential, is_consumer, is_full")
      .limit(10);

    // Build diagnosis
    const diagnosis = {
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        type_id: product.type_id,
      },
      evaluations: {
        total: evaluations?.length || 0,
        byResult: resultCounts,
        byPillar: pillarCounts,
        hasError: !!evalError,
      },
      scoringResults: {
        exists: !!scoringResults,
        data: scoringResults,
        hasError: !!scoringError,
      },
      definitions: {
        sampleCount: definitions?.length || 0,
        sample: definitions?.slice(0, 3),
        hasError: !!defError,
      },
      issues: [],
    };

    // Identify issues
    if (!evaluations || evaluations.length === 0) {
      diagnosis.issues.push("NO_EVALUATIONS: Aucune évaluation trouvée pour ce produit");
    }

    if (!scoringResults) {
      diagnosis.issues.push("NO_SCORING_RESULTS: Pas d'entrée dans safe_scoring_results - les scores n'ont jamais été calculés");
    } else if (scoringResults.note_finale === null || scoringResults.note_finale === 0) {
      diagnosis.issues.push("ZERO_SCORE: note_finale est null ou 0 malgré des évaluations existantes");
    }

    if (!definitions || definitions.length === 0) {
      diagnosis.issues.push("NO_DEFINITIONS: Table safe_scoring_definitions vide - les norms ne sont pas classifiées");
    }

    if (resultCounts.YES === 0 && resultCounts.NO === 0) {
      diagnosis.issues.push("ALL_NA_OR_TBD: Toutes les évaluations sont N/A ou TBD, aucun score calculable");
    }

    // Sample evaluations for debugging
    diagnosis.sampleEvaluations = evaluationsWithNorms.slice(0, 5).map(e => ({
      normCode: e.norm?.code,
      pillar: e.norm?.pillar,
      result: e.result,
    }));

    return NextResponse.json(diagnosis);
  } catch (error) {
    console.error("Diagnose error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
