import { NextResponse } from "next/server";

import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { validateRequestOrigin } from "@/libs/security";
import { applyUserRateLimit } from "@/libs/rate-limiters";

/**
 * Web3 Settings API
 * Manages blockchain preferences, wallet settings, and crypto configurations
 */

/**
 * SECURITY: Validate origin for state-changing requests
 */
function requireValidOrigin(request) {
  const check = validateRequestOrigin(request);
  if (!check.valid) {
    console.warn(`[SECURITY] CSRF attempt blocked on web3-settings: ${check.reason}`);
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  return null;
}

export const dynamic = "force-dynamic";

// Supported chains
const SUPPORTED_CHAINS = {
  1: "Ethereum Mainnet",
  137: "Polygon",
  56: "BNB Smart Chain",
  42161: "Arbitrum One",
  10: "Optimism",
  43114: "Avalanche",
  8453: "Base",
};

// GET - Fetch web3 settings
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
      .from("user_web3_settings")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching web3 settings:", error);
      return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }

    // Return defaults if no settings exist
    if (!data) {
      return NextResponse.json({
        success: true,
        settings: {
          preferred_chain_id: 137,
          preferred_payment_currency: "usdc",
          auto_switch_network: true,
          gas_preference: "standard",
          slippage_tolerance: 0.5,
          show_wallet_balance: true,
          hide_small_balances: true,
          small_balance_threshold: 1.0,
          show_nft_badges: true,
          auto_refresh_nft_access: true,
          default_defi_view: "all",
          risk_tolerance: "moderate",
        },
        supported_chains: SUPPORTED_CHAINS,
      });
    }

    return NextResponse.json({
      success: true,
      settings: data,
      supported_chains: SUPPORTED_CHAINS,
    });
  } catch (error) {
    console.error("Error in GET /api/user/web3-settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Update web3 settings
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
      preferred_chain_id,
      preferred_payment_currency,
      auto_switch_network,
      gas_preference,
      slippage_tolerance,
      show_wallet_balance,
      hide_small_balances,
      small_balance_threshold,
      show_nft_badges,
      auto_refresh_nft_access,
      default_defi_view,
      risk_tolerance,
    } = body;

    // Validate chain ID
    if (preferred_chain_id && !SUPPORTED_CHAINS[preferred_chain_id]) {
      return NextResponse.json({ error: "Unsupported chain" }, { status: 400 });
    }

    // Validate payment currency
    const validCurrencies = ["usdc", "eth", "btc", "matic", "bnb"];
    if (preferred_payment_currency && !validCurrencies.includes(preferred_payment_currency)) {
      return NextResponse.json({ error: "Invalid payment currency" }, { status: 400 });
    }

    // Validate gas preference
    const validGas = ["slow", "standard", "fast", "instant"];
    if (gas_preference && !validGas.includes(gas_preference)) {
      return NextResponse.json({ error: "Invalid gas preference" }, { status: 400 });
    }

    // Validate risk tolerance
    const validRisk = ["conservative", "moderate", "aggressive"];
    if (risk_tolerance && !validRisk.includes(risk_tolerance)) {
      return NextResponse.json({ error: "Invalid risk tolerance" }, { status: 400 });
    }

    // Build update object
    const updates = {};
    if (preferred_chain_id !== undefined) updates.preferred_chain_id = preferred_chain_id;
    if (preferred_payment_currency !== undefined) updates.preferred_payment_currency = preferred_payment_currency;
    if (auto_switch_network !== undefined) updates.auto_switch_network = auto_switch_network;
    if (gas_preference !== undefined) updates.gas_preference = gas_preference;
    if (slippage_tolerance !== undefined) updates.slippage_tolerance = Math.max(0.1, Math.min(50, slippage_tolerance));
    if (show_wallet_balance !== undefined) updates.show_wallet_balance = show_wallet_balance;
    if (hide_small_balances !== undefined) updates.hide_small_balances = hide_small_balances;
    if (small_balance_threshold !== undefined) updates.small_balance_threshold = Math.max(0, small_balance_threshold);
    if (show_nft_badges !== undefined) updates.show_nft_badges = show_nft_badges;
    if (auto_refresh_nft_access !== undefined) updates.auto_refresh_nft_access = auto_refresh_nft_access;
    if (default_defi_view !== undefined) updates.default_defi_view = default_defi_view;
    if (risk_tolerance !== undefined) updates.risk_tolerance = risk_tolerance;

    // Upsert settings
    const { data, error } = await supabase
      .from("user_web3_settings")
      .upsert({
        user_id: session.user.id,
        ...updates,
      }, { onConflict: "user_id" })
      .select()
      .single();

    if (error) {
      console.error("Error updating web3 settings:", error);
      return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }

    return NextResponse.json({ success: true, settings: data });
  } catch (error) {
    console.error("Error in POST /api/user/web3-settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
