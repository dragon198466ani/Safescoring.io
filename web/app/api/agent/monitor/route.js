import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { authenticateAgent, debitAgentCredits, AGENT_CORS_HEADERS } from "@/libs/agent-auth";

/**
 * Agent Monitor API - Ray Donovan
 *
 * POST /api/agent/monitor - Subscribe to product monitoring
 * GET  /api/agent/monitor - Check monitoring status for a wallet
 *
 * Headers:
 *   X-Agent-Wallet: 0x...
 *   X-Agent-Signature: <signature>
 *   X-Agent-Timestamp: <unix_ms>
 *
 * Cost: $0.05 USDC per alert sent
 * Returns: Subscription details and status
 */

const ALERT_COST = 0.05;
const VALID_ALERT_TYPES = ["score_change", "incident", "score_below_threshold"];
const MAX_PRODUCTS_PER_SUBSCRIPTION = 20;

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

    if (auth.access.balance < ALERT_COST) {
      return NextResponse.json(
        {
          error: "Insufficient USDC balance",
          balance: auth.access.balance,
          required: ALERT_COST,
          depositUrl: "https://safescoring.io/agents#deposit",
        },
        { status: 402, headers: AGENT_CORS_HEADERS }
      );
    }
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503, headers: AGENT_CORS_HEADERS }
    );
  }

  // 3. Parse and validate request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: AGENT_CORS_HEADERS }
    );
  }

  const { products, webhook_url, alert_types, threshold } = body;

  // Validate products
  if (!products || !Array.isArray(products) || products.length === 0) {
    return NextResponse.json(
      {
        error: "Missing or empty 'products' array",
        example: { products: ["binance", "ledger-nano-x"] },
      },
      { status: 400, headers: AGENT_CORS_HEADERS }
    );
  }

  if (products.length > MAX_PRODUCTS_PER_SUBSCRIPTION) {
    return NextResponse.json(
      {
        error: `Maximum ${MAX_PRODUCTS_PER_SUBSCRIPTION} products per subscription`,
        received: products.length,
      },
      { status: 400, headers: AGENT_CORS_HEADERS }
    );
  }

  // Validate webhook URL
  if (!webhook_url || typeof webhook_url !== "string") {
    return NextResponse.json(
      { error: "Missing 'webhook_url'" },
      { status: 400, headers: AGENT_CORS_HEADERS }
    );
  }

  try {
    const url = new URL(webhook_url);
    if (!["https:", "http:"].includes(url.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid 'webhook_url'. Must be a valid HTTP(S) URL." },
      { status: 400, headers: AGENT_CORS_HEADERS }
    );
  }

  // Validate alert types
  const resolvedAlertTypes = alert_types || ["score_change", "incident"];
  if (!Array.isArray(resolvedAlertTypes)) {
    return NextResponse.json(
      { error: "'alert_types' must be an array", valid: VALID_ALERT_TYPES },
      { status: 400, headers: AGENT_CORS_HEADERS }
    );
  }

  const invalidTypes = resolvedAlertTypes.filter((t) => !VALID_ALERT_TYPES.includes(t));
  if (invalidTypes.length > 0) {
    return NextResponse.json(
      { error: `Invalid alert types: ${invalidTypes.join(", ")}`, valid: VALID_ALERT_TYPES },
      { status: 400, headers: AGENT_CORS_HEADERS }
    );
  }

  // Validate threshold
  const resolvedThreshold = threshold != null ? parseInt(threshold, 10) : 60;
  if (isNaN(resolvedThreshold) || resolvedThreshold < 0 || resolvedThreshold > 100) {
    return NextResponse.json(
      { error: "'threshold' must be a number between 0 and 100" },
      { status: 400, headers: AGENT_CORS_HEADERS }
    );
  }

  try {
    // 4. Verify products exist
    const { data: existingProducts, error: productsError } = await supabase
      .from("products")
      .select("slug")
      .in("slug", products);

    if (productsError) {
      console.error("Agent monitor products lookup error:", productsError);
      return NextResponse.json(
        { error: "Failed to verify products" },
        { status: 500, headers: AGENT_CORS_HEADERS }
      );
    }

    const foundSlugs = (existingProducts || []).map((p) => p.slug);
    const missingSlugs = products.filter((p) => !foundSlugs.includes(p));

    if (foundSlugs.length === 0) {
      return NextResponse.json(
        { error: "None of the specified products were found", products: missingSlugs },
        { status: 404, headers: AGENT_CORS_HEADERS }
      );
    }

    // 5. Create subscription
    const { data: subscription, error: insertError } = await supabase
      .from("agent_monitoring_subscriptions")
      .insert({
        wallet_address: auth.wallet,
        product_slugs: foundSlugs,
        webhook_url: webhook_url,
        alert_types: resolvedAlertTypes,
        threshold: resolvedThreshold,
        is_active: true,
      })
      .select("id, product_slugs, alert_types, threshold, is_active, created_at")
      .single();

    if (insertError) {
      console.error("Agent monitor subscription insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create subscription" },
        { status: 500, headers: AGENT_CORS_HEADERS }
      );
    }

    // 6. Debit credits for subscription setup (unless streaming)
    let payment = { cost: 0, method: "stream" };
    if (!hasUnlimitedAccess) {
      const debit = await debitAgentCredits(
        auth.wallet, ALERT_COST, "monitor_subscribe", "/api/agent/monitor", null, foundSlugs.length
      );

      if (!debit.success) {
        // Rollback: deactivate the subscription
        await supabase
          .from("agent_monitoring_subscriptions")
          .update({ is_active: false })
          .eq("id", subscription.id);

        return NextResponse.json(
          { error: debit.error, balance: auth.access.balance },
          { status: 402, headers: AGENT_CORS_HEADERS }
        );
      }

      payment = {
        cost: ALERT_COST,
        method: "credits",
        newBalance: debit.newBalance,
      };
    }

    // 7. Build response
    const response = {
      success: true,
      data: {
        subscription_id: subscription.id,
        products: subscription.product_slugs,
        webhook_url: "configured",
        alert_types: subscription.alert_types,
        threshold: subscription.threshold,
        cost_per_alert: ALERT_COST,
        estimated_monthly: "$0.50-2.00",
        status: "active",
        created_at: subscription.created_at,
      },
      payment,
      meta: {
        apiVersion: "agent-1.0",
        timestamp: new Date().toISOString(),
        wallet: auth.wallet,
      },
    };

    if (missingSlugs.length > 0) {
      response.warnings = [
        `Products not found (skipped): ${missingSlugs.join(", ")}`,
      ];
    }

    return NextResponse.json(response, {
      status: 201,
      headers: {
        ...AGENT_CORS_HEADERS,
        "X-Agent-Balance": payment.newBalance?.toString() || "unlimited",
        "X-Alert-Cost": ALERT_COST.toString(),
      },
    });
  } catch (error) {
    console.error("Agent monitor API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: AGENT_CORS_HEADERS }
    );
  }
}

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

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503, headers: AGENT_CORS_HEADERS }
    );
  }

  try {
    // 2. Fetch all subscriptions for this wallet
    const { data: subscriptions, error: fetchError } = await supabase
      .from("agent_monitoring_subscriptions")
      .select("id, product_slugs, alert_types, threshold, is_active, total_alerts_sent, last_checked_at, created_at, updated_at")
      .eq("wallet_address", auth.wallet)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Agent monitor fetch error:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch subscriptions" },
        { status: 500, headers: AGENT_CORS_HEADERS }
      );
    }

    const active = (subscriptions || []).filter((s) => s.is_active);
    const totalAlerts = (subscriptions || []).reduce(
      (sum, s) => sum + (s.total_alerts_sent || 0),
      0
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          subscriptions: (subscriptions || []).map((s) => ({
            subscription_id: s.id,
            products: s.product_slugs,
            alert_types: s.alert_types,
            threshold: s.threshold,
            status: s.is_active ? "active" : "inactive",
            total_alerts_sent: s.total_alerts_sent || 0,
            last_checked_at: s.last_checked_at,
            created_at: s.created_at,
            updated_at: s.updated_at,
          })),
          summary: {
            total: (subscriptions || []).length,
            active: active.length,
            total_alerts_sent: totalAlerts,
            total_alert_cost: parseFloat((totalAlerts * ALERT_COST).toFixed(2)),
          },
        },
        meta: {
          apiVersion: "agent-1.0",
          timestamp: new Date().toISOString(),
          wallet: auth.wallet,
        },
      },
      {
        headers: {
          ...AGENT_CORS_HEADERS,
          "Cache-Control": "private, max-age=30",
        },
      }
    );
  } catch (error) {
    console.error("Agent monitor status API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: AGENT_CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: AGENT_CORS_HEADERS });
}
