import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { getClientId } from "@/libs/rate-limit";
import { checkUnifiedAccess, getPlanLimits } from "@/libs/access";
import { PLAN_CODES, PILLARS } from "@/libs/config-constants";
import { getScoreVerdict } from "@/libs/score-utils";
import crypto from "crypto";

/**
 * SafeScoring API v1 - Batch Evaluate (VC Edition)
 *
 * POST /api/v1/batch-evaluate
 *
 * Evaluate multiple crypto products in bulk for VCs and institutional users.
 *
 * Headers:
 *   X-API-Key: required for authenticated tier (Professional/Enterprise)
 *
 * Body:
 *   {
 *     "products": ["binance", "coinbase", "kraken", "ledger-nano-x"],
 *     "format": "summary" | "detailed",
 *     "include_comparison": true
 *   }
 *
 * Pricing:
 *   - $0.01 per product evaluated
 *   - 10% batch discount for 5+ products
 *   - Billed against API key's plan quota
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};

// Pricing constants
const PER_PRODUCT_COST = 0.01;
const BATCH_DISCOUNT_THRESHOLD = 5;
const BATCH_DISCOUNT_PERCENT = 10;

// Limits
const MAX_PRODUCTS_PER_BATCH = 50;
const MIN_PRODUCTS_PER_BATCH = 1;

// In-memory store for per-tier rate limiting
const tierRateLimitStore = new Map();

/**
 * Check rate limit based on user's plan tier
 */
function checkTierRateLimit(clientId, limits) {
  const windowMs = 60000;
  const maxRequests = limits.apiRatePerMinute || 10;
  const now = Date.now();
  const key = `tier-batch:${clientId}`;

  let data = tierRateLimitStore.get(key);
  if (!data || now - data.windowStart > windowMs) {
    data = { windowStart: now, requests: 0 };
  }

  data.requests++;
  tierRateLimitStore.set(key, data);

  const remaining = Math.max(0, maxRequests - data.requests);
  const resetIn = Math.max(0, windowMs - (now - data.windowStart));
  const allowed = data.requests <= maxRequests;

  return { allowed, remaining, resetIn, total: maxRequests };
}

/**
 * Track API usage for daily/monthly limits
 */
async function checkUsageQuota(userId, limits, productCount) {
  if (!userId || !isSupabaseConfigured()) {
    return { allowed: true };
  }

  if (limits.apiDailyLimit === -1 && limits.apiMonthlyLimit === -1) {
    return { allowed: true };
  }

  const today = new Date().toISOString().split("T")[0];
  const monthStart = today.substring(0, 7) + "-01";

  const { data: dailyData } = await supabase
    .from("api_usage_daily")
    .select("request_count")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  const dailyUsed = dailyData?.request_count || 0;

  const { data: monthlyData } = await supabase
    .from("api_usage_daily")
    .select("request_count")
    .eq("user_id", userId)
    .gte("date", monthStart);

  const monthlyUsed = (monthlyData || []).reduce((sum, d) => sum + (d.request_count || 0), 0);

  // Batch counts as N requests (one per product)
  const dailyExceeded = limits.apiDailyLimit > 0 && (dailyUsed + productCount) > limits.apiDailyLimit;
  const monthlyExceeded = limits.apiMonthlyLimit > 0 && (monthlyUsed + productCount) > limits.apiMonthlyLimit;

  return {
    allowed: !dailyExceeded && !monthlyExceeded,
    dailyUsed,
    monthlyUsed,
    dailyExceeded,
    monthlyExceeded,
  };
}

/**
 * Record API usage for a user (counts as N requests for batch)
 */
async function recordUsage(userId, endpoint, count = 1) {
  if (!userId || !isSupabaseConfigured()) return;

  const today = new Date().toISOString().split("T")[0];

  // Record each product as a separate API call for quota tracking
  const { error } = await supabase.rpc("increment_api_usage_daily", {
    p_user_id: userId,
    p_date: today,
    p_endpoint: endpoint,
  });

  if (error?.code === "42883") {
    await supabase
      .from("api_usage_daily")
      .upsert(
        { user_id: userId, date: today, request_count: count, endpoint },
        { onConflict: "user_id,date", ignoreDuplicates: false }
      );
  }
}

/**
 * Validate API key and check plan access
 */
async function validateApiKey(apiKey) {
  if (!apiKey || !isSupabaseConfigured()) return { valid: false };

  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, is_active, user_id")
    .eq("key_hash", keyHash)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return { valid: false };

  // Update last_used_at (fire and forget)
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => {})
    .catch(() => {});

  let hasApiAccess = false;
  let plan = PLAN_CODES.FREE;
  let limits = getPlanLimits(plan);

  if (data.user_id) {
    const access = await checkUnifiedAccess({ userId: data.user_id });
    plan = access.plan || PLAN_CODES.FREE;
    limits = getPlanLimits(plan);
    hasApiAccess = limits.apiAccess === true;
  }

  return { valid: true, userId: data.user_id, hasApiAccess, plan, limits };
}

