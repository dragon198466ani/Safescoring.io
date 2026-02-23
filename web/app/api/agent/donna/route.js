import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { authenticateAgent, debitAgentCredits, AGENT_CORS_HEADERS } from "@/libs/agent-auth";
import { API_TIERS } from "@/libs/config-constants";

/**
 * Agent Donna — Pre-transaction Gatekeeper
 *
 * POST /api/agent/donna
 *
 * Headers:
 *   X-Agent-Wallet: 0x...
 *   X-Agent-Signature: <signature>
 *   X-Agent-Timestamp: <unix_ms>
 *
 * Body:
 *   { product, action, amount_usd?, threshold? }
 *
 * Cost: $0.01 USDC per check
 * Returns: PASS / CAUTION / BLOCK recommendation
 */

const QUERY_COST = API_TIERS.agent.queryPriceUSDC;

// Default thresholds
const DEFAULT_PASS_THRESHOLD = 70;
const DEFAULT_CAUTION_THRESHOLD = 50;
const HIGH_VALUE_THRESHOLD_USD = 10000;
const HIGH_VALUE_SCORE_REQUIRED = 75;
const FIDELITY_INCIDENT_THRESHOLD = 50;

/**
 * Determine recommendation based on score, amount, and pillar analysis
 */
function getRecommendation(score, pillarScores, amountUsd, customThreshold) {
  const passThreshold = customThreshold || DEFAULT_PASS_THRESHOLD;
  const cautionThreshold = customThreshold
    ? Math.max(customThreshold - 20, 0)
    : DEFAULT_CAUTION_THRESHOLD;

  const riskFactors = [];

  // Check for weak pillars (any pillar below 50)
  const pillarNames = { S: "Security", A: "Architecture", F: "Fidelity", E: "Economics" };
  for (const [key, value] of Object.entries(pillarScores)) {
    if (value < 50) {
      riskFactors.push(`WEAK_${key}_PILLAR`);
    }
  }

  // Check for recent incidents (Fidelity pillar < 50)
  if (pillarScores.F < FIDELITY_INCIDENT_THRESHOLD) {
    riskFactors.push("RECENT_INCIDENTS");
  }

  // High-value transaction with mediocre score
  if (amountUsd && amountUsd > HIGH_VALUE_THRESHOLD_USD && score < HIGH_VALUE_SCORE_REQUIRED) {
    riskFactors.push("HIGH_VALUE_LOW_SCORE");
  }

  // Determine recommendation
  let recommendation;

  if (score < cautionThreshold) {
    recommendation = "BLOCK";
  } else if (score < passThreshold) {
    recommendation = "CAUTION";
  } else if (amountUsd && amountUsd > HIGH_VALUE_THRESHOLD_USD && score < HIGH_VALUE_SCORE_REQUIRED) {
    recommendation = "CAUTION";
  } else {
    recommendation = "PASS";
  }

  return { recommendation, riskFactors };
}

/**
 * Generate a human-readable message for the recommendation
 */
function generateMessage(productName, score, recommendation, action, riskFactors) {
  const actionLabel = action || "interaction";

  switch (recommendation) {
    case "PASS":
      return `${productName} has a SAFE score of ${score}/100. Generally safe for ${actionLabel}.`;
    case "CAUTION":
      if (riskFactors.includes("HIGH_VALUE_LOW_SCORE")) {
        return `${productName} has a SAFE score of ${score}/100. Exercise caution for high-value ${actionLabel}. Consider splitting or using a higher-rated alternative.`;
      }
      return `${productName} has a SAFE score of ${score}/100. Proceed with caution for ${actionLabel}. Review risk factors before proceeding.`;
    case "BLOCK":
      return `${productName} has a SAFE score of ${score}/100. Not recommended for ${actionLabel}. Significant risks detected.`;
    default:
      return `${productName} has a SAFE score of ${score}/100.`;
  }
}

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

  // 3. Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", example: { product: "binance", action: "deposit", amount_usd: 5000 } },
      { status: 400, headers: AGENT_CORS_HEADERS }
    );
  }

  const { product: productSlug, action, amount_usd: amountUsd, threshold } = body;

  if (!productSlug) {
    return NextResponse.json(
      { error: "Missing 'product' field in request body", example: { product: "binance", action: "deposit" } },
      { status: 400, headers: AGENT_CORS_HEADERS }
    );
  }

  if (threshold !== undefined && (typeof threshold !== "number" || threshold < 0 || threshold > 100)) {
    return NextResponse.json(
      { error: "Invalid 'threshold' — must be a number between 0 and 100" },
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
    // 4. Fetch product
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

    // 5. Fetch latest score
    const { data: score } = await supabase
      .from("safe_scoring_results")
      .select("note_finale, score_s, score_a, score_f, score_e, calculated_at")
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

    // 6. Debit credits (unless streaming)
    let remainingCredits;
    if (!hasUnlimitedAccess) {
      const debit = await debitAgentCredits(
        auth.wallet, QUERY_COST, "query", "/api/agent/donna", productSlug
      );

      if (!debit.success) {
        return NextResponse.json(
          { error: debit.error, balance: auth.access.balance },
          { status: 402, headers: AGENT_CORS_HEADERS }
        );
      }

      remainingCredits = debit.newBalance;
    } else {
      remainingCredits = null; // unlimited
    }

    // 7. Compute recommendation
    const finalScore = Math.round(score.note_finale || 0);
    const pillarScores = {
      S: Math.round(score.score_s || 0),
      A: Math.round(score.score_a || 0),
      F: Math.round(score.score_f || 0),
      E: Math.round(score.score_e || 0),
    };

    const { recommendation, riskFactors } = getRecommendation(
      finalScore, pillarScores, amountUsd, threshold
    );

    const message = generateMessage(
      product.name, finalScore, recommendation, action, riskFactors
    );

    // 8. Return response
    return NextResponse.json(
      {
        recommendation,
        product: product.name,
        score: finalScore,
        pillar_scores: pillarScores,
        risk_factors: riskFactors,
        message,
        details_url: `https://safescoring.io/products/${product.slug}`,
        cost: hasUnlimitedAccess ? "$0.00 (stream)" : `$${QUERY_COST.toFixed(2)}`,
        remaining_credits: remainingCredits !== null
          ? parseFloat(remainingCredits.toFixed(2))
          : "unlimited",
        meta: {
          action: action || null,
          amount_usd: amountUsd || null,
          threshold: threshold || DEFAULT_PASS_THRESHOLD,
          apiVersion: "agent-1.0",
          timestamp: new Date().toISOString(),
          wallet: auth.wallet,
          lastEvaluated: score.calculated_at,
        },
      },
      {
        headers: {
          ...AGENT_CORS_HEADERS,
          "Cache-Control": "public, max-age=300",
          "X-Agent-Balance": remainingCredits?.toString() || "unlimited",
          "X-Query-Cost": QUERY_COST.toString(),
        },
      }
    );
  } catch (error) {
    console.error("Agent Donna API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: AGENT_CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: AGENT_CORS_HEADERS });
}
