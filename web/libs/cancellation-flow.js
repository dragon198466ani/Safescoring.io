/**
 * Cancellation Flow System
 * Optimized retention flow with offers and alternatives
 *
 * Flow:
 * 1. User clicks cancel
 * 2. Ask for reason
 * 3. Show targeted retention offer based on reason
 * 4. Offer downgrade option
 * 5. Offer pause option
 * 6. Final confirmation
 */

import { createClient } from "@supabase/supabase-js";
import { createCheckout, getCustomerPortalUrl } from "./lemonsqueezy";
import config from "@/config";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Cancellation reasons with targeted offers
export const CANCEL_REASONS = {
  too_expensive: {
    code: "too_expensive",
    label: "Too expensive",
    emoji: "💰",
    offer: "discount_50_3mo",
    offerMessage: "We understand budgets can be tight. Stay with us at 50% off for the next 3 months.",
  },
  not_using: {
    code: "not_using",
    label: "Not using it enough",
    emoji: "😴",
    offer: "discount_30_3mo",
    offerMessage: "We'd hate to see you go. Here's 30% off to give us another try.",
  },
  missing_feature: {
    code: "missing_feature",
    label: "Missing a feature I need",
    emoji: "🔧",
    offer: "free_month",
    offerMessage: "Tell us what you need! Get 1 month free while we work on it.",
    askForDetail: true,
  },
  competitor: {
    code: "competitor",
    label: "Switching to another service",
    emoji: "🏃",
    offer: "discount_50_3mo",
    offerMessage: "Before you go - what would make you stay? 50% off while we match their features.",
    askForDetail: true,
  },
  temporary: {
    code: "temporary",
    label: "Just need a break",
    emoji: "⏸️",
    offer: "pause_1mo",
    offerMessage: "No problem! Pause your subscription for up to 3 months and keep all your data.",
    showPauseOption: true,
  },
  other: {
    code: "other",
    label: "Other reason",
    emoji: "💬",
    offer: "discount_30_3mo",
    offerMessage: "We'd love to understand why. Here's 30% off if you'd like to stay.",
    askForDetail: true,
  },
};

