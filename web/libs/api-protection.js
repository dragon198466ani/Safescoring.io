import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import {
  checkRateLimit,
  getClientId,
  logSuspiciousActivity,
  isClientBlocked,
} from "./rate-limit";

/**
 * API Protection middleware
 * Wraps API handlers with rate limiting, watermarking, and anti-scraping measures
 */

/**
 * Generate invisible watermark for response tracking
 */
function generateWatermark(clientId, endpoint) {
  const timestamp = Date.now();
  const encoded = Buffer.from(
    JSON.stringify({
      t: timestamp,
      c: clientId.substring(0, 16),
      e: endpoint,
    })
  ).toString("base64");

  return {
    _ss: encoded, // SafeScoring watermark
    _v: "1.0",
  };
}

/**
 * Detect scraping patterns
 */
function detectScrapingPatterns(request, clientId) {
  const ua = request.headers.get("user-agent") || "";
  const reasons = [];

  // Common scraper user agents
  const scraperUAs = [
    "python-requests",
    "axios",
    "node-fetch",
    "curl",
    "wget",
    "scrapy",
    "puppeteer",
    "playwright",
    "headless",
    "bot",
    "spider",
    "crawler",
  ];

  const uaLower = ua.toLowerCase();
  for (const scraper of scraperUAs) {
    if (uaLower.includes(scraper)) {
      reasons.push(`scraper-ua:${scraper}`);
    }
  }

  // Empty or missing user agent
  if (!ua || ua.length < 10) {
    reasons.push("missing-ua");
  }

  // Missing common browser headers
  if (!request.headers.get("accept-language")) {
    reasons.push("missing-accept-language");
  }

  // High offset pagination (trying to dump all data)
  const url = new URL(request.url);
  const offset = parseInt(url.searchParams.get("offset") || "0");
  if (offset > 200) {
    reasons.push(`high-offset:${offset}`);
  }

  // Very high limit
  const limit = parseInt(url.searchParams.get("limit") || "0");
  if (limit > 100) {
    reasons.push(`high-limit:${limit}`);
  }

  return reasons;
}

/**
 * Create protected API handler
 * @param {function} handler - The original API handler
 * @param {object} options - Protection options
 */
export function withProtection(handler, options = {}) {
  const {
    rateLimit = "public",
    requireAuth = false,
    maxLimit = 50, // Default max items for unauthenticated users
    authMaxLimit = 500, // Max items for authenticated users
    sensitiveFields = [], // Fields to hide from unauthenticated users
    addWatermark = true,
  } = options;

  return async function protectedHandler(request, context) {
    const clientId = getClientId(request);
    const endpoint = new URL(request.url).pathname;

    // Check if client is blocked
    if (isClientBlocked(clientId)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": "3600",
            "X-RateLimit-Reset": String(Date.now() + 3600000),
          },
        }
      );
    }

    // Detect scraping patterns
    const scrapingReasons = detectScrapingPatterns(request, clientId);
    if (scrapingReasons.length > 0) {
      logSuspiciousActivity(clientId, endpoint, scrapingReasons.join(","));
    }

    // Check rate limit
    const limitType = scrapingReasons.length > 0 ? "sensitive" : rateLimit;
    const { allowed, remaining, resetIn, total } = checkRateLimit(clientId, limitType);

    if (!allowed) {
      logSuspiciousActivity(clientId, endpoint, "rate-limit-exceeded");
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please slow down.",
          retryAfter: Math.ceil(resetIn / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(resetIn / 1000)),
            "X-RateLimit-Limit": String(total),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Date.now() + resetIn),
          },
        }
      );
    }

    // Check API key first (for programmatic access)
    let apiKeyAuth = null;
    // API key ONLY via header — never via URL param (prevents leaks in logs/referrer)
    const apiKeyHeader = request.headers.get("x-api-key") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (apiKeyHeader) {
      try {
        const { validateApiKey } = await import("@/libs/api-key-auth");
        apiKeyAuth = await validateApiKey(request);
      } catch {
        // API key validation module not available, continue
      }
    }

    // Check session authentication
    let session = null;
    if (apiKeyAuth?.valid) {
      // Create synthetic session from API key
      session = { user: { id: apiKeyAuth.userId, apiKeyAuth: true } };
    } else {
      try {
        session = await auth();
      } catch (e) {
        // Session check failed, continue as unauthenticated
      }
    }

    if (requireAuth && !session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Add protection context to request
    const protectionContext = {
      clientId,
      isAuthenticated: !!session,
      session,
      maxLimit: session ? authMaxLimit : maxLimit,
      sensitiveFields,
      scrapingDetected: scrapingReasons.length > 0,
    };

    // Call original handler
    try {
      const response = await handler(request, context, protectionContext);

      // If response is a NextResponse, add headers and watermark
      if (response instanceof NextResponse) {
        // Add rate limit headers
        response.headers.set("X-RateLimit-Limit", String(total));
        response.headers.set("X-RateLimit-Remaining", String(remaining));
        response.headers.set("X-RateLimit-Reset", String(Date.now() + resetIn));

        // Add anti-scraping headers
        response.headers.set("X-Robots-Tag", "noindex, nofollow");
        response.headers.set("X-Content-Type-Options", "nosniff");

        // Add watermark to JSON responses
        if (addWatermark && response.headers.get("content-type")?.includes("application/json")) {
          try {
            const data = await response.json();
            const watermarkedData = {
              ...data,
              ...generateWatermark(clientId, endpoint),
            };
            return NextResponse.json(watermarkedData, {
              status: response.status,
              headers: response.headers,
            });
          } catch (e) {
            // Not a JSON response, return as-is
          }
        }
      }

      return response;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

/**
 * Helper to limit and filter data based on authentication
 */
export function filterResponseData(data, protectionContext, options = {}) {
  const { isAuthenticated, maxLimit, sensitiveFields } = protectionContext;
  const { itemsKey = "items" } = options;

  let result = { ...data };

  // Limit array items
  if (Array.isArray(result[itemsKey])) {
    result[itemsKey] = result[itemsKey].slice(0, maxLimit);
    result._limited = result[itemsKey].length >= maxLimit;
    result._maxItems = maxLimit;
  }

  // Remove sensitive fields for unauthenticated users
  if (!isAuthenticated && sensitiveFields.length > 0) {
    const removeSensitive = (obj) => {
      if (Array.isArray(obj)) {
        return obj.map(removeSensitive);
      }
      if (obj && typeof obj === "object") {
        const filtered = { ...obj };
        for (const field of sensitiveFields) {
          delete filtered[field];
        }
        return filtered;
      }
      return obj;
    };

    result = removeSensitive(result);
  }

  return result;
}

/**
 * Quick protection for simple endpoints
 */
export async function quickProtect(request, limitType = "public") {
  const clientId = getClientId(request);
  const endpoint = new URL(request.url).pathname;

  if (isClientBlocked(clientId)) {
    return {
      blocked: true,
      response: NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      ),
    };
  }

  const { allowed, remaining, resetIn } = checkRateLimit(clientId, limitType);

  if (!allowed) {
    return {
      blocked: true,
      response: NextResponse.json(
        { error: "Rate limit exceeded", retryAfter: Math.ceil(resetIn / 1000) },
        { status: 429 }
      ),
    };
  }

  return { blocked: false, clientId, remaining };
}

// Re-export getClientId for use in API routes
export { getClientId } from "./rate-limit";
