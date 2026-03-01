import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { authenticateAgent, debitAgentCredits, AGENT_CORS_HEADERS } from "@/libs/agent-auth";
import { API_TIERS } from "@/libs/config-constants";

/**
 * Agent Deep Analysis API
 *
 * GET /api/agent/analysis?product=<slug>
 *
 * Cost: $0.10 USDC per analysis
 * Returns: Detailed norm breakdown, pillar analysis, risks, recommendations
 */

const ANALYSIS_COST = API_TIERS.agent.analysisPriceUSDC;

export async function GET(request) {
  const auth = await authenticateAgent(request);

  if (!auth.authenticated) {
    return NextResponse.json(
      { error: auth.error },
      { status: 401, headers: AGENT_CORS_HEADERS }
    );
  }

  if (auth.rateLimited) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfter: Math.ceil(auth.rateLimit.resetIn / 1000) },
      { status: 429, headers: { ...AGENT_CORS_HEADERS, "Retry-After": Math.ceil(auth.rateLimit.resetIn / 1000).toString() } }
    );
  }

  const hasUnlimitedAccess = auth.access.hasStream;

  if (!hasUnlimitedAccess) {
    if (!auth.access.exists || auth.access.balance < ANALYSIS_COST) {
      return NextResponse.json(
        {
          error: "Insufficient USDC balance",
          balance: auth.access.balance || 0,
          required: ANALYSIS_COST,
        },
        { status: 402, headers: AGENT_CORS_HEADERS }
      );
    }
  }

  const { searchParams } = new URL(request.url);
  const productSlug = searchParams.get("product");

  if (!productSlug) {
    return NextResponse.json(
      { error: "Missing 'product' parameter" },
      { status: 400, headers: AGENT_CORS_HEADERS }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503, headers: AGENT_CORS_HEADERS });
  }

  try {
    // Fetch product
    const { data: product } = await supabase
      .from("products")
      .select("id, name, slug, url, description, specs, type_id, product_types!inner(name, slug)")
      .eq("slug", productSlug)
      .maybeSingle();

    if (!product) {
      return NextResponse.json(
        { error: "Product not found", slug: productSlug },
        { status: 404, headers: AGENT_CORS_HEADERS }
      );
    }

    // Fetch score
    const { data: score } = await supabase
      .from("safe_scoring_results")
      .select("*")
      .eq("product_id", product.id)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch evaluation details (YES/NO/TBD breakdown by pillar)
    const { data: evaluations } = await supabase
      .from("evaluations")
      .select("norm_id, result, confidence, norms!inner(code, pillar, title, description)")
      .eq("product_id", product.id)
      .order("norms(pillar)", { ascending: true });

    // Fetch recent incidents
    const { data: incidents } = await supabase
      .from("incident_product_impact")
      .select("impact_level, security_incidents!inner(title, severity, incident_date, funds_lost_usd, incident_type)")
      .eq("product_id", product.id)
      .order("security_incidents(incident_date)", { ascending: false })
      .limit(5);

    // Debit credits
    let payment = { cost: 0, method: "stream" };
    if (!hasUnlimitedAccess) {
      const debit = await debitAgentCredits(
        auth.wallet, ANALYSIS_COST, "analysis", "/api/agent/analysis", productSlug
      );
      if (!debit.success) {
        return NextResponse.json({ error: debit.error }, { status: 402, headers: AGENT_CORS_HEADERS });
      }
      payment = { cost: ANALYSIS_COST, method: "credits", newBalance: debit.newBalance };
    }

    // Build pillar breakdown
    const pillarBreakdown = { S: { yes: 0, no: 0, na: 0, tbd: 0, norms: [] }, A: { yes: 0, no: 0, na: 0, tbd: 0, norms: [] }, F: { yes: 0, no: 0, na: 0, tbd: 0, norms: [] }, E: { yes: 0, no: 0, na: 0, tbd: 0, norms: [] } };

    for (const ev of evaluations || []) {
      const pillar = ev.norms?.pillar;
      if (pillar && pillarBreakdown[pillar]) {
        const result = (ev.result || "TBD").toUpperCase();
        if (result === "YES" || result === "YESP") pillarBreakdown[pillar].yes++;
        else if (result === "NO") pillarBreakdown[pillar].no++;
        else if (result === "N/A" || result === "NA") pillarBreakdown[pillar].na++;
        else pillarBreakdown[pillar].tbd++;

        // Include failed norms for risk analysis
        if (result === "NO") {
          pillarBreakdown[pillar].norms.push({
            code: ev.norms.code,
            title: ev.norms.title,
            confidence: ev.confidence,
          });
        }
      }
    }

    // Build risk assessment
    const totalNo = Object.values(pillarBreakdown).reduce((s, p) => s + p.no, 0);
    const totalEval = (evaluations || []).length;
    const failRate = totalEval > 0 ? totalNo / totalEval : 0;

    let riskLevel = "low";
    if (failRate > 0.3) riskLevel = "critical";
    else if (failRate > 0.2) riskLevel = "high";
    else if (failRate > 0.1) riskLevel = "medium";

    return NextResponse.json(
      {
        success: true,
        data: {
          product: {
            slug: product.slug,
            name: product.name,
            type: product.product_types?.name,
            url: product.url,
            description: product.description,
          },
          score: score ? {
            overall: Math.round(score.note_finale || 0),
            s: Math.round(score.score_s || 0),
            a: Math.round(score.score_a || 0),
            f: Math.round(score.score_f || 0),
            e: Math.round(score.score_e || 0),
            consumer: Math.round(score.note_consumer || 0),
            essential: Math.round(score.note_essential || 0),
          } : null,
          analysis: {
            totalNormsEvaluated: totalEval,
            pillarBreakdown,
            riskAssessment: {
              level: riskLevel,
              failRate: Math.round(failRate * 100),
              criticalFailures: pillarBreakdown.S.norms.length + pillarBreakdown.A.norms.length,
              weakestPillar: Object.entries(pillarBreakdown)
                .sort((a, b) => b[1].no - a[1].no)[0]?.[0] || null,
            },
          },
          incidents: (incidents || []).map(i => ({
            title: i.security_incidents?.title,
            severity: i.security_incidents?.severity,
            date: i.security_incidents?.incident_date,
            fundsLost: i.security_incidents?.funds_lost_usd,
            type: i.security_incidents?.incident_type,
            impactLevel: i.impact_level,
          })),
          lastUpdated: score?.calculated_at,
        },
        payment,
        meta: {
          apiVersion: "agent-1.0",
          timestamp: new Date().toISOString(),
          wallet: auth.wallet,
        },
      },
      {
        headers: {
          ...AGENT_CORS_HEADERS,
          "Cache-Control": "public, max-age=600",
        },
      }
    );
  } catch (error) {
    console.error("Agent analysis API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: AGENT_CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: AGENT_CORS_HEADERS });
}
