/**
 * Security Utilities for SafeScoring
 *
 * Features:
 * - CSRF token generation and validation
 * - Input sanitization (XSS prevention)
 * - SQL injection prevention
 * - Content validation
 * - Honeypot field detection
 */

import crypto from "crypto";
import { ALLOWED_ORIGINS as CONFIG_ALLOWED_ORIGINS } from "@/libs/config-constants";

// ============================================
// CSRF PROTECTION
// ============================================

// SECURITY FIX: CSRF_SECRET must be independent from NEXTAUTH_SECRET
// Using NEXTAUTH_SECRET as fallback is dangerous - if one is compromised, both are
const CSRF_SECRET = process.env.CSRF_SECRET;
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const IS_BUILD_TIME = process.env.NEXT_PHASE === "phase-production-build";

if (!CSRF_SECRET && IS_PRODUCTION && !IS_BUILD_TIME) {
  // CRITICAL: In production, CSRF protection is mandatory
  // Throw error to prevent server from starting without proper security
  throw new Error(
    "[SECURITY CRITICAL] CSRF_SECRET is not configured! " +
    "Generate one with: openssl rand -base64 32 " +
    "and add it to your environment variables."
  );
}
const CSRF_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

/**
 * Generate a CSRF token
 * @param {string} sessionId - User session ID
 * @returns {string} CSRF token
 */
export function generateCsrfToken(sessionId) {
  const timestamp = Date.now();
  const payload = `${sessionId}:${timestamp}`;
  const signature = crypto
    .createHmac("sha256", CSRF_SECRET)
    .update(payload)
    .digest("hex");

  return Buffer.from(`${payload}:${signature}`).toString("base64");
}

/**
 * Validate a CSRF token
 * @param {string} token - CSRF token to validate
 * @param {string} sessionId - User session ID
 * @returns {boolean} Whether the token is valid
 */
export function validateCsrfToken(token, sessionId) {
  if (!token || !sessionId) return false;

  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const [tokenSessionId, timestamp, signature] = decoded.split(":");

    // Check session ID matches
    if (tokenSessionId !== sessionId) return false;

    // Check token hasn't expired
    const tokenAge = Date.now() - parseInt(timestamp, 10);
    if (tokenAge > CSRF_TOKEN_EXPIRY) return false;

    // Verify signature
    const expectedPayload = `${tokenSessionId}:${timestamp}`;
    const expectedSignature = crypto
      .createHmac("sha256", CSRF_SECRET)
      .update(expectedPayload)
      .digest("hex");

    // SECURITY FIX: Constant-time comparison
    // Check length FIRST to avoid timingSafeEqual throwing on different lengths
    // BUT we must ensure both branches take similar time to prevent timing attacks
    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    // If lengths differ, still do comparison to prevent timing leak
    if (sigBuffer.length !== expectedBuffer.length) {
      // Compare against itself to consume similar time
      crypto.timingSafeEqual(expectedBuffer, expectedBuffer);
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Validate request origin for CSRF protection
 * Standalone function that can be used without CSRF tokens
 * @param {Request} request - Next.js request object
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateRequestOrigin(request) {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  // For same-origin requests, validate origin matches host
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return { valid: false, reason: "origin_mismatch" };
      }
      return { valid: true };
    } catch {
      return { valid: false, reason: "invalid_origin" };
    }
  }

  // Fallback to referer check
  if (referer) {
    try {
      const refererHost = new URL(referer).host;
      if (refererHost !== host) {
        return { valid: false, reason: "referer_mismatch" };
      }
      return { valid: true };
    } catch {
      return { valid: false, reason: "invalid_referer" };
    }
  }

  // No origin/referer - could be API call, allow but log
  return { valid: true, reason: "no_origin_header" };
}

/**
 * CSRF protection helper - returns error response if origin invalid
 * Use this in POST/PUT/PATCH/DELETE handlers to prevent CSRF attacks.
 *
 * @param {Request} request - Next.js request object
 * @param {string} routeName - Name of the route for logging (e.g., "corrections", "setups")
 * @returns {Response|null} - Error response if invalid, null if valid
 *
 * @example
 * export async function POST(request) {
 *   const originError = requireValidOrigin(request, "corrections");
 *   if (originError) return originError;
 *   // ... rest of handler
 * }
 */
export function requireValidOrigin(request, routeName = "api") {
  const { NextResponse } = require("next/server");
  const check = validateRequestOrigin(request);

  if (!check.valid) {
    console.warn(`[SECURITY] CSRF attempt blocked on ${routeName}: ${check.reason}`);
    return NextResponse.json(
      {
        error: "Invalid request origin",
        code: "CSRF_BLOCKED",
        status: 403,
      },
      { status: 403 }
    );
  }

  return null; // Origin is valid, continue with request
}

