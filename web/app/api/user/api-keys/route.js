import { NextResponse } from "next/server";

import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { validateRequestOrigin } from "@/libs/security";
import { quickProtect } from "@/libs/api-protection";
import { API_TIERS, getApiTierConfig } from "@/libs/config-constants";
import crypto from "crypto";
import { applyUserRateLimit } from "@/libs/rate-limiters";

/**
 * API Key Management
 *
 * GET - List user's API keys
 * POST - Create new API key
 * DELETE - Delete an API key
 */

/**
 * SECURITY: Validate origin for state-changing requests
 */
function requireValidOrigin(request) {
  const check = validateRequestOrigin(request);
  if (!check.valid) {
    console.warn(`[SECURITY] CSRF attempt blocked on api-keys: ${check.reason}`);
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  return null;
}

// Generate a new API key
function generateApiKey() {
  const key = `sk_live_${crypto.randomBytes(32).toString('hex')}`;
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const prefix = key.substring(0, 14);
  return { key, hash, prefix };
}

export async function GET(req) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(req);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const { data: keys, error } = await supabase
      .from("api_keys")
      .select("id, name, key_prefix, tier, rate_limit, is_active, created_at, last_used_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching API keys:", error);
      return NextResponse.json({ error: "Failed to fetch API keys" }, { status: 500 });
    }

    // Get usage stats for each key
    const keysWithUsage = await Promise.all((keys || []).map(async (k) => {
      const tierConfig = getApiTierConfig(k.tier);

      // Get today's usage
      const today = new Date().toISOString().split('T')[0];
      const { count: dailyUsage } = await supabase
        .from("api_usage")
        .select("*", { count: "exact", head: true })
        .eq("api_key_id", k.id)
        .gte("created_at", `${today}T00:00:00Z`);

      // Get this month's usage
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const { count: monthlyUsage } = await supabase
        .from("api_usage")
        .select("*", { count: "exact", head: true })
        .eq("api_key_id", k.id)
        .gte("created_at", monthStart.toISOString());

      return {
        id: k.id,
        name: k.name,
        prefix: k.key_prefix,
        tier: k.tier,
        tierName: tierConfig.name,
        limits: {
          ratePerMinute: tierConfig.ratePerMinute,
          dailyLimit: tierConfig.dailyLimit,
          monthlyLimit: tierConfig.monthlyLimit,
        },
        usage: {
          today: dailyUsage || 0,
          thisMonth: monthlyUsage || 0,
          dailyRemaining: tierConfig.dailyLimit === -1 ? "unlimited" : Math.max(0, tierConfig.dailyLimit - (dailyUsage || 0)),
          monthlyRemaining: tierConfig.monthlyLimit === -1 ? "unlimited" : Math.max(0, tierConfig.monthlyLimit - (monthlyUsage || 0)),
        },
        isActive: k.is_active,
        createdAt: k.created_at,
        lastUsedAt: k.last_used_at,
      };
    }));

    return NextResponse.json({
      keys: keysWithUsage,
      availableTiers: Object.entries(API_TIERS).map(([key, tier]) => ({
        id: key,
        name: tier.name,
        dailyLimit: tier.dailyLimit,
        monthlyLimit: tier.monthlyLimit,
        ratePerMinute: tier.ratePerMinute,
        price: tier.price,
        overage: tier.overage,
      })),
    });

  } catch (error) {
    console.error("Error in API keys GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  // SECURITY: Validate origin to prevent CSRF
  const originError = requireValidOrigin(request);
  if (originError) return originError;

  // SECURITY: Rate limiting for sensitive operation
  const protection = await quickProtect(request, "sensitive");
  if (protection.blocked) {
    return NextResponse.json(
      { error: protection.message },
      { status: protection.status, headers: { "Retry-After": String(protection.retryAfter || 60) } }
    );
  }

  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const { name } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // SECURITY: Input length validation
    if (name.length > 100) {
      return NextResponse.json({ error: "Name too long (max 100 characters)" }, { status: 400 });
    }

    // Check existing keys count (limit to 5 for free tier)
    const { count } = await supabase
      .from("api_keys")
      .select("*", { count: "exact", head: true })
      .eq("user_id", session.user.id);

    if (count >= 5) {
      return NextResponse.json(
        { error: "Maximum API keys limit reached (5). Delete an existing key to create a new one." },
        { status: 400 }
      );
    }

    // Get user's plan to determine API tier
    const { data: userData } = await supabase
      .from("users")
      .select("plan_type")
      .eq("id", session.user.id)
      .single();

    // Determine API tier based on plan
    let apiTier = "free";
    const planType = userData?.plan_type?.toLowerCase() || "free";

    if (planType === "enterprise") {
      apiTier = "enterprise";
    } else if (planType === "professional" || planType === "pro") {
      apiTier = "professional";
    } else if (planType === "explorer") {
      apiTier = "starter"; // Explorer gets starter API tier
    }

    const tierConfig = getApiTierConfig(apiTier);

    // Generate new key
    const { key, hash, prefix } = generateApiKey();

    // Insert into database with tier-based limits
    const { data, error } = await supabase
      .from("api_keys")
      .insert({
        user_id: session.user.id,
        name: name.trim(),
        key_hash: hash,
        key_prefix: prefix,
        tier: apiTier,
        rate_limit: tierConfig.ratePerMinute,
        daily_limit: tierConfig.dailyLimit,
        monthly_limit: tierConfig.monthlyLimit,
        is_active: true,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating API key:", error);
      return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
    }

    // SECURITY: Return key with no-cache headers to prevent logging/caching
    return NextResponse.json({
      id: data.id,
      key, // Only returned once - save it immediately!
      prefix,
      tier: apiTier,
      limits: {
        ratePerMinute: tierConfig.ratePerMinute,
        dailyLimit: tierConfig.dailyLimit,
        monthlyLimit: tierConfig.monthlyLimit,
        overage: tierConfig.overage,
      },
      message: "API key created successfully. Save this key - it won't be shown again!",
    }, {
      status: 201,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        "Pragma": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });

  } catch (error) {
    console.error("Error in API keys POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  // SECURITY: Validate origin to prevent CSRF
  const originError = requireValidOrigin(request);
  if (originError) return originError;

  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get("id");

    if (!keyId) {
      return NextResponse.json({ error: "Key ID is required" }, { status: 400 });
    }

    // Delete key (only if owned by user)
    const { error } = await supabase
      .from("api_keys")
      .delete()
      .eq("id", keyId)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Error deleting API key:", error);
      return NextResponse.json({ error: "Failed to delete API key" }, { status: 500 });
    }

    return NextResponse.json({ message: "API key deleted successfully" });

  } catch (error) {
    console.error("Error in API keys DELETE:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
