/**
 * Centralized Configuration Constants
 * Single source of truth for all configuration values
 *
 * NEVER hardcode these values elsewhere - always import from this file
 */

// =============================================================================
// DOMAIN & URLs
// =============================================================================

export const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || "safescoring.io";
export const BASE_URL = process.env.NEXT_PUBLIC_URL || `https://${DOMAIN}`;
export const API_BASE_URL = `${BASE_URL}/api`;

// Allowed origins for CORS/CSRF
export const ALLOWED_ORIGINS = [
  BASE_URL,
  `https://${DOMAIN}`,
  `https://www.${DOMAIN}`,
  process.env.NEXTAUTH_URL,
  // Development
  ...(process.env.NODE_ENV === "development" ? [
    "http://localhost:3000",
    "http://localhost:3001",
  ] : []),
].filter(Boolean);

// =============================================================================
// PLAN CONFIGURATION (Single Source of Truth)
// =============================================================================

export const PLAN_CODES = {
  FREE: "free",
  EXPLORER: "explorer",
  PROFESSIONAL: "professional",
  ENTERPRISE: "enterprise",
};

export const PLAN_HIERARCHY = {
  [PLAN_CODES.FREE]: 0,
  [PLAN_CODES.EXPLORER]: 1,
  [PLAN_CODES.PROFESSIONAL]: 2,
  [PLAN_CODES.ENTERPRISE]: 3,
};

export const PLAN_LIMITS = {
  [PLAN_CODES.FREE]: {
    monthlyProductViews: -1, // unlimited
    maxSetups: 1,
    maxProductsPerSetup: 3,
    maxScoringSetups: 1,
    apiAccess: false,
    exportPDF: false,
    alerts: false,
    whiteLabel: false,
    // API limits (if they somehow get access)
    apiDailyLimit: 0,
    apiMonthlyLimit: 0,
    apiRatePerMinute: 0,
  },
  [PLAN_CODES.EXPLORER]: {
    monthlyProductViews: -1,
    maxSetups: 5,
    maxProductsPerSetup: 5,
    maxScoringSetups: 3,
    apiAccess: false, // No API access
    exportPDF: true,
    alerts: true,
    whiteLabel: false,
    // API limits
    apiDailyLimit: 0,
    apiMonthlyLimit: 0,
    apiRatePerMinute: 0,
  },
  [PLAN_CODES.PROFESSIONAL]: {
    monthlyProductViews: -1,
    maxSetups: 20,
    maxProductsPerSetup: 10,
    maxScoringSetups: 3,
    apiAccess: true,
    exportPDF: true,
    alerts: true,
    whiteLabel: false,
    // API limits - 1,000 req/day, 20,000 req/month
    apiDailyLimit: 1000,
    apiMonthlyLimit: 20000,
    apiRatePerMinute: 30,
  },
  [PLAN_CODES.ENTERPRISE]: {
    monthlyProductViews: -1,
    maxSetups: -1, // unlimited
    maxProductsPerSetup: -1, // unlimited
    maxScoringSetups: -1, // unlimited
    apiAccess: true,
    exportPDF: true,
    alerts: true,
    whiteLabel: true,
    // API limits - unlimited
    apiDailyLimit: -1, // unlimited
    apiMonthlyLimit: -1, // unlimited
    apiRatePerMinute: 100,
  },
};

// =============================================================================
// API TIER CONFIGURATION (for usage-based billing)
// =============================================================================

