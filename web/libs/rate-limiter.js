/**
 * Rate Limiter for Next.js API Routes
 * In-memory rate limiting with sliding window algorithm
 */

// Store for rate limit data (in-memory, resets on server restart)
const rateLimitStore = new Map();

// Cleanup old entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitStore.entries()) {
      if (now - data.windowStart > data.windowMs * 2) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Rate limit configuration presets
 */
export const RATE_LIMITS = {
  // Standard API calls
  standard: {
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
  },
  // Strict for sensitive endpoints
  strict: {
    windowMs: 60 * 1000,
    max: 10,
  },
  // Relaxed for public data
  relaxed: {
    windowMs: 60 * 1000,
    max: 120,
  },
  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
  },
  // Form submissions
  form: {
    windowMs: 60 * 1000,
    max: 5,
  },
};

/**
 * Get client identifier from request
 */
function getClientId(request) {
  // Try to get IP from various headers
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfIp = request.headers.get("cf-connecting-ip");

  // Use first IP in forwarded list, or fall back to others
  const ip = forwarded?.split(",")[0]?.trim() || realIp || cfIp || "unknown";

  return ip;
}

/**
 * Check rate limit for a request
 *
 * @param {Request} request - Next.js request object
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum requests per window
 * @param {string} options.keyPrefix - Prefix for rate limit key
 * @returns {Object} { success, remaining, resetTime, clientId }
 */
export function checkRateLimit(request, options = {}) {
  const {
    windowMs = RATE_LIMITS.standard.windowMs,
    max = RATE_LIMITS.standard.max,
    keyPrefix = "rl",
  } = options;

  const clientId = getClientId(request);
  const key = `${keyPrefix}:${clientId}`;
  const now = Date.now();

  // Get or create rate limit entry
  let data = rateLimitStore.get(key);

  if (!data || now - data.windowStart >= windowMs) {
    // New window
    data = {
      count: 0,
      windowStart: now,
      windowMs,
    };
  }

  // Increment count
  data.count++;
  rateLimitStore.set(key, data);

  const remaining = Math.max(0, max - data.count);
  const resetTime = data.windowStart + windowMs;
  const success = data.count <= max;

  return {
    success,
    remaining,
    resetTime,
    clientId,
    current: data.count,
    limit: max,
  };
}

/**
 * Rate limit middleware for API routes
 *
 * @param {Function} handler - API route handler
 * @param {Object} options - Rate limit options
 */
export function withRateLimit(handler, options = {}) {
  return async (request, context) => {
    const result = checkRateLimit(request, options);

    // Add rate limit headers
    const headers = {
      "X-RateLimit-Limit": result.limit.toString(),
      "X-RateLimit-Remaining": result.remaining.toString(),
      "X-RateLimit-Reset": result.resetTime.toString(),
    };

    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: "Too many requests",
          message: "Rate limit exceeded. Please try again later.",
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            ...headers,
            "Content-Type": "application/json",
            "Retry-After": Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Call the actual handler
    const response = await handler(request, context);

    // Add rate limit headers to response
    if (response instanceof Response) {
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
    }

    return response;
  };
}

/**
 * Rate limit by endpoint path
 * Different limits for different API routes
 */
export function getRateLimitForPath(pathname) {
  if (pathname.includes("/auth")) {
    return RATE_LIMITS.auth;
  }
  if (pathname.includes("/corrections") || pathname.includes("/submit")) {
    return RATE_LIMITS.form;
  }
  if (pathname.includes("/products") || pathname.includes("/norms")) {
    return RATE_LIMITS.relaxed;
  }
  return RATE_LIMITS.standard;
}

/**
 * Simple in-memory cache with rate-limited background refresh
 */
export class RateLimitedCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.refreshing = new Set();
    this.ttl = options.ttl || 60 * 1000; // 1 minute default
    this.maxSize = options.maxSize || 1000;
  }

  async get(key, fetchFn) {
    const cached = this.cache.get(key);
    const now = Date.now();

    // Return fresh cache
    if (cached && now - cached.timestamp < this.ttl) {
      return cached.data;
    }

    // Return stale cache while refreshing
    if (cached && !this.refreshing.has(key)) {
      this.refreshing.add(key);
      this.refresh(key, fetchFn).finally(() => {
        this.refreshing.delete(key);
      });
      return cached.data;
    }

    // No cache, fetch new data
    const data = await fetchFn();
    this.set(key, data);
    return data;
  }

  set(key, data) {
    // Evict oldest entries if at max size
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  async refresh(key, fetchFn) {
    try {
      const data = await fetchFn();
      this.set(key, data);
    } catch (error) {
      console.error(`Cache refresh failed for ${key}:`, error);
    }
  }

  invalidate(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

export default {
  checkRateLimit,
  withRateLimit,
  getRateLimitForPath,
  RATE_LIMITS,
  RateLimitedCache,
};
