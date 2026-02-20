import { NextResponse } from "next/server";
import { verifyMessage } from "viem";

import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { validateRequestOrigin } from "@/libs/security";
import { applyUserRateLimit } from "@/libs/rate-limiters";

/**
 * Multi-Wallet Management API
 * Supports multiple wallet addresses per user with labels
 */

export const dynamic = "force-dynamic";

const MAX_WALLETS_PER_USER = 10;

/**
 * SECURITY: Verify EIP-191 personal signature for wallet ownership
 * Message format: "Link wallet to SafeScoring\n\nAddress: {address}\nUser: {userId}\nNonce: {nonce}"
 */
async function verifyWalletSignature(walletAddress, signature, userId, nonce) {
  if (!signature || !nonce) {
    return { valid: false, reason: "Missing signature or nonce" };
  }

  try {
    // Reconstruct expected message
    const message = `Link wallet to SafeScoring\n\nAddress: ${walletAddress.toLowerCase()}\nUser: ${userId}\nNonce: ${nonce}`;

    // Verify signature using viem
    const isValid = await verifyMessage({
      address: walletAddress,
      message,
      signature,
    });

    if (!isValid) {
      return { valid: false, reason: "Signature verification failed" };
    }

    return { valid: true };
  } catch (error) {
    console.error("[WALLET] Signature verification error:", error);
    return { valid: false, reason: "Signature verification error" };
  }
}

/**
 * SECURITY: Validate origin for state-changing requests
 */
function requireValidOrigin(request) {
  const check = validateRequestOrigin(request);
  if (!check.valid) {
    console.warn(`[SECURITY] CSRF attempt blocked on wallets: ${check.reason}`);
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  return null; // Valid
}

// GET - List all user wallets
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

    const { data: wallets, error } = await supabase
      .from("user_wallets")
      .select("id, wallet_address, chain_id, label, is_primary, verified_at, last_used_at, created_at")
      .eq("user_id", session.user.id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching wallets:", error);
      return NextResponse.json({ error: "Failed to fetch wallets" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      wallets: wallets || [],
      max_wallets: MAX_WALLETS_PER_USER,
    });
  } catch (error) {
    console.error("Error in GET /api/user/wallets:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Add a new wallet
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
    const { wallet_address, chain_id = 1, label, signature, nonce } = body;

    // Validate wallet address (EVM format)
    if (!wallet_address || !/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    // SECURITY: Verify wallet ownership with signature
    let isVerified = false;
    if (signature && nonce) {
      // Validate nonce format (should be recent timestamp, max 5 minutes old)
      const nonceTimestamp = parseInt(nonce, 10);
      const now = Date.now();
      const MAX_NONCE_AGE = 5 * 60 * 1000; // 5 minutes

      if (isNaN(nonceTimestamp) || now - nonceTimestamp > MAX_NONCE_AGE) {
        return NextResponse.json({
          error: "Nonce expired. Please request a new signature.",
        }, { status: 400 });
      }

      // Verify signature
      const verification = await verifyWalletSignature(
        wallet_address,
        signature,
        session.user.id,
        nonce
      );

      if (!verification.valid) {
        console.warn(`[WALLET] Signature rejected for ${wallet_address}: ${verification.reason}`);
        return NextResponse.json({
          error: "Wallet signature verification failed",
          details: verification.reason,
        }, { status: 403 });
      }

      isVerified = true;
      console.log(`[WALLET] Signature verified for ${wallet_address.slice(0, 10)}...`);
    }

    // Check wallet count limit
    const { count } = await supabase
      .from("user_wallets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.user.id);

    if (count >= MAX_WALLETS_PER_USER) {
      return NextResponse.json({
        error: `Maximum ${MAX_WALLETS_PER_USER} wallets allowed`,
      }, { status: 400 });
    }

    // Check if wallet already exists for this user
    const { data: existing } = await supabase
      .from("user_wallets")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("wallet_address", wallet_address.toLowerCase())
      .eq("chain_id", chain_id)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Wallet already linked" }, { status: 400 });
    }

    // SECURITY: Check if this wallet is linked to another user (prevent wallet theft)
    const { data: otherUserWallet } = await supabase
      .from("user_wallets")
      .select("id, user_id")
      .eq("wallet_address", wallet_address.toLowerCase())
      .neq("user_id", session.user.id)
      .single();

    if (otherUserWallet) {
      console.warn(`[WALLET] Attempted to link wallet ${wallet_address} already owned by another user`);
      return NextResponse.json({
        error: "This wallet is already linked to another account",
      }, { status: 409 });
    }

    // Determine if this should be primary (first wallet)
    const isPrimary = count === 0;

    // Add wallet - only mark as verified if signature was provided and verified
    const { data: wallet, error } = await supabase
      .from("user_wallets")
      .insert({
        user_id: session.user.id,
        wallet_address: wallet_address.toLowerCase(),
        chain_id,
        label: label || `Wallet ${count + 1}`,
        is_primary: isPrimary,
        verified_at: isVerified ? new Date().toISOString() : null,
        verification_signature: isVerified ? signature : null,
        verification_nonce: isVerified ? nonce : null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding wallet:", error);
      return NextResponse.json({ error: "Failed to add wallet" }, { status: 500 });
    }

    return NextResponse.json({ success: true, wallet });
  } catch (error) {
    console.error("Error in POST /api/user/wallets:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Update wallet (label, primary status)
export async function PATCH(request) {
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
    const { wallet_id, label, set_primary } = body;

    if (!wallet_id) {
      return NextResponse.json({ error: "Wallet ID required" }, { status: 400 });
    }

    const updates = {};
    if (label !== undefined) updates.label = label.slice(0, 50);

    // If setting as primary, first unset other primaries
    if (set_primary) {
      await supabase
        .from("user_wallets")
        .update({ is_primary: false })
        .eq("user_id", session.user.id);

      updates.is_primary = true;
    }

    const { data: wallet, error } = await supabase
      .from("user_wallets")
      .update(updates)
      .eq("id", wallet_id)
      .eq("user_id", session.user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating wallet:", error);
      return NextResponse.json({ error: "Failed to update wallet" }, { status: 500 });
    }

    return NextResponse.json({ success: true, wallet });
  } catch (error) {
    console.error("Error in PATCH /api/user/wallets:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Remove a wallet
export async function DELETE(request) {
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

    const { searchParams } = new URL(request.url);
    const walletId = searchParams.get("id");

    if (!walletId) {
      return NextResponse.json({ error: "Wallet ID required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("user_wallets")
      .delete()
      .eq("id", walletId)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Error deleting wallet:", error);
      return NextResponse.json({ error: "Failed to delete wallet" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Wallet removed" });
  } catch (error) {
    console.error("Error in DELETE /api/user/wallets:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
