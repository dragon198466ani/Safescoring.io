/**
 * Optimized Security Module
 * Combines all security checks with caching and performance optimization
 */

import crypto from "crypto";

// In-memory caches with TTL
const caches = {
  blockedIPs: new Map(),
  rateLimits: new Map(),
  honeypotTriggers: new Map(),
  sessionRisks: new Map(),
};

// Cache TTLs (in ms)
const CACHE_TTL = {
  blockedIP: 60000, // 1 minute
  rateLimit: 1000, // 1 second
  honeypot: 300000, // 5 minutes
  sessionRisk: 30000, // 30 seconds
};

// Cleanup interval
setInterval(() => {
  const now = Date.now();
  for (const [key, cache] of Object.entries(caches)) {
    for (const [cacheKey, { expires }] of cache.entries()) {
      if (expires < now) {
        cache.delete(cacheKey);
      }
    }
  }
}, 60000); // Cleanup every minute

/**
 * Generate request fingerprint
 */
export function generateRequestFingerprint(request) {
  const ip = getClientIP(request);
  const ua = request.headers.get("user-agent") || "";
  const accept = request.headers.get("accept") || "";
  const acceptLang = request.headers.get("accept-language") || "";

  const components = [ip, ua, accept, acceptLang].join("|");

  return crypto.createHash("sha256").update(components).digest("hex").substring(0, 32);
}

/**
 * Get client IP with proxy support
 */
export function getClientIP(request) {
  const headers = request.headers;

  // Check various headers in order of reliability
  const ipHeaders = [
    "cf-connecting-ip", // Cloudflare
    "x-real-ip", // Nginx
    "x-forwarded-for", // Standard proxy
    "x-client-ip", // Apache
    "true-client-ip", // Akamai
  ];

  for (const header of ipHeaders) {
    const value = headers.get(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs
      const ip = value.split(",")[0].trim();
      if (isValidIP(ip)) {
        return ip;
      }
    }
  }

  return "0.0.0.0";
}

/**
 * Validate IP address format
 */
function isValidIP(ip) {
  // IPv4
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Check if IP is blocked (with cache)
 */
export async function isIPBlocked(ip, supabase) {
  const cacheKey = `blocked:${ip}`;
  const cached = caches.blockedIPs.get(cacheKey);

  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }

  // Query database
  const { data, error } = await supabase
    .from("ip_blocklist")
    .select("id")
    .eq("ip_address", ip)
    .is("unblocked_at", null)
    .or("blocked_until.is.null,blocked_until.gt.now()")
    .limit(1);

  const isBlocked = !error && data && data.length > 0;

  // Cache result
  caches.blockedIPs.set(cacheKey, {
    value: isBlocked,
    expires: Date.now() + CACHE_TTL.blockedIP,
  });

  return isBlocked;
}

/**
 * Fast rate limiting with token bucket
 */
export function checkRateLimitFast(key, maxTokens = 100, refillRate = 10) {
  const now = Date.now();
  const cacheKey = `rate:${key}`;

  let bucket = caches.rateLimits.get(cacheKey);

  if (!bucket || bucket.expires < now) {
    bucket = {
      tokens: maxTokens,
      lastRefill: now,
      expires: now + 3600000, // 1 hour
    };
  }

  // Refill tokens
  const elapsed = (now - bucket.lastRefill) / 60000; // Minutes
  const refilled = Math.floor(elapsed * refillRate);
  bucket.tokens = Math.min(maxTokens, bucket.tokens + refilled);
  bucket.lastRefill = now;

  // Check and consume
  if (bucket.tokens > 0) {
    bucket.tokens--;
    caches.rateLimits.set(cacheKey, bucket);
    return { allowed: true, remaining: bucket.tokens };
  }

  return { allowed: false, remaining: 0, resetIn: Math.ceil((1 / refillRate) * 60) };
}

/**
 * Detect honeypot field submission
 */
export function detectHoneypotField(body, fieldNames = ["website_url", "fax", "company_address"]) {
  if (!body || typeof body !== "object") return false;

  for (const field of fieldNames) {
    if (body[field] && body[field].toString().trim() !== "") {
      return { triggered: true, field, value: body[field] };
    }
  }

  return { triggered: false };
}

/**
 * Detect suspicious timing (too fast = bot)
 */
export function detectSuspiciousTiming(requestTimestamp, formLoadTimestamp) {
  if (!formLoadTimestamp) return { suspicious: false };

  const elapsed = requestTimestamp - formLoadTimestamp;
  const MIN_HUMAN_TIME = 1000; // 1 second minimum

  if (elapsed < MIN_HUMAN_TIME) {
    return {
      suspicious: true,
      reason: "Form submitted too fast",
      elapsed,
      threshold: MIN_HUMAN_TIME,
    };
  }

  return { suspicious: false };
}

