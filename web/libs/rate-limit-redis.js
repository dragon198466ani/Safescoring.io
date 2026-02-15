/**
 * Redis-based Rate Limiter for multi-instance production deployments
 *
 * Drop-in replacement for the in-memory rate-limit.js.
 * Uses a sliding window algorithm backed by Redis sorted sets.
 *
 * To enable: set REDIS_URL environment variable.
 * Falls back to in-memory rate-limit.js automatically if Redis is unavailable.
 *
 * Usage:
 *   import { checkRateLimit, getClientId } from "@/libs/rate-limit-redis";
 *   // API is identical to rate-limit.js
 */

let redis = null;
let redisAvailable = false;

// Lazy-init Redis connection
async function getRedis() {
  if (redis) return redis;

  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    // Dynamic import to avoid bundling ioredis when not used
    const { default: Redis } = await import("ioredis");
    redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
      enableReadyCheck: false,
    });
    await redis.connect();
    redisAvailable = true;
    console.log("[RATE LIMIT] Redis connected successfully");
    return redis;
  } catch (err) {
    console.warn("[RATE LIMIT] Redis unavailable, falling back to in-memory:", err.message);
    redisAvailable = false;
    return null;
  }
}

// Re-export RATE_LIMITS and getClientId from base module (they don't depend on storage)
export { RATE_LIMITS, getClientId, logSuspiciousActivity, isClientBlocked } from "./rate-limit";
import { RATE_LIMITS, checkRateLimit as memoryCheckRateLimit } from "./rate-limit";

/**
 * Redis-backed rate limit check using sliding window with sorted sets
 * Falls back to in-memory if Redis is unavailable
 */
export async function checkRateLimit(clientId, limitType = "public") {
  const config = RATE_LIMITS[limitType] || RATE_LIMITS.public;
  const redisClient = await getRedis();

  // Fallback to in-memory if Redis not available
  if (!redisClient) {
    return memoryCheckRateLimit(clientId, limitType);
  }

  try {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const key = `rl:${clientId}:${limitType}`;
    const blockKey = `rl:block:${clientId}`;

    // Check if blocked
    const blocked = await redisClient.get(blockKey);
    if (blocked) {
      const ttl = await redisClient.pttl(blockKey);
      return {
        allowed: false,
        remaining: 0,
        resetIn: Math.max(0, ttl),
        total: config.maxRequests,
        blocked: true,
      };
    }

    // Sliding window: remove old entries, add current, count
    const pipeline = redisClient.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart); // Remove expired
    pipeline.zadd(key, now, `${now}:${Math.random()}`); // Add current request
    pipeline.zcard(key); // Count requests in window
    pipeline.pexpire(key, config.windowMs); // Set expiry

    const results = await pipeline.exec();
    const requestCount = results[2][1]; // zcard result

    const allowed = requestCount <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - requestCount);

    // Block persistent offenders
    if (!allowed && config.blockDuration) {
      const violationKey = `rl:v:${clientId}:${limitType}`;
      const violations = await redisClient.incr(violationKey);
      await redisClient.pexpire(violationKey, config.windowMs);

      if (violations >= 3) {
        await redisClient.set(blockKey, "1", "PX", config.blockDuration);
        console.warn(`[RATE LIMIT] Redis: Client ${clientId} blocked for ${config.blockDuration}ms`);
      }
    }

    return {
      allowed,
      remaining,
      resetIn: config.windowMs,
      total: config.maxRequests,
      blocked: false,
    };
  } catch (err) {
    console.error("[RATE LIMIT] Redis error, falling back to memory:", err.message);
    return memoryCheckRateLimit(clientId, limitType);
  }
}

/**
 * Check if Redis is connected and available
 */
export function isRedisAvailable() {
  return redisAvailable;
}
