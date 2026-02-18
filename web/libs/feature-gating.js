/**
 * Feature Gating System
 * Intelligent feature access control with upgrade triggers
 *
 * Usage:
 * const { canAccess, limitInfo } = await checkFeatureAccess(userId, 'comparison');
 * if (!canAccess) {
 *   // Show upgrade modal with limitInfo
 * }
 */

import { createClient } from "@supabase/supabase-js";
import { PLAN_LIMITS, PLAN_CODES, getPlanLimits } from "./config-constants";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Feature limits by plan (monthly limits for gated features)
export const FEATURE_LIMITS = {
  [PLAN_CODES.FREE]: {
    comparisons: 1, // per day
    scoreDetails: 3, // per month
    pdfExports: 0,
    apiCalls: 0,
    historyDays: 7,
    alertsEnabled: false,
  },
  [PLAN_CODES.EXPLORER]: {
    comparisons: 10, // per day
    scoreDetails: -1, // unlimited
    pdfExports: 3, // per month
    apiCalls: 0,
    historyDays: 90,
    alertsEnabled: true,
  },
  [PLAN_CODES.PROFESSIONAL]: {
    comparisons: -1, // unlimited
    scoreDetails: -1,
    pdfExports: -1,
    apiCalls: 1000, // per day
    historyDays: 365,
    alertsEnabled: true,
  },
  [PLAN_CODES.ENTERPRISE]: {
    comparisons: -1,
    scoreDetails: -1,
    pdfExports: -1,
    apiCalls: -1,
    historyDays: -1, // unlimited
    alertsEnabled: true,
  },
};

