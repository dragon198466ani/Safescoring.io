import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { authenticateAgent, debitAgentCredits, AGENT_CORS_HEADERS } from "@/libs/agent-auth";
import { API_TIERS, PILLARS } from "@/libs/config-constants";
import { getScoreVerdict, getChangeIndicator } from "@/libs/score-utils";

/**
 * Agent Transition API - Migration Assistant
 *
 * POST /api/agent/transition
 *
 * Helps agents evaluate a migration from one crypto product to another.
 * Compares scores, calculates risk deltas per pillar, and generates
 * a migration checklist with compatibility notes.
 *
 * Headers:
 *   X-Agent-Wallet: 0x...
 *   X-Agent-Signature: <signature>
 *   X-Agent-Timestamp: <unix_ms>
 *
 * Body:
 *   {
 *     "from": "product-slug-current",
 *     "to": "product-slug-target",
 *     "use_case": "cold_storage" // optional context
 *   }
 *
 * Cost: $0.01 USDC per analysis
 */

const QUERY_COST = API_TIERS.agent.queryPriceUSDC;

// Pillar codes for iteration
const PILLAR_CODES = ["S", "A", "F", "E"];

// Score DB columns for the full query
const SCORE_SELECT = "note_finale, score_s, score_a, score_f, score_e, note_consumer, note_essential, total_norms_evaluated, total_yes, total_no, total_na, total_tbd, calculated_at";

/**
 * Fetch a product and its latest score by slug.
 * Returns { product, score } or { error, status }.
 */
async function fetchProductWithScore(slug) {
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, slug, url, type_id, product_types!inner(name, slug)")
    .eq("slug", slug)
    .maybeSingle();

  if (productError || !product) {
    return { error: `Product not found: ${slug}`, status: 404 };
  }

  const { data: score } = await supabase
    .from("safe_scoring_results")
    .select(SCORE_SELECT)
    .eq("product_id", product.id)
    .order("calculated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!score) {
    return { error: `Product not yet evaluated: ${slug}`, status: 404 };
  }

  return { product, score };
}

/**
 * Extract pillar scores as a { S, A, F, E } object.
 */
function extractPillarScores(score) {
  return {
    S: Math.round(score.score_s || 0),
    A: Math.round(score.score_a || 0),
    F: Math.round(score.score_f || 0),
    E: Math.round(score.score_e || 0),
  };
}

/**
 * Calculate risk delta per pillar between source and target.
 * Positive delta = improvement, negative = regression.
 */
function calculateRiskDelta(fromPillars, toPillars) {
  const delta = {};
  for (const code of PILLAR_CODES) {
    const diff = toPillars[code] - fromPillars[code];
    const pillarInfo = PILLARS[code];
    delta[code] = {
      pillar: pillarInfo.name,
      from: fromPillars[code],
      to: toPillars[code],
      delta: diff,
      direction: diff > 0 ? "improvement" : diff < 0 ? "regression" : "neutral",
    };
  }
  return delta;
}

/**
 * Generate a migration checklist based on the comparison.
 */
function generateMigrationChecklist(fromProduct, toProduct, fromScore, toScore, riskDelta, useCase) {
  const checklist = [];

  // 1. Always: backup current setup
  checklist.push({
    step: 1,
    action: "Backup current configuration",
    description: `Export your current ${fromProduct.name} settings, keys, and recovery data before migration.`,
    priority: "critical",
  });

  // 2. Check for score regressions
  const regressions = PILLAR_CODES.filter((c) => riskDelta[c].direction === "regression");
  if (regressions.length > 0) {
    const regNames = regressions.map((c) => PILLARS[c].name).join(", ");
    checklist.push({
      step: checklist.length + 1,
      action: "Evaluate score regressions",
      description: `${toProduct.name} scores lower on ${regNames}. Assess whether this regression is acceptable for your risk profile.`,
      priority: "high",
    });
  }

  // 3. Type compatibility check
  const fromType = fromProduct.product_types?.slug;
  const toType = toProduct.product_types?.slug;
  if (fromType !== toType) {
    checklist.push({
      step: checklist.length + 1,
      action: "Review product type change",
      description: `Migrating from ${fromProduct.product_types?.name || "Unknown"} to ${toProduct.product_types?.name || "Unknown"}. Ensure the new product type supports your use case.`,
      priority: "high",
    });
  }

  // 4. Use-case-specific checks
  if (useCase) {
    const useCaseChecks = getUseCaseChecks(useCase, fromProduct, toProduct, riskDelta);
    checklist.push(...useCaseChecks.map((check, i) => ({
      step: checklist.length + i + 1,
      ...check,
    })));
  }

  // 5. Transfer assets
  checklist.push({
    step: checklist.length + 1,
    action: "Transfer assets securely",
    description: `Move assets from ${fromProduct.name} to ${toProduct.name} using verified addresses. Send a small test transaction first.`,
    priority: "critical",
  });

  // 6. Verify target setup
  checklist.push({
    step: checklist.length + 1,
    action: "Verify target product setup",
    description: `Confirm ${toProduct.name} is fully configured: 2FA, backup, recovery phrase stored safely.`,
    priority: "high",
  });

  // 7. Monitor after migration
  checklist.push({
    step: checklist.length + 1,
    action: "Post-migration monitoring",
    description: "Monitor both products for 30 days. Keep old product accessible until fully transitioned.",
    priority: "medium",
  });

  return checklist;
}

