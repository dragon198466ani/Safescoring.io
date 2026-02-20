import { NextResponse } from "next/server";

import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { validateRequestOrigin } from "@/libs/security";
import { validateUrl } from "@/libs/url-validator";
import { checkUnifiedAccess, getPlanLimits } from "@/libs/access";
import crypto from "crypto";
import { applyUserRateLimit } from "@/libs/rate-limiters";

/**
 * User Alerts Management (via web dashboard)
 *
 * GET - List user's alert subscriptions
 * POST - Create new alert
 * DELETE - Delete an alert
 */

/**
 * SECURITY: Validate origin for state-changing requests
 */
function requireValidOrigin(request) {
  const check = validateRequestOrigin(request);
  if (!check.valid) {
    console.warn(`[SECURITY] CSRF attempt blocked on alerts: ${check.reason}`);
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  return null;
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
    // Get user's API keys to find their alerts
    const { data: keys } = await supabase
      .from("api_keys")
      .select("key_hash")
      .eq("user_id", session.user.id);

    if (!keys || keys.length === 0) {
      return NextResponse.json({ alerts: [] });
    }

    const keyHashes = keys.map(k => k.key_hash);

    // Get alerts for these API keys
    const { data: alerts, error } = await supabase
      .from("alert_subscriptions")
      .select(`
        id,
        type,
        webhook_url,
        email,
        product_id,
        threshold,
        is_active,
        created_at,
        last_triggered_at,
        trigger_count,
        products(name, slug)
      `)
      .in("api_key_hash", keyHashes)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching alerts:", error);
      return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
    }

    return NextResponse.json({
      alerts: (alerts || []).map(a => ({
        id: a.id,
        type: a.type,
        webhookUrl: a.webhook_url ? "***" : null, // Hide full URL
        email: a.email,
        productSlug: a.products?.slug || null,
        productName: a.products?.name || null,
        threshold: a.threshold,
        isActive: a.is_active,
        createdAt: a.created_at,
        lastTriggeredAt: a.last_triggered_at,
        triggerCount: a.trigger_count || 0,
      }))
    });

  } catch (error) {
    console.error("Error in alerts GET:", error);
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

  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user's plan has alerts access (paid feature)
  const access = await checkUnifiedAccess({ userId: session.user.id });
  const limits = getPlanLimits(access.plan);

  if (!limits.alerts) {
    return NextResponse.json(
      { error: "Alerts require a paid plan (Explorer or higher)", upgrade: true },
      { status: 403 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const { type, webhookUrl, email, productSlug, threshold } = await request.json();

    // Validate
    if (!type) {
      return NextResponse.json({ error: "Alert type is required" }, { status: 400 });
    }

    // SECURITY: Input length validation
    if (type.length > 50) {
      return NextResponse.json({ error: "Alert type too long" }, { status: 400 });
    }

    if (email && email.length > 254) {
      return NextResponse.json({ error: "Email too long" }, { status: 400 });
    }

    if (webhookUrl && webhookUrl.length > 2000) {
      return NextResponse.json({ error: "Webhook URL too long" }, { status: 400 });
    }

    if (productSlug && productSlug.length > 100) {
      return NextResponse.json({ error: "Product slug too long" }, { status: 400 });
    }

    if (!webhookUrl && !email) {
      return NextResponse.json({ error: "Webhook URL or email is required" }, { status: 400 });
    }

    // SECURITY: Validate webhook URL to prevent SSRF attacks
    if (webhookUrl) {
      const urlValidation = validateUrl(webhookUrl, { allowHttp: true });
      if (!urlValidation.valid) {
        return NextResponse.json(
          { error: `Invalid webhook URL: ${urlValidation.error}` },
          { status: 400 }
        );
      }
    }

    // Get user's first API key (or create one)
    let { data: keys } = await supabase
      .from("api_keys")
      .select("key_hash")
      .eq("user_id", session.user.id)
      .limit(1);

    let apiKeyHash;
    if (!keys || keys.length === 0) {
      // Create a default API key for alerts
      const key = `sk_live_${crypto.randomBytes(32).toString('hex')}`;
      const hash = crypto.createHash('sha256').update(key).digest('hex');

      await supabase.from("api_keys").insert({
        user_id: session.user.id,
        name: "Default (Alerts)",
        key_hash: hash,
        key_prefix: key.substring(0, 14),
        tier: "free",
        rate_limit: 100,
        is_active: true,
      });

      apiKeyHash = hash;
    } else {
      apiKeyHash = keys[0].key_hash;
    }

    // Get product ID if slug provided
    let productId = null;
    if (productSlug) {
      const { data: product } = await supabase
        .from("products")
        .select("id")
        .eq("slug", productSlug)
        .maybeSingle();

      if (product) productId = product.id;
    }

    // Generate webhook secret if URL provided
    const webhookSecret = webhookUrl ? `whsec_${crypto.randomBytes(24).toString('hex')}` : null;

    // Create alert
    const { data, error } = await supabase
      .from("alert_subscriptions")
      .insert({
        api_key_hash: apiKeyHash,
        type,
        webhook_url: webhookUrl,
        webhook_secret: webhookSecret,
        email,
        product_id: productId,
        threshold,
        is_active: true,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating alert:", error);
      return NextResponse.json({ error: "Failed to create alert" }, { status: 500 });
    }

    // SECURITY: Return webhook secret with no-cache headers to prevent logging/caching
    return NextResponse.json({
      id: data.id,
      webhookSecret, // Only shown once - save it immediately!
      message: "Alert created successfully. Save the webhook secret - it won't be shown again!",
    }, {
      status: 201,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        "Pragma": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });

  } catch (error) {
    console.error("Error in alerts POST:", error);
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
    const alertId = searchParams.get("id");

    if (!alertId) {
      return NextResponse.json({ error: "Alert ID is required" }, { status: 400 });
    }

    // Get user's API keys to verify ownership
    const { data: keys } = await supabase
      .from("api_keys")
      .select("key_hash")
      .eq("user_id", session.user.id);

    if (!keys || keys.length === 0) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    const keyHashes = keys.map(k => k.key_hash);

    // Delete alert (only if owned by user)
    const { error } = await supabase
      .from("alert_subscriptions")
      .delete()
      .eq("id", alertId)
      .in("api_key_hash", keyHashes);

    if (error) {
      console.error("Error deleting alert:", error);
      return NextResponse.json({ error: "Failed to delete alert" }, { status: 500 });
    }

    return NextResponse.json({ message: "Alert deleted successfully" });

  } catch (error) {
    console.error("Error in alerts DELETE:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
