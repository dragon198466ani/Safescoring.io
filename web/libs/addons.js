/**
 * Add-ons System
 * Expansion revenue through additional purchasable features
 *
 * Add-on types:
 * - API Boost (more API calls)
 * - White Label Reports
 * - Custom Scoring
 * - Dedicated Support
 * - Extra Setups
 * - Team Seats
 * - Priority Alerts
 */

import { createClient } from "@supabase/supabase-js";
import { createCheckout } from "./lemonsqueezy";
import config from "@/config";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Available add-ons configuration
export const ADDONS = {
  api_boost: {
    id: "api_boost",
    name: "API Boost",
    description: "10,000 extra API calls per month",
    priceMonthly: 29,
    priceYearly: 290,
    features: [
      "10,000 additional API calls/month",
      "Priority API rate limits",
      "Webhook notifications",
    ],
    requiresPlan: ["professional", "enterprise"],
    variantId: process.env.LEMON_SQUEEZY_ADDON_API_BOOST_VARIANT_ID,
    limits: {
      additionalApiCalls: 10000,
    },
  },
  white_label: {
    id: "white_label",
    name: "White Label Reports",
    description: "Branded PDF reports with your logo",
    priceMonthly: 99,
    priceYearly: 990,
    features: [
      "Custom logo on all reports",
      "Remove SafeScoring branding",
      "Custom color scheme",
      "Client-ready exports",
    ],
    requiresPlan: ["professional", "enterprise"],
    variantId: process.env.LEMON_SQUEEZY_ADDON_WHITE_LABEL_VARIANT_ID,
    limits: {
      whiteLabel: true,
    },
  },
  custom_scoring: {
    id: "custom_scoring",
    name: "Custom Scoring Model",
    description: "Create your own scoring weights and criteria",
    priceMonthly: 199,
    priceYearly: 1990,
    features: [
      "Custom pillar weights",
      "Custom norm importance",
      "Save multiple scoring profiles",
      "Apply to all setups",
    ],
    requiresPlan: ["enterprise"],
    variantId: process.env.LEMON_SQUEEZY_ADDON_CUSTOM_SCORING_VARIANT_ID,
    limits: {
      customScoring: true,
    },
  },
  dedicated_support: {
    id: "dedicated_support",
    name: "Dedicated Support",
    description: "Priority support with dedicated Slack channel",
    priceMonthly: 149,
    priceYearly: 1490,
    features: [
      "Dedicated Slack channel",
      "4-hour response SLA",
      "Monthly check-in calls",
      "Priority feature requests",
    ],
    requiresPlan: ["professional", "enterprise"],
    variantId: process.env.LEMON_SQUEEZY_ADDON_SUPPORT_VARIANT_ID,
    limits: {
      prioritySupport: true,
    },
  },
  extra_setups_5: {
    id: "extra_setups_5",
    name: "5 Extra Setups",
    description: "Add 5 more security setups to your account",
    priceMonthly: 9,
    priceYearly: 90,
    features: [
      "5 additional security setups",
      "Same features as your plan",
      "Stack with multiple purchases",
    ],
    requiresPlan: ["explorer", "professional"],
    variantId: process.env.LEMON_SQUEEZY_ADDON_EXTRA_SETUPS_VARIANT_ID,
    stackable: true,
    limits: {
      additionalSetups: 5,
    },
  },
  team_seats_5: {
    id: "team_seats_5",
    name: "Team Pack (5 seats)",
    description: "Share access with 5 team members",
    priceMonthly: 49,
    priceYearly: 490,
    features: [
      "5 additional team members",
      "Shared setups and data",
      "Team admin dashboard",
      "Activity logs",
    ],
    requiresPlan: ["enterprise"],
    variantId: process.env.LEMON_SQUEEZY_ADDON_TEAM_SEATS_VARIANT_ID,
    stackable: true,
    limits: {
      additionalSeats: 5,
    },
  },
  priority_alerts: {
    id: "priority_alerts",
    name: "Priority Alerts",
    description: "Get alerts faster with priority processing",
    priceMonthly: 19,
    priceYearly: 190,
    features: [
      "Instant score change alerts",
      "Webhook delivery",
      "SMS notifications",
      "Custom alert rules",
    ],
    requiresPlan: ["explorer", "professional", "enterprise"],
    variantId: process.env.LEMON_SQUEEZY_ADDON_PRIORITY_ALERTS_VARIANT_ID,
    limits: {
      priorityAlerts: true,
    },
  },
};

