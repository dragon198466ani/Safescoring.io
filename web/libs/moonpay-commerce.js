/**
 * MoonPay Commerce Integration
 * For crypto payments without VAT (non-EU + EU B2B)
 *
 * Documentation: https://docs.moonpay.com/commerce/introduction
 */

const MOONPAY_API_URL = "https://api.moonpay.com";
const MOONPAY_WIDGET_URL = "https://buy.moonpay.com";

/**
 * Get API headers for MoonPay
 */
function getHeaders() {
  if (!process.env.MOONPAY_SECRET_KEY) {
    throw new Error("MOONPAY_SECRET_KEY is not configured");
  }

  return {
    "Content-Type": "application/json",
    "Authorization": `Api-Key ${process.env.MOONPAY_SECRET_KEY}`,
  };
}

/**
 * Create a MoonPay transaction for subscription
 */
export async function createTransaction({
  walletAddress,
  currencyCode = "usdc",
  baseCurrencyAmount,
  externalTransactionId,
  redirectURL,
  email,
}) {
  if (!process.env.MOONPAY_PUBLISHABLE_KEY) {
    throw new Error("MOONPAY_PUBLISHABLE_KEY is not configured");
  }

  try {
    const transactionData = {
      walletAddress,
      currencyCode, // crypto to receive (usdc, btc, eth, etc.)
      baseCurrencyCode: "usd",
      baseCurrencyAmount,
      externalTransactionId,
      redirectURL,
      email,
      lockAmount: true, // Fix the USD amount
    };

    const response = await fetch(`${MOONPAY_API_URL}/v3/transactions`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(transactionData),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("MoonPay transaction error:", error);
      throw new Error(error.message || "Failed to create MoonPay transaction");
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("MoonPay createTransaction error:", error);
    throw error;
  }
}

/**
 * Generate MoonPay widget URL (client-side)
 * This creates a URL that opens the MoonPay hosted checkout
 */
export function generateMoonPayURL({
  walletAddress,
  currencyCode = "usdc",
  baseCurrencyAmount,
  externalTransactionId,
  email,
  redirectURL,
}) {
  const params = new URLSearchParams({
    apiKey: process.env.NEXT_PUBLIC_MOONPAY_PUBLISHABLE_KEY,
    walletAddress,
    currencyCode,
    baseCurrencyCode: "usd",
    baseCurrencyAmount: baseCurrencyAmount.toString(),
    externalTransactionId,
    lockAmount: "true",
    showWalletAddressForm: "false",
    redirectURL: redirectURL || `${process.env.NEXTAUTH_URL}/dashboard?payment=success`,
  });

  if (email) {
    params.append("email", email);
  }

  return `${MOONPAY_WIDGET_URL}?${params.toString()}`;
}

/**
 * Get transaction status
 */
export async function getTransactionStatus(transactionId) {
  try {
    const response = await fetch(
      `${MOONPAY_API_URL}/v3/transactions/${transactionId}`,
      {
        method: "GET",
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to get transaction status");
    }

    return await response.json();
  } catch (error) {
    console.error("MoonPay getTransactionStatus error:", error);
    throw error;
  }
}

/**
 * Verify webhook signature
 * MoonPay sends webhooks with HMAC signatures
 */
export function verifyWebhookSignature(payload, signature) {
  const crypto = require("crypto");
  const secret = process.env.MOONPAY_WEBHOOK_SECRET;

  if (!secret) {
    console.warn("MOONPAY_WEBHOOK_SECRET not set");
    return false;
  }

  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(JSON.stringify(payload)).digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

/**
 * Get supported currencies
 */
export async function getSupportedCurrencies() {
  try {
    const response = await fetch(
      `${MOONPAY_API_URL}/v3/currencies?apiKey=${process.env.NEXT_PUBLIC_MOONPAY_PUBLISHABLE_KEY}`,
      {
        method: "GET",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to get supported currencies");
    }

    return await response.json();
  } catch (error) {
    console.error("MoonPay getSupportedCurrencies error:", error);
    throw error;
  }
}

/**
 * Popular crypto options for users
 */
export const POPULAR_CRYPTOS = [
  { code: "usdc", name: "USDC", network: "Ethereum", icon: "💵" },
  { code: "usdc_polygon", name: "USDC", network: "Polygon", icon: "💵" },
  { code: "usdc_arbitrum", name: "USDC", network: "Arbitrum", icon: "💵" },
  { code: "usdc_base", name: "USDC", network: "Base", icon: "💵" },
  { code: "btc", name: "Bitcoin", network: "Bitcoin", icon: "₿" },
  { code: "eth", name: "Ethereum", network: "Ethereum", icon: "Ξ" },
  { code: "sol", name: "Solana", network: "Solana", icon: "◎" },
  { code: "matic", name: "Polygon", network: "Polygon", icon: "⬡" },
];

/**
 * Get recommended crypto for user (prefer stablecoins)
 */
export function getRecommendedCrypto() {
  // Default to USDC on Polygon (low fees)
  return POPULAR_CRYPTOS.find(c => c.code === "usdc_polygon") || POPULAR_CRYPTOS[0];
}

/**
 * Calculate crypto amount from USD
 * Note: This is an estimate - MoonPay handles actual conversion
 */
export async function estimateCryptoAmount(usdAmount, cryptoCode = "usdc") {
  try {
    const response = await fetch(
      `${MOONPAY_API_URL}/v3/currencies/${cryptoCode}/price?apiKey=${process.env.NEXT_PUBLIC_MOONPAY_PUBLISHABLE_KEY}`,
      {
        method: "GET",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to get crypto price");
    }

    const data = await response.json();
    const cryptoAmount = usdAmount / data.price;

    return {
      cryptoCode,
      cryptoAmount: Math.round(cryptoAmount * 1e6) / 1e6, // 6 decimals
      usdAmount,
      exchangeRate: data.price,
    };
  } catch (error) {
    console.error("MoonPay estimateCryptoAmount error:", error);
    // Fallback for stablecoins
    if (cryptoCode.includes("usdc") || cryptoCode.includes("usdt")) {
      return {
        cryptoCode,
        cryptoAmount: usdAmount,
        usdAmount,
        exchangeRate: 1,
      };
    }
    throw error;
  }
}