// Upgrade messages by trigger type
export const UPGRADE_MESSAGES = {
  comparison_limit: {
    title: "Comparison Limit Reached",
    message: "Upgrade to compare unlimited products side-by-side",
    cta: "Unlock Unlimited Comparisons",
    suggestedPlan: "explorer",
  },
  score_detail_limit: {
    title: "Score Details Locked",
    message: "Get full S/A/F/E breakdowns for every product",
    cta: "Unlock Full Score Details",
    suggestedPlan: "explorer",
  },
  pdf_export_limit: {
    title: "PDF Export Locked",
    message: "Export professional security reports for your records",
    cta: "Enable PDF Exports",
    suggestedPlan: "explorer",
  },
  setup_limit: {
    title: "Setup Limit Reached",
    message: "Manage more crypto stacks with Explorer",
    cta: "Add More Setups",
    suggestedPlan: "explorer",
  },
  products_per_setup_limit: {
    title: "Product Limit Reached",
    message: "Add more products to your security setup",
    cta: "Expand Your Setup",
    suggestedPlan: "explorer",
  },
  api_access: {
    title: "API Access Required",
    message: "Integrate SafeScoring data into your applications",
    cta: "Get API Access",
    suggestedPlan: "professional",
  },
  history_limit: {
    title: "History Limited",
    message: "Track score changes over longer periods",
    cta: "Unlock Full History",
    suggestedPlan: "explorer",
  },
  alerts_locked: {
    title: "Alerts Locked",
    message: "Get notified when product scores change",
    cta: "Enable Alerts",
    suggestedPlan: "explorer",
  },
  white_label: {
    title: "White Label Required",
    message: "Create branded reports for your clients",
    cta: "Go Enterprise",
    suggestedPlan: "enterprise",
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
 * Check if user can access a specific feature
 *
 * @param {string} userId - User ID
 * @param {string} feature - Feature name (comparison, scoreDetail, pdfExport, etc.)
 * @param {object} options - Additional options
 * @returns {Promise<object>} Access result with limit info
 */
export async function checkFeatureAccess(userId, feature, options = {}) {
  const supabase = getSupabaseAdmin();

  // Get user's plan
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("plan_type, has_access")
    .eq("id", userId)
    .single();

  if (userError || !user) {
    return {
      canAccess: false,
      reason: "user_not_found",
      upgradeInfo: UPGRADE_MESSAGES.comparison_limit,
    };
  }

  const plan = user.plan_type?.toLowerCase() || PLAN_CODES.FREE;
  const limits = FEATURE_LIMITS[plan] || FEATURE_LIMITS[PLAN_CODES.FREE];
  const planLimits = getPlanLimits(plan);

  // Get current usage
  const { data: usage } = await supabase
    .from("feature_usage")
    .select("*")
    .eq("user_id", userId)
    .single();

  // Check feature-specific limits
  let canAccess = true;
  let currentUsage = 0;
  let limit = -1;
  let triggerType = null;

  switch (feature) {
    case "comparison":
      limit = limits.comparisons;
      currentUsage = usage?.comparisons_this_month || 0;
      // For daily limit, check today's comparisons
      if (limit > 0 && currentUsage >= limit) {
        canAccess = false;
        triggerType = "comparison_limit";
      }
      break;

    case "scoreDetail":
      limit = limits.scoreDetails;
      currentUsage = usage?.score_details_this_month || 0;
      if (limit >= 0 && currentUsage >= limit) {
        canAccess = false;
        triggerType = "score_detail_limit";
      }
      break;

    case "pdfExport":
      limit = limits.pdfExports;
      currentUsage = usage?.pdf_exports_this_month || 0;
      if (limit === 0) {
        canAccess = false;
        triggerType = "pdf_export_limit";
      } else if (limit > 0 && currentUsage >= limit) {
        canAccess = false;
        triggerType = "pdf_export_limit";
      }
      break;

    case "setup":
      limit = planLimits.maxSetups;
      // Get current setup count
      const { count: setupCount } = await supabase
        .from("user_setups")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      currentUsage = setupCount || 0;
      if (limit > 0 && currentUsage >= limit) {
        canAccess = false;
        triggerType = "setup_limit";
      }
      break;

    case "productsPerSetup":
      limit = planLimits.maxProductsPerSetup;
      currentUsage = options.currentProducts || 0;
      if (limit > 0 && currentUsage >= limit) {
        canAccess = false;
        triggerType = "products_per_setup_limit";
      }
      break;

    case "api":
      canAccess = planLimits.apiAccess;
      if (!canAccess) {
        triggerType = "api_access";
      }
      break;

    case "alerts":
      canAccess = limits.alertsEnabled;
      if (!canAccess) {
        triggerType = "alerts_locked";
      }
      break;

    case "whiteLabel":
      canAccess = planLimits.whiteLabel;
      if (!canAccess) {
        triggerType = "white_label";
      }
      break;

    case "history":
      limit = limits.historyDays;
      const requestedDays = options.days || 30;
      if (limit > 0 && requestedDays > limit) {
        canAccess = false;
        triggerType = "history_limit";
      }
      break;

    default:
      canAccess = true;
  }

  // Track feature access attempt
  if (!canAccess) {
    await trackUpgradeEvent(supabase, userId, triggerType, {
      feature,
      currentUsage,
      limit,
      plan,
    });
  }

  return {
    canAccess,
    feature,
    currentUsage,
    limit,
    remaining: limit < 0 ? -1 : Math.max(0, limit - currentUsage),
    plan,
    triggerType,
    upgradeInfo: triggerType ? UPGRADE_MESSAGES[triggerType] : null,
  };
}

/**
 * Track feature usage and check limits
 */
export async function trackFeatureUsage(userId, feature) {
  const supabase = getSupabaseAdmin();

  // Call database function to track usage
  const { data, error } = await supabase.rpc("track_feature_usage", {
    p_user_id: userId,
    p_feature: feature,
    p_increment: 1,
  });

  if (error) {
    console.error("Error tracking feature usage:", error);
    return { success: false, error };
  }

  return { success: true, ...data };
}

/**
 * Track upgrade prompt event
 */
async function trackUpgradeEvent(supabase, userId, triggerType, context) {
  try {
    await supabase.from("upsell_events").insert({
      user_id: userId,
      trigger_type: triggerType,
      trigger_context: context,
      modal_shown: false,
    });
  } catch (error) {
    console.error("Error tracking upgrade event:", error);
  }
}

/**
 * Record that upgrade modal was shown
 */
export async function recordUpgradeModalShown(userId, eventId) {
  const supabase = getSupabaseAdmin();

  await supabase
    .from("upsell_events")
    .update({
      modal_shown: true,
      modal_shown_at: new Date().toISOString(),
    })
    .eq("id", eventId)
    .eq("user_id", userId);
}

/**
 * Record upgrade modal response
 */
export async function recordUpgradeResponse(userId, eventId, response, convertedPlan = null) {
  const supabase = getSupabaseAdmin();

  const updateData = {
    response,
    responded_at: new Date().toISOString(),
  };

  if (convertedPlan) {
    updateData.converted_to_plan = convertedPlan;
  }

  await supabase
    .from("upsell_events")
    .update(updateData)
    .eq("id", eventId)
    .eq("user_id", userId);
}

/**
 * Get user's current usage summary
 */
export async function getUserUsageSummary(userId) {
  const supabase = getSupabaseAdmin();

  // Get user plan
  const { data: user } = await supabase
    .from("users")
    .select("plan_type")
    .eq("id", userId)
    .single();

  const plan = user?.plan_type?.toLowerCase() || PLAN_CODES.FREE;
  const limits = FEATURE_LIMITS[plan] || FEATURE_LIMITS[PLAN_CODES.FREE];
  const planLimits = getPlanLimits(plan);

  // Get current usage
  const { data: usage } = await supabase
    .from("feature_usage")
    .select("*")
    .eq("user_id", userId)
    .single();

  // Get setup count
  const { count: setupCount } = await supabase
    .from("user_setups")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  return {
    plan,
    usage: {
      comparisons: {
        used: usage?.comparisons_this_month || 0,
        limit: limits.comparisons,
        remaining: limits.comparisons < 0 ? -1 : Math.max(0, limits.comparisons - (usage?.comparisons_this_month || 0)),
      },
      scoreDetails: {
        used: usage?.score_details_this_month || 0,
        limit: limits.scoreDetails,
        remaining: limits.scoreDetails < 0 ? -1 : Math.max(0, limits.scoreDetails - (usage?.score_details_this_month || 0)),
      },
      pdfExports: {
        used: usage?.pdf_exports_this_month || 0,
        limit: limits.pdfExports,
        remaining: limits.pdfExports < 0 ? -1 : Math.max(0, limits.pdfExports - (usage?.pdf_exports_this_month || 0)),
      },
      setups: {
        used: setupCount || 0,
        limit: planLimits.maxSetups,
        remaining: planLimits.maxSetups < 0 ? -1 : Math.max(0, planLimits.maxSetups - (setupCount || 0)),
      },
    },
    features: {
      apiAccess: planLimits.apiAccess,
      alerts: limits.alertsEnabled,
      whiteLabel: planLimits.whiteLabel,
      historyDays: limits.historyDays,
    },
  };
}

/**
 * Check if user is approaching limits (for proactive upsell)
 */
export async function checkApproachingLimits(userId) {
  const summary = await getUserUsageSummary(userId);
  const warnings = [];

  // Check each usage category
  for (const [key, data] of Object.entries(summary.usage)) {
    if (data.limit > 0) {
      const percentUsed = (data.used / data.limit) * 100;
      if (percentUsed >= 80) {
        warnings.push({
          feature: key,
          percentUsed,
          remaining: data.remaining,
          message: `You've used ${percentUsed.toFixed(0)}% of your ${key} limit`,
        });
      }
    }
  }

  return {
    hasWarnings: warnings.length > 0,
    warnings,
    summary,
  };
}

export default {
  checkFeatureAccess,
  trackFeatureUsage,
  getUserUsageSummary,
  checkApproachingLimits,
  recordUpgradeModalShown,
  recordUpgradeResponse,
  FEATURE_LIMITS,
  UPGRADE_MESSAGES,
};
