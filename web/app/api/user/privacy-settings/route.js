import { NextResponse } from "next/server";

import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { validateRequestOrigin } from "@/libs/security";
import { applyUserRateLimit } from "@/libs/rate-limiters";

/**
 * Privacy Settings API
 * RGPD compliant privacy and consent management
 *
 * Art. 7 - Consent management
 * Art. 17 - Right to be forgotten (data retention)
 * Art. 21 - Right to object (tracking preferences)
 */

/**
 * SECURITY: Validate origin for state-changing requests
 */
function requireValidOrigin(request) {
  const check = validateRequestOrigin(request);
  if (!check.valid) {
    console.warn(`[SECURITY] CSRF attempt blocked on privacy-settings: ${check.reason}`);
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  return null;
}

export const dynamic = "force-dynamic";

// GET - Fetch privacy settings
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
      .from("user_privacy_settings")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching privacy settings:", error);
      return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }

    // Return defaults if no settings exist
    if (!data) {
      return NextResponse.json({
        success: true,
        settings: {
          cookie_consent_given: null,
          cookie_consent_version: null,
          analytics_consent: false,
          marketing_consent: false,
          data_retention_days: 365,
          anonymize_usage_data: true,
          profile_visibility: "private",
          show_wallet_publicly: false,
          show_setups_publicly: false,
          track_product_views: true,
          track_search_history: false,
          allow_contact_from_users: false,
          // Globe visibility defaults
          show_setup_on_globe: false,
          globe_display_emoji: "🛡️",
          globe_anonymous_name: null,
          globe_show_products: false,
        },
        gdpr_info: {
          data_controller: "SafeScoring",
          contact_email: "privacy@safescoring.io",
          supervisory_authority: "CNIL (France)",
          your_rights: [
            "Right of access (Art. 15)",
            "Right to rectification (Art. 16)",
            "Right to erasure (Art. 17)",
            "Right to data portability (Art. 20)",
            "Right to object (Art. 21)",
          ],
        },
      });
    }

    return NextResponse.json({
      success: true,
      settings: data,
      gdpr_info: {
        data_controller: "SafeScoring",
        contact_email: "privacy@safescoring.io",
        supervisory_authority: "CNIL (France)",
      },
    });
  } catch (error) {
    console.error("Error in GET /api/user/privacy-settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Update privacy settings
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
      analytics_consent,
      marketing_consent,
      data_retention_days,
      anonymize_usage_data,
      profile_visibility,
      show_wallet_publicly,
      show_setups_publicly,
      track_product_views,
      track_search_history,
      allow_contact_from_users,
      update_cookie_consent, // Special flag to update cookie consent timestamp
      // Globe visibility settings
      show_setup_on_globe,
      globe_display_emoji,
      globe_anonymous_name,
      globe_show_products,
    } = body;

    // Validate profile visibility
    const validVisibility = ["private", "public", "contacts"];
    if (profile_visibility && !validVisibility.includes(profile_visibility)) {
      return NextResponse.json({ error: "Invalid visibility option" }, { status: 400 });
    }

    // Validate data retention (min 30 days, max 10 years)
    if (data_retention_days && (data_retention_days < 30 || data_retention_days > 3650)) {
      return NextResponse.json({ error: "Data retention must be between 30 and 3650 days" }, { status: 400 });
    }

    // Build update object
    const updates = {};

    // Cookie consent update (requires version)
    if (update_cookie_consent) {
      updates.cookie_consent_given = new Date().toISOString();
      updates.cookie_consent_version = "1.0";
    }

    if (analytics_consent !== undefined) updates.analytics_consent = analytics_consent;
    if (marketing_consent !== undefined) updates.marketing_consent = marketing_consent;
    if (data_retention_days !== undefined) updates.data_retention_days = data_retention_days;
    if (anonymize_usage_data !== undefined) updates.anonymize_usage_data = anonymize_usage_data;
    if (profile_visibility !== undefined) updates.profile_visibility = profile_visibility;
    if (show_wallet_publicly !== undefined) updates.show_wallet_publicly = show_wallet_publicly;
    if (show_setups_publicly !== undefined) updates.show_setups_publicly = show_setups_publicly;
    if (track_product_views !== undefined) updates.track_product_views = track_product_views;
    if (track_search_history !== undefined) updates.track_search_history = track_search_history;
    if (allow_contact_from_users !== undefined) updates.allow_contact_from_users = allow_contact_from_users;
    
    // Globe visibility settings
    if (show_setup_on_globe !== undefined) updates.show_setup_on_globe = show_setup_on_globe;
    if (globe_display_emoji !== undefined) {
      // Validate emoji (basic check - single emoji or short string)
      if (globe_display_emoji.length > 4) {
        return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });
      }
      updates.globe_display_emoji = globe_display_emoji;
    }
    if (globe_anonymous_name !== undefined) {
      // Validate anonymous name (alphanumeric, 3-20 chars)
      if (globe_anonymous_name && (globe_anonymous_name.length < 3 || globe_anonymous_name.length > 20)) {
        return NextResponse.json({ error: "Anonymous name must be 3-20 characters" }, { status: 400 });
      }
      if (globe_anonymous_name && !/^[a-zA-Z0-9_]+$/.test(globe_anonymous_name)) {
        return NextResponse.json({ error: "Anonymous name can only contain letters, numbers, and underscores" }, { status: 400 });
      }
      updates.globe_anonymous_name = globe_anonymous_name;
    }
    if (globe_show_products !== undefined) updates.globe_show_products = globe_show_products;

    // Upsert settings
    const { data, error } = await supabase
      .from("user_privacy_settings")
      .upsert({
        user_id: session.user.id,
        ...updates,
      }, { onConflict: "user_id" })
      .select()
      .single();

    if (error) {
      console.error("Error updating privacy settings:", error);
      return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }

    // Log consent changes for RGPD audit trail
    if (analytics_consent !== undefined || marketing_consent !== undefined) {
      console.log(`[RGPD] Consent updated for user ${session.user.id.slice(0, 8)}...`, {
        analytics: analytics_consent,
        marketing: marketing_consent,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, settings: data });
  } catch (error) {
    console.error("Error in POST /api/user/privacy-settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
