import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

/**
 * One-Click Audit API — Instant security audit from URL or product name
 *
 * POST /api/audit/instant
 *
 * Input: { url: "https://..." } or { product: "metamask" }
 * Output: Full SAFE score + report + PDF link
 *
 * Flow:
 * 1. Identify product from URL or name
 * 2. Look up existing score
 * 3. If no score exists, queue for evaluation
 * 4. Return results with report HTML
 *
 * Pricing: $19 per audit (free for scored products)
 */

export async function POST(request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const session = await auth();

  try {
    const body = await request.json();
    const { url, product: productQuery } = body;

    if (!url && !productQuery) {
      return NextResponse.json(
        { error: "Provide either 'url' or 'product' field" },
        { status: 400 }
      );
    }

    let product = null;
    let matchMethod = null;

    // Step 1: Find the product
    if (productQuery) {
      // Direct slug or name search
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, url, type_id, logo_url")
        .or(`slug.eq.${productQuery.toLowerCase()},name.ilike.%${productQuery}%`)
        .limit(1)
        .maybeSingle();

      product = data;
      matchMethod = "name";
    } else if (url) {
      // Extract domain from URL
      try {
        const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
        const domain = parsed.hostname.replace("www.", "");

        // Search by URL domain
        const { data } = await supabase
          .from("products")
          .select("id, name, slug, url, type_id, logo_url")
          .ilike("url", `%${domain}%`)
          .limit(1)
          .maybeSingle();

        product = data;
        matchMethod = "url";
      } catch {
        return NextResponse.json(
          { error: "Invalid URL format" },
          { status: 400 }
        );
      }
    }

    if (!product) {
      return NextResponse.json({
        found: false,
        message: "Product not found in our database. You can request an evaluation.",
        requestUrl: "https://safescoring.io/contact?type=audit-request",
        query: url || productQuery,
      });
    }

    // Step 2: Get existing score
    const { data: scoring } = await supabase
      .from("safe_scoring_results")
      .select("note_finale, score_s, score_a, score_f, score_e, scored_at, evaluation_count")
      .eq("product_slug", product.slug)
      .order("scored_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Step 3: Get evaluation details (norms breakdown)
    const { data: evaluations } = await supabase
      .from("evaluations")
      .select("pillar, answer, norm_code")
      .eq("product_slug", product.slug)
      .limit(500);

    // Compute pillar breakdown
    const pillarBreakdown = {};
    const pillars = ["S", "A", "F", "E"];
    const pillarNames = { S: "Security", A: "Adversity", F: "Fidelity", E: "Efficiency" };

    pillars.forEach((p) => {
      const pillarEvals = (evaluations || []).filter(
        (e) => (e.pillar || "").toUpperCase() === p
      );
      const yes = pillarEvals.filter((e) => e.answer === "YES" || e.answer === "YES_PARTIAL").length;
      const no = pillarEvals.filter((e) => e.answer === "NO").length;
      const na = pillarEvals.filter((e) => e.answer === "NA" || e.answer === "N/A").length;
      const applicable = pillarEvals.length - na;

      pillarBreakdown[p] = {
        name: pillarNames[p],
        score: scoring?.[`score_${p.toLowerCase()}`] ?? null,
        totalNorms: pillarEvals.length,
        compliant: yes,
        nonCompliant: no,
        notApplicable: na,
        complianceRate: applicable > 0 ? Math.round((yes / applicable) * 100) : null,
      };
    });

    // Step 4: Risk assessment
    const overallScore = scoring?.note_finale;
    const riskFactors = [];

    if (overallScore != null) {
      if (overallScore < 50) riskFactors.push("LOW_OVERALL_SCORE");
      if (pillarBreakdown.S.score != null && pillarBreakdown.S.score < 50) riskFactors.push("WEAK_SECURITY");
      if (pillarBreakdown.A.score != null && pillarBreakdown.A.score < 40) riskFactors.push("WEAK_ADVERSITY_PROTECTION");
      if (pillarBreakdown.F.score != null && pillarBreakdown.F.score < 50) riskFactors.push("TRACK_RECORD_CONCERNS");
      if (pillarBreakdown.E.score != null && pillarBreakdown.E.score < 40) riskFactors.push("USABILITY_RISKS");
    }

    const recommendation = overallScore == null
      ? "PENDING"
      : overallScore >= 70
      ? "SAFE"
      : overallScore >= 50
      ? "CAUTION"
      : "HIGH_RISK";

    // Step 5: Build response
    const result = {
      found: true,
      matchMethod,
      product: {
        name: product.name,
        slug: product.slug,
        url: product.url,
        logoUrl: product.logo_url,
      },
      score: {
        overall: overallScore ? Math.round(overallScore * 10) / 10 : null,
        pillars: pillarBreakdown,
        evaluationCount: scoring?.evaluation_count || (evaluations || []).length,
        lastUpdated: scoring?.scored_at,
      },
      recommendation,
      riskFactors,
      links: {
        fullReport: `https://safescoring.io/products/${product.slug}`,
        compareUrl: `https://safescoring.io/compare?p1=${product.slug}`,
        pdfReport: session?.user
          ? `https://safescoring.io/api/reports/generate?product=${product.slug}`
          : null,
        methodology: "https://safescoring.io/methodology",
      },
    };

    // Track audit in analytics
    if (session?.user?.id) {
      supabase
        .from("api_usage")
        .insert({
          user_id: session.user.id,
          endpoint: "/api/audit/instant",
          product_slug: product.slug,
        })
        .then(() => {})
        .catch(() => {});
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Instant audit error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
