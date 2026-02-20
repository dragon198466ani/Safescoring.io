/**
 * Rate limiting for the autonomous chatbot
 * Uses Supabase to track usage per user
 */

import { supabase, isSupabaseConfigured } from "./supabase";

// Rate limits by plan (aligned with config.js plans)
// Free: Basic access
// Explorer ($19/mo): More generous limits
// Professional ($39/mo): High limits
// Enterprise ($499/mo): Unlimited
const RATE_LIMITS = {
  free: {
    daily: 10,
    perMinute: 3,
  },
  explorer: {
    daily: 50,
    perMinute: 5,
  },
  professional: {
    daily: 200,
    perMinute: 15,
  },
  enterprise: {
    daily: -1, // Unlimited
    perMinute: 30,
  },
  // Legacy alias for backwards compatibility
  pro: {
    daily: 200,
    perMinute: 15,
  },
};

// Cache for rate limit checks (in-memory, short-lived)
const rateLimitCache = new Map();
const CACHE_TTL = 5000; // 5 seconds

/**
 * Get user's current plan
 * @param {string} userId - User ID
 * @returns {Promise<string>} Plan name
 */
async function getUserPlan(userId) {
  if (!isSupabaseConfigured() || !userId) return "free";

  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("has_access, plan_type")
      .eq("id", userId)
      .single();

    if (error || !user) return "free";

    // Check for active subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan_type, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (subscription) {
      // Map plan_type to plan name (aligned with config.js)
      const planType = subscription.plan_type?.toLowerCase();
      if (planType?.includes("enterprise")) return "enterprise";
      if (planType?.includes("professional") || planType?.includes("pro")) return "professional";
      if (planType?.includes("explorer")) return "explorer";
    }

    // Fallback to user's plan_type
    if (user.plan_type) {
      const planType = user.plan_type.toLowerCase();
      if (planType.includes("enterprise")) return "enterprise";
      if (planType.includes("professional") || planType.includes("pro")) return "professional";
      if (planType.includes("explorer")) return "explorer";
    }

    return user.has_access ? "professional" : "free";
  } catch (error) {
    console.error("Error getting user plan:", error);
    return "free";
  }
}

/**
 * Get today's chat usage for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of messages today
 */
async function getDailyUsage(userId) {
  if (!isSupabaseConfigured() || !userId) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const { count, error } = await supabase
      .from("conversation_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("role", "user")
      .gte("created_at", today.toISOString());

    if (error) {
      console.error("Error getting daily usage:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("Error getting daily usage:", error);
    return 0;
  }
}

/**
 * Get recent minute usage for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of messages in last minute
 */
async function getMinuteUsage(userId) {
  if (!isSupabaseConfigured() || !userId) return 0;

  const oneMinuteAgo = new Date(Date.now() - 60000);

  try {
    const { count, error } = await supabase
      .from("conversation_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("role", "user")
      .gte("created_at", oneMinuteAgo.toISOString());

    if (error) {
      console.error("Error getting minute usage:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("Error getting minute usage:", error);
    return 0;
  }
}

/**
 * Check if user is rate limited
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Rate limit status
 */
export async function checkRateLimit(userId) {
  if (!userId) {
    return {
      allowed: false,
      reason: "unauthorized",
      remaining: 0,
      resetAt: null,
    };
  }

  // Check cache first
  const cacheKey = `rate_limit_${userId}`;
  const cached = rateLimitCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }

  // Get user's plan and limits
  const plan = await getUserPlan(userId);
  const limits = RATE_LIMITS[plan] || RATE_LIMITS.free;

  // Check per-minute limit first (more strict)
  const minuteUsage = await getMinuteUsage(userId);
  if (minuteUsage >= limits.perMinute) {
    const result = {
      allowed: false,
      reason: "rate_limit_minute",
      remaining: 0,
      resetAt: new Date(Date.now() + 60000),
      message: "Too many requests. Please wait a moment.",
      messageFr: "Trop de requêtes. Veuillez patienter un moment.",
    };
    rateLimitCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }

  // Check daily limit
  if (limits.daily > 0) {
    const dailyUsage = await getDailyUsage(userId);
    if (dailyUsage >= limits.daily) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const result = {
        allowed: false,
        reason: "rate_limit_daily",
        remaining: 0,
        resetAt: tomorrow,
        message: `Daily limit reached (${limits.daily} messages). Upgrade for more.`,
        messageFr: `Limite quotidienne atteinte (${limits.daily} messages). Passez à la version Pro.`,
      };
      rateLimitCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    }

    const result = {
      allowed: true,
      remaining: limits.daily - dailyUsage,
      plan,
      dailyLimit: limits.daily,
    };
    rateLimitCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }

  // Enterprise with unlimited
  const result = {
    allowed: true,
    remaining: -1, // Unlimited
    plan,
    dailyLimit: -1,
  };
  rateLimitCache.set(cacheKey, { result, timestamp: Date.now() });
  return result;
}

/**
 * Get remaining messages for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Usage stats
 */
export async function getRemainingMessages(userId) {
  if (!userId) {
    return { remaining: 0, limit: 0, plan: "free" };
  }

  const plan = await getUserPlan(userId);
  const limits = RATE_LIMITS[plan] || RATE_LIMITS.free;
  const dailyUsage = await getDailyUsage(userId);

  return {
    remaining: limits.daily > 0 ? Math.max(0, limits.daily - dailyUsage) : -1,
    used: dailyUsage,
    limit: limits.daily,
    plan,
  };
}

/**
 * Record a chat message for rate limiting
 * This is handled automatically when messages are saved to conversation_messages
 * This function can be used for additional tracking if needed
 */
export async function recordUsage(userId) {
  // Usage is tracked automatically via conversation_messages table
  // This function can be extended for additional analytics
  return true;
}

/**
 * Clear rate limit cache (for testing)
 */
export function clearRateLimitCache() {
  rateLimitCache.clear();
}

export default {
  checkRateLimit,
  getRemainingMessages,
  recordUsage,
  clearRateLimitCache,
  RATE_LIMITS,
};
