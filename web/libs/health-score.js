/**
 * User Health Score System
 * Proactive churn prevention through engagement tracking
 *
 * Health Score (0-100):
 * - 80-100: Healthy (green) - Upsell opportunities
 * - 60-79: At Risk (yellow) - Engagement emails
 * - 40-59: Danger (orange) - Personal outreach
 * - 0-39: Critical (red) - Retention offer + call
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Health score weights
const HEALTH_WEIGHTS = {
  // Positive signals
  loginThisWeek: 20,
  loginThisMonth: 10,
  setupModifiedThisMonth: 15,
  comparisonMade: 10,
  alertOpened: 10,
  pdfExported: 5,
  apiUsed: 5,

  // Negative signals
  noLogin7Days: -15,
  noLogin14Days: -30,
  noLogin30Days: -40,
  supportTicketOpen: -10,
  paymentFailed: -40,
};

// Status thresholds
export const HEALTH_STATUS = {
  HEALTHY: { min: 80, max: 100, color: "green", action: "upsell" },
  AT_RISK: { min: 60, max: 79, color: "yellow", action: "engagement_email" },
  DANGER: { min: 40, max: 59, color: "orange", action: "personal_outreach" },
  CRITICAL: { min: 0, max: 39, color: "red", action: "retention_offer" },
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
 * Calculate health score for a user
 */
export async function calculateHealthScore(userId) {
  const supabase = getSupabaseAdmin();

  // Get user data
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, last_login_at, plan_type, has_access, created_at")
    .eq("id", userId)
    .single();

  if (userError || !user) {
    return { score: 0, status: "critical", error: "User not found" };
  }

  let score = 50; // Base score
  const now = new Date();
  const signals = [];

  // Check last login
  if (user.last_login_at) {
    const lastLogin = new Date(user.last_login_at);
    const daysSinceLogin = Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24));

    if (daysSinceLogin <= 7) {
      score += HEALTH_WEIGHTS.loginThisWeek;
      signals.push({ signal: "loginThisWeek", impact: HEALTH_WEIGHTS.loginThisWeek });
    } else if (daysSinceLogin <= 30) {
      score += HEALTH_WEIGHTS.loginThisMonth;
      signals.push({ signal: "loginThisMonth", impact: HEALTH_WEIGHTS.loginThisMonth });
    }

    // Negative signals for inactivity
    if (daysSinceLogin > 30) {
      score += HEALTH_WEIGHTS.noLogin30Days;
      signals.push({ signal: "noLogin30Days", impact: HEALTH_WEIGHTS.noLogin30Days });
    } else if (daysSinceLogin > 14) {
      score += HEALTH_WEIGHTS.noLogin14Days;
      signals.push({ signal: "noLogin14Days", impact: HEALTH_WEIGHTS.noLogin14Days });
    } else if (daysSinceLogin > 7) {
      score += HEALTH_WEIGHTS.noLogin7Days;
      signals.push({ signal: "noLogin7Days", impact: HEALTH_WEIGHTS.noLogin7Days });
    }
  } else {
    // Never logged in - critical
    score += HEALTH_WEIGHTS.noLogin30Days;
    signals.push({ signal: "neverLoggedIn", impact: HEALTH_WEIGHTS.noLogin30Days });
  }

  // Check feature usage
  const { data: usage } = await supabase
    .from("feature_usage")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (usage) {
    if (usage.comparisons_this_month > 0) {
      score += HEALTH_WEIGHTS.comparisonMade;
      signals.push({ signal: "comparisonMade", impact: HEALTH_WEIGHTS.comparisonMade });
    }
    if (usage.pdf_exports_this_month > 0) {
      score += HEALTH_WEIGHTS.pdfExported;
      signals.push({ signal: "pdfExported", impact: HEALTH_WEIGHTS.pdfExported });
    }
    if (usage.api_calls_this_month > 0) {
      score += HEALTH_WEIGHTS.apiUsed;
      signals.push({ signal: "apiUsed", impact: HEALTH_WEIGHTS.apiUsed });
    }
  }

  // Check setup activity
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count: recentSetupChanges } = await supabase
    .from("user_setups")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("updated_at", thirtyDaysAgo);

  if (recentSetupChanges > 0) {
    score += HEALTH_WEIGHTS.setupModifiedThisMonth;
    signals.push({ signal: "setupModifiedThisMonth", impact: HEALTH_WEIGHTS.setupModifiedThisMonth });
  }

  // Check for payment failures (from dunning table)
  const { data: dunning } = await supabase
    .from("dunning_sequences")
    .select("failure_count")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (dunning && dunning.failure_count > 0) {
    score += HEALTH_WEIGHTS.paymentFailed;
    signals.push({ signal: "paymentFailed", impact: HEALTH_WEIGHTS.paymentFailed });
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Determine status
  let status = "critical";
  let statusInfo = HEALTH_STATUS.CRITICAL;

  if (score >= HEALTH_STATUS.HEALTHY.min) {
    status = "healthy";
    statusInfo = HEALTH_STATUS.HEALTHY;
  } else if (score >= HEALTH_STATUS.AT_RISK.min) {
    status = "at_risk";
    statusInfo = HEALTH_STATUS.AT_RISK;
  } else if (score >= HEALTH_STATUS.DANGER.min) {
    status = "danger";
    statusInfo = HEALTH_STATUS.DANGER;
  }

  return {
    score,
    status,
    statusInfo,
    signals,
    calculatedAt: now.toISOString(),
  };
}

