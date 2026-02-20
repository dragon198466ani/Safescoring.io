import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { checkRateLimit, getClientId } from "@/libs/rate-limit";
import crypto from "crypto";

/**
 * SafeScoring Alerts API v1
 *
 * POST /api/v1/alerts - Create new alert subscription
 * GET /api/v1/alerts - List your alert subscriptions
 * DELETE /api/v1/alerts - Delete an alert subscription
 *
 * Alert types:
 * - score_change: When a product's score changes
 * - score_drop: When a product's score drops below threshold
 * - new_incident: When a new security incident is reported
 * - product_incident: When an incident affects a specific product
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};

// Generate webhook secret
function generateSecret() {
  return `whsec_${crypto.randomBytes(24).toString('hex')}`;
}

// Validate webhook URL
function isValidWebhookUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * POST - Create new alert subscription
 */
export async function POST(request) {
  const clientId = getClientId(request);
  const apiKey = request.headers.get("x-api-key");

  if (!apiKey) {
    return NextResponse.json(
      { error: "API key required for creating alerts" },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  const rateCheck = checkRateLimit(clientId, "authenticated");
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: CORS_HEADERS }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503, headers: CORS_HEADERS }
    );
  }

  try {
    const body = await request.json();
    const {
      type,           // alert type
      webhookUrl,     // webhook URL for notifications
      email,          // email for notifications (optional)
      productSlug,    // specific product to watch (optional)
      threshold,      // score threshold for score_drop alerts
      metadata,       // additional metadata
    } = body;

    // Validate required fields
    if (!type) {
      return NextResponse.json(
        { error: "Alert type is required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!webhookUrl && !email) {
      return NextResponse.json(
        { error: "Either webhookUrl or email is required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Validate webhook URL
    if (webhookUrl && !isValidWebhookUrl(webhookUrl)) {
      return NextResponse.json(
        { error: "Webhook URL must be HTTPS" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Validate alert type
    const validTypes = ['score_change', 'score_drop', 'new_incident', 'product_incident'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid alert type. Valid types: ${validTypes.join(', ')}` },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Get product ID if slug provided
    let productId = null;
    if (productSlug) {
      const { data: product } = await supabase
        .from("products")
        .select("id")
        .eq("slug", productSlug)
        .maybeSingle();

      if (!product) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404, headers: CORS_HEADERS }
        );
      }
      productId = product.id;
    }

    // Generate webhook secret
    const webhookSecret = webhookUrl ? generateSecret() : null;

    // Create alert subscription
    const alertId = crypto.randomUUID();

    const { data, error } = await supabase
      .from("alert_subscriptions")
      .insert({
        id: alertId,
        api_key_hash: crypto.createHash('sha256').update(apiKey).digest('hex'),
        type,
        webhook_url: webhookUrl,
        webhook_secret: webhookSecret,
        email,
        product_id: productId,
        threshold,
        metadata,
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating alert:", error);
      return NextResponse.json(
        { error: "Failed to create alert subscription" },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: alertId,
          type,
          webhookUrl,
          webhookSecret, // Only returned once!
          email,
          productSlug,
          threshold,
          isActive: true,
          createdAt: data.created_at,
        },
        message: "Alert subscription created successfully. Save your webhook secret - it won't be shown again!",
      },
      { status: 201, headers: CORS_HEADERS }
    );

  } catch (error) {
    console.error("Alert creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

/**
 * GET - List alert subscriptions
 */
export async function GET(request) {
  const apiKey = request.headers.get("x-api-key");

  if (!apiKey) {
    return NextResponse.json(
      { error: "API key required" },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503, headers: CORS_HEADERS }
    );
  }

  try {
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

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
      .eq("api_key_hash", apiKeyHash)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching alerts:", error);
      return NextResponse.json(
        { error: "Failed to fetch alerts" },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const formattedAlerts = (alerts || []).map(a => ({
      id: a.id,
      type: a.type,
      webhookUrl: a.webhook_url,
      email: a.email,
      productSlug: a.products?.slug || null,
      productName: a.products?.name || null,
      threshold: a.threshold,
      isActive: a.is_active,
      createdAt: a.created_at,
      lastTriggeredAt: a.last_triggered_at,
      triggerCount: a.trigger_count || 0,
    }));

    return NextResponse.json(
      {
        success: true,
        data: formattedAlerts,
        meta: {
          total: formattedAlerts.length,
          timestamp: new Date().toISOString(),
        }
      },
      { headers: CORS_HEADERS }
    );

  } catch (error) {
    console.error("Error listing alerts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

/**
 * DELETE - Delete an alert subscription
 */
export async function DELETE(request) {
  const apiKey = request.headers.get("x-api-key");

  if (!apiKey) {
    return NextResponse.json(
      { error: "API key required" },
      { status: 401, headers: CORS_HEADERS }
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
    const alertId = searchParams.get("id");

    if (!alertId) {
      return NextResponse.json(
        { error: "Alert ID required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const { error } = await supabase
      .from("alert_subscriptions")
      .delete()
      .eq("id", alertId)
      .eq("api_key_hash", apiKeyHash);

    if (error) {
      console.error("Error deleting alert:", error);
      return NextResponse.json(
        { error: "Failed to delete alert" },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Alert subscription deleted",
      },
      { headers: CORS_HEADERS }
    );

  } catch (error) {
    console.error("Error deleting alert:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS });
}
