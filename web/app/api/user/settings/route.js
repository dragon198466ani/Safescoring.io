import { NextResponse } from "next/server";

import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { validateRequestOrigin } from "@/libs/security";
import { applyUserRateLimit } from "@/libs/rate-limiters";

/**
 * Unified Settings API
 * Returns all user settings in one call for the settings dashboard
 */

/**
 * SECURITY: Validate origin for state-changing requests
 */
function requireValidOrigin(request) {
  const check = validateRequestOrigin(request);
  if (!check.valid) {
    console.warn(`[SECURITY] CSRF attempt blocked on settings: ${check.reason}`);
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  return null;
}

export const dynamic = "force-dynamic";

// GET - Fetch all settings at once
export async function GET(req) {
  try {
    // SECURITY: Rate limiting (100 req/10min per user)
    const rateLimitResult = await applyUserRateLimit(req);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch all settings in parallel
    const [
      { data: emailPrefs },
      { data: displaySettings },
      { data: web3Settings },
      { data: privacySettings },
      { data: wallets },
      { data: userProfile },
    ] = await Promise.all([
      supabase.from("user_email_preferences").select("*").eq("user_id", userId).single(),
      supabase.from("user_display_settings").select("*").eq("user_id", userId).single(),
      supabase.from("user_web3_settings").select("*").eq("user_id", userId).single(),
      supabase.from("user_privacy_settings").select("*").eq("user_id", userId).single(),
      supabase.from("user_wallets").select("*").eq("user_id", userId).order("is_primary", { ascending: false }),
      supabase.from("users").select("id, email, name, image, country, user_type, interests, plan_type, created_at").eq("id", userId).single(),
    ]);

    // Default values for missing settings
    const defaults = {
      email: {
        alert_emails_enabled: true,
        alert_digest_frequency: "instant",
        product_updates_enabled: true,
        newsletter_enabled: false,
        marketing_emails_enabled: false,
        security_alerts_enabled: true,
      },
      display: {
        theme: "dark",
        language: "en",
        timezone: "UTC",
        compact_view: false,
        show_score_colors: true,
      },
      web3: {
        preferred_chain_id: 137,
        preferred_payment_currency: "usdc",
        gas_preference: "standard",
        show_wallet_balance: true,
      },
      privacy: {
        analytics_consent: false,
        marketing_consent: false,
        profile_visibility: "private",
        anonymize_usage_data: true,
      },
    };

    // SECURITY: Mask wallet addresses for privacy (show first 6 and last 4 chars)
    const maskedWallets = (wallets || []).map(wallet => ({
      ...wallet,
      wallet_address: wallet.wallet_address
        ? `${wallet.wallet_address.slice(0, 6)}...${wallet.wallet_address.slice(-4)}`
        : null,
      // Keep full address hash for identification (not the actual address)
      address_id: wallet.wallet_address
        ? Buffer.from(wallet.wallet_address).toString("base64").slice(0, 12)
        : null,
    }));

    return NextResponse.json({
      success: true,
      settings: {
        profile: userProfile || {},
        email: emailPrefs || defaults.email,
        display: displaySettings || defaults.display,
        web3: web3Settings || defaults.web3,
        privacy: privacySettings || defaults.privacy,
        wallets: maskedWallets,
      },
      meta: {
        supported_languages: { en: "English", fr: "Francais", de: "Deutsch", es: "Espanol" },
        supported_chains: { 1: "Ethereum", 137: "Polygon", 56: "BSC", 42161: "Arbitrum" },
        max_wallets: 10,
        wallet_addresses_masked: true, // Inform client that addresses are masked
      },
    }, {
      headers: rateLimitResult.headers
    });
  } catch (error) {
    console.error("Error in GET /api/user/settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Initialize all default settings for a user
export async function POST(request) {
  try {
    // SECURITY: Rate limiting (100 req/10min per user)
    const rateLimitResult = await applyUserRateLimit(request);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

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

    const userId = session.user.id;

    // Initialize all settings with defaults
    await Promise.all([
      supabase.from("user_email_preferences").upsert({ user_id: userId }, { onConflict: "user_id" }),
      supabase.from("user_display_settings").upsert({ user_id: userId }, { onConflict: "user_id" }),
      supabase.from("user_web3_settings").upsert({ user_id: userId }, { onConflict: "user_id" }),
      supabase.from("user_privacy_settings").upsert({ user_id: userId }, { onConflict: "user_id" }),
    ]);

    return NextResponse.json({ success: true, message: "Settings initialized" }, {
      headers: rateLimitResult.headers
    });
  } catch (error) {
    console.error("Error in POST /api/user/settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