export const API_TIERS = {
  free: {
    name: "Free",
    dailyLimit: 100,
    monthlyLimit: 1000,
    ratePerMinute: 10,
    price: 0,
    overage: null, // No overage allowed
  },
  starter: {
    name: "Starter",
    dailyLimit: 500,
    monthlyLimit: 10000,
    ratePerMinute: 20,
    price: 29,
    overage: { per1000: 5 }, // $5 per 1,000 extra requests
  },
  professional: {
    name: "Professional",
    dailyLimit: 1000,
    monthlyLimit: 20000,
    ratePerMinute: 30,
    price: 0, // Included with Professional plan
    overage: { per1000: 3 }, // $3 per 1,000 extra requests
  },
  enterprise: {
    name: "Enterprise",
    dailyLimit: -1, // unlimited
    monthlyLimit: -1, // unlimited
    ratePerMinute: 100,
    price: 0, // Included with Enterprise plan
    overage: null, // No limits
  },
  agent: {
    name: "Agent (Pay-per-query)",
    dailyLimit: -1,
    monthlyLimit: -1,
    ratePerMinute: 60,
    price: 0,
    queryPriceUSDC: 0.01,
    analysisPriceUSDC: 0.10,
    batchPriceUSDC: 0.005,
  },
};

/**
 * Get API tier config by tier name
 */
export function getApiTierConfig(tierName) {
  return API_TIERS[tierName?.toLowerCase()] || API_TIERS.free;
}

// =============================================================================
// RATE LIMITING CONFIGURATION
// =============================================================================

const isProduction = process.env.NODE_ENV === "production";

export const RATE_LIMITS = {
  // Public APIs - STRICT anti-scraping limits
  public: {
    windowMs: 60000, // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_PUBLIC) || (isProduction ? 30 : 1000), // 30 req/min = anti-scraping
    blockDuration: isProduction ? 600000 : 0, // 10 min block in production
  },
  // Authenticated APIs
  authenticated: {
    windowMs: 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_AUTHENTICATED) || (isProduction ? 120 : 2000), // 120 req/min
    blockDuration: isProduction ? 300000 : 0,
  },
  // Sensitive APIs (history, bulk data, DNS verification)
  sensitive: {
    windowMs: 60000,
    maxRequests: isProduction ? 20 : 500, // 20 req/min max
    blockDuration: isProduction ? 900000 : 0, // 15 min block
  },
  // Admin APIs
  admin: {
    windowMs: 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_ADMIN) || (isProduction ? 200 : 1000),
    blockDuration: isProduction ? 300000 : 0,
  },
  // Search/query APIs
  search: {
    windowMs: 60000,
    maxRequests: isProduction ? 60 : 500,
    blockDuration: isProduction ? 300000 : 0,
  },
  // API v1 (external)
  api: {
    windowMs: 60000,
    maxRequests: isProduction ? 60 : 500,
    blockDuration: isProduction ? 600000 : 0,
  },
};

// =============================================================================
// CACHE TTL CONFIGURATION (in milliseconds)
// =============================================================================

export const CACHE_TTL = {
  // Short-lived (real-time data)
  CRYPTO_PRICES: 60 * 1000, // 1 minute
  USER_PRESENCE: 30 * 1000, // 30 seconds

  // Medium-lived
  API_DEFAULT: 5 * 60 * 1000, // 5 minutes
  PRODUCT_LIST: 5 * 60 * 1000, // 5 minutes
  SEARCH_RESULTS: 5 * 60 * 1000, // 5 minutes

  // Long-lived
  PRODUCT_DETAILS: 30 * 60 * 1000, // 30 minutes
  STATS: 60 * 60 * 1000, // 1 hour
  STALE_WHILE_REVALIDATE: 60 * 60 * 1000, // 1 hour

  // Very long-lived
  STATIC_CONTENT: 24 * 60 * 60 * 1000, // 24 hours
  IMAGE_OPTIMIZATION: 30 * 24 * 60 * 60 * 1000, // 30 days
};

// =============================================================================
// PAGINATION DEFAULTS
// =============================================================================

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  LEADERBOARD_SIZE: 50,
  SEARCH_LIMIT: 50,
};

// =============================================================================
// SCORE TIER CONFIGURATION (Full / Consumer / Essential)
// =============================================================================