/**
 * Format a product evaluation in summary mode.
 */
function formatSummary(product, score) {
  const total = Math.round(score.note_finale || 0);
  return {
    slug: product.slug,
    name: product.name,
    type: product.product_types?.name || "Unknown",
    score: total,
    verdict: getScoreVerdict(total).text,
    scores: {
      s: Math.round(score.score_s || 0),
      a: Math.round(score.score_a || 0),
      f: Math.round(score.score_f || 0),
      e: Math.round(score.score_e || 0),
    },
    lastUpdated: score.calculated_at,
    detailsUrl: `https://safescoring.io/products/${product.slug}`,
  };
}

/**
 * Format a product evaluation in detailed mode.
 */
function formatDetailed(product, score) {
  const total = Math.round(score.note_finale || 0);
  const pillarScores = {
    s: Math.round(score.score_s || 0),
    a: Math.round(score.score_a || 0),
    f: Math.round(score.score_f || 0),
    e: Math.round(score.score_e || 0),
  };

  // Find strongest and weakest pillars
  const pillarEntries = Object.entries(pillarScores);
  const strongest = pillarEntries.reduce((a, b) => (a[1] >= b[1] ? a : b));
  const weakest = pillarEntries.reduce((a, b) => (a[1] <= b[1] ? a : b));

  return {
    slug: product.slug,
    name: product.name,
    type: product.product_types?.name || "Unknown",
    typeSlug: product.product_types?.slug || null,
    url: product.url,
    score: total,
    verdict: getScoreVerdict(total).text,
    scores: pillarScores,
    consumerScore: Math.round(score.note_consumer || 0),
    essentialScore: Math.round(score.note_essential || 0),
    evaluation: {
      totalNorms: score.total_norms_evaluated || 0,
      yes: score.total_yes || 0,
      no: score.total_no || 0,
      na: score.total_na || 0,
      tbd: score.total_tbd || 0,
      completeness: score.total_norms_evaluated
        ? Math.round(((score.total_yes + score.total_no + score.total_na) / score.total_norms_evaluated) * 100)
        : 0,
    },
    analysis: {
      strongestPillar: {
        code: strongest[0].toUpperCase(),
        name: PILLARS[strongest[0].toUpperCase()]?.name || strongest[0],
        score: strongest[1],
      },
      weakestPillar: {
        code: weakest[0].toUpperCase(),
        name: PILLARS[weakest[0].toUpperCase()]?.name || weakest[0],
        score: weakest[1],
      },
      pillarSpread: Math.max(...Object.values(pillarScores)) - Math.min(...Object.values(pillarScores)),
    },
    lastUpdated: score.calculated_at,
    links: {
      details: `https://safescoring.io/products/${product.slug}`,
      badge: `https://safescoring.io/api/badge/${product.slug}`,
      widget: `https://safescoring.io/api/widget/${product.slug}`,
    },
  };
}

/**
 * Generate comparison data across all evaluated products.
 */
function generateComparison(evaluations) {
  if (evaluations.length === 0) {
    return null;
  }

  // Sort by score descending
  const sorted = [...evaluations].sort((a, b) => (b.score || 0) - (a.score || 0));

  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  // Calculate averages
  const validScores = evaluations.filter((e) => e.score != null);
  const avgScore = validScores.length
    ? Math.round(validScores.reduce((sum, e) => sum + e.score, 0) / validScores.length)
    : 0;

  // Per-pillar averages
  const pillarAverages = {};
  for (const code of ["s", "a", "f", "e"]) {
    const vals = validScores.map((e) => e.scores?.[code] || 0);
    pillarAverages[code] = vals.length
      ? Math.round(vals.reduce((sum, v) => sum + v, 0) / vals.length)
      : 0;
  }

  // Generate recommendations
  const recommendations = [];

  if (best.score >= 80) {
    recommendations.push({
      type: "top_pick",
      message: `${best.name} leads the batch with a score of ${best.score}/100 (${getScoreVerdict(best.score).text}).`,
    });
  }

  if (worst.score < 40) {
    recommendations.push({
      type: "risk_alert",
      message: `${worst.name} scores ${worst.score}/100 and may pose significant risks. Review before investing or recommending.`,
    });
  }

  const spread = best.score - worst.score;
  if (spread > 30) {
    recommendations.push({
      type: "spread_warning",
      message: `Large score spread (${spread} points) across the batch. Quality varies significantly between products.`,
    });
  }

  // Find the weakest common pillar
  const weakestPillar = Object.entries(pillarAverages).reduce((a, b) =>
    a[1] <= b[1] ? a : b
  );
  const pillarCode = weakestPillar[0].toUpperCase();
  const pillarName = PILLARS[pillarCode]?.name || pillarCode;
  if (weakestPillar[1] < 50) {
    recommendations.push({
      type: "pillar_weakness",
      message: `${pillarName} is the weakest pillar across the batch (avg: ${weakestPillar[1]}/100). This sector may have systemic ${pillarName.toLowerCase()} challenges.`,
    });
  }

  return {
    ranking: sorted.map((e, i) => ({
      rank: i + 1,
      slug: e.slug,
      name: e.name,
      score: e.score,
      verdict: e.verdict,
    })),
    best: { slug: best.slug, name: best.name, score: best.score },
    worst: { slug: worst.slug, name: worst.name, score: worst.score },
    average: {
      overall: avgScore,
      pillars: pillarAverages,
    },
    spread,
    recommendations,
  };
}

