/**
 * ============================================================================
 * SECURITY MODULE - Unified Exports
 * ============================================================================
 * 
 * This file consolidates all security-related exports into a single import point.
 * Instead of importing from 6+ different files, import from "@/libs/security"
 * 
 * USAGE:
 * import { 
 *   generateCsrfToken, 
 *   validateCsrfToken,
 *   quickProtect,
 *   getClientId,
 *   protectAuthenticatedRequest,
 * } from "@/libs/security";
 * 
 * MODULES CONSOLIDATED:
 * - security.js (CSRF, sanitization)
 * - security-optimized.js (caching, fingerprinting)
 * - api-protection.js (rate limiting, watermarking)
 * - user-protection.js (user-level limits)
 * - brute-force-protection.js (login protection)
 * - rate-limit.js / rate-limit-redis.js (rate limiting backends)
 * ============================================================================
 */

// ============================================================================
// CSRF & INPUT SANITIZATION (from security.js)
// ============================================================================
export {
  generateCsrfToken,
  validateCsrfToken,
  validateRequestOrigin,
  requireValidOrigin,
  verifyCsrfRequest,
  sanitizeString,
  stripHtml,
  sanitizeHtml,
  sanitizeObject,
  validateEmail,
  validateDisplayName,
  validateUrl,
  validateWalletAddress,
  isHoneypotTriggered,
  isSubmittedTooFast,
  hasSqlInjectionPattern,
  sanitizeForDatabase,
  isRequestTooLarge,
  isValidContentType,
  validateApiKey,
  generateApiKey,
} from "../security";

// ============================================================================
// OPTIMIZED SECURITY (from security-optimized.js)
// ============================================================================
export {
  generateRequestFingerprint,
  getClientIP,
  isIPBlocked,
} from "../security-optimized";

// ============================================================================
// API PROTECTION (from api-protection.js)
// ============================================================================
export {
  quickProtect,
  withProtection,
  filterResponseData,
  getClientId,
  sleep,
  calculatePublicDelay,
} from "../api-protection";

// ============================================================================
// USER PROTECTION (from user-protection.js)
// ============================================================================
export {
  protectAuthenticatedRequest,
  trackUserActivity,
  checkUserRateLimit,
  getDataLimitForUser,
  USER_LIMITS,
} from "../user-protection";

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick security check for API routes
 * Combines rate limiting + fingerprinting + basic validation
 * 
 * @param {Request} request - Next.js request
 * @param {Object} options - Options
 * @returns {Promise<{allowed: boolean, clientId: string, response?: Response}>}
 */
export async function secureApiRoute(request, options = {}) {
  const { quickProtect, getClientId } = await import("../api-protection");
  const { generateRequestFingerprint } = await import("../security-optimized");
  
  const clientId = getClientId(request);
  const fingerprint = generateRequestFingerprint(request);
  
  const protection = await quickProtect(request, options.tier || "public");
  
  return {
    allowed: !protection.blocked,
    clientId,
    fingerprint,
    response: protection.blocked ? protection.response : null,
    rateLimit: protection.rateLimit,
  };
}

/**
 * Validate and sanitize user input
 * 
 * @param {string} input - Raw input
 * @param {Object} options - Validation options
 * @returns {{valid: boolean, sanitized: string, errors: string[]}}
 */
export function validateAndSanitize(input, options = {}) {
  const { sanitizeString, hasSqlInjectionPattern } = require("../security");
  
  const errors = [];
  
  // Check for SQL injection
  if (hasSqlInjectionPattern(input)) {
    errors.push("Potential SQL injection detected");
  }
  
  // Sanitize
  const sanitized = sanitizeString(input);
  
  // Length check
  if (options.maxLength && sanitized.length > options.maxLength) {
    errors.push(`Input exceeds maximum length of ${options.maxLength}`);
  }
  
  if (options.minLength && sanitized.length < options.minLength) {
    errors.push(`Input must be at least ${options.minLength} characters`);
  }
  
  return {
    valid: errors.length === 0,
    sanitized,
    errors,
  };
}

// ============================================================================
// SECURITY CONSTANTS
// ============================================================================

export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

export const RATE_LIMIT_TIERS = {
  public: { requests: 30, window: 60 },      // 30 req/min
  authenticated: { requests: 100, window: 60 }, // 100 req/min
  paid: { requests: 300, window: 60 },       // 300 req/min
  admin: { requests: 1000, window: 60 },     // 1000 req/min
};