/**
 * CSRF middleware for API routes
 * @param {Request} request - Next.js request object
 * @param {string} sessionId - User session ID
 * @param {Object} options - Configuration options
 * @param {boolean} options.requireToken - If true, CSRF token is mandatory (default: false for backwards compatibility)
 * @param {boolean} options.strictOrigin - If true, reject requests without origin header (default: false)
 * @returns {{ valid: boolean, error?: string }}
 */
export function verifyCsrfRequest(request, sessionId, options = {}) {
  const { requireToken = false, strictOrigin = false } = options;

  // Skip for GET, HEAD, OPTIONS requests
  const safeMethod = ["GET", "HEAD", "OPTIONS"].includes(request.method);
  if (safeMethod) return { valid: true };

  // Get token from header or body
  const headerToken = request.headers.get("x-csrf-token");
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // Verify origin/referer - use centralized config
  const allowedOrigins = [
    ...CONFIG_ALLOWED_ORIGINS,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  ].filter(Boolean);

  const requestOrigin = origin || (referer ? new URL(referer).origin : null);

  // SECURITY: Strict mode requires origin header
  if (strictOrigin && !requestOrigin) {
    return { valid: false, error: "missing_origin" };
  }

  if (requestOrigin && !allowedOrigins.includes(requestOrigin)) {
    console.warn(`[CSRF] Blocked request from unauthorized origin: ${requestOrigin}`);
    return { valid: false, error: "invalid_origin" };
  }

  // SECURITY: If token is required, validate it
  if (requireToken) {
    if (!headerToken) {
      return { valid: false, error: "missing_csrf_token" };
    }
    if (!validateCsrfToken(headerToken, sessionId)) {
      return { valid: false, error: "invalid_csrf_token" };
    }
  } else if (headerToken) {
    // If token is provided but not required, still validate it
    if (!validateCsrfToken(headerToken, sessionId)) {
      return { valid: false, error: "invalid_csrf_token" };
    }
  }

  return { valid: true };
}

/**
 * Strict CSRF verification for sensitive operations
 * ALWAYS requires valid CSRF token and origin validation
 * Use this for: password changes, account deletion, payment operations
 *
 * @param {Request} request - Next.js request object
 * @param {string} sessionId - User session ID
 * @returns {{ valid: boolean, error?: string }}
 */
export function verifyStrictCsrf(request, sessionId) {
  return verifyCsrfRequest(request, sessionId, {
    requireToken: true,
    strictOrigin: true,
  });
}

// ============================================
// INPUT SANITIZATION
// ============================================

/**
 * Sanitize a string to prevent XSS attacks
 * @param {string} input - Input string
 * @returns {string} Sanitized string
 */