/**
 * Calculate pricing for the batch.
 */
function calculatePricing(productCount) {
  const hasDiscount = productCount >= BATCH_DISCOUNT_THRESHOLD;
  const discountPercent = hasDiscount ? BATCH_DISCOUNT_PERCENT : 0;
  const subtotal = productCount * PER_PRODUCT_COST;
  const discount = hasDiscount ? subtotal * (discountPercent / 100) : 0;
  const total = subtotal - discount;

  return {
    perProduct: PER_PRODUCT_COST,
    productCount,
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    discountPercent: hasDiscount ? `${discountPercent}%` : null,
    total: Math.round(total * 100) / 100,
    currency: "USD",
  };
}

export async function POST(request) {
  const clientId = getClientId(request);
  const apiKey = request.headers.get("x-api-key");

  // 1. Validate API key - required for batch endpoint
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "API key required for batch evaluation",
        docs: "https://safescoring.io/api#authentication",
        hint: "Include X-API-Key header with your API key. Available on Professional and Enterprise plans.",
      },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  const keyValidation = await validateApiKey(apiKey);

  if (!keyValidation.valid) {
    return NextResponse.json(
      { error: "Invalid API key" },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  if (!keyValidation.hasApiAccess) {
    return NextResponse.json(
      {
        error: "API access requires a Professional or Enterprise plan",
        plan: keyValidation.plan,
        upgrade: true,
        upgradeUrl: "https://safescoring.io/#pricing",
      },
      { status: 403, headers: CORS_HEADERS }
    );
  }

  // 2. Rate limiting
  const rateCheck = checkTierRateLimit(clientId, keyValidation.limits);

  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        retryAfter: Math.ceil(rateCheck.resetIn / 1000),
        limit: rateCheck.total,
        remaining: rateCheck.remaining,
        plan: keyValidation.plan,
      },
      {
        status: 429,
        headers: {
          ...CORS_HEADERS,
          "Retry-After": Math.ceil(rateCheck.resetIn / 1000).toString(),
          "X-RateLimit-Limit": rateCheck.total.toString(),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  // 3. Parse and validate request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const { products, format = "summary", include_comparison = true } = body || {};

  // Validate products array
  if (!Array.isArray(products) || products.length < MIN_PRODUCTS_PER_BATCH) {
    return NextResponse.json(
      {
        error: `'products' must be an array with at least ${MIN_PRODUCTS_PER_BATCH} product slug(s)`,
        example: {
          products: ["binance", "coinbase", "kraken"],
          format: "summary",
          include_comparison: true,
        },
      },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  if (products.length > MAX_PRODUCTS_PER_BATCH) {
    return NextResponse.json(
      {
        error: `Maximum ${MAX_PRODUCTS_PER_BATCH} products per batch request`,
        requested: products.length,
        limit: MAX_PRODUCTS_PER_BATCH,
      },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // Validate all slugs are strings
  const invalidSlugs = products.filter((p) => typeof p !== "string" || p.trim().length === 0);
  if (invalidSlugs.length > 0) {
    return NextResponse.json(
      { error: "All product entries must be non-empty strings (slugs)" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // Deduplicate slugs
  const uniqueSlugs = [...new Set(products.map((p) => p.trim().toLowerCase()))];

  // Validate format
  const validFormats = ["summary", "detailed"];
  if (!validFormats.includes(format)) {
    return NextResponse.json(
      { error: `Invalid format. Must be one of: ${validFormats.join(", ")}` },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // 4. Check usage quota (batch counts as N requests)
  const quotaCheck = await checkUsageQuota(
    keyValidation.userId,
    keyValidation.limits,
    uniqueSlugs.length
  );

  if (!quotaCheck.allowed) {
    const limitType = quotaCheck.dailyExceeded ? "daily" : "monthly";
    const limitValue = quotaCheck.dailyExceeded
      ? keyValidation.limits.apiDailyLimit
      : keyValidation.limits.apiMonthlyLimit;
    const usedValue = quotaCheck.dailyExceeded
      ? quotaCheck.dailyUsed
      : quotaCheck.monthlyUsed;

    return NextResponse.json(
      {
        error: `${limitType.charAt(0).toUpperCase() + limitType.slice(1)} API quota exceeded`,
        limit: limitValue,
        used: usedValue,
        batchSize: uniqueSlugs.length,
        plan: keyValidation.plan,
        upgrade: keyValidation.plan !== "enterprise",
        upgradeUrl: "https://safescoring.io/#pricing",
      },
      {
        status: 429,
        headers: {
          ...CORS_HEADERS,
          "X-Quota-Type": limitType,
          "X-Quota-Limit": limitValue.toString(),
          "X-Quota-Used": usedValue.toString(),
        },
      }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503, headers: CORS_HEADERS }
    );
  }

  try {
    // 5. Fetch all products in batch
    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("id, name, slug, url, type_id, product_types!inner(name, slug)")
      .in("slug", uniqueSlugs);

    if (productsError) {
      console.error("Batch evaluate products error:", productsError);
      return NextResponse.json(
        { error: "Failed to fetch products" },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    // Map products by slug for easy lookup
    const productMap = {};
    for (const p of productsData || []) {
      productMap[p.slug] = p;
    }

    // Identify which slugs were not found
    const foundSlugs = Object.keys(productMap);
    const notFoundSlugs = uniqueSlugs.filter((s) => !productMap[s]);

    // 6. Fetch scores for all found products
    const productIds = foundSlugs.map((s) => productMap[s].id);
    let scoreMap = {};

    if (productIds.length > 0) {
      const { data: scores } = await supabase
        .from("safe_scoring_results")
        .select("product_id, note_finale, score_s, score_a, score_f, score_e, note_consumer, note_essential, total_norms_evaluated, total_yes, total_no, total_na, total_tbd, calculated_at")
        .in("product_id", productIds)
        .order("calculated_at", { ascending: false });

      // Create score map (latest score per product)
      for (const score of scores || []) {
        if (!scoreMap[score.product_id]) {
          scoreMap[score.product_id] = score;
        }
      }
    }

    // 7. Build evaluations
    const evaluations = [];
    const notEvaluated = [];

    for (const slug of uniqueSlugs) {
      const product = productMap[slug];
      if (!product) continue; // already tracked in notFoundSlugs

      const score = scoreMap[product.id];
      if (!score) {
        notEvaluated.push(slug);
        continue;
      }

      const formatted = format === "detailed"
        ? formatDetailed(product, score)
        : formatSummary(product, score);

      evaluations.push(formatted);
    }

    // 8. Generate comparison if requested
    const comparison = include_comparison ? generateComparison(evaluations) : null;

    // 9. Calculate pricing
    const pricing = calculatePricing(evaluations.length);

    // Generate a deterministic batch ID for report URL
    const batchId = crypto
      .createHash("md5")
      .update(uniqueSlugs.sort().join(",") + new Date().toISOString().split("T")[0])
      .digest("hex")
      .substring(0, 12);

    // 10. Record API usage (fire and forget, counts as N requests)
    if (keyValidation.userId) {
      // Record once with the batch count for the endpoint
      recordUsage(keyValidation.userId, "/api/v1/batch-evaluate", evaluations.length).catch(() => {});
    }

    // 11. Build response headers
    const responseHeaders = {
      ...CORS_HEADERS,
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "X-RateLimit-Limit": rateCheck.total.toString(),
      "X-RateLimit-Remaining": rateCheck.remaining.toString(),
      "X-Plan": keyValidation.plan,
      "X-Batch-Size": evaluations.length.toString(),
    };

    if (keyValidation.limits.apiDailyLimit > 0) {
      responseHeaders["X-Daily-Limit"] = keyValidation.limits.apiDailyLimit.toString();
    }
    if (keyValidation.limits.apiMonthlyLimit > 0) {
      responseHeaders["X-Monthly-Limit"] = keyValidation.limits.apiMonthlyLimit.toString();
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          evaluations,
          ...(comparison ? { comparison } : {}),
          reportUrl: null, // PDF reports coming soon
          pricing,
        },
        warnings: {
          ...(notFoundSlugs.length > 0 ? { notFound: notFoundSlugs } : {}),
          ...(notEvaluated.length > 0 ? { notEvaluated } : {}),
        },
        meta: {
          apiVersion: "1.0",
          timestamp: new Date().toISOString(),
          plan: keyValidation.plan,
          batchId,
          format,
          requested: uniqueSlugs.length,
          evaluated: evaluations.length,
        },
      },
      { headers: responseHeaders }
    );
  } catch (error) {
    console.error("Batch evaluate API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS });
}
