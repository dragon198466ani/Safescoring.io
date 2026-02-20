/**
 * Payment URL Validation
 *
 * Security-critical validation for payment provider redirects.
 * Centralized to ensure consistent security across all payment flows.
 *
 * Previously duplicated in:
 * - ButtonAccount.js (lines 12-29)
 * - ButtonCheckout.js (lines 9-26)
 */

/**
 * Trusted payment provider domains
 * Only these domains are allowed for payment redirects
 */
export const TRUSTED_PAYMENT_DOMAINS = [
  // Lemon Squeezy
  "lemonsqueezy.com",
  "checkout.lemonsqueezy.com",
  "app.lemonsqueezy.com",
  // NOWPayments (crypto)
  "nowpayments.io",
  "checkout.nowpayments.io",
];

/**
 * SECURITY: Validate that a redirect URL is from a trusted payment provider
 *
 * This prevents:
 * - Open redirect attacks
 * - Phishing via malicious redirect URLs
 * - Man-in-the-middle payment hijacking
 *
 * @param {string} url - URL to validate
 * @returns {boolean} - Whether the URL is from a trusted payment provider
 */
export function isValidPaymentUrl(url) {
  if (!url) return false;

  try {
    const parsed = new URL(url);

    // Must be HTTPS
    if (parsed.protocol !== "https:") {
      console.warn("[SECURITY] Rejected non-HTTPS payment URL:", url);
      return false;
    }

    // Must be from a trusted domain
    const isTrusted = TRUSTED_PAYMENT_DOMAINS.some((domain) =>
      parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    );

    if (!isTrusted) {
      console.warn("[SECURITY] Rejected untrusted payment URL:", url);
      return false;
    }

    return true;
  } catch (e) {
    console.warn("[SECURITY] Invalid payment URL:", url, e.message);
    return false;
  }
}

/**
 * Validate and sanitize a checkout URL before redirect
 *
 * @param {string} url - Checkout URL from payment provider
 * @param {string} provider - Expected provider ('lemonsqueezy' | 'nowpayments')
 * @returns {{ valid: boolean, url?: string, error?: string }}
 */
export function validateCheckoutUrl(url, provider = "lemonsqueezy") {
  if (!isValidPaymentUrl(url)) {
    return {
      valid: false,
      error: "Invalid checkout URL",
    };
  }

  const parsed = new URL(url);

  // Provider-specific validation
  if (provider === "lemonsqueezy") {
    const isLemonSqueezy = parsed.hostname.includes("lemonsqueezy.com");
    if (!isLemonSqueezy) {
      return {
        valid: false,
        error: "URL is not from Lemon Squeezy",
      };
    }
  }

  if (provider === "nowpayments") {
    const isNowPayments = parsed.hostname.includes("nowpayments.io");
    if (!isNowPayments) {
      return {
        valid: false,
        error: "URL is not from NOWPayments",
      };
    }
  }

  return {
    valid: true,
    url: url,
  };
}

/**
 * Safe redirect to payment provider
 * Only redirects if URL is valid, otherwise throws
 *
 * @param {string} url - URL to redirect to
 * @throws {Error} If URL is not valid
 */
export function safePaymentRedirect(url) {
  if (!isValidPaymentUrl(url)) {
    throw new Error("Invalid payment URL - redirect blocked for security");
  }

  window.location.href = url;
}

export default {
  isValidPaymentUrl,
  validateCheckoutUrl,
  safePaymentRedirect,
  TRUSTED_PAYMENT_DOMAINS,
};
