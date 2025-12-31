/**
 * User-level anti-scraping protection
 * Prevents authenticated users from bulk scraping data
 */

// In-memory store for user activity tracking
const userActivityStore = new Map();
const suspiciousUsersStore = new Map();
const blockedUsersStore = new Set();

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  const oneHour = 3600000;

  for (const [userId, data] of userActivityStore.entries()) {
    if (now - data.lastActivity > oneHour) {
      userActivityStore.delete(userId);
    }
  }
}, 600000);

/**
 * User rate limits - much stricter than IP limits
 */
export const USER_LIMITS = {
  free: {
    requestsPerMinute: 1000,
    requestsPerHour: 10000,
    requestsPerDay: 50000,
    productsPerDay: 5000, // Max unique products accessed
    uniqueEndpointsPerMinute: 500,
  },
  paid: {
    requestsPerMinute: 2000,
    requestsPerHour: 20000,
    requestsPerDay: 100000,
    productsPerDay: 10000,
    uniqueEndpointsPerMinute: 1000,
  },
};

/**
 * Track user API activity
 */
export function trackUserActivity(userId, endpoint, productSlug = null) {
  const now = Date.now();

  if (!userActivityStore.has(userId)) {
    userActivityStore.set(userId, {
      requests: [],
      endpoints: [],
      products: new Set(),
      lastActivity: now,
      dayStart: now,
    });
  }

  const data = userActivityStore.get(userId);

  // Reset daily counters
  if (now - data.dayStart > 86400000) {
    data.requests = [];
    data.endpoints = [];
    data.products = new Set();
    data.dayStart = now;
  }

  // Track this request
  data.requests.push(now);
  data.endpoints.push({ endpoint, time: now });
  if (productSlug) {
    data.products.add(productSlug);
  }
  data.lastActivity = now;

  // Clean old requests (keep last hour only)
  const oneHour = 3600000;
  data.requests = data.requests.filter(t => now - t < oneHour);
  data.endpoints = data.endpoints.filter(e => now - e.time < oneHour);

  return data;
}

/**
 * Check if user is rate limited
 */
export function checkUserRateLimit(userId, isPaid = false) {
  const limits = isPaid ? USER_LIMITS.paid : USER_LIMITS.free;
  const data = userActivityStore.get(userId);

  if (!data) {
    return { allowed: true, reason: null };
  }

  const now = Date.now();
  const oneMinute = 60000;
  const oneHour = 3600000;

  // Requests in last minute
  const requestsLastMinute = data.requests.filter(t => now - t < oneMinute).length;
  if (requestsLastMinute > limits.requestsPerMinute) {
    return {
      allowed: false,
      reason: "too_many_requests_minute",
      message: `Rate limit: ${limits.requestsPerMinute} requests/minute`,
      retryAfter: 60,
    };
  }

  // Requests in last hour
  const requestsLastHour = data.requests.filter(t => now - t < oneHour).length;
  if (requestsLastHour > limits.requestsPerHour) {
    return {
      allowed: false,
      reason: "too_many_requests_hour",
      message: `Rate limit: ${limits.requestsPerHour} requests/hour`,
      retryAfter: 3600,
    };
  }

  // Unique products accessed today
  if (data.products.size > limits.productsPerDay) {
    return {
      allowed: false,
      reason: "too_many_products",
      message: `Daily limit: ${limits.productsPerDay} unique products`,
      retryAfter: 86400,
    };
  }

  // Unique endpoints per minute (detects automated scanning)
  const endpointsLastMinute = new Set(
    data.endpoints
      .filter(e => now - e.time < oneMinute)
      .map(e => e.endpoint)
  ).size;

  if (endpointsLastMinute > limits.uniqueEndpointsPerMinute) {
    return {
      allowed: false,
      reason: "scanning_detected",
      message: "Unusual activity detected. Please slow down.",
      retryAfter: 300,
    };
  }

  return { allowed: true, reason: null };
}

/**
 * Detect scraping patterns
 */
export function detectScrapingBehavior(userId) {
  const data = userActivityStore.get(userId);
  if (!data) return { suspicious: false, reasons: [] };

  const reasons = [];
  const now = Date.now();
  const fiveMinutes = 300000;

  // Pattern 1: Sequential product access (scraping all products in order)
  // Legitimate users browse randomly, scrapers go in sequence

  // Pattern 2: Too consistent timing (bots have regular intervals)
  const recentRequests = data.requests.filter(t => now - t < fiveMinutes);
  if (recentRequests.length >= 10) {
    const intervals = [];
    for (let i = 1; i < recentRequests.length; i++) {
      intervals.push(recentRequests[i] - recentRequests[i-1]);
    }

    // Check if intervals are too consistent (within 500ms of each other)
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev < 500 && avgInterval < 5000) {
      reasons.push("bot_timing_pattern");
    }
  }

  // Pattern 3: Accessing too many unique products too fast
  const productsPerMinute = data.products.size / Math.max(1, (now - data.dayStart) / 60000);
  if (productsPerMinute > 2) {
    reasons.push("rapid_product_access");
  }

  // Pattern 4: Only API calls, no page views (would need frontend tracking)

  return {
    suspicious: reasons.length > 0,
    reasons,
    score: reasons.length,
  };
}