export const SCORE_TIERS = {
  full: {
    id: "full",
    label: "Full",
    labelKey: "productsPage.scoreTypes.full",
    descKey: "productsPage.scoreTypes.fullDesc",
    explanationKey: "productsPage.scoreTypeExplanations.full",
    normPercentage: 100,
    description: "Complete evaluation with all norms",
    /** Map from tier field names to DB column names in safe_scoring_results */
    dbFields: {
      total: "note_finale",
      s: "score_s",
      a: "score_a",
      f: "score_f",
      e: "score_e",
    },
    /** Keys used in API response objects */
    apiScoreKey: "scores",
  },
  consumer: {
    id: "consumer",
    label: "Consumer",
    labelKey: "productsPage.scoreTypes.consumer",
    descKey: "productsPage.scoreTypes.consumerDesc",
    explanationKey: "productsPage.scoreTypeExplanations.consumer",
    normPercentage: 38,
    description: "Important norms for general public users",
    dbFields: {
      total: "note_consumer",
      s: "s_consumer",
      a: "a_consumer",
      f: "f_consumer",
      e: "e_consumer",
    },
    apiScoreKey: "consumerScores",
  },
  essential: {
    id: "essential",
    label: "Essential",
    labelKey: "productsPage.scoreTypes.essential",
    descKey: "productsPage.scoreTypes.essentialDesc",
    explanationKey: "productsPage.scoreTypeExplanations.essential",
    normPercentage: 17,
    description: "Critical norms for basic security",
    dbFields: {
      total: "note_essential",
      s: "s_essential",
      a: "a_essential",
      f: "f_essential",
      e: "e_essential",
    },
    apiScoreKey: "essentialScores",
  },
};

export const SCORE_TIER_IDS = ["full", "consumer", "essential"];

/**
 * Get score tier config by ID
 * @param {string} tierId - "full", "consumer", or "essential"
 * @returns {Object} Tier config object
 */
export function getScoreTier(tierId) {
  return SCORE_TIERS[tierId?.toLowerCase()] || SCORE_TIERS.full;
}

// =============================================================================
// SAFE PILLARS CONFIGURATION
// =============================================================================

export const PILLARS = {
  S: {
    code: "S",
    name: "Security",
    description: "Cryptographic foundations",
    color: "#22c55e", // green
  },
  A: {
    code: "A",
    name: "Adversity",
    description: "Protection vs human adversaries", // INTENTIONAL attacks (theft, coercion, surveillance)
    color: "#f59e0b", // amber
  },
  F: {
    code: "F",
    name: "Fidelity",
    description: "Durability & reliability over time", // NON-INTENTIONAL (wear, accidents, failures)
    color: "#3b82f6", // blue
  },
  E: {
    code: "E",
    name: "Efficiency",
    description: "Usability & performance",
    color: "#8b5cf6", // purple
  },
};

// =============================================================================
// SCORE THRESHOLDS
// =============================================================================

export const SCORE_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 60,
  AVERAGE: 40,
  POOR: 20,
};

// =============================================================================
// API EXTERNAL ENDPOINTS
// =============================================================================

export const EXTERNAL_APIS = {
  LEMON_SQUEEZY: "https://api.lemonsqueezy.com/v1",
  NOWPAYMENTS: "https://api.nowpayments.io/v1",
  COINGECKO: "https://api.coingecko.com/api/v3",
};

// =============================================================================
// CONTRACT ADDRESSES (Blockchain)
// =============================================================================

