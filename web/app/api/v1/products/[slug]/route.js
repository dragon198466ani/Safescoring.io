import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { getClientId } from "@/libs/rate-limit";
import { checkUnifiedAccess, getPlanLimits } from "@/libs/access";
import { PLAN_CODES } from "@/libs/config-constants";
import crypto from "crypto";

/**
 * SafeScoring Public API v1 - Single Product
 *
 * GET /api/v1/products/:slug
 *
 * Returns detailed product information including:
 * - Basic info (name, type, url)
 * - Current SAFE scores
 * - Score history (last 10 evaluations)
 * - Related incidents
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};

// In-memory store for per-tier rate limiting
const tierRateLimitStore = new Map();

/**
 * Check rate limit based on user's plan tier
 */
function checkTierRateLimit(clientId, limits) {
  const windowMs = 60000;
  const maxRequests = limits.apiRatePerMinute || 10;
  const now = Date.now();
  const key = `tier-slug:${clientId}`;

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
async function checkUsageQuota(userId, limits) {
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

  const dailyExceeded = limits.apiDailyLimit > 0 && dailyUsed >= limits.apiDailyLimit;
  const monthlyExceeded = limits.apiMonthlyLimit > 0 && monthlyUsed >= limits.apiMonthlyLimit;

  return {
    allowed: !dailyExceeded && !monthlyExceeded,
    dailyUsed,
    monthlyUsed,
    dailyExceeded,
    monthlyExceeded,
  };
}

/**
 * Record API usage
 */
async function recordUsage(userId, endpoint) {
  if (!userId || !isSupabaseConfigured()) return;

  const today = new Date().toISOString().split("T")[0];

  const { error } = await supabase.rpc("increment_api_usage_daily", {
    p_user_id: userId,
    p_date: today,
    p_endpoint: endpoint,
  });

  if (error?.code === "42883") {
    await supabase
      .from("api_usage_daily")
      .upsert(
        { user_id: userId, date: today, request_count: 1, endpoint },
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

  // Update last_used_at
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

export async function GET(request, { params }) {
  const { slug } = await params;
  const clientId = getClientId(request);
  const apiKey = request.headers.get("x-api-key");

  // Validate API key and check plan access
  const keyValidation = apiKey ? await validateApiKey(apiKey) : { valid: false };

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
    rateCheck = checkTierRateLimit(clientId, keyValidation.limits);

    const quotaCheck = await checkUsageQuota(keyValidation.userId, keyValidation.limits);
    if (!quotaCheck.allowed) {
      const limitType = quotaCheck.dailyExceeded ? "daily" : "monthly";
      const limitValue = quotaCheck.dailyExceeded
        ? keyValidation.limits.apiDailyLimit
        : keyValidation.limits.apiMonthlyLimit;

      return NextResponse.json(
        {
          error: `${limitType.charAt(0).toUpperCase() + limitType.slice(1)} API quota exceeded`,
          plan: keyValidation.plan,
          upgrade: keyValidation.plan !== "enterprise",
          upgradeUrl: "https://safescoring.io/#pricing",
        },
        { status: 429, headers: CORS_HEADERS }
      );
    }
  } else {
    const publicLimits = { apiRatePerMinute: 10 };
    rateCheck = checkTierRateLimit(`public:${clientId}`, publicLimits);
  }

  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        retryAfter: Math.ceil(rateCheck.resetIn / 1000),
        plan: isValidKey ? keyValidation.plan : "public",
      },
      {
        status: 429,
        headers: {
          ...CORS_HEADERS,
          "Retry-After": Math.ceil(rateCheck.resetIn / 1000).toString(),
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
    // Fetch product with type info
    const { data: product, error: productError } = await supabase
      .from("products")
      .select(`
        id,
        name,
        slug,
        url,
        description,
        type_id,
        created_at,
        product_types(id, name, slug)
      `)
      .eq("slug", slug)
      .maybeSingle();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Product not found", slug },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // Fetch all scores (for history)
    const { data: allScores } = await supabase
      .from("safe_scoring_results")
      .select("note_finale, score_s, score_a, score_f, score_e, calculated_at, category")
      .eq("product_id", product.id)
      .order("calculated_at", { ascending: false })
      .limit(10);

    const latestScore = allScores?.[0];

    // Fetch incidents affecting this product
    const { data: incidents } = await supabase
      .from("incident_product_impact")
      .select(`
        impact_level,
        security_incidents(
          incident_id,
          title,
          severity,
          incident_date,
          funds_lost_usd,
          status
        )
      `)
      .eq("product_id", product.id)
      .limit(5);

    // Format score history
    const scoreHistory = (allScores || []).map((s) => ({
      score: Math.round(s.note_finale || 0),
      scores: {
        s: Math.round(s.score_s || 0),
        a: Math.round(s.score_a || 0),
        f: Math.round(s.score_f || 0),
        e: Math.round(s.score_e || 0),
      },
      category: s.category || "FULL",
      date: s.calculated_at,
    }));

    // Format incidents
    const formattedIncidents = (incidents || [])
      .filter((i) => i.security_incidents)
      .map((i) => ({
        id: i.security_incidents.incident_id,
        title: i.security_incidents.title,
        severity: i.security_incidents.severity,
        date: i.security_incidents.incident_date,
        fundsLost: i.security_incidents.funds_lost_usd,
        status: i.security_incidents.status,
        impactLevel: i.impact_level,
      }));

    // Record API usage for authenticated users
    if (isValidKey && keyValidation.userId) {
      recordUsage(keyValidation.userId, `/api/v1/products/${slug}`).catch(() => {});
    }

    // Build response headers
    const responseHeaders = {
      ...CORS_HEADERS,
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "X-RateLimit-Limit": rateCheck.total.toString(),
      "X-RateLimit-Remaining": rateCheck.remaining.toString(),
    };

    if (isValidKey) {
      responseHeaders["X-Plan"] = keyValidation.plan;
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          slug: product.slug,
          name: product.name,
          description: product.description,
          type: product.product_types?.name || "Unknown",
          typeSlug: product.product_types?.slug || null,
          url: product.url,
          createdAt: product.created_at,

          // Current score
          score: latestScore ? Math.round(latestScore.note_finale || 0) : null,
          scores: latestScore
            ? {
                s: Math.round(latestScore.score_s || 0),
                a: Math.round(latestScore.score_a || 0),
                f: Math.round(latestScore.score_f || 0),
                e: Math.round(latestScore.score_e || 0),
              }
            : null,
          lastUpdated: latestScore?.calculated_at || null,

          // History
          scoreHistory,

          // Incidents
          incidents: formattedIncidents,
          incidentCount: formattedIncidents.length,

          // Links
          links: {
            details: `https://safescoring.io/products/${product.slug}`,
            badge: `https://safescoring.io/api/badge/${product.slug}`,
            widget: `https://safescoring.io/api/widget/${product.slug}`,
          },
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
    console.error("API v1 product detail error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS });
}