/**
 * Generate use-case-specific checklist items.
 */
function getUseCaseChecks(useCase, fromProduct, toProduct, riskDelta) {
  const checks = [];
  const uc = useCase.toLowerCase().replace(/[^a-z_]/g, "");

  switch (uc) {
    case "cold_storage":
      checks.push({
        action: "Verify offline capability",
        description: `Ensure ${toProduct.name} supports air-gapped signing and offline storage for cold storage use.`,
        priority: "critical",
      });
      if (riskDelta.S.direction === "regression") {
        checks.push({
          action: "Security regression warning",
          description: `Security score drops from ${riskDelta.S.from} to ${riskDelta.S.to}. For cold storage, Security is paramount.`,
          priority: "critical",
        });
      }
      break;

    case "trading":
      checks.push({
        action: "Verify trading features",
        description: `Confirm ${toProduct.name} supports your required trading pairs, order types, and API integrations.`,
        priority: "high",
      });
      if (riskDelta.E.direction === "regression") {
        checks.push({
          action: "Efficiency regression warning",
          description: `Efficiency score drops from ${riskDelta.E.from} to ${riskDelta.E.to}. Trading requires strong usability/performance.`,
          priority: "high",
        });
      }
      break;

    case "defi":
    case "staking":
      checks.push({
        action: "Verify DeFi compatibility",
        description: `Ensure ${toProduct.name} supports the DeFi protocols and networks you need.`,
        priority: "high",
      });
      checks.push({
        action: "Check smart contract risks",
        description: "Review the smart contract audit status and TVL of the target platform.",
        priority: "high",
      });
      break;

    case "long_term":
    case "hodl":
      if (riskDelta.F.direction === "regression") {
        checks.push({
          action: "Fidelity regression warning",
          description: `Fidelity score drops from ${riskDelta.F.from} to ${riskDelta.F.to}. Long-term holding requires strong durability.`,
          priority: "critical",
        });
      }
      checks.push({
        action: "Verify long-term viability",
        description: `Check ${toProduct.name}'s company track record, funding status, and product roadmap for longevity.`,
        priority: "high",
      });
      break;

    default:
      checks.push({
        action: "Validate use case compatibility",
        description: `Confirm ${toProduct.name} supports your "${useCase}" use case requirements.`,
        priority: "medium",
      });
  }

  return checks;
}

/**
 * Generate compatibility notes between two products.
 */
function generateCompatibilityNotes(fromProduct, toProduct, fromScore, toScore, riskDelta) {
  const notes = [];

  // Overall score comparison
  const fromTotal = Math.round(fromScore.note_finale || 0);
  const toTotal = Math.round(toScore.note_finale || 0);
  const overallDelta = toTotal - fromTotal;

  if (overallDelta > 10) {
    notes.push("Significant overall score improvement. This migration strengthens your security posture.");
  } else if (overallDelta < -10) {
    notes.push("Significant overall score decrease. Carefully evaluate whether the tradeoffs are acceptable.");
  } else if (Math.abs(overallDelta) <= 5) {
    notes.push("Similar overall scores. Migration is lateral in terms of security posture.");
  }

  // Type compatibility
  const fromType = fromProduct.product_types?.slug;
  const toType = toProduct.product_types?.slug;
  if (fromType === toType) {
    notes.push(`Both products are ${fromProduct.product_types?.name || "the same type"}, making migration straightforward.`);
  } else {
    notes.push(`Different product types (${fromProduct.product_types?.name} -> ${toProduct.product_types?.name}). Migration may require workflow changes.`);
  }

  // Pillar-specific notes
  const improvements = PILLAR_CODES.filter((c) => riskDelta[c].delta >= 10);
  const regressions = PILLAR_CODES.filter((c) => riskDelta[c].delta <= -10);

  if (improvements.length > 0) {
    const names = improvements.map((c) => `${PILLARS[c].name} (+${riskDelta[c].delta})`).join(", ");
    notes.push(`Notable improvements in: ${names}.`);
  }

  if (regressions.length > 0) {
    const names = regressions.map((c) => `${PILLARS[c].name} (${riskDelta[c].delta})`).join(", ");
    notes.push(`Notable regressions in: ${names}. Review these areas carefully.`);
  }

  // Evaluation completeness
  const fromTbd = fromScore.total_tbd || 0;
  const toTbd = toScore.total_tbd || 0;
  if (fromTbd > 5 || toTbd > 5) {
    notes.push("One or both products have pending evaluations (TBD norms). Scores may change as more data becomes available.");
  }

  return notes;
}

/**
 * Estimate migration effort level.
 */
