import { NextResponse } from "next/server";

import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { validateRequestOrigin } from "@/libs/security";
import { applyUserRateLimit } from "@/libs/rate-limiters";

/**
 * Email Preferences API
 * RGPD Art. 7 - Consent management for marketing emails
 */

/**
 * SECURITY: Validate origin for state-changing requests
 */
function requireValidOrigin(request) {
  const check = validateRequestOrigin(request);
  if (!check.valid) {
    console.warn(`[SECURITY] CSRF attempt blocked on email-preferences: ${check.reason}`);
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  return null;
}

export const dynamic = "force-dynamic";

// GET - Fetch email preferences
export async function GET(req) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(req);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("user_email_preferences")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching email preferences:", error);
      return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 });
    }

    // Return defaults if no preferences exist
    if (!data) {
      return NextResponse.json({
        success: true,
        preferences: {
          alert_emails_enabled: true,
          alert_digest_frequency: "instant",
          product_updates_enabled: true,
          score_change_threshold: 1,
          newsletter_enabled: false,
          marketing_emails_enabled: false,
          security_alerts_enabled: true,
          login_notifications_enabled: true,
          quiet_hours_enabled: false,
          quiet_hours_start: "22:00",
          quiet_hours_end: "08:00",
        },
      });
    }

    return NextResponse.json({ success: true, preferences: data });
  } catch (error) {
    console.error("Error in GET /api/user/email-preferences:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Update email preferences
export async function POST(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  try {
    // SECURITY: Validate origin to prevent CSRF
    const originError = requireValidOrigin(request);
    if (originError) return originError;

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      alert_emails_enabled,
      alert_digest_frequency,
      product_updates_enabled,
      score_change_threshold,
      newsletter_enabled,
      marketing_emails_enabled,
      security_alerts_enabled,
      login_notifications_enabled,
      quiet_hours_enabled,
      quiet_hours_start,
      quiet_hours_end,
    } = body;

    // Validate digest frequency
    const validFrequencies = ["instant", "daily", "weekly", "never"];
    if (alert_digest_frequency && !validFrequencies.includes(alert_digest_frequency)) {
      return NextResponse.json({ error: "Invalid digest frequency" }, { status: 400 });
    }

    // Build update object (only include provided fields)
    const updates = {};
    if (alert_emails_enabled !== undefined) updates.alert_emails_enabled = alert_emails_enabled;
    if (alert_digest_frequency !== undefined) updates.alert_digest_frequency = alert_digest_frequency;
    if (product_updates_enabled !== undefined) updates.product_updates_enabled = product_updates_enabled;
    if (score_change_threshold !== undefined) updates.score_change_threshold = Math.max(1, Math.min(10, score_change_threshold));
    if (newsletter_enabled !== undefined) updates.newsletter_enabled = newsletter_enabled;
    if (marketing_emails_enabled !== undefined) updates.marketing_emails_enabled = marketing_emails_enabled;
    if (security_alerts_enabled !== undefined) updates.security_alerts_enabled = security_alerts_enabled;
    if (login_notifications_enabled !== undefined) updates.login_notifications_enabled = login_notifications_enabled;
    if (quiet_hours_enabled !== undefined) updates.quiet_hours_enabled = quiet_hours_enabled;
    if (quiet_hours_start !== undefined) updates.quiet_hours_start = quiet_hours_start;
    if (quiet_hours_end !== undefined) updates.quiet_hours_end = quiet_hours_end;

    // Upsert preferences
    const { data, error } = await supabase
      .from("user_email_preferences")
      .upsert({
        user_id: session.user.id,
        ...updates,
      }, { onConflict: "user_id" })
      .select()
      .single();

    if (error) {
      console.error("Error updating email preferences:", error);
      return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
    }

    return NextResponse.json({ success: true, preferences: data });
  } catch (error) {
    console.error("Error in POST /api/user/email-preferences:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