/**
 * Calculate request risk score
 */
export function calculateRequestRisk(request, options = {}) {
  const factors = [];
  let score = 0;

  const ip = getClientIP(request);
  const ua = request.headers.get("user-agent") || "";
  const referer = request.headers.get("referer") || "";
  const origin = request.headers.get("origin") || "";

  // No User-Agent (likely bot)
  if (!ua || ua.length < 10) {
    factors.push("NO_USER_AGENT");
    score += 30;
  }

  // Suspicious User-Agent patterns
  const suspiciousUA = [
    /curl/i,
    /wget/i,
    /python/i,
    /scrapy/i,
    /bot/i,
    /spider/i,
    /crawler/i,
    /headless/i,
  ];

  for (const pattern of suspiciousUA) {
    if (pattern.test(ua)) {
      factors.push("SUSPICIOUS_UA");
      score += 20;
      break;
    }
  }

  // Missing or mismatched origin (potential CSRF)
  if (options.checkOrigin) {
    const expectedOrigin = process.env.NEXT_PUBLIC_URL || process.env.VERCEL_URL;
    if (!origin || (expectedOrigin && !origin.includes(expectedOrigin))) {
      factors.push("ORIGIN_MISMATCH");
      score += 25;
    }
  }

  // Tor exit node detection (common Tor UA patterns)
  if (/Tor/.test(ua)) {
    factors.push("TOR_DETECTED");
    score += 15;
  }

  // Known data center IP ranges (simplified check)
  const datacenterPrefixes = [
    "34.", "35.", "104.", "108.", // Google Cloud
    "52.", "54.", "18.", "13.", // AWS
    "20.", "40.", "13.", "23.", // Azure
  ];

  for (const prefix of datacenterPrefixes) {
    if (ip.startsWith(prefix)) {
      factors.push("DATACENTER_IP");
      score += 10;
      break;
    }
  }

  return {
    score,
    level: score >= 50 ? "high" : score >= 25 ? "medium" : "low",
    factors,
  };
}

/**
 * Combined security check for API routes
 */
export async function performSecurityChecks(request, supabase, options = {}) {
  const {
    checkRateLimit = true,
    checkBlocked = true,
    checkRisk = true,
    rateLimitKey = null,
    rateLimitMax = 100,
  } = options;

  const results = {
    passed: true,
    blocked: false,
    rateLimited: false,
    riskLevel: "low",
    details: {},
  };

  const ip = getClientIP(request);
  const fingerprint = generateRequestFingerprint(request);

  // 1. Check if IP is blocked
  if (checkBlocked && supabase) {
    const blocked = await isIPBlocked(ip, supabase);
    if (blocked) {
      results.passed = false;
      results.blocked = true;
      results.details.blockReason = "IP is in blocklist";
      return results;
    }
  }

  // 2. Check rate limit
  if (checkRateLimit) {
    const key = rateLimitKey || `api:${ip}`;
    const rateResult = checkRateLimitFast(key, rateLimitMax);
    if (!rateResult.allowed) {
      results.passed = false;
      results.rateLimited = true;
      results.details.rateLimit = rateResult;
      return results;
    }
    results.details.rateLimitRemaining = rateResult.remaining;
  }

  // 3. Calculate risk
  if (checkRisk) {
    const risk = calculateRequestRisk(request, options);
    results.riskLevel = risk.level;
    results.details.risk = risk;

    if (risk.level === "high") {
      // Don't block, but flag for monitoring
      results.details.flagged = true;
    }
  }

  results.details.ip = ip;
  results.details.fingerprint = fingerprint;

  return results;
}

/**
 * Log security event efficiently (non-blocking)
 */
export function logSecurityEvent(supabase, event) {
  // Fire and forget - don't await
  supabase
    .from("security_events")
    .insert({
      event_type: event.type,
      severity: event.severity || "low",
      ip_address: event.ip,
      user_agent: event.userAgent,
      user_id: event.userId,
      details: event.details || {},
      fingerprint: event.fingerprint,
    })
    .then(() => {})
    .catch((err) => console.error("[SECURITY LOG] Failed:", err.message));
}

export default {
  generateRequestFingerprint,
  getClientIP,
  isIPBlocked,
  checkRateLimitFast,
  detectHoneypotField,
  detectSuspiciousTiming,
  calculateRequestRisk,
  performSecurityChecks,
  logSecurityEvent,
};
