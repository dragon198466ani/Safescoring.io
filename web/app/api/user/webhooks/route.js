/**
 * User Webhooks API
 * Allows premium users to register webhooks for real-time incident alerts
 *
 * POST - Register a new webhook
 * GET - List user's webhooks
 * DELETE - Remove a webhook
 */

import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import crypto from "crypto";
import { applyUserRateLimit } from "@/libs/rate-limiters";

export async function GET(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
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

  const { data: webhooks, error } = await supabase
    .from("user_webhooks")
    .select("id, url, events, is_active, last_triggered_at, created_at")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch webhooks" }, { status: 500 });
  }

  return NextResponse.json({ webhooks });
}

export async function POST(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user has premium access
  const { data: user } = await supabase
    .from("users")
    .select("has_access")
    .eq("id", session.user.id)
    .single();

  if (!user?.has_access) {
    return NextResponse.json(
      { error: "Premium subscription required for webhooks" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { url, events = ["incident_detected", "score_changed", "prediction_validated"] } = body;

  if (!url || !url.startsWith("https://")) {
    return NextResponse.json(
      { error: "Valid HTTPS URL required" },
      { status: 400 }
    );
  }

  // Generate webhook secret for signature verification
  const secret = crypto.randomBytes(32).toString("hex");

  const { data: webhook, error } = await supabase
    .from("user_webhooks")
    .insert({
      user_id: session.user.id,
      url,
      secret,
      events,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 });
  }

  // Return secret only on creation (user must save it)
  return NextResponse.json({
    webhook: {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      secret, // Only returned once!
    },
    message: "Webhook created. Save the secret - it won't be shown again.",
  });
}

export async function DELETE(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const webhookId = searchParams.get("id");

  if (!webhookId) {
    return NextResponse.json({ error: "Webhook ID required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("user_webhooks")
    .delete()
    .eq("id", webhookId)
    .eq("user_id", session.user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete webhook" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