/**
 * Update and store health score
 */
export async function updateHealthScore(userId) {
  const supabase = getSupabaseAdmin();
  const result = await calculateHealthScore(userId);

  // Upsert health score record
  const { error } = await supabase
    .from("user_health_scores")
    .upsert({
      user_id: userId,
      health_score: result.score,
      health_status: result.status,
      calculated_at: result.calculatedAt,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "user_id",
    });

  if (error) {
    console.error("Error updating health score:", error);
  }

  return result;
}

/**
 * Get users by health status for batch processing
 */
export async function getUsersByHealthStatus(status, limit = 100) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("user_health_scores")
    .select(`
      *,
      users (
        id,
        email,
        name,
        plan_type,
        has_access,
        created_at
      )
    `)
    .eq("health_status", status)
    .order("health_score", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Error fetching users by health status:", error);
    return [];
  }

  return data;
}

/**
 * Get users needing intervention
 */
export async function getUsersNeedingIntervention() {
  const supabase = getSupabaseAdmin();

  // Get at-risk, danger, and critical users
  const { data, error } = await supabase
    .from("user_health_scores")
    .select(`
      *,
      users (
        id,
        email,
        name,
        plan_type,
        has_access
      )
    `)
    .in("health_status", ["at_risk", "danger", "critical"])
    .order("health_score", { ascending: true });

  if (error) {
    console.error("Error fetching users needing intervention:", error);
    return { atRisk: [], danger: [], critical: [] };
  }

  // Group by status
  const grouped = {
    atRisk: data.filter(u => u.health_status === "at_risk"),
    danger: data.filter(u => u.health_status === "danger"),
    critical: data.filter(u => u.health_status === "critical"),
  };

  return grouped;
}

/**
 * Batch update all user health scores
 * Run this daily via cron
 */
export async function batchUpdateHealthScores() {
  const supabase = getSupabaseAdmin();

  // Get all paying users
  const { data: users, error } = await supabase
    .from("users")
    .select("id")
    .eq("has_access", true);

  if (error) {
    console.error("Error fetching users for health score update:", error);
    return { updated: 0, errors: 0 };
  }

  let updated = 0;
  let errors = 0;

  // Update each user's health score
  for (const user of users) {
    try {
      await updateHealthScore(user.id);
      updated++;
    } catch (e) {
      console.error(`Error updating health score for user ${user.id}:`, e);
      errors++;
    }
  }

  console.log(`Health scores updated: ${updated} success, ${errors} errors`);
  return { updated, errors };
}

/**
 * Get health score statistics
 */
export async function getHealthScoreStats() {
  const supabase = getSupabaseAdmin();

  // Get counts by status
  const { data: statusCounts } = await supabase
    .from("user_health_scores")
    .select("health_status")
    .then(({ data }) => {
      const counts = { healthy: 0, at_risk: 0, danger: 0, critical: 0 };
      data?.forEach(row => {
        if (counts[row.health_status] !== undefined) {
          counts[row.health_status]++;
        }
      });
      return { data: counts };
    });

  // Get average score
  const { data: avgData } = await supabase
    .from("user_health_scores")
    .select("health_score");

  const avgScore = avgData?.length > 0
    ? avgData.reduce((sum, row) => sum + row.health_score, 0) / avgData.length
    : 0;

  return {
    distribution: statusCounts || { healthy: 0, at_risk: 0, danger: 0, critical: 0 },
    averageScore: Math.round(avgScore),
    totalTracked: avgData?.length || 0,
  };
}

/**
 * Determine recommended action for a user based on health score
 */
export function getRecommendedAction(healthScore, status) {
  const actions = {
    healthy: {
      type: "upsell",
      priority: "low",
      message: "Consider upselling to higher plan",
      automatable: true,
    },
    at_risk: {
      type: "engagement_email",
      priority: "medium",
      message: "Send re-engagement email sequence",
      automatable: true,
    },
    danger: {
      type: "personal_outreach",
      priority: "high",
      message: "Personal email from founder/support",
      automatable: false,
    },
    critical: {
      type: "retention_offer",
      priority: "critical",
      message: "Immediate retention offer + possible call",
      automatable: false,
    },
  };

  return actions[status] || actions.critical;
}

export default {
  calculateHealthScore,
  updateHealthScore,
  getUsersByHealthStatus,
  getUsersNeedingIntervention,
  batchUpdateHealthScores,
  getHealthScoreStats,
  getRecommendedAction,
  HEALTH_STATUS,
  HEALTH_WEIGHTS,
};
