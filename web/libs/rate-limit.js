/**
 * Rate Limiter for API Protection
 * Prevents scraping and abuse of public endpoints
 *
 * Supports two backends:
 * 1. In-memory (default) — suitable for single-server deployments
 * 2. Redis (via REDIS_URL env var) — for production multi-server deployments
 *
 * The adapter is auto-selected at startup based on environment.
 */

// ─── Store interface ──────────────────────────────────────────────
// Both in-memory and Redis adapters expose the same API internally.
// Key: `${clientId}:${limitType}`

// In-memory store (default)
const memoryStore = new Map();
const blockedClients = new Map();
const suspiciousActivity = new Map();

// Redis client (lazy-initialised)
let redis = null;
let useRedis = false;

async function initRedis() {
  if (redis || !process.env.REDIS_URL) return false;

  try {
    // Dynamic import to avoid build-time dependency
    const { Redis } = await import("ioredis");
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 3000,
      // Disable reconnect in serverless to avoid hanging connections
      retryStrategy: (times) => (times > 2 ? null : Math.min(times * 200, 1000)),
    });
    await redis.connect();
    useRedis = true;
    console.log("[RATE-LIMIT] Using Redis backend");
    return true;
  } catch (e) {
    console.warn("[RATE-LIMIT] Redis unavailable, using in-memory fallback:", e.message);
    redis = null;
    return false;
  }
}

// Try to connect at module load (non-blocking)
if (process.env.REDIS_URL) {
  initRedis().catch(() => {});
}

// ─── Cleanup (in-memory only) ─────────────────────────────────────
const CLEANUP_INTERVAL = 120000;
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of memoryStore.entries()) {
    if (now - data.windowStart > 600000) {
      memoryStore.delete(key);
    }
  }
  for (const [key, expiry] of blockedClients.entries()) {
    if (now > expiry) {
      blockedClients.delete(key);
    }
  }
  const oneHourAgo = now - 3600000;
  for (const [key, data] of suspiciousActivity.entries()) {
    if (data.events.length === 0 || data.events[data.events.length - 1].timestamp < oneHourAgo) {
      suspiciousActivity.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

// ─── Configuration ────────────────────────────────────────────────
export const RATE_LIMITS = {
  public: {
    windowMs: 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_PUBLIC) || (process.env.NODE_ENV === "production" ? 60 : 1000),
    blockDuration: process.env.NODE_ENV === "production" ? 300000 : 0,
  },
  authenticated: {
    windowMs: 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_AUTHENTICATED) || (process.env.NODE_ENV === "production" ? 120 : 2000),
    blockDuration: process.env.NODE_ENV === "production" ? 300000 : 0,
  },
  sensitive: {
    windowMs: 60000,
    maxRequests: process.env.NODE_ENV === "production" ? 20 : 500,
    blockDuration: process.env.NODE_ENV === "production" ? 600000 : 0,
  },
  admin: {
    windowMs: 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_ADMIN) || (process.env.NODE_ENV === "production" ? 100 : 1000),
    blockDuration: 0,
  },
  search: {
    windowMs: 60000,
    maxRequests: process.env.NODE_ENV === "production" ? 30 : 500,
    blockDuration: process.env.NODE_ENV === "production" ? 300000 : 0,
  },
};

// ─── Client identification ────────────────────────────────────────
export function getClientId(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfIp = request.headers.get("cf-connecting-ip");
  const ip = cfIp || realIp || forwarded?.split(",")[0]?.trim() || "unknown";
  const ua = request.headers.get("user-agent") || "unknown";
  const uaHash = simpleHash(ua);
  return `${ip}:${uaHash}`;
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).substring(0, 8);
}

// ─── Rate limit check (with Redis support) ───────────────────────

/**
 * Check rate limit for a client — sliding window algorithm.
 * When Redis is available, uses INCR + EXPIRE for atomic counters.
 */
export function checkRateLimit(clientId, limitType = "public") {
  // Redis path is sync-incompatible; these routes already call quickProtect
  // which is async. For sync callers, always use memory path.
  return checkRateLimitMemory(clientId, limitType);
}

/**
 * Async rate limit check — prefers Redis when available.
 */
