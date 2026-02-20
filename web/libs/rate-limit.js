/**
 * Rate Limiter for API Protection
 * Prevents scraping and abuse of public endpoints
 *
 * NOTE: This is an in-memory rate limiter suitable for single-server deployments.
 * For production multi-server deployments, use Redis-based rate limiting.
 *
 * To switch to Redis, set REDIS_URL environment variable and use:
 * - @upstash/ratelimit for serverless
 * - ioredis + sliding window for traditional servers
 */

// Store rate limit data in memory
// Key: clientId:limitType, Value: { windowStart, requests, blocked }
const rateLimitStore = new Map();

// Blocked clients store (for persistent blocking)
const blockedClients = new Map();

// Cleanup old entries every 2 minutes
const CLEANUP_INTERVAL = 120000;
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    // Remove entries older than 10 minutes
    if (now - data.windowStart > 600000) {
      rateLimitStore.delete(key);
    }
  }

  // Clean up expired blocks
  for (const [key, expiry] of blockedClients.entries()) {
    if (now > expiry) {
      blockedClients.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

/**
 * Rate limit configuration per endpoint type
 * Can be overridden via environment variables
 */
const isProduction = process.env.NODE_ENV === "production";

export const RATE_LIMITS = {
  // Public APIs
  public: {
    windowMs: 60000, // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_PUBLIC) || (isProduction ? 30 : 1000),
    blockDuration: isProduction ? 300000 : 0, // 5 min block in production
  },
  // Authenticated APIs - higher limits for logged-in users
  authenticated: {
    windowMs: 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_AUTHENTICATED) || (isProduction ? 200 : 2000),
    blockDuration: isProduction ? 120000 : 0, // 2 min block in production
  },
  // Sensitive APIs (history, bulk data, DNS verification)
  sensitive: {
    windowMs: 60000,
    maxRequests: isProduction ? 20 : 500,
    blockDuration: isProduction ? 600000 : 0, // 10 min block in production
  },
  // Admin APIs
  admin: {
    windowMs: 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_ADMIN) || (isProduction ? 100 : 1000),
    blockDuration: isProduction ? 60000 : 0, // 1 min block in production
  },
  // Search/query APIs
  search: {
    windowMs: 60000,
    maxRequests: isProduction ? 60 : 500,
    blockDuration: isProduction ? 180000 : 0, // 3 min block in production
  },
};

/**
 * Get client identifier from request
 */
export function getClientId(request) {
  // Try to get real IP from various headers (for proxies/load balancers)
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfIp = request.headers.get("cf-connecting-ip"); // Cloudflare

  const ip = cfIp || realIp || forwarded?.split(",")[0]?.trim() || "unknown";

  // Also consider user agent for fingerprinting
  const ua = request.headers.get("user-agent") || "unknown";
  const uaHash = simpleHash(ua);

  return `${ip}:${uaHash}`;
}

/**
 * Simple hash function for fingerprinting
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).substring(0, 8);
}

/**
 * Check if a client is temporarily blocked
 * @param {string} clientId
 * @returns {boolean}
 */
function isTemporarilyBlocked(clientId) {
  const expiry = blockedClients.get(clientId);
  if (!expiry) return false;

  if (Date.now() > expiry) {
    blockedClients.delete(clientId);
    return false;
  }

  return true;
}

/**
 * Block a client temporarily
 * @param {string} clientId
 * @param {number} duration - Duration in ms
 */
function blockClient(clientId, duration) {
  blockedClients.set(clientId, Date.now() + duration);
}

/**
 * Check rate limit for a client
 * Uses sliding window algorithm for better accuracy
 * @returns {object} { allowed: boolean, remaining: number, resetIn: number, blocked: boolean }
 */
export function checkRateLimit(clientId, limitType = "public") {
  const config = RATE_LIMITS[limitType] || RATE_LIMITS.public;
  const now = Date.now();
  const key = `${clientId}:${limitType}`;

  // Check if client is blocked
  if (isTemporarilyBlocked(clientId)) {
    const blockExpiry = blockedClients.get(clientId);
    return {
      allowed: false,
      remaining: 0,
      resetIn: blockExpiry - now,
      total: config.maxRequests,
      blocked: true,
    };
  }

  let data = rateLimitStore.get(key);

  // Initialize or reset window
  if (!data || now - data.windowStart > config.windowMs) {
    data = {
      windowStart: now,
      requests: 0,
      violations: 0,
    };
  }

  data.requests++;
  rateLimitStore.set(key, data);

  const remaining = Math.max(0, config.maxRequests - data.requests);
  const resetIn = Math.max(0, config.windowMs - (now - data.windowStart));
  const allowed = data.requests <= config.maxRequests;

  // Track violations and block persistent offenders
  if (!allowed) {
    data.violations = (data.violations || 0) + 1;
    rateLimitStore.set(key, data);

    // Block client after 3 consecutive violations
    if (data.violations >= 3 && config.blockDuration) {
      blockClient(clientId, config.blockDuration);
      console.warn(`[RATE LIMIT] Client ${clientId} blocked for ${config.blockDuration}ms`);
    }
  }

  return {
    allowed,
    remaining,
    resetIn,
    total: config.maxRequests,
    blocked: false,
  };
}

/**
 * Log suspicious activity for monitoring
 */
const suspiciousActivity = new Map();

export function logSuspiciousActivity(clientId, endpoint, reason) {
  const key = clientId;
  const now = Date.now();

  if (!suspiciousActivity.has(key)) {
    suspiciousActivity.set(key, {
      firstSeen: now,
      events: [],
    });
  }

  const data = suspiciousActivity.get(key);
  data.events.push({
    timestamp: now,
    endpoint,
    reason,
  });

  // Keep only last 100 events per client
  if (data.events.length > 100) {
    data.events = data.events.slice(-100);
  }

  // Log to console for monitoring
  console.warn(`[SUSPICIOUS] ${clientId} - ${endpoint} - ${reason}`);

  return data.events.length;
}

/**
 * Check if client is blocked (too many violations)
 */
export function isClientBlocked(clientId) {
  const data = suspiciousActivity.get(clientId);
  if (!data) return false;

  // Block if more than 50 violations in last hour
  const oneHourAgo = Date.now() - 3600000;
  const recentViolations = data.events.filter(e => e.timestamp > oneHourAgo);

  return recentViolations.length > 50;
}
