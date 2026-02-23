/**
 * Agent Authentication Middleware
 *
 * Wallet-based authentication for AI agents accessing SafeScoring API.
 * Agents sign a timestamp with their private key to prove wallet ownership.
 *
 * Auth flow:
 * 1. Agent sends X-Agent-Wallet + X-Agent-Signature headers
 * 2. We verify the signature against the wallet address
 * 3. We check the agent's USDC credit balance
 * 4. We check for active Superfluid streams (unlimited access)
 * 5. We debit credits atomically per query
 */

import { verifyMessage } from "viem";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { API_TIERS } from "@/libs/config-constants";
import { getClientId } from "@/libs/rate-limit";
import { checkRateLimit as checkRedisRateLimit, isRedisAvailable } from "@/libs/rate-limit-redis";

// In-memory fallback rate limiting for agents (wallet-based)
const agentRateLimitStore = new Map();
const AGENT_RATE_WINDOW_MS = 60000; // 1 minute
const AGENT_MAX_REQUESTS = API_TIERS.agent.ratePerMinute; // 60/min

// Signature validity window (5 minutes)
const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * Verify agent wallet signature
 * Agent signs: "SafeScoring Agent Auth: <timestamp>"
 */
export async function verifyAgentSignature(wallet, signature, timestamp) {
  if (!wallet || !signature || !timestamp) {
    return { valid: false, error: "Missing wallet, signature, or timestamp" };
  }

  // Validate wallet format (Ethereum address)
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return { valid: false, error: "Invalid wallet address format" };
  }

  // Check timestamp freshness (prevent replay attacks)
  const ts = parseInt(timestamp, 10);
  const now = Date.now();
  if (isNaN(ts) || Math.abs(now - ts) > SIGNATURE_MAX_AGE_MS) {
    return { valid: false, error: "Signature expired or invalid timestamp" };
  }

  try {
    const message = `SafeScoring Agent Auth: ${timestamp}`;
    const recoveredAddress = await verifyMessage({
      address: wallet,
      message,
      signature,
    });

    // viem's verifyMessage returns true/false for address match
    if (recoveredAddress) {
      return { valid: true, wallet: wallet.toLowerCase() };
    }
    return { valid: false, error: "Signature verification failed" };
  } catch (err) {
    return { valid: false, error: "Invalid signature: " + err.message };
  }
}

/**
 * Check agent rate limit (per wallet)
 * Uses Redis when available (persistent across Vercel cold starts),
 * falls back to in-memory Map otherwise.
 */
export async function checkAgentRateLimit(wallet) {
  const walletKey = `agent:${wallet.toLowerCase()}`;

  // Try Redis first (persistent across serverless instances)
  try {
    const redisResult = await checkRedisRateLimit(walletKey, "authenticated");
    if (isRedisAvailable()) {
      return redisResult;
    }
  } catch {
    // Fall through to in-memory
  }

  // In-memory fallback
  const now = Date.now();
  let data = agentRateLimitStore.get(walletKey);
  if (!data || now - data.windowStart > AGENT_RATE_WINDOW_MS) {
    data = { windowStart: now, requests: 0 };
  }

  data.requests++;
  agentRateLimitStore.set(walletKey, data);

  const remaining = Math.max(0, AGENT_MAX_REQUESTS - data.requests);
  const resetIn = Math.max(0, AGENT_RATE_WINDOW_MS - (now - data.windowStart));

  return {
    allowed: data.requests <= AGENT_MAX_REQUESTS,
    remaining,
    resetIn,
    total: AGENT_MAX_REQUESTS,
  };
}

/**
 * Get agent balance and check for active Superfluid stream
 */
export async function getAgentAccess(wallet) {
  if (!isSupabaseConfigured()) {
    return { exists: false, error: "Service unavailable" };
  }

  const normalizedWallet = wallet.toLowerCase();

  const { data, error } = await supabase
    .from("agent_credits")
    .select("balance_usdc, total_deposited, total_spent, total_queries, has_active_stream, stream_flow_rate")
    .eq("wallet_address", normalizedWallet)
    .maybeSingle();

  if (error) {
    return { exists: false, error: "Database error" };
  }

  if (!data) {
    return { exists: false, balance: 0, hasStream: false };
  }

  return {
    exists: true,
    balance: parseFloat(data.balance_usdc) || 0,
    totalDeposited: parseFloat(data.total_deposited) || 0,
    totalSpent: parseFloat(data.total_spent) || 0,
    totalQueries: data.total_queries || 0,
    hasStream: data.has_active_stream || false,
    streamFlowRate: data.stream_flow_rate,
  };
}

/**
 * Debit agent credits atomically (via Supabase RPC)
 */
export async function debitAgentCredits(wallet, amount, type, endpoint, productSlug, productsCount) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Service unavailable" };
  }

  const { data, error } = await supabase.rpc("debit_agent_credits", {
    p_wallet: wallet.toLowerCase(),
    p_amount: amount,
    p_type: type,
    p_endpoint: endpoint || null,
    p_product_slug: productSlug || null,
    p_products_count: productsCount || null,
  });

  if (error) {
    console.error("Debit agent credits error:", error);
    return { success: false, error: "Failed to process payment" };
  }

  const result = data?.[0] || data;
  return {
    success: result?.success || false,
    newBalance: parseFloat(result?.new_balance) || 0,
    error: result?.error_message || null,
  };
}

/**
 * Register a new agent wallet (or return existing)
 */
export async function registerAgentWallet(wallet, label) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Service unavailable" };
  }

  const normalizedWallet = wallet.toLowerCase();

  const { data, error } = await supabase
    .from("agent_credits")
    .upsert(
      {
        wallet_address: normalizedWallet,
        label: label || null,
      },
      { onConflict: "wallet_address", ignoreDuplicates: true }
    )
    .select()
    .maybeSingle();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, wallet: normalizedWallet, data };
}

/**
 * Full agent authentication middleware
 * Returns { authenticated, wallet, access, rateLimit, error }
 */
export async function authenticateAgent(request) {
  const wallet = request.headers.get("x-agent-wallet");
  const signature = request.headers.get("x-agent-signature");
  const timestamp = request.headers.get("x-agent-timestamp");

  if (!wallet) {
    return { authenticated: false, error: "Missing X-Agent-Wallet header" };
  }

  if (!signature || !timestamp) {
    return { authenticated: false, error: "Missing X-Agent-Signature or X-Agent-Timestamp header" };
  }

  // 1. Verify signature
  const sigResult = await verifyAgentSignature(wallet, signature, timestamp);
  if (!sigResult.valid) {
    return { authenticated: false, error: sigResult.error };
  }

  // 2. Check rate limit
  const rateLimit = await checkAgentRateLimit(sigResult.wallet);
  if (!rateLimit.allowed) {
    return {
      authenticated: true,
      wallet: sigResult.wallet,
      rateLimited: true,
      rateLimit,
      error: "Rate limit exceeded",
    };
  }

  // 3. Get agent access (balance + stream status)
  const access = await getAgentAccess(sigResult.wallet);

  return {
    authenticated: true,
    wallet: sigResult.wallet,
    access,
    rateLimit,
    rateLimited: false,
  };
}

/**
 * CORS headers for agent API endpoints
 */
export const AGENT_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, X-Agent-Wallet, X-Agent-Signature, X-Agent-Timestamp",
};

// Cleanup stale rate limit entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of agentRateLimitStore.entries()) {
      if (now - data.windowStart > AGENT_RATE_WINDOW_MS * 2) {
        agentRateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}
