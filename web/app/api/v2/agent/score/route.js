import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/libs/supabase";

export const dynamic = "force-dynamic";

/**
 * Agent-Friendly Score Endpoint
 * GET /api/v2/agent/score?product=ledger-nano-x
 *
 * Returns a simplified, agent-optimized JSON response.
 * No auth required (public data), but rate limited.
 */
export async function GET(request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("product");
  const name = searchParams.get("name");

  if (!slug && !name) {
    return NextResponse.json(
      {
        error: "Missing parameter",
        usage: "GET /api/v2/agent/score?product=<slug>",
        example: "/api/v2/agent/score?product=ledger-nano-x",
      },
      { status: 400 }
    );
  }

  try {
    // Find product
    let query = supabaseAdmin
      .from("products")
      .select("id, name, slug, type_id, security_status, product_types:type_id(name)")
      .eq("is_active", true);

    if (slug) {
      query = query.eq("slug", slug);
    } else if (name) {
      query = query.ilike("name", `%${name}%`).limit(1);
    }

    const { data: productData } = await query.single();

    if (!productData) {
      return NextResponse.json({ error: "Product not found", query: slug || name }, { status: 404 });
    }

    // Get SAFE scores
    const { data: scores } = await supabaseAdmin
      .from("safe_scoring_results")
      .select("note_finale, note_consumer, note_essential, score_s, score_a, score_f, score_e, s_consumer, a_consumer, f_consumer, e_consumer, total_norms_evaluated, total_yes, total_no")
      .eq("product_id", productData.id)
      .single();

    // Get last incident
    const { data: lastIncident } = await supabaseAdmin
      .from("security_incidents")
      .select("title, severity, incident_date, status")
      .contains("affected_product_ids", [productData.id])
      .eq("is_published", true)
      .order("incident_date", { ascending: false })
      .limit(1)
      .single();

    // Determine security level
    const safeScore = scores?.note_finale || 0;
    const securityLevel = safeScore >= 80 ? "HIGH" : safeScore >= 60 ? "MEDIUM" : safeScore >= 40 ? "LOW" : "CRITICAL";

    // Generate recommendation
    let recommendation = "";
    if (safeScore >= 80) {
      recommendation = "Strong security posture. Suitable for significant holdings.";
    } else if (safeScore >= 60) {
      recommendation = "Acceptable security. Review weak pillars before storing large amounts.";
    } else if (safeScore >= 40) {
      recommendation = "Below average security. Consider alternatives for important holdings.";
    } else {
      recommendation = "Poor security rating. Not recommended for storing crypto assets.";
    }

    const response = {
      product: {
        name: productData.name,
        slug: productData.slug,
        type: productData.product_types?.name || "Unknown",
      },
      safe_score: Math.round(safeScore),
      security_level: securityLevel,
      pillar_scores: scores ? {
        security: Math.round(scores.score_s || 0),
        adversity: Math.round(scores.score_a || 0),
        fidelity: Math.round(scores.score_f || 0),
        efficiency: Math.round(scores.score_e || 0),
      } : null,
      consumer_score: scores?.note_consumer ? Math.round(scores.note_consumer) : null,
      essential_score: scores?.note_essential ? Math.round(scores.note_essential) : null,
      norms_evaluated: scores?.total_norms_evaluated || 0,
      compliance_rate: scores?.total_norms_evaluated
        ? Math.round(((scores.total_yes || 0) / scores.total_norms_evaluated) * 100)
        : 0,
      last_incident: lastIncident ? {
        title: lastIncident.title,
        severity: lastIncident.severity,
        date: lastIncident.incident_date,
        status: lastIncident.status,
      } : null,
      recommendation,
      source: "SafeScoring.io",
      methodology: "916 norms, SAFE framework (Security, Adversity, Fidelity, Efficiency)",
    };

    return NextResponse.json(response, {
      headers: {
        "X-SafeScoring-Agent": "true",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Agent score error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
