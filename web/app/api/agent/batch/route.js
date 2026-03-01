import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { authenticateAgent, debitAgentCredits, AGENT_CORS_HEADERS } from "@/libs/agent-auth";
import { API_TIERS } from "@/libs/config-constants";

/**
 * Agent Batch Score API - Multiple products in one query
 *
 * POST /api/agent/batch
 * Body: { "products": ["ledger-nano-x", "trezor-model-t", ...] }
 *
 * Cost: $0.005 USDC per product
 * Max: 50 products per request
 */

const BATCH_COST = API_TIERS.agent.batchPriceUSDC;
const MAX_BATCH_SIZE = 50;

export async function POST(request) {
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
      { error: "Rate limit exceeded", retryAfter: Math.ceil(auth.rateLimit.resetIn / 1000) },
      { status: 429, headers: { ...AGENT_CORS_HEADERS, "Retry-After": Math.ceil(auth.rateLimit.resetIn / 1000).toString() } }
    );
  }

  // 2. Parse body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", example: { products: ["ledger-nano-x", "trezor-model-t"] } },
      { status: 400, headers: AGENT_CORS_HEADERS }
    );
  }

  const slugs = body?.products;
  if (!Array.isArray(slugs) || slugs.length === 0) {
    return NextResponse.json(
      { error: "Missing or empty 'products' array" },
      { status: 400, headers: AGENT_CORS_HEADERS }
    );
  }

  if (slugs.length > MAX_BATCH_SIZE) {
    return NextResponse.json(
      { error: `Maximum ${MAX_BATCH_SIZE} products per batch request`, received: slugs.length },
      { status: 400, headers: AGENT_CORS_HEADERS }
    );
  }

  // Sanitize slugs
  const cleanSlugs = slugs
    .filter(s => typeof s === "string" && s.length > 0 && s.length < 200)
    .map(s => s.toLowerCase().trim());

  const totalCost = cleanSlugs.length * BATCH_COST;
  const hasUnlimitedAccess = auth.access.hasStream;

  // 3. Check balance
  if (!hasUnlimitedAccess) {
    if (!auth.access.exists || auth.access.balance < totalCost) {
      return NextResponse.json(
        {
          error: "Insufficient USDC balance",
          balance: auth.access.balance || 0,
          required: totalCost,
          products: cleanSlugs.length,
          costPerProduct: BATCH_COST,
        },
        { status: 402, headers: AGENT_CORS_HEADERS }
      );
    }
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503, headers: AGENT_CORS_HEADERS });
  }

  try {
    // 4. Fetch all products + scores
    const { data: products, error: prodError } = await supabase
      .from("products")
      .select("id, name, slug, url, type_id, product_types!inner(name, slug)")
      .in("slug", cleanSlugs);

    if (prodError) {
      return NextResponse.json({ error: "Database error" }, { status: 500, headers: AGENT_CORS_HEADERS });
    }

    const productIds = (products || []).map(p => p.id);

    const { data: scores } = await supabase
      .from("safe_scoring_results")
      .select("product_id, note_finale, score_s, score_a, score_f, score_e, calculated_at")
      .in("product_id", productIds)
      .order("calculated_at", { ascending: false });

    // Latest score per product
    const scoreMap = {};
    for (const s of scores || []) {
      if (!scoreMap[s.product_id]) scoreMap[s.product_id] = s;
    }

    // 5. Debit credits for found products only
    const foundSlugs = (products || []).map(p => p.slug);
    const actualCost = foundSlugs.length * BATCH_COST;

    let payment = { cost: 0, method: "stream" };
    if (!hasUnlimitedAccess && foundSlugs.length > 0) {
      const debit = await debitAgentCredits(
        auth.wallet, actualCost, "batch", "/api/agent/batch", null, foundSlugs.length
      );

      if (!debit.success) {
        return NextResponse.json(
          { error: debit.error },
          { status: 402, headers: AGENT_CORS_HEADERS }
        );
      }

      payment = { cost: actualCost, method: "credits", newBalance: debit.newBalance };
    }

    // 6. Format results
    const results = (products || []).map(p => {
      const score = scoreMap[p.id];
      return {
        slug: p.slug,
        name: p.name,
        type: p.product_types?.name || "Unknown",
        url: p.url,
        score: score ? Math.round(score.note_finale || 0) : null,
        scores: score ? {
          s: Math.round(score.score_s || 0),
          a: Math.round(score.score_a || 0),
          f: Math.round(score.score_f || 0),
          e: Math.round(score.score_e || 0),
        } : null,
        lastUpdated: score?.calculated_at || null,
      };
    });

    const notFound = cleanSlugs.filter(s => !foundSlugs.includes(s));

    return NextResponse.json(
      {
        success: true,
        data: results,
        notFound,
        payment,
        meta: {
          apiVersion: "agent-1.0",
          timestamp: new Date().toISOString(),
          wallet: auth.wallet,
          productsRequested: cleanSlugs.length,
          productsFound: foundSlugs.length,
          costPerProduct: BATCH_COST,
        },
      },
      {
        headers: {
          ...AGENT_CORS_HEADERS,
          "Cache-Control": "public, max-age=300",
        },
      }
    );
  } catch (error) {
    console.error("Agent batch API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: AGENT_CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: AGENT_CORS_HEADERS });
}