/**
 * Get Supabase admin client
 */
function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase not configured");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Get available add-ons for a user based on their plan
 */
export async function getAvailableAddons(userId) {
  const supabase = getSupabaseAdmin();

  // Get user's plan
  const { data: user } = await supabase
    .from("users")
    .select("plan_type")
    .eq("id", userId)
    .single();

  const plan = user?.plan_type?.toLowerCase() || "free";

  // Get user's current add-ons
  const { data: userAddons } = await supabase
    .from("user_addons")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active");

  const activeAddonIds = userAddons?.map(a => a.addon_type) || [];

  // Filter available add-ons
  const available = Object.values(ADDONS).filter(addon => {
    // Check if plan is eligible
    if (!addon.requiresPlan.includes(plan)) {
      return false;
    }

    // Check if already purchased (unless stackable)
    if (!addon.stackable && activeAddonIds.includes(addon.id)) {
      return false;
    }

    return true;
  });

  return {
    available,
    active: userAddons || [],
    plan,
  };
}

/**
 * Get user's active add-ons with their limits
 */
export async function getUserAddonLimits(userId) {
  const supabase = getSupabaseAdmin();

  const { data: userAddons } = await supabase
    .from("user_addons")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active");

  if (!userAddons || userAddons.length === 0) {
    return {
      additionalApiCalls: 0,
      additionalSetups: 0,
      additionalSeats: 0,
      whiteLabel: false,
      customScoring: false,
      prioritySupport: false,
      priorityAlerts: false,
    };
  }

  // Aggregate limits from all add-ons
  const limits = {
    additionalApiCalls: 0,
    additionalSetups: 0,
    additionalSeats: 0,
    whiteLabel: false,
    customScoring: false,
    prioritySupport: false,
    priorityAlerts: false,
  };

  userAddons.forEach(addon => {
    const addonConfig = ADDONS[addon.addon_type];
    if (addonConfig?.limits) {
      Object.entries(addonConfig.limits).forEach(([key, value]) => {
        if (typeof value === "boolean") {
          limits[key] = limits[key] || value;
        } else if (typeof value === "number") {
          limits[key] = (limits[key] || 0) + value;
        }
      });
    }
  });

  return limits;
}

/**
 * Purchase add-on
 */
export async function purchaseAddon(userId, addonId, billingPeriod = "monthly") {
  const supabase = getSupabaseAdmin();

  const addon = ADDONS[addonId];
  if (!addon) {
    throw new Error("Add-on not found");
  }

  // Get user
  const { data: user } = await supabase
    .from("users")
    .select("email, plan_type")
    .eq("id", userId)
    .single();

  if (!user) {
    throw new Error("User not found");
  }

  // Verify plan eligibility
  if (!addon.requiresPlan.includes(user.plan_type?.toLowerCase())) {
    throw new Error(`This add-on requires ${addon.requiresPlan.join(" or ")} plan`);
  }

  // Check if already purchased (for non-stackable)
  if (!addon.stackable) {
    const { data: existing } = await supabase
      .from("user_addons")
      .select("id")
      .eq("user_id", userId)
      .eq("addon_type", addonId)
      .eq("status", "active")
      .single();

    if (existing) {
      throw new Error("You already have this add-on");
    }
  }

  // Create checkout URL
  const price = billingPeriod === "yearly" ? addon.priceYearly : addon.priceMonthly;

  const checkoutUrl = await createCheckout({
    variantId: addon.variantId,
    email: user.email,
    userId,
    successUrl: `${process.env.NEXT_PUBLIC_URL}/dashboard?addon_success=${addonId}`,
    cancelUrl: `${process.env.NEXT_PUBLIC_URL}/dashboard/addons`,
    customData: {
      type: "addon",
      addon_id: addonId,
      billing_period: billingPeriod,
    },
  });

  return { checkoutUrl, addon, price };
}

/**
 * Activate add-on (called from webhook)
 */