export async function checkRateLimitAsync(clientId, limitType = "public") {
  if (useRedis && redis) {
    try {
      return await checkRateLimitRedis(clientId, limitType);
    } catch {
      // Fallback to memory on Redis error
      return checkRateLimitMemory(clientId, limitType);
    }
  }
  return checkRateLimitMemory(clientId, limitType);
}

async function checkRateLimitRedis(clientId, limitType) {
  const config = RATE_LIMITS[limitType] || RATE_LIMITS.public;
  const key = `rl:${clientId}:${limitType}`;
  const blockKey = `rl:block:${clientId}`;
  const windowSec = Math.ceil(config.windowMs / 1000);

  // Check block
  const blocked = await redis.get(blockKey);
  if (blocked) {
    const ttl = await redis.ttl(blockKey);
    return { allowed: false, remaining: 0, resetIn: ttl * 1000, total: config.maxRequests, blocked: true };
  }

  // Increment counter
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSec);
  }
  const ttl = await redis.ttl(key);
  const resetIn = ttl > 0 ? ttl * 1000 : config.windowMs;
  const remaining = Math.max(0, config.maxRequests - count);
  const allowed = count <= config.maxRequests;

  if (!allowed && config.blockDuration) {
    // Track violations in Redis
    const violKey = `rl:viol:${clientId}:${limitType}`;
    const violations = await redis.incr(violKey);
    if (violations === 1) await redis.expire(violKey, 300); // 5 min
    if (violations >= 3) {
      const blockSec = Math.ceil(config.blockDuration / 1000);
      await redis.set(blockKey, "1", "EX", blockSec);
      console.warn(`[RATE LIMIT] Client ${clientId} blocked for ${blockSec}s (Redis)`);
    }
  }

  return { allowed, remaining, resetIn, total: config.maxRequests, blocked: false };
}

function checkRateLimitMemory(clientId, limitType) {
  const config = RATE_LIMITS[limitType] || RATE_LIMITS.public;
  const now = Date.now();
  const key = `${clientId}:${limitType}`;

  if (isTemporarilyBlocked(clientId)) {
    const blockExpiry = blockedClients.get(clientId);
    return { allowed: false, remaining: 0, resetIn: blockExpiry - now, total: config.maxRequests, blocked: true };
  }

  let data = memoryStore.get(key);
  if (!data || now - data.windowStart > config.windowMs) {
    data = { windowStart: now, requests: 0, violations: 0 };
  }

  data.requests++;
  memoryStore.set(key, data);

  const remaining = Math.max(0, config.maxRequests - data.requests);
  const resetIn = Math.max(0, config.windowMs - (now - data.windowStart));
  const allowed = data.requests <= config.maxRequests;

  if (!allowed) {
    data.violations = (data.violations || 0) + 1;
    memoryStore.set(key, data);
    if (data.violations >= 3 && config.blockDuration) {
      blockClient(clientId, config.blockDuration);
      console.warn(`[RATE LIMIT] Client ${clientId} blocked for ${config.blockDuration}ms`);
    }
  }

  return { allowed, remaining, resetIn, total: config.maxRequests, blocked: false };
}

// ─── Blocking helpers ─────────────────────────────────────────────
function isTemporarilyBlocked(clientId) {
  const expiry = blockedClients.get(clientId);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    blockedClients.delete(clientId);
    return false;
  }
  return true;
}

function blockClient(clientId, duration) {
  blockedClients.set(clientId, Date.now() + duration);
}

// ─── Suspicious activity tracking ─────────────────────────────────
export function logSuspiciousActivity(clientId, endpoint, reason) {
  const key = clientId;
  const now = Date.now();

  if (!suspiciousActivity.has(key)) {
    suspiciousActivity.set(key, { firstSeen: now, events: [] });
  }

  const data = suspiciousActivity.get(key);
  data.events.push({ timestamp: now, endpoint, reason });

  if (data.events.length > 100) {
    data.events = data.events.slice(-100);
  }

  console.warn(`[SUSPICIOUS] ${clientId} - ${endpoint} - ${reason}`);
  return data.events.length;
}

export function isClientBlocked(clientId) {
  // Check temporary block first
  if (isTemporarilyBlocked(clientId)) return true;

  const data = suspiciousActivity.get(clientId);
  if (!data) return false;

  const oneHourAgo = Date.now() - 3600000;
  const recentViolations = data.events.filter((e) => e.timestamp > oneHourAgo);
  return recentViolations.length > 50;
}
