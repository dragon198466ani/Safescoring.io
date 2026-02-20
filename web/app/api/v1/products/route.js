import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { getClientId } from "@/libs/rate-limit";
import { checkUnifiedAccess, getPlanLimits } from "@/libs/access";
import { PLAN_CODES } from "@/libs/config-constants";
import crypto from "crypto";

/**
 * SafeScoring Public API v1 - Products List
 *
 * GET /api/v1/products
 *
 * Query params:
 * - type: Filter by product type (e.g., "hardware-wallet")
 * - limit: Max results (default: 50, max: 100)
 * - offset: Pagination offset
 * - sort: Sort field (score, name, updated)
 * - order: Sort order (asc, desc)
 * - min_score: Minimum score filter
 *
 * Headers:
 * - X-API-Key: Optional API key for higher rate limits
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};

// In-memory store for per-tier rate limiting (use Redis in production)
const tierRateLimitStore = new Map();

/**
 * Check rate limit based on user's plan tier
 * Returns { allowed, remaining, resetIn, total }
 */
function checkTierRateLimit(clientId, limits) {
  const windowMs = 60000; // 1 minute window
  const maxRequests = limits.apiRatePerMinute || 10;
  const now = Date.now();
  const key = `tier:${clientId}`;

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
 * Returns { allowed, dailyUsed, monthlyUsed, limits }
 */
async function checkUsageQuota(userId, limits) {
  if (!userId || !isSupabaseConfigured()) {
    return { allowed: true, dailyUsed: 0, monthlyUsed: 0, limits };
  }

  // Unlimited plan
  if (limits.apiDailyLimit === -1 && limits.apiMonthlyLimit === -1) {
    return { allowed: true, dailyUsed: 0, monthlyUsed: 0, limits };
  }

  const today = new Date().toISOString().split("T")[0];
  const monthStart = today.substring(0, 7) + "-01";

  // Get today's usage
  const { data: dailyData } = await supabase
    .from("api_usage_daily")
    .select("request_count")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  const dailyUsed = dailyData?.request_count || 0;

  // Get monthly usage
  const { data: monthlyData } = await supabase
    .from("api_usage_daily")
    .select("request_count")
    .eq("user_id", userId)
    .gte("date", monthStart);

  const monthlyUsed = (monthlyData || []).reduce((sum, d) => sum + (d.request_count || 0), 0);

  // Check limits
  const dailyExceeded = limits.apiDailyLimit > 0 && dailyUsed >= limits.apiDailyLimit;
  const monthlyExceeded = limits.apiMonthlyLimit > 0 && monthlyUsed >= limits.apiMonthlyLimit;

  return {
    allowed: !dailyExceeded && !monthlyExceeded,
    dailyUsed,
    monthlyUsed,
    limits,
    dailyExceeded,
    monthlyExceeded,
  };
}

/**
 * Record API usage for a user
 */
async function recordUsage(userId, endpoint = "/api/v1/products") {
  if (!userId || !isSupabaseConfigured()) return;

  const today = new Date().toISOString().split("T")[0];

  // Upsert daily usage
  const { error } = await supabase.rpc("increment_api_usage_daily", {
    p_user_id: userId,
    p_date: today,
    p_endpoint: endpoint,
  });

  // Fallback if RPC doesn't exist
  if (error?.code === "42883") {
    // Function doesn't exist, use upsert
    await supabase
      .from("api_usage_daily")
      .upsert(
        { user_id: userId, date: today, request_count: 1, endpoint },
        { onConflict: "user_id,date", ignoreDuplicates: false }
      );
  }
}

/**
 * SECURITY: Validate API key against database
 * Returns { valid: false } or { valid: true, userId, hasApiAccess, plan, limits }
 */
async function validateApiKey(apiKey) {
  if (!apiKey || !isSupabaseConfigured()) return { valid: false };

  // SECURITY: Hash the key before lookup (keys are stored hashed)
  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, is_active, user_id")
    .eq("key_hash", keyHash)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return { valid: false };

  // Update last_used_at timestamp (fire and forget)
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => {})
    .catch(() => {});

  // Check user's plan and get API limits
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

export async function GET(request) {
  const clientId = getClientId(request);
  const apiKey = request.headers.get("x-api-key");

  // SECURITY: Validate API key and check plan access
  const keyValidation = apiKey ? await validateApiKey(apiKey) : { valid: false };

  // If API key provided but user doesn't have API access, reject
  if (apiKey && keyValidation.valid && !keyValidation.hasApiAccess) {
    return NextResponse.json(
      {
        error: "API access requires a Professional or Enterprise plan",
        upgrade: true,
        upgradeUrl: "https://safescoring.io/#pricing",
      },
      { status: 403, headers: CORS_HEADERS }
    );
  }

  const isValidKey = keyValidation.valid && keyValidation.hasApiAccess;

  // Apply tier-specific rate limiting
  let rateCheck;
  if (isValidKey) {
    // Use plan-specific rate limits (Professional: 30/min, Enterprise: 100/min)
    rateCheck = checkTierRateLimit(clientId, keyValidation.limits);

    // Also check daily/monthly quotas
    const quotaCheck = await checkUsageQuota(keyValidation.userId, keyValidation.limits);
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
  } else {
    // Public API access - very limited (10 req/min)
    const publicLimits = { apiRatePerMinute: 10 };
    rateCheck = checkTierRateLimit(`public:${clientId}`, publicLimits);
  }

  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        retryAfter: Math.ceil(rateCheck.resetIn / 1000),
        limit: rateCheck.total,
        remaining: rateCheck.remaining,
        plan: isValidKey ? keyValidation.plan : "public",
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

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503, headers: CORS_HEADERS }
    );
  }

  try {
    const { searchParams } = new URL(request.url);

    // Parse query params
    const type = searchParams.get("type");
    const limit = Math.min(parseInt(searchParams.get("limit")) || 50, 100);
    const offset = parseInt(searchParams.get("offset")) || 0;
    const sort = searchParams.get("sort") || "score";
    const order = searchParams.get("order") || "desc";
    const minScore = parseInt(searchParams.get("min_score")) || 0;

    // Build query
    let query = supabase
      .from("products")
      .select(`
        id,
        name,
        slug,
        url,
        type_id,
        product_types!inner(name, slug)
      `, { count: "exact" });

    // Filter by type
    if (type) {
      query = query.eq("product_types.slug", type);
    }

    // Get products
    const { data: products, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("API v1 products error:", error);
      return NextResponse.json(
        { error: "Failed to fetch products" },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    // Get scores for all products
    const productIds = products.map(p => p.id);
    const { data: scores } = await supabase
      .from("safe_scoring_results")
      .select("product_id, note_finale, score_s, score_a, score_f, score_e, calculated_at")
      .in("product_id", productIds)
      .order("calculated_at", { ascending: false });

    // Create score map (latest score per product)
    const scoreMap = {};
    for (const score of scores || []) {
      if (!scoreMap[score.product_id]) {
        scoreMap[score.product_id] = score;
      }
    }

    // Format response
    let results = products.map(p => {
      const score = scoreMap[p.id];
      return {
        slug: p.slug,
        name: p.name,
        type: p.product_types?.name || "Unknown",
        typeSlug: p.product_types?.slug || null,
        url: p.url,
        score: score ? Math.round(score.note_finale || 0) : null,
        scores: score ? {
          s: Math.round(score.score_s || 0),
          a: Math.round(score.score_a || 0),
          f: Math.round(score.score_f || 0),
          e: Math.round(score.score_e || 0),
        } : null,
        lastUpdated: score?.calculated_at || null,
        detailsUrl: `https://safescoring.io/products/${p.slug}`,
      };
    });

    // Filter by min score
    if (minScore > 0) {
      results = results.filter(r => r.score && r.score >= minScore);
    }

    // Sort results
    results.sort((a, b) => {
      let aVal, bVal;
      switch (sort) {
        case "score":
          aVal = a.score || 0;
          bVal = b.score || 0;
          break;
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "updated":
          aVal = new Date(a.lastUpdated || 0).getTime();
          bVal = new Date(b.lastUpdated || 0).getTime();
          break;
        default:
          aVal = a.score || 0;
          bVal = b.score || 0;
      }

      if (order === "asc") {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    // Record API usage for authenticated users (fire and forget)
    if (isValidKey && keyValidation.userId) {
      recordUsage(keyValidation.userId, "/api/v1/products").catch(() => {});
    }

    // Build response headers with tier-specific info
    const responseHeaders = {
      ...CORS_HEADERS,
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "X-RateLimit-Limit": rateCheck.total.toString(),
      "X-RateLimit-Remaining": rateCheck.remaining.toString(),
    };

    // Add plan-specific headers for authenticated requests
    if (isValidKey) {
      responseHeaders["X-Plan"] = keyValidation.plan;
      if (keyValidation.limits.apiDailyLimit > 0) {
        responseHeaders["X-Daily-Limit"] = keyValidation.limits.apiDailyLimit.toString();
      }
      if (keyValidation.limits.apiMonthlyLimit > 0) {
        responseHeaders["X-Monthly-Limit"] = keyValidation.limits.apiMonthlyLimit.toString();
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: results,
        pagination: {
          total: count,
          limit,
          offset,
          hasMore: offset + limit < count,
        },
        meta: {
          apiVersion: "1.0",
          timestamp: new Date().toISOString(),
          plan: isValidKey ? keyValidation.plan : "public",
        },
      },
      { headers: responseHeaders }
    );

  } catch (error) {
    console.error("API v1 products error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS });
}