export async function activateAddon(userId, addonId, subscriptionId, billingPeriod = "monthly") {
  const supabase = getSupabaseAdmin();

  const addon = ADDONS[addonId];
  if (!addon) {
    throw new Error("Add-on not found");
  }

  const price = billingPeriod === "yearly" ? addon.priceYearly : addon.priceMonthly;

  // Calculate expiration
  const expiresAt = new Date();
  if (billingPeriod === "yearly") {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  } else {
    expiresAt.setMonth(expiresAt.getMonth() + 1);
  }

  const { data: userAddon, error } = await supabase
    .from("user_addons")
    .insert({
      user_id: userId,
      addon_type: addonId,
      addon_name: addon.name,
      price_monthly: addon.priceMonthly,
      price_yearly: addon.priceYearly,
      billing_period: billingPeriod,
      status: "active",
      lemon_squeezy_subscription_id: subscriptionId,
      activated_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error activating add-on:", error);
    throw error;
  }

  return userAddon;
}

/**
 * Cancel add-on
 */
export async function cancelAddon(userId, addonId) {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("user_addons")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("addon_type", addonId)
    .eq("status", "active");

  if (error) {
    console.error("Error cancelling add-on:", error);
    throw error;
  }

  return { success: true };
}

/**
 * Get add-on revenue statistics
 */
export async function getAddonStats() {
  const supabase = getSupabaseAdmin();

  const { data: addons } = await supabase
    .from("user_addons")
    .select("*")
    .eq("status", "active");

  if (!addons || addons.length === 0) {
    return {
      totalActive: 0,
      totalMrr: 0,
      byType: {},
    };
  }

  const stats = {
    totalActive: addons.length,
    totalMrr: 0,
    byType: {},
  };

  addons.forEach(addon => {
    // Calculate MRR
    const mrr = addon.billing_period === "yearly"
      ? addon.price_yearly / 12
      : addon.price_monthly;
    stats.totalMrr += mrr;

    // Count by type
    if (!stats.byType[addon.addon_type]) {
      stats.byType[addon.addon_type] = { count: 0, mrr: 0 };
    }
    stats.byType[addon.addon_type].count++;
    stats.byType[addon.addon_type].mrr += mrr;
  });

  stats.totalMrr = Math.round(stats.totalMrr * 100) / 100;

  return stats;
}

/**
 * Check if user has specific add-on
 */
export async function hasAddon(userId, addonId) {
  const supabase = getSupabaseAdmin();

  const { data } = await supabase
    .from("user_addons")
    .select("id")
    .eq("user_id", userId)
    .eq("addon_type", addonId)
    .eq("status", "active")
    .single();

  return !!data;
}

/**
 * Get recommended add-ons based on user usage
 */
export async function getRecommendedAddons(userId) {
  const supabase = getSupabaseAdmin();

  // Get user's usage data
  const { data: usage } = await supabase
    .from("feature_usage")
    .select("*")
    .eq("user_id", userId)
    .single();

  // Get user's current add-ons
  const { data: userAddons } = await supabase
    .from("user_addons")
    .select("addon_type")
    .eq("user_id", userId)
    .eq("status", "active");

  const activeAddonIds = userAddons?.map(a => a.addon_type) || [];

  const recommendations = [];

  // Recommend API boost if using lots of API
  if (usage?.api_calls_this_month > 500 && !activeAddonIds.includes("api_boost")) {
    recommendations.push({
      addon: ADDONS.api_boost,
      reason: "You're using a lot of API calls - boost your limit",
      priority: "high",
    });
  }

  // Recommend priority alerts if using alerts
  if (usage?.total_comparisons > 20 && !activeAddonIds.includes("priority_alerts")) {
    recommendations.push({
      addon: ADDONS.priority_alerts,
      reason: "Stay ahead with instant score change alerts",
      priority: "medium",
    });
  }

  // Recommend extra setups if approaching limit
  const { count: setupCount } = await supabase
    .from("user_setups")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (setupCount >= 4 && !activeAddonIds.includes("extra_setups_5")) {
    recommendations.push({
      addon: ADDONS.extra_setups_5,
      reason: "You're almost at your setup limit",
      priority: "high",
    });
  }

  return recommendations;
}

export default {
  getAvailableAddons,
  getUserAddonLimits,
  purchaseAddon,
  activateAddon,
  cancelAddon,
  getAddonStats,
  hasAddon,
  getRecommendedAddons,
  ADDONS,
};