// Retention offers
export const RETENTION_OFFERS = {
  discount_50_3mo: {
    code: "discount_50_3mo",
    name: "50% off for 3 months",
    type: "discount",
    discountPercent: 50,
    durationMonths: 3,
    discountCode: "STAY50",
    estimatedSavings: (price) => price * 0.5 * 3,
  },
  discount_30_3mo: {
    code: "discount_30_3mo",
    name: "30% off for 3 months",
    type: "discount",
    discountPercent: 30,
    durationMonths: 3,
    discountCode: "STAY30",
    estimatedSavings: (price) => price * 0.3 * 3,
  },
  free_month: {
    code: "free_month",
    name: "1 month free",
    type: "free",
    freeMonths: 1,
    discountCode: "FREEMONTH",
    estimatedSavings: (price) => price,
  },
  pause_1mo: {
    code: "pause_1mo",
    name: "Pause for 1 month",
    type: "pause",
    pauseMonths: 1,
    estimatedSavings: (price) => price,
  },
  pause_3mo: {
    code: "pause_3mo",
    name: "Pause for 3 months",
    type: "pause",
    pauseMonths: 3,
    estimatedSavings: (price) => price * 3,
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
 * Initialize cancellation flow
 */
export async function initiateCancellationFlow(userId) {
  const supabase = getSupabaseAdmin();

  // Get user's current plan info
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, email, plan_type, has_access, lemon_squeezy_subscription_id, created_at")
    .eq("id", userId)
    .single();

  if (userError || !user) {
    throw new Error("User not found");
  }

  // Calculate MRR for this user
  const plan = config.lemonsqueezy?.plans?.find(
    p => p.planCode === user.plan_type
  );
  const mrr = plan?.price || 0;

  // Create cancellation flow record
  const { data: flow, error: flowError } = await supabase
    .from("cancellation_flows")
    .insert({
      user_id: userId,
      status: "initiated",
      previous_plan: user.plan_type,
      previous_mrr: mrr,
      initiated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (flowError) {
    console.error("Error creating cancellation flow:", flowError);
    throw flowError;
  }

  return {
    flowId: flow.id,
    currentPlan: user.plan_type,
    mrr,
    reasons: Object.values(CANCEL_REASONS),
  };
}

/**
 * Submit cancellation reason and get offer
 */
export async function submitCancelReason(flowId, userId, reason, detail = null) {
  const supabase = getSupabaseAdmin();

  // Validate reason
  const reasonConfig = CANCEL_REASONS[reason];
  if (!reasonConfig) {
    throw new Error("Invalid cancellation reason");
  }

  // Get the flow
  const { data: flow, error: flowError } = await supabase
    .from("cancellation_flows")
    .select("*")
    .eq("id", flowId)
    .eq("user_id", userId)
    .single();

  if (flowError || !flow) {
    throw new Error("Cancellation flow not found");
  }

  // Get the offer for this reason
  const offer = RETENTION_OFFERS[reasonConfig.offer];

  // Update flow with reason
  await supabase
    .from("cancellation_flows")
    .update({
      status: "reason_selected",
      cancel_reason: reason,
      cancel_reason_detail: detail,
      offer_type: reasonConfig.offer,
      offer_shown_at: new Date().toISOString(),
    })
    .eq("id", flowId);

  // Calculate savings
  const estimatedSavings = offer.estimatedSavings?.(flow.previous_mrr) || 0;

  return {
    flowId,
    reason: reasonConfig,
    offer: {
      ...offer,
      message: reasonConfig.offerMessage,
      estimatedSavings,
    },
    showPauseOption: reasonConfig.showPauseOption || false,
    askForDetail: reasonConfig.askForDetail || false,
  };
}

/**
 * Accept retention offer
 */
export async function acceptRetentionOffer(flowId, userId) {
  const supabase = getSupabaseAdmin();

  // Get the flow
  const { data: flow, error: flowError } = await supabase
    .from("cancellation_flows")
    .select("*, users(email, lemon_squeezy_customer_id)")
    .eq("id", flowId)
    .eq("user_id", userId)
    .single();

  if (flowError || !flow) {
    throw new Error("Cancellation flow not found");
  }

  const offer = RETENTION_OFFERS[flow.offer_type];
  if (!offer) {
    throw new Error("Offer not found");
  }

  // Handle different offer types
  let result = {};

  if (offer.type === "discount" || offer.type === "free") {
    // Apply discount via Lemon Squeezy
    // In production, you'd create a discount code in LS and apply it
    result = {
      type: "discount_applied",
      discountCode: offer.discountCode,
      message: `Great! Use code ${offer.discountCode} at checkout for your next billing cycle.`,
    };

    // Update user to mark discount applied
    await supabase
      .from("users")
      .update({
        retention_discount_code: offer.discountCode,
        retention_discount_expires: new Date(
          Date.now() + (offer.durationMonths || 1) * 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
      })
      .eq("id", userId);
  } else if (offer.type === "pause") {
    // Create pause record
    const resumesAt = new Date();
    resumesAt.setMonth(resumesAt.getMonth() + offer.pauseMonths);

    await supabase
      .from("subscription_pauses")
      .insert({
        user_id: userId,
        pause_reason: flow.cancel_reason,
        pause_duration_months: offer.pauseMonths,
        preserved_plan: flow.previous_plan,
        resumes_at: resumesAt.toISOString(),
      });

    result = {
      type: "paused",
      resumesAt: resumesAt.toISOString(),
      message: `Your subscription is paused until ${resumesAt.toLocaleDateString()}. We'll remind you before it resumes.`,
    };
  }

  // Update flow
  await supabase
    .from("cancellation_flows")
    .update({
      status: "offer_accepted",
      offer_response: "accepted",
      offer_responded_at: new Date().toISOString(),
      final_outcome: offer.type === "pause" ? "paused" : "retained",
      revenue_saved: flow.previous_mrr * (offer.durationMonths || 1),
      completed_at: new Date().toISOString(),
    })
    .eq("id", flowId);

  return result;
}

/**
 * Reject offer and show downgrade option
 */
export async function rejectRetentionOffer(flowId, userId) {
  const supabase = getSupabaseAdmin();

  // Get user's current plan
  const { data: user } = await supabase
    .from("users")
    .select("plan_type")
    .eq("id", userId)
    .single();

  // Update flow
  await supabase
    .from("cancellation_flows")
    .update({
      offer_response: "rejected",
      offer_responded_at: new Date().toISOString(),
    })
    .eq("id", flowId);

  // Get downgrade options (all plans below current)
  const plans = config.lemonsqueezy?.plans || [];
  const currentPlanIndex = plans.findIndex(p => p.planCode === user?.plan_type);

  const downgradeOptions = plans
    .slice(0, currentPlanIndex)
    .filter(p => p.planCode !== "free")
    .map(p => ({
      planCode: p.planCode,
      name: p.name,
      price: p.price,
      features: p.features?.slice(0, 3),
    }));

  return {
    flowId,
    downgradeOptions,
    pauseOption: {
      available: true,
      durations: [1, 2, 3],
      message: "Pause your subscription and keep all your data",
    },
  };
}

/**
 * Downgrade to a lower plan
 */
export async function downgradePlan(flowId, userId, targetPlan) {
  const supabase = getSupabaseAdmin();

  // Get the flow
  const { data: flow } = await supabase
    .from("cancellation_flows")
    .select("*")
    .eq("id", flowId)
    .eq("user_id", userId)
    .single();

  // Validate target plan is lower
  const plans = config.lemonsqueezy?.plans || [];
  const currentIndex = plans.findIndex(p => p.planCode === flow?.previous_plan);
  const targetIndex = plans.findIndex(p => p.planCode === targetPlan);

  if (targetIndex >= currentIndex) {
    throw new Error("Cannot upgrade in cancellation flow");
  }

  // Update user's plan
  const targetPlanConfig = plans[targetIndex];

  await supabase
    .from("users")
    .update({
      plan_type: targetPlan,
      price_id: targetPlanConfig?.variantId,
    })
    .eq("id", userId);

  // Update flow
  await supabase
    .from("cancellation_flows")
    .update({
      status: "downgraded",
      final_outcome: "downgraded",
      revenue_saved: flow.previous_mrr - (targetPlanConfig?.price || 0),
      completed_at: new Date().toISOString(),
    })
    .eq("id", flowId);

  return {
    success: true,
    newPlan: targetPlan,
    message: `You've been downgraded to ${targetPlanConfig?.name}. You can upgrade anytime.`,
  };
}

/**
 * Pause subscription
 */
export async function pauseSubscription(flowId, userId, months = 1) {
  const supabase = getSupabaseAdmin();

  // Validate months
  if (months < 1 || months > 3) {
    throw new Error("Pause duration must be 1-3 months");
  }

  // Get flow and user
  const { data: flow } = await supabase
    .from("cancellation_flows")
    .select("*")
    .eq("id", flowId)
    .eq("user_id", userId)
    .single();

  if (!flow) {
    throw new Error("Flow not found");
  }

  // Calculate resume date
  const resumesAt = new Date();
  resumesAt.setMonth(resumesAt.getMonth() + months);

  // Create pause record
  await supabase
    .from("subscription_pauses")
    .insert({
      user_id: userId,
      pause_reason: flow.cancel_reason,
      pause_duration_months: months,
      preserved_plan: flow.previous_plan,
      resumes_at: resumesAt.toISOString(),
    });

  // Update user - remove access but keep plan info
  await supabase
    .from("users")
    .update({
      has_access: false,
      subscription_paused: true,
      subscription_resumes_at: resumesAt.toISOString(),
    })
    .eq("id", userId);

  // Update flow
  await supabase
    .from("cancellation_flows")
    .update({
      status: "paused",
      final_outcome: "paused",
      revenue_saved: flow.previous_mrr * months,
      completed_at: new Date().toISOString(),
    })
    .eq("id", flowId);

  return {
    success: true,
    paused: true,
    resumesAt: resumesAt.toISOString(),
    message: `Your subscription is paused until ${resumesAt.toLocaleDateString()}. All your data will be preserved.`,
  };
}

/**
 * Complete cancellation (final step)
 */
export async function completeCancellation(flowId, userId) {
  const supabase = getSupabaseAdmin();

  // Get flow
  const { data: flow } = await supabase
    .from("cancellation_flows")
    .select("*")
    .eq("id", flowId)
    .eq("user_id", userId)
    .single();

  if (!flow) {
    throw new Error("Flow not found");
  }

  // Get user info for win-back campaign
  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  // Update user - revoke access
  await supabase
    .from("users")
    .update({
      has_access: false,
      plan_type: "free",
      price_id: "free",
    })
    .eq("id", userId);

  // Update flow
  await supabase
    .from("cancellation_flows")
    .update({
      status: "cancelled",
      final_outcome: "churned",
      completed_at: new Date().toISOString(),
    })
    .eq("id", flowId);

  // Create win-back campaign
  const dataDeleteAt = new Date();
  dataDeleteAt.setDate(dataDeleteAt.getDate() + 90);

  await supabase
    .from("winback_campaigns")
    .insert({
      user_id: userId,
      campaign_type: flow.previous_mrr > 50 ? "high_value" : "standard",
      churned_at: new Date().toISOString(),
      churn_reason: flow.cancel_reason,
      previous_plan: flow.previous_plan,
      previous_ltv: flow.previous_mrr * 12, // Estimate
      data_deletion_scheduled_at: dataDeleteAt.toISOString(),
      expires_at: dataDeleteAt.toISOString(),
    });

  return {
    success: true,
    cancelled: true,
    message: "Your subscription has been cancelled. Your data will be preserved for 90 days.",
    dataDeletesAt: dataDeleteAt.toISOString(),
  };
}

/**
 * Get cancellation flow stats for dashboard
 */
export async function getCancellationStats(days = 30) {
  const supabase = getSupabaseAdmin();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: flows } = await supabase
    .from("cancellation_flows")
    .select("*")
    .gte("initiated_at", startDate.toISOString());

  if (!flows || flows.length === 0) {
    return {
      total: 0,
      retained: 0,
      downgraded: 0,
      paused: 0,
      churned: 0,
      saveRate: 0,
      revenueSaved: 0,
      topReasons: [],
    };
  }

  const stats = {
    total: flows.length,
    retained: flows.filter(f => f.final_outcome === "retained").length,
    downgraded: flows.filter(f => f.final_outcome === "downgraded").length,
    paused: flows.filter(f => f.final_outcome === "paused").length,
    churned: flows.filter(f => f.final_outcome === "churned").length,
    revenueSaved: flows.reduce((sum, f) => sum + (f.revenue_saved || 0), 0),
  };

  stats.saveRate = ((stats.retained + stats.downgraded + stats.paused) / stats.total * 100).toFixed(1);

  // Top reasons
  const reasonCounts = {};
  flows.forEach(f => {
    if (f.cancel_reason) {
      reasonCounts[f.cancel_reason] = (reasonCounts[f.cancel_reason] || 0) + 1;
    }
  });

  stats.topReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => ({
      reason,
      label: CANCEL_REASONS[reason]?.label || reason,
      count,
      percentage: (count / stats.total * 100).toFixed(1),
    }));

  return stats;
}

export default {
  initiateCancellationFlow,
  submitCancelReason,
  acceptRetentionOffer,
  rejectRetentionOffer,
  downgradePlan,
  pauseSubscription,
  completeCancellation,
  getCancellationStats,
  CANCEL_REASONS,
  RETENTION_OFFERS,
};
