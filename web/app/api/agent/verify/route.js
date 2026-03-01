import { NextResponse } from "next/server";
import { verifyAgentSignature, registerAgentWallet, AGENT_CORS_HEADERS } from "@/libs/agent-auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import crypto from "crypto";

/**
 * Agent Wallet Verification API
 *
 * POST /api/agent/verify
 * Body: { wallet: "0x...", signature: "0x...", timestamp: "1234567890" }
 *
 * Verifies wallet ownership and returns agent info + nonce for future sessions.
 * Free endpoint - no USDC cost.
 */

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: AGENT_CORS_HEADERS }
    );
  }

  const { wallet, signature, timestamp, label } = body || {};

  if (!wallet || !signature || !timestamp) {
    return NextResponse.json(
      {
        error: "Missing required fields",
        required: { wallet: "0x...", signature: "0x...", timestamp: "unix_ms" },
        howToSign: "Sign the message: 'SafeScoring Agent Auth: <timestamp>' with your wallet private key",
      },
      { status: 400, headers: AGENT_CORS_HEADERS }
    );
  }

  // Verify signature
  const result = await verifyAgentSignature(wallet, signature, timestamp);

  if (!result.valid) {
    return NextResponse.json(
      { error: result.error, verified: false },
      { status: 401, headers: AGENT_CORS_HEADERS }
    );
  }

  // Register wallet if new
  const reg = await registerAgentWallet(result.wallet, label);

  // Generate a session nonce (valid for 1 hour)
  const nonce = crypto.randomBytes(32).toString("hex");

  if (isSupabaseConfigured()) {
    await supabase.from("agent_nonces").insert({
      wallet_address: result.wallet,
      nonce,
      expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
    });
  }

  // Get current balance
  let balance = 0;
  let hasStream = false;
  if (isSupabaseConfigured()) {
    const { data } = await supabase
      .from("agent_credits")
      .select("balance_usdc, has_active_stream")
      .eq("wallet_address", result.wallet)
      .maybeSingle();

    balance = parseFloat(data?.balance_usdc) || 0;
    hasStream = data?.has_active_stream || false;
  }

  return NextResponse.json(
    {
      success: true,
      verified: true,
      data: {
        wallet: result.wallet,
        nonce,
        nonceExpiresAt: new Date(Date.now() + 3600000).toISOString(),
        balance,
        hasActiveStream: hasStream,
        isNew: !reg?.data?.total_queries,
        pricing: {
          scoreQuery: 0.01,
          deepAnalysis: 0.10,
          batchPerProduct: 0.005,
          currency: "USDC",
          network: "Polygon",
        },
        endpoints: {
          score: "/api/agent/score?product=<slug>",
          batch: "/api/agent/batch",
          analysis: "/api/agent/analysis?product=<slug>",
          credits: "/api/agent/credits",
          stream: "/api/agent/stream",
        },
      },
    },
    { headers: AGENT_CORS_HEADERS }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: AGENT_CORS_HEADERS });
}