export function sanitizeString(input) {
  if (typeof input !== "string") return "";

  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .replace(/`/g, "&#x60;")
    .replace(/=/g, "&#x3D;");
}

/**
 * Strip HTML tags from a string
 * @param {string} input - Input string
 * @returns {string} String without HTML
 */
export function stripHtml(input) {
  if (typeof input !== "string") return "";
  return input.replace(/<[^>]*>/g, "");
}

/**
 * Allowed HTML tags for sanitized content
 */
const ALLOWED_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'ul', 'ol', 'li',
  'strong', 'b', 'em', 'i', 'u', 's', 'mark',
  'blockquote', 'pre', 'code',
  'a', 'span', 'div',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'img',
]);

/**
 * Allowed attributes per tag (whitelist approach)
 */
const ALLOWED_ATTRIBUTES = {
  'a': ['href', 'title', 'target', 'rel'],
  'img': ['src', 'alt', 'title', 'width', 'height'],
  '*': ['class'], // class allowed on all tags
};

/**
 * Sanitize HTML content to prevent XSS attacks
 * Allows only safe tags and attributes while escaping everything else
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML
 */
export function sanitizeHtml(html) {
  if (typeof html !== "string") return "";
  if (!html.trim()) return "";

  // First, decode any HTML entities to catch encoded attacks
  let decoded = html
    .replace(/&#x([0-9a-fA-F]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));

  // Remove any script tags and their content completely
  decoded = decoded.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove any style tags and their content
  decoded = decoded.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove all event handlers (onclick, onerror, onload, etc.)
  decoded = decoded.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  decoded = decoded.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: and data: URLs
  decoded = decoded.replace(/javascript\s*:/gi, '');
  decoded = decoded.replace(/data\s*:\s*text\/html/gi, 'data:blocked');
  decoded = decoded.replace(/vbscript\s*:/gi, '');

  // Process each tag
  const result = decoded.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\s*([^>]*)>/gi, (match, tagName, attributes) => {
    const tag = tagName.toLowerCase();
    const isClosing = match.startsWith('</');

    // If tag is not allowed, escape it
    if (!ALLOWED_TAGS.has(tag)) {
      return sanitizeString(match);
    }

    // For closing tags, just return the clean closing tag
    if (isClosing) {
      return `</${tag}>`;
    }

    // For opening tags, filter attributes
    const cleanAttributes = [];
    const allowedForTag = [...(ALLOWED_ATTRIBUTES[tag] || []), ...(ALLOWED_ATTRIBUTES['*'] || [])];

    // Parse attributes
    const attrRegex = /([a-zA-Z][a-zA-Z0-9-_]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))/g;
    let attrMatch;

    while ((attrMatch = attrRegex.exec(attributes)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const attrValue = attrMatch[2] || attrMatch[3] || attrMatch[4] || '';

      // Only allow whitelisted attributes
      if (allowedForTag.includes(attrName)) {
        // Additional validation for specific attributes
        if (attrName === 'href' || attrName === 'src') {
          // Block dangerous protocols
          const cleanValue = attrValue.toLowerCase().trim();
          if (cleanValue.startsWith('javascript:') ||
              cleanValue.startsWith('vbscript:') ||
              cleanValue.startsWith('data:text/html')) {
            continue; // Skip this attribute
          }
        }

        // For links, always add rel="noopener noreferrer" if target="_blank"
        cleanAttributes.push(`${attrName}="${sanitizeAttributeValue(attrValue)}"`);
      }
    }

    // Check for boolean attributes without values
    const boolAttrRegex = /\s([a-zA-Z][a-zA-Z0-9-_]*)(?=\s|>|$)/g;
    // Skip boolean attributes for security

    // Build clean tag
    const attrsStr = cleanAttributes.length > 0 ? ' ' + cleanAttributes.join(' ') : '';
    const selfClosing = ['br', 'hr', 'img'].includes(tag) ? ' /' : '';

    return `<${tag}${attrsStr}${selfClosing}>`;
  });

  return result;
}

/**
 * Sanitize an attribute value
 * @param {string} value - Attribute value
 * @returns {string} Sanitized value
 */
function sanitizeAttributeValue(value) {
  if (typeof value !== 'string') return '';

  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Sanitize an object recursively
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 */
export function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return sanitizeString(obj);
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[sanitizeString(key)] = sanitizeObject(value);
  }
  return sanitized;
}

/**
 * Validate and sanitize email
 * @param {string} email - Email to validate
 * @returns {{ valid: boolean, sanitized?: string, error?: string }}
 */
export function validateEmail(email) {
  if (!email || typeof email !== "string") {
    return { valid: false, error: "Email is required" };
  }

  const trimmed = email.trim().toLowerCase();

  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: "Invalid email format" };
  }

  // Check for suspicious patterns
  if (trimmed.includes("..") || trimmed.includes("--")) {
    return { valid: false, error: "Invalid email format" };
  }

  // Max length
  if (trimmed.length > 254) {
    return { valid: false, error: "Email too long" };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * Validate and sanitize username/display name
 * @param {string} name - Name to validate
 * @returns {{ valid: boolean, sanitized?: string, error?: string }}
 */
export function validateDisplayName(name) {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "Name is required" };
  }

  const trimmed = name.trim();

  // Check length
  if (trimmed.length < 2) {
    return { valid: false, error: "Name too short (min 2 characters)" };
  }
  if (trimmed.length > 50) {
    return { valid: false, error: "Name too long (max 50 characters)" };
  }

  // Only allow alphanumeric, spaces, hyphens, underscores
  const nameRegex = /^[a-zA-Z0-9\s\-_\u00C0-\u017F]+$/;
  if (!nameRegex.test(trimmed)) {
    return { valid: false, error: "Name contains invalid characters" };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {{ valid: boolean, sanitized?: string, error?: string }}
 */
export function validateUrl(url) {
  if (!url || typeof url !== "string") {
    return { valid: false, error: "URL is required" };
  }

  try {
    const parsed = new URL(url.trim());

    // Only allow http and https
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { valid: false, error: "Invalid URL protocol" };
    }

    // Block localhost and internal IPs in production
    if (process.env.NODE_ENV === "production") {
      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname.startsWith("192.168.") ||
        hostname.startsWith("10.") ||
        hostname.startsWith("172.")
      ) {
        return { valid: false, error: "Invalid URL" };
      }
    }

    return { valid: true, sanitized: parsed.toString() };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}

/**
 * Validate wallet address (Ethereum)
 * @param {string} address - Wallet address
 * @returns {{ valid: boolean, sanitized?: string, error?: string }}
 */
export function validateWalletAddress(address) {
  if (!address || typeof address !== "string") {
    return { valid: false, error: "Address is required" };
  }

  const trimmed = address.trim();

  // Ethereum address validation
  if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return { valid: false, error: "Invalid Ethereum address" };
  }

  return { valid: true, sanitized: trimmed.toLowerCase() };
}

// ============================================
// HONEYPOT DETECTION
// ============================================

/**
 * Check for honeypot field (anti-spam)
 * Honeypot fields should be hidden and empty for real users
 * @param {Object} data - Form data
 * @param {string} honeypotField - Name of honeypot field
 * @returns {boolean} True if honeypot was triggered (bot detected)
 */
export function isHoneypotTriggered(data, honeypotField = "website_url") {
  // If honeypot field has a value, it's likely a bot
  return data[honeypotField] && data[honeypotField].length > 0;
}

/**
 * Check submission timing (anti-spam)
 * Forms submitted too quickly are likely bots
 * @param {number} startTime - Form load timestamp
 * @param {number} minSeconds - Minimum seconds before submission
 * @returns {boolean} True if submitted too fast (bot detected)
 */
export function isSubmittedTooFast(startTime, minSeconds = 3) {
  const elapsed = (Date.now() - startTime) / 1000;
  return elapsed < minSeconds;
}

// ============================================
// SQL INJECTION PREVENTION
// ============================================

/**
 * Check if string contains SQL injection patterns
 * @param {string} input - Input to check
 * @returns {boolean} True if suspicious
 */
export function hasSqlInjectionPattern(input) {
  if (typeof input !== "string") return false;

  const patterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /\b(union|select|insert|update|delete|drop|alter|create|truncate)\b/i,
    /\b(exec|execute|xp_|sp_)\b/i,
    /(\%00)/,  // Null byte
    /(;|\||&|`)/,  // Command separators
  ];

  return patterns.some((pattern) => pattern.test(input));
}