/**
 * Mark user as suspicious
 */
export function markUserSuspicious(userId, reason) {
  if (!suspiciousUsersStore.has(userId)) {
    suspiciousUsersStore.set(userId, {
      firstFlagged: Date.now(),
      reasons: [],
      strikes: 0,
    });
  }

  const data = suspiciousUsersStore.get(userId);
  data.reasons.push({ reason, time: Date.now() });
  data.strikes++;

  console.warn(`[SUSPICIOUS USER] ${userId} - ${reason} - Strikes: ${data.strikes}`);

  // Auto-block after 5 strikes
  if (data.strikes >= 5) {
    blockUser(userId, "auto_blocked_suspicious");
  }

  return data.strikes;
}

/**
 * Block a user
 */
export function blockUser(userId, reason) {
  blockedUsersStore.add(userId);
  console.error(`[BLOCKED USER] ${userId} - Reason: ${reason}`);
}

/**
 * Check if user is blocked
 */
export function isUserBlocked(userId) {
  return blockedUsersStore.has(userId);
}

/**
 * Get user's trust score (for gradual access)
 * New accounts start with low trust
 */
export function getUserTrustScore(user) {
  if (!user) return 0;

  let score = 0;

  // Account age (max 30 points)
  const createdAt = new Date(user.created_at || user.createdAt);
  const ageInDays = (Date.now() - createdAt.getTime()) / 86400000;
  score += Math.min(30, ageInDays);

  // Email verified (20 points)
  if (user.email_verified || user.emailVerified) {
    score += 20;
  }

  // Has paid (30 points)
  if (user.has_access || user.hasAccess) {
    score += 30;
  }

  // Not suspicious (20 points)
  if (!suspiciousUsersStore.has(user.id)) {
    score += 20;
  }

  return Math.min(100, score);
}

/**
 * Get data limit based on trust score
 */
export function getDataLimitForUser(user) {
  const trustScore = getUserTrustScore(user);

  if (trustScore >= 80) {
    // Trusted user - full access
    return {
      products: 100,
      incidents: 50,
      history: 24,
      canExport: true,
    };
  } else if (trustScore >= 50) {
    // Medium trust
    return {
      products: 30,
      incidents: 15,
      history: 6,
      canExport: false,
    };
  } else if (trustScore >= 20) {
    // Low trust (new account)
    return {
      products: 10,
      incidents: 5,
      history: 3,
      canExport: false,
    };
  } else {
    // Very new/suspicious account
    return {
      products: 5,
      incidents: 3,
      history: 1,
      canExport: false,
    };
  }
}

/**
 * Calculate artificial delay based on trust score and behavior
 * Scrapers hate waiting - this makes scraping painfully slow
 */
export function calculateArtificialDelay(user, scrapingScore = 0) {
  // Disabled for development - return 0
  return 0;
}

/**
 * Sleep helper for artificial delay
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Full protection check for authenticated requests
 */
export async function protectAuthenticatedRequest(userId, endpoint, options = {}) {
  const { productSlug = null, isPaid = false, user = null } = options;

  // Check if blocked
  if (isUserBlocked(userId)) {
    return {
      allowed: false,
      reason: "account_blocked",
      message: "Your account has been suspended. Contact support.",
      status: 403,
      delay: 0,
    };
  }

  // Track activity
  trackUserActivity(userId, endpoint, productSlug);

  // Check rate limit
  const rateLimit = checkUserRateLimit(userId, isPaid);
  if (!rateLimit.allowed) {
    markUserSuspicious(userId, rateLimit.reason);
    return {
      allowed: false,
      ...rateLimit,
      status: 429,
      delay: 0,
    };
  }

  // Check for scraping patterns
  const scraping = detectScrapingBehavior(userId);
  if (scraping.suspicious) {
    markUserSuspicious(userId, scraping.reasons.join(","));

    // Don't block immediately, just slow them down
    if (scraping.score >= 2) {
      return {
        allowed: false,
        reason: "suspicious_activity",
        message: "Unusual activity detected. Please wait before continuing.",
        retryAfter: 60,
        status: 429,
        delay: 0,
      };
    }
  }

  // Calculate artificial delay for this request
  const delay = calculateArtificialDelay(user, scraping.score);

  return { allowed: true, delay, scrapingScore: scraping.score };
}

/**
 * Quick delay for unauthenticated requests based on IP behavior
 */
export function calculatePublicDelay(clientId, isSuspicious = false) {
  // Disabled for development - return 0
  return 0;
}
