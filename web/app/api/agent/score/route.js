import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { authenticateAgent, debitAgentCredits, AGENT_CORS_HEADERS } from "@/libs/agent-auth";
import { API_TIERS } from "@/libs/config-constants";
import { API_DISCLAIMER } from "@/libs/api-disclaimer";

/**
 * Agent Score API - Pay-per-query
 *
 * GET /api/agent/score?product=<slug>
 *
 * Headers:
 *   X-Agent-Wallet: 0x...
 *   X-Agent-Signature: <signature>
 *   X-Agent-Timestamp: <unix_ms>
 *
 * Cost: $0.01 USDC per query
 * Returns: Full SAFE score (S/A/F/E) + metadata
 */

const QUERY_COST = API_TIERS.agent.queryPriceUSDC;

export async function GET(request) {
  // 1. Authenticate agent
  const auth = await authenticateAgent(request);

  if (!auth.authenticated) {
    return NextResponse.json(
      { error: auth.error, docs: "https://safescoring.io/agents" },
      { status: 401, headers: AGENT_CORS_HEADERS }
    );
  }

  if (auth.rateLimited) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        retryAfter: Math.ceil(auth.rateLimit.resetIn / 1000),
        limit: auth.rateLimit.total,
      },
      {
        status: 429,
        headers: {
          ...AGENT_CORS_HEADERS,
          "Retry-After": Math.ceil(auth.rateLimit.resetIn / 1000).toString(),
        },
      }
    );
  }

  // 2. Check balance (skip if streaming)
  const hasUnlimitedAccess = auth.access.hasStream;

  if (!hasUnlimitedAccess) {
    if (!auth.access.exists) {
      return NextResponse.json(
        {
          error: "Wallet not registered. Deposit USDC to activate.",
          wallet: auth.wallet,
          depositUrl: "https://safescoring.io/agents#deposit",
        },
        { status: 402, headers: AGENT_CORS_HEADERS }
      );
    }

    if (auth.access.balance < QUERY_COST) {
      return NextResponse.json(
        {
          error: "Insufficient USDC balance",
          balance: auth.access.balance,
          required: QUERY_COST,
          depositUrl: "https://safescoring.io/agents#deposit",
        },
        { status: 402, headers: AGENT_CORS_HEADERS }
      );
    }
  }

  // 3. Get product slug
  const { searchParams } = new URL(request.url);
  const productSlug = searchParams.get("product");

  if (!productSlug) {
    return NextResponse.json(
      { error: "Missing 'product' query parameter", example: "/api/agent/score?product=ledger-nano-x" },
      { status: 400, headers: AGENT_CORS_HEADERS }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503, headers: AGENT_CORS_HEADERS }
    );
  }

  try {
    // 4. Fetch product + score
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, slug, url, type_id, product_types!inner(name, slug)")
      .eq("slug", productSlug)
      .maybeSingle();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Product not found", slug: productSlug },
        { status: 404, headers: AGENT_CORS_HEADERS }
      );
    }

    const { data: score } = await supabase
      .from("safe_scoring_results")
      .select("note_finale, score_s, score_a, score_f, score_e, note_consumer, note_essential, total_norms_evaluated, total_yes, total_no, total_na, total_tbd, calculated_at")
      .eq("product_id", product.id)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!score) {
      return NextResponse.json(
        { error: "Product not yet evaluated", slug: productSlug },
        { status: 404, headers: AGENT_CORS_HEADERS }
      );
    }

    // 5. Debit credits (unless streaming)
    let payment = { cost: 0, method: "stream" };
    if (!hasUnlimitedAccess) {
      const debit = await debitAgentCredits(
        auth.wallet, QUERY_COST, "query", "/api/agent/score", productSlug
      );

      if (!debit.success) {
        return NextResponse.json(
          { error: debit.error, balance: auth.access.balance },
          { status: 402, headers: AGENT_CORS_HEADERS }
        );
      }

      payment = {
        cost: QUERY_COST,
        method: "credits",
        newBalance: debit.newBalance,
      };
    }

    // 6. Return score
    return NextResponse.json(
      {
        success: true,
        _legal: API_DISCLAIMER,
        data: {
          slug: product.slug,
          name: product.name,
          type: product.product_types?.name || "Unknown",
          typeSlug: product.product_types?.slug || null,
          url: product.url,
          score: Math.round(score.note_finale || 0),
          scores: {
            s: Math.round(score.score_s || 0),
            a: Math.round(score.score_a || 0),
            f: Math.round(score.score_f || 0),
            e: Math.round(score.score_e || 0),
          },
          consumerScore: Math.round(score.note_consumer || 0),
          essentialScore: Math.round(score.note_essential || 0),
          evaluation: {
            totalNorms: score.total_norms_evaluated || 0,
            yes: score.total_yes || 0,
            no: score.total_no || 0,
            na: score.total_na || 0,
            tbd: score.total_tbd || 0,
          },
          lastUpdated: score.calculated_at,
          detailsUrl: `https://safescoring.io/products/${product.slug}`,
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
          "Cache-Control": "public, max-age=300",
          "X-Agent-Balance": payment.newBalance?.toString() || "unlimited",
          "X-Query-Cost": QUERY_COST.toString(),
        },
      }
    );
  } catch (error) {
    console.error("Agent score API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: AGENT_CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: AGENT_CORS_HEADERS });
}
