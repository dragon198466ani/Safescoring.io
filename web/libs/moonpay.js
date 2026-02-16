/**
 * MoonPay Integration — Crypto payment provider
 *
 * MoonPay handles fiat-to-crypto and crypto payments for subscriptions.
 * Users pay in BTC, ETH, USDC, SOL, etc. — MoonPay converts and settles.
 *
 * Flow:
 * 1. User clicks "Pay with Crypto" on pricing page
 * 2. We generate a MoonPay checkout URL with plan details
 * 3. User pays via MoonPay widget (supports 100+ cryptos)
 * 4. MoonPay sends webhook on payment completion
 * 5. We grant access based on the webhook event
 *
 * Docs: https://docs.moonpay.com/
 * Dashboard: https://dashboard.moonpay.com/
 */

import crypto from "crypto";

const MOONPAY_API_URL = "https://api.moonpay.com/v1";

/**
 * Plan price mapping (USD amounts sent to MoonPay)
 * MoonPay will handle the crypto conversion at market rate
 */
const PLAN_PRICES_USD = {
  explorer: 19,
  professional: 49,
  enterprise: 299,
};

/**
 * Generate a MoonPay checkout URL for a subscription payment.
 *
 * MoonPay supports two modes:
 * - Direct crypto payment (user sends USDC/ETH/BTC)
 * - Fiat-to-crypto onramp (user pays with card → crypto → us)
 *
 * For SafeScoring, we use the "sell" flow: user pays crypto, we receive fiat.
 *
 * @param {Object} options
 * @param {string} options.planName - Plan name (explorer, professional, enterprise)
 * @param {string} options.userId - User ID for webhook reconciliation
 * @param {string} options.email - User email (pre-fill MoonPay widget)
 * @param {string} options.successUrl - Redirect URL after successful payment
 * @param {string} options.cancelUrl - Redirect URL if cancelled
 * @returns {string} MoonPay checkout URL
 */
export function generateMoonPayUrl({
  planName,
  userId,
  email,
  successUrl,
  cancelUrl,
}) {
  const apiKey = process.env.NEXT_PUBLIC_MOONPAY_API_KEY;
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_MOONPAY_API_KEY is not configured");
  }

  const baseCurrency = "usd";
  const amount = PLAN_PRICES_USD[planName.toLowerCase()];
  if (!amount) {
    throw new Error(`Unknown plan: ${planName}`);
  }

  // MoonPay buy widget URL — user pays in crypto, we receive the equivalent value
  // Using USDC as the default crypto currency (stablecoin, no volatility)
  const params = new URLSearchParams({
    apiKey,
    currencyCode: "usdc",
    baseCurrencyCode: baseCurrency,
    baseCurrencyAmount: amount.toString(),
    walletAddress: process.env.MOONPAY_WALLET_ADDRESS || "",
    email: email || "",
    externalCustomerId: userId || "",
    externalTransactionId: generateSignedTransactionId(planName, userId),
    redirectURL: successUrl || "",
    showWalletAddressForm: "false",
    colorCode: "#6366f1", // SafeScoring brand color
    theme: "dark",
  });

  return `https://buy.moonpay.com?${params.toString()}`;
}

/**
 * Generate a signed externalTransactionId with HMAC to prevent spoofing.
 * Format: ss_{planName}_{userId}_{timestamp}_{hmac8chars}
 */
function generateSignedTransactionId(planName, userId) {
  const timestamp = Date.now();
  const payload = `ss_${planName}_${userId}_${timestamp}`;
  const secret = process.env.MOONPAY_WEBHOOK_SECRET || process.env.NEXTAUTH_SECRET || "";
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex").slice(0, 8);
  return `${payload}_${hmac}`;
}

/**
 * Verify MoonPay webhook signature
 *
 * MoonPay signs webhooks with HMAC-SHA256 using your webhook secret.
 * The signature is in the `moonpay-signature-v2` header.
 *
 * @param {string} payload - Raw request body
 * @param {string} signature - Signature from header
 * @returns {boolean} Whether signature is valid
 */
export function verifyMoonPayWebhook(payload, signature) {
  const crypto = require("crypto");
  const secret = process.env.MOONPAY_WEBHOOK_SECRET;

  if (!secret) {
    console.warn("MOONPAY_WEBHOOK_SECRET not set — skipping verification");
    return false;
  }

  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(payload).digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(digest)
    );
  } catch {
    return false;
  }
}

/**
 * Map a MoonPay transaction to a SafeScoring plan.
 * Extracts plan name from the externalTransactionId and verifies HMAC signature.
 *
 * @param {string} externalTransactionId - Format: ss_{planName}_{userId}_{timestamp}_{hmac}
 * @returns {{ planName: string, userId: string } | null}
 */
export function parseTransactionId(externalTransactionId) {
  if (!externalTransactionId) return null;

  const parts = externalTransactionId.split("_");
  // ss_planName_userId_timestamp_hmac (5 parts) or legacy ss_planName_userId_timestamp (4 parts)
  if (parts.length < 4 || parts[0] !== "ss") return null;

  const planName = parts[1];
  const userId = parts[2];

  // Verify HMAC if present (5 parts = signed format)
  if (parts.length >= 5) {
    const receivedHmac = parts[4];
    const payload = `ss_${planName}_${userId}_${parts[3]}`;
    const secret = process.env.MOONPAY_WEBHOOK_SECRET || process.env.NEXTAUTH_SECRET || "";
    const expectedHmac = crypto.createHmac("sha256", secret).update(payload).digest("hex").slice(0, 8);
    try {
      if (!crypto.timingSafeEqual(Buffer.from(receivedHmac), Buffer.from(expectedHmac))) {
        console.error("MoonPay transactionId HMAC verification failed");
        return null;
      }
    } catch {
      console.error("MoonPay transactionId HMAC verification failed");
      return null;
    }
  }

  return { planName, userId };
}