export const CONTRACT_ADDRESSES = {
  // Polygon Mainnet
  137: {
    SAFEPASS_NFT: process.env.NEXT_PUBLIC_SAFEPASS_NFT_ADDRESS,
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  },
  // Polygon Amoy (Testnet)
  80002: {
    SAFEPASS_NFT: process.env.NEXT_PUBLIC_SAFEPASS_NFT_ADDRESS_TESTNET,
    USDC: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get plan limits by plan code
 */
export function getPlanLimits(planCode) {
  return PLAN_LIMITS[planCode?.toLowerCase()] || PLAN_LIMITS[PLAN_CODES.FREE];
}

/**
 * Get plan level (for comparison)
 */
export function getPlanLevel(planCode) {
  return PLAN_HIERARCHY[planCode?.toLowerCase()] ?? 0;
}

/**
 * Check if plan A is higher than plan B
 */
export function isPlanHigher(planA, planB) {
  return getPlanLevel(planA) > getPlanLevel(planB);
}

/**
 * Get rate limit config by type
 */
export function getRateLimitConfig(type = "public") {
  return RATE_LIMITS[type] || RATE_LIMITS.public;
}

/**
 * Get pillar by code
 */
export function getPillar(code) {
  return PILLARS[code?.toUpperCase()] || null;
}

/**
 * Get score category
 */
export function getScoreCategory(score) {
  if (score >= SCORE_THRESHOLDS.EXCELLENT) return "excellent";
  if (score >= SCORE_THRESHOLDS.GOOD) return "good";
  if (score >= SCORE_THRESHOLDS.AVERAGE) return "average";
  if (score >= SCORE_THRESHOLDS.POOR) return "poor";
  return "critical";
}

// =============================================================================
// SAFEGUARD AGENT BUNDLES (Subscription Boxes)
// =============================================================================

export const SAFEGUARD_BUNDLES = {
  sentinel: {
    name: "SafeGuard Sentinel",
    description: "Real-time monitoring for your portfolio",
    price: 29,
    interval: "month",
    agents: ["ray_donovan"],
    features: [
      "Score change alerts (email + telegram)",
      "Incident monitoring for 10 products",
      "Weekly security digest",
      "5 instant audits/month",
    ],
    queryLimit: 500,
    monitoringSlots: 10,
  },
  guardian: {
    name: "SafeGuard Guardian",
    description: "Pre-transaction security gatekeeper",
    price: 49,
    interval: "month",
    agents: ["ray_donovan", "donna"],
    features: [
      "Everything in Sentinel",
      "Pre-transaction checks (Agent Donna)",
      "Risk assessment before swaps/deposits",
      "25 products monitored",
      "20 instant audits/month",
      "Webhook integrations",
    ],
    queryLimit: 2000,
    monitoringSlots: 25,
  },
  advisor: {
    name: "SafeGuard Advisor",
    description: "Full security advisory suite",
    price: 99,
    interval: "month",
    agents: ["ray_donovan", "donna", "courtier"],
    features: [
      "Everything in Guardian",
      "Fee optimization (Agent Courtier)",
      "Portfolio risk analysis",
      "Unlimited products monitored",
      "Unlimited audits",
      "Priority API access",
      "Custom alert rules",
      "PDF reports",
    ],
    queryLimit: -1, // unlimited
    monitoringSlots: -1, // unlimited
  },
};

/**
 * Get SafeGuard bundle by key
 */
export function getSafeGuardBundle(key) {
  return SAFEGUARD_BUNDLES[key?.toLowerCase()] || null;
}

export default {
  DOMAIN,
  BASE_URL,
  API_BASE_URL,
  ALLOWED_ORIGINS,
  PLAN_CODES,
  PLAN_HIERARCHY,
  PLAN_LIMITS,
  RATE_LIMITS,
  API_TIERS,
  CACHE_TTL,
  PAGINATION,
  PILLARS,
  SCORE_TIERS,
  SCORE_TIER_IDS,
  SCORE_THRESHOLDS,
  EXTERNAL_APIS,
  CONTRACT_ADDRESSES,
  SAFEGUARD_BUNDLES,
  getPlanLimits,
  getPlanLevel,
  isPlanHigher,
  getRateLimitConfig,
  getApiTierConfig,
  getScoreTier,
  getPillar,
  getScoreCategory,
  getSafeGuardBundle,
};