/**
 * Sanitize input for database queries
 * Note: Always use parameterized queries with Supabase instead
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
export function sanitizeForDatabase(input) {
  if (typeof input !== "string") return "";

  return input
    .replace(/'/g, "''")  // Escape single quotes
    .replace(/;/g, "")    // Remove semicolons
    .replace(/--/g, "")   // Remove comments
    .replace(/\/\*/g, "") // Remove block comments
    .replace(/\*\//g, "")
    .trim();
}

// ============================================
// REQUEST VALIDATION
// ============================================

/**
 * Validate request body size
 * @param {Request} request - Request object
 * @param {number} maxSizeBytes - Maximum size in bytes
 * @returns {Promise<boolean>}
 */
export async function isRequestTooLarge(request, maxSizeBytes = 1024 * 1024) {
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > maxSizeBytes) {
    return true;
  }
  return false;
}

/**
 * Validate content type
 * @param {Request} request - Request object
 * @param {string[]} allowedTypes - Allowed content types
 * @returns {boolean}
 */
export function isValidContentType(request, allowedTypes = ["application/json"]) {
  const contentType = request.headers.get("content-type") || "";
  return allowedTypes.some((type) => contentType.includes(type));
}

// ============================================
// API KEY VALIDATION
// ============================================

/**
 * Validate API key format
 * @param {string} apiKey - API key to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== "string") {
    return { valid: false, error: "API key is required" };
  }

  // Expected format: ss_live_xxxx or ss_test_xxxx
  const apiKeyRegex = /^ss_(live|test)_[a-zA-Z0-9]{32,64}$/;
  if (!apiKeyRegex.test(apiKey)) {
    return { valid: false, error: "Invalid API key format" };
  }

  return { valid: true };
}

/**
 * Generate a new API key
 * @param {string} environment - 'live' or 'test'
 * @returns {string} New API key
 */
export function generateApiKey(environment = "live") {
  const randomPart = crypto.randomBytes(32).toString("hex");
  return `ss_${environment}_${randomPart}`;
}

// ============================================
// EXPORTS
// ============================================

export default {
  // CSRF
  generateCsrfToken,
  validateCsrfToken,
  verifyCsrfRequest,
  verifyStrictCsrf,
  validateRequestOrigin,
  // Sanitization
  sanitizeString,
  stripHtml,
  sanitizeHtml,
  sanitizeObject,
  // Validation
  validateEmail,
  validateDisplayName,
  validateUrl,
  validateWalletAddress,
  // Anti-spam
  isHoneypotTriggered,
  isSubmittedTooFast,
  // SQL
  hasSqlInjectionPattern,
  sanitizeForDatabase,
  // Request
  isRequestTooLarge,
  isValidContentType,
  // API Keys
  validateApiKey,
  generateApiKey,
};