function estimateEffort(fromProduct, toProduct, riskDelta) {
  const fromType = fromProduct.product_types?.slug;
  const toType = toProduct.product_types?.slug;
  const regressionCount = PILLAR_CODES.filter((c) => riskDelta[c].direction === "regression").length;

  let effort = "low";
  let estimatedMinutes = 30;
  let description = "Simple migration with minimal configuration needed.";

  if (fromType !== toType) {
    effort = "high";
    estimatedMinutes = 120;
    description = "Cross-type migration requires significant workflow adaptation.";
  } else if (regressionCount >= 2) {
    effort = "medium";
    estimatedMinutes = 60;
    description = "Same type but multiple regressions require careful evaluation.";
  } else if (regressionCount === 1) {
    effort = "low";
    estimatedMinutes = 45;
    description = "Minor regression to evaluate, otherwise straightforward.";
  }

  return { level: effort, estimatedMinutes, description };
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
      { error: "Invalid JSON body" },
      { status: 400, headers: AGENT_CORS_HEADERS }
    );
  }

  const { from, to, use_case } = body || {};

  if (!from || !to) {
    return NextResponse.json(
      {
        error: "Missing required fields: 'from' and 'to' product slugs",
        example: {
          from: "ledger-nano-x",
          to: "trezor-model-t",
          use_case: "cold_storage",
        },
      },
      { status: 400, headers: AGENT_CORS_HEADERS }
    );
  }

  if (from === to) {
    return NextResponse.json(
      { error: "Source and target products must be different" },
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
    // 4. Fetch both products and scores in parallel
    const [fromResult, toResult] = await Promise.all([
      fetchProductWithScore(from),
      fetchProductWithScore(to),
    ]);

    if (fromResult.error) {
      return NextResponse.json(
        { error: fromResult.error, field: "from", slug: from },
        { status: fromResult.status, headers: AGENT_CORS_HEADERS }
      );
    }

    if (toResult.error) {
      return NextResponse.json(
        { error: toResult.error, field: "to", slug: to },
        { status: toResult.status, headers: AGENT_CORS_HEADERS }
      );
    }

    const { product: fromProduct, score: fromScore } = fromResult;
    const { product: toProduct, score: toScore } = toResult;

    // 5. Calculate comparisons
    const fromPillars = extractPillarScores(fromScore);
    const toPillars = extractPillarScores(toScore);
    const riskDelta = calculateRiskDelta(fromPillars, toPillars);

    const fromTotal = Math.round(fromScore.note_finale || 0);
    const toTotal = Math.round(toScore.note_finale || 0);
    const overallChange = getChangeIndicator(toTotal, fromTotal);

    // 6. Generate analysis
    const checklist = generateMigrationChecklist(
      fromProduct, toProduct, fromScore, toScore, riskDelta, use_case
    );
    const compatibilityNotes = generateCompatibilityNotes(
      fromProduct, toProduct, fromScore, toScore, riskDelta
    );
    const effort = estimateEffort(fromProduct, toProduct, riskDelta);

    // 7. Debit credits (unless streaming)
    let payment = { cost: 0, method: "stream" };
    if (!hasUnlimitedAccess) {
      const debit = await debitAgentCredits(
        auth.wallet, QUERY_COST, "query", "/api/agent/transition", `${from}->${to}`
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

    // 8. Return transition analysis
    return NextResponse.json(
      {
        success: true,
        data: {
          from: {
            slug: fromProduct.slug,
            name: fromProduct.name,
            type: fromProduct.product_types?.name || "Unknown",
            typeSlug: fromProduct.product_types?.slug || null,
            url: fromProduct.url,
            score: fromTotal,
            verdict: getScoreVerdict(fromTotal).text,
            scores: fromPillars,
            evaluation: {
              totalNorms: fromScore.total_norms_evaluated || 0,
              yes: fromScore.total_yes || 0,
              no: fromScore.total_no || 0,
              na: fromScore.total_na || 0,
              tbd: fromScore.total_tbd || 0,
            },
            lastUpdated: fromScore.calculated_at,
          },
          to: {
            slug: toProduct.slug,
            name: toProduct.name,
            type: toProduct.product_types?.name || "Unknown",
            typeSlug: toProduct.product_types?.slug || null,
            url: toProduct.url,
            score: toTotal,
            verdict: getScoreVerdict(toTotal).text,
            scores: toPillars,
            evaluation: {
              totalNorms: toScore.total_norms_evaluated || 0,
              yes: toScore.total_yes || 0,
              no: toScore.total_no || 0,
              na: toScore.total_na || 0,
              tbd: toScore.total_tbd || 0,
            },
            lastUpdated: toScore.calculated_at,
          },
          comparison: {
            overallDelta: toTotal - fromTotal,
            direction: overallChange.direction,
            label: overallChange.label,
            riskDelta,
          },
          migrationChecklist: checklist,
          compatibilityNotes,
          effort,
          useCase: use_case || null,
          links: {
            fromDetails: `https://safescoring.io/products/${fromProduct.slug}`,
            toDetails: `https://safescoring.io/products/${toProduct.slug}`,
            compare: `https://safescoring.io/compare/${fromProduct.slug}/${toProduct.slug}`,
          },
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
    console.error("Agent transition API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: AGENT_CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: AGENT_CORS_HEADERS });
}
