/**
 * Logo URL utilities
 * Shared helpers for generating product logo/favicon URLs.
 * Used by product pages, leaderboard, compare, etc.
 */

/**
 * Extract clean domain from a URL string.
 * @param {string} url - Full URL (e.g., "https://www.ledger.com/products")
 * @returns {string|null} Clean domain (e.g., "ledger.com") or null if invalid
 */
export function extractDomain(url) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Get HD logo URL via Clearbit Logo API.
 * Returns high-quality company logos (transparent PNG, ~128px).
 * Falls back to null if URL is invalid.
 *
 * @param {string} url - Product website URL
 * @returns {string|null} Clearbit logo URL or null
 */
export function getLogoUrl(url) {
  const domain = extractDomain(url);
  if (!domain) return null;
  return `https://logo.clearbit.com/${domain}`;
}

/**
 * Get favicon URL via Google Favicon API.
 * Works for virtually any website. Lower quality than Clearbit but more reliable.
 * Good as a fallback or for smaller display sizes.
 *
 * @param {string} url - Product website URL
 * @param {number} [size=128] - Desired size in px (Google supports 16, 32, 64, 128)
 * @returns {string|null} Google Favicon URL or null
 */
export function getFaviconUrl(url, size = 128) {
  if (!url) return null;
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
  } catch {
    return null;
  }
}
