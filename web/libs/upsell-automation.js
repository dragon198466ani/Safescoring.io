/**
 * Upsell Automation System
 * Intelligent triggers for upgrade prompts
 *
 * Trigger types:
 * - Feature limits (setup, comparison, export)
 * - Usage milestones (10 comparisons, 5 setups)
 * - Time-based (trial ending, 30 days active)
 * - Behavior-based (heavy usage, frequent logins)
 */

import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "./resend";
import config from "@/config";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Upsell trigger configurations
export const UPSELL_TRIGGERS = {
  // Limit-based triggers
  setup_limit: {
    type: "setup_limit",
    priority: "high",
    targetPlan: "explorer",
    title: "Need More Setups?",
    message: "Upgrade to manage up to 5 security setups",
    cta: "Unlock More Setups",
    discount: null,
  },
  comparison_limit: {
    type: "comparison_limit",
    priority: "medium",
    targetPlan: "explorer",
    title: "Compare Without Limits",
    message: "Upgrade for unlimited side-by-side comparisons",
    cta: "Unlock Unlimited Comparisons",
    discount: null,
  },
  export_limit: {
    type: "export_limit",
    priority: "low",
    targetPlan: "explorer",
    title: "Export Your Reports",
    message: "Generate professional PDF reports for your records",
    cta: "Enable PDF Exports",
    discount: null,
  },
  api_access: {
    type: "api_access",
    priority: "medium",
    targetPlan: "professional",
    title: "Integrate with Your Tools",
    message: "Access SafeScoring data via API",
    cta: "Get API Access",
    discount: null,
  },

  // Milestone triggers
  usage_milestone_10_comparisons: {
    type: "usage_milestone",
    priority: "medium",
    targetPlan: "explorer",
    title: "You're a Power User!",
    message: "You've made 10 comparisons. Upgrade for unlimited access.",
    cta: "Upgrade Now",
    discount: "POWER10",
    discountPercent: 10,
  },
  usage_milestone_5_setups: {
    type: "usage_milestone",
    priority: "high",
    targetPlan: "professional",
    title: "Serious About Security",
    message: "You've created 5 setups. Go Pro for advanced features.",
    cta: "Go Professional",
    discount: "SERIOUS20",
    discountPercent: 20,
  },

  // Time-based triggers
  trial_ending_7d: {
    type: "trial_ending",
    priority: "critical",
    targetPlan: null, // Keep current plan
    title: "Trial Ending Soon",
    message: "Your trial ends in 7 days. Subscribe to keep your data.",
    cta: "Subscribe Now",
    discount: "TRIAL20",
    discountPercent: 20,
  },
  trial_ending_3d: {
    type: "trial_ending",
    priority: "critical",
    targetPlan: null,
    title: "Only 3 Days Left!",
    message: "Don't lose access to your setups and history.",
    cta: "Subscribe Now",
    discount: "LASTCHANCE25",
    discountPercent: 25,
  },
  trial_ending_1d: {
    type: "trial_ending",
    priority: "critical",
    targetPlan: null,
    title: "Trial Ends Tomorrow!",
    message: "Subscribe now to keep full access.",
    cta: "Subscribe Now",
    discount: "FINAL30",
    discountPercent: 30,
  },
  active_30d: {
    type: "time_based",
    priority: "low",
    targetPlan: "explorer",
    title: "Thanks for Being With Us!",
    message: "You've been with us for 30 days. Ready for more features?",
    cta: "Explore Premium",
    discount: "LOYAL15",
    discountPercent: 15,
  },

  // Behavior-based triggers
  heavy_usage: {
    type: "behavior_based",
    priority: "high",
    targetPlan: "professional",
    title: "Power User Detected",
    message: "You're using SafeScoring like a pro. Unlock pro features.",
    cta: "Go Professional",
    discount: "POWER25",
    discountPercent: 25,
  },
  frequent_logins: {
    type: "behavior_based",
    priority: "medium",
    targetPlan: "explorer",
    title: "Welcome Back!",
    message: "You visit often. Get more from each visit with Explorer.",
    cta: "Try Explorer",
    discount: "REGULAR10",
    discountPercent: 10,
  },

  // Annual upgrade
  annual_savings: {
    type: "time_based",
    priority: "medium",
    targetPlan: null, // Upgrade to annual of current plan
    title: "Save 20% with Annual",
    message: "Switch to annual billing and save 2 months!",
    cta: "Switch to Annual",
    discount: null,
    savings: "20%",
  },
};

// Email sequences for upsell nurturing
export const UPSELL_EMAIL_SEQUENCES = {
  free_to_explorer: [
    { day: 3, template: "feature_highlight_comparisons" },
    { day: 7, template: "case_study_user" },
    { day: 14, template: "limited_time_offer" },
    { day: 21, template: "final_reminder" },
  ],
  explorer_to_pro: [
    { day: 7, template: "api_benefits" },
    { day: 14, template: "power_user_features" },
    { day: 21, template: "pro_discount_offer" },
  ],
  monthly_to_annual: [
    { day: 30, template: "annual_savings_intro" },
    { day: 60, template: "annual_reminder" },
    { day: 90, template: "annual_final_offer" },
  ],
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
 * Check and trigger upsells for a user
 */
export async function checkUpsellTriggers(userId) {
  const supabase = getSupabaseAdmin();
  const triggers = [];

  // Get user data
  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (!user) return triggers;

  const plan = user.plan_type?.toLowerCase() || "free";

  // Get usage data
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

  // Check trial ending
  if (user.trial_ends_at) {
    const trialEnds = new Date(user.trial_ends_at);
    const daysUntilEnd = Math.ceil((trialEnds - new Date()) / (1000 * 60 * 60 * 24));

    if (daysUntilEnd <= 1) {
      triggers.push(UPSELL_TRIGGERS.trial_ending_1d);
    } else if (daysUntilEnd <= 3) {
      triggers.push(UPSELL_TRIGGERS.trial_ending_3d);
    } else if (daysUntilEnd <= 7) {
      triggers.push(UPSELL_TRIGGERS.trial_ending_7d);
    }
  }

  // Check usage milestones (only for free users)
  if (plan === "free") {
    if (usage?.total_comparisons >= 10) {
      triggers.push(UPSELL_TRIGGERS.usage_milestone_10_comparisons);
    }
    if (setupCount >= 1 && usage?.total_comparisons >= 5) {
      triggers.push(UPSELL_TRIGGERS.heavy_usage);
    }
  }

  // Check for explorer users ready for pro
  if (plan === "explorer") {
    if (setupCount >= 4) {
      triggers.push(UPSELL_TRIGGERS.usage_milestone_5_setups);
    }
  }

  // Check for annual upsell (monthly subscribers after 30 days)
  if (user.has_access && !user.price_id?.includes("yearly")) {
    const daysSinceSubscription = Math.floor(
      (new Date() - new Date(user.created_at)) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceSubscription >= 30) {
      triggers.push(UPSELL_TRIGGERS.annual_savings);
    }
  }

  return triggers;
}

/**
 * Record upsell event shown
 */
export async function recordUpsellShown(userId, triggerType, context = {}) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("upsell_events")
    .insert({
      user_id: userId,
      trigger_type: triggerType,
      trigger_context: context,
      modal_shown: true,
      modal_shown_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error recording upsell event:", error);
  }

  return data;
}

/**
 * Record upsell response
 */
export async function recordUpsellResponse(eventId, response, convertedPlan = null, revenue = null) {
  const supabase = getSupabaseAdmin();

  const updateData = {
    response,
    responded_at: new Date().toISOString(),
  };

  if (convertedPlan) {
    updateData.converted_to_plan = convertedPlan;
  }

  if (revenue) {
    updateData.revenue_generated = revenue;
  }

  const { error } = await supabase
    .from("upsell_events")
    .update(updateData)
    .eq("id", eventId);

  if (error) {
    console.error("Error recording upsell response:", error);
  }
}

/**
 * Send upsell email
 */
export async function sendUpsellEmail(userId, trigger, customMessage = null) {
  const supabase = getSupabaseAdmin();

  // Get user
  const { data: user } = await supabase
    .from("users")
    .select("email, name, plan_type")
    .eq("id", userId)
    .single();

  if (!user) return { success: false, error: "User not found" };

  const triggerConfig = UPSELL_TRIGGERS[trigger] || trigger;

  // Generate email content
  const emailContent = generateUpsellEmailContent(triggerConfig, {
    userName: user.name || "there",
    currentPlan: user.plan_type,
    customMessage,
  });

  try {
    await sendEmail({
      to: user.email,
      subject: triggerConfig.title,
      html: emailContent.html,
      text: emailContent.text,
    });

    // Record email
    await supabase
      .from("engagement_emails")
      .insert({
        user_id: userId,
        email_type: "upsell",
        email_subject: triggerConfig.title,
        status: "sent",
        sent_at: new Date().toISOString(),
        metadata: { trigger: triggerConfig.type },
      });

    return { success: true };
  } catch (error) {
    console.error("Error sending upsell email:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate upsell email content
 */
function generateUpsellEmailContent(trigger, data) {
  const baseUrl = `https://${config.domainName}`;
  const { userName, currentPlan, customMessage } = data;

  const ctaUrl = trigger.discount
    ? `${baseUrl}/pricing?code=${trigger.discount}`
    : `${baseUrl}/pricing`;

  const discountLine = trigger.discountPercent
    ? `<p style="color: #10b981; font-weight: bold;">Use code ${trigger.discount} for ${trigger.discountPercent}% off!</p>`
    : "";

  const html = `
    <h2>Hi ${userName}!</h2>
    <p>${trigger.message}</p>
    ${customMessage ? `<p>${customMessage}</p>` : ""}
    ${discountLine}
    <p>
      <a href="${ctaUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        ${trigger.cta}
      </a>
    </p>
    <p>Best,<br>The SafeScoring Team</p>
  `;

  const text = `Hi ${userName}!\n\n${trigger.message}\n\n${trigger.discount ? `Use code ${trigger.discount} for ${trigger.discountPercent}% off!\n\n` : ""}${ctaUrl}\n\nBest,\nThe SafeScoring Team`;

  return { html, text };
}

/**
 * Get best upsell for user (highest priority applicable trigger)
 */
export async function getBestUpsell(userId) {
  const triggers = await checkUpsellTriggers(userId);

  if (triggers.length === 0) return null;

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  triggers.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return triggers[0];
}

/**
 * Check if user should see upsell (rate limiting)
 */
export async function shouldShowUpsell(userId, triggerType) {
  const supabase = getSupabaseAdmin();

  // Check last upsell shown
  const { data: lastUpsell } = await supabase
    .from("upsell_events")
    .select("modal_shown_at")
    .eq("user_id", userId)
    .eq("modal_shown", true)
    .order("modal_shown_at", { ascending: false })
    .limit(1)
    .single();

  if (lastUpsell) {
    const hoursSinceLastUpsell = (new Date() - new Date(lastUpsell.modal_shown_at)) / (1000 * 60 * 60);

    // Don't show more than once per 24 hours for same type
    if (hoursSinceLastUpsell < 24) {
      return false;
    }
  }

  // Check total upsells shown this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { count: weeklyUpsells } = await supabase
    .from("upsell_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("modal_shown", true)
    .gte("modal_shown_at", weekAgo.toISOString());

  // Max 3 upsells per week
  if (weeklyUpsells >= 3) {
    return false;
  }

  return true;
}

/**
 * Get upsell statistics
 */
export async function getUpsellStats(days = 30) {
  const supabase = getSupabaseAdmin();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: events } = await supabase
    .from("upsell_events")
    .select("*")
    .gte("created_at", startDate.toISOString());

  if (!events || events.length === 0) {
    return {
      total: 0,
      shown: 0,
      converted: 0,
      dismissed: 0,
      conversionRate: 0,
      revenueGenerated: 0,
      topTriggers: [],
    };
  }

  const stats = {
    total: events.length,
    shown: events.filter(e => e.modal_shown).length,
    converted: events.filter(e => e.response === "converted").length,
    dismissed: events.filter(e => e.response === "dismissed").length,
    revenueGenerated: events
      .filter(e => e.revenue_generated)
      .reduce((sum, e) => sum + (e.revenue_generated || 0), 0),
  };

  stats.conversionRate = stats.shown > 0
    ? ((stats.converted / stats.shown) * 100).toFixed(1)
    : 0;

  // Top triggers
  const triggerCounts = {};
  events.forEach(e => {
    triggerCounts[e.trigger_type] = (triggerCounts[e.trigger_type] || 0) + 1;
  });

  stats.topTriggers = Object.entries(triggerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([trigger, count]) => ({ trigger, count }));

  return stats;
}

export default {
  checkUpsellTriggers,
  recordUpsellShown,
  recordUpsellResponse,
  sendUpsellEmail,
  getBestUpsell,
  shouldShowUpsell,
  getUpsellStats,
  UPSELL_TRIGGERS,
  UPSELL_EMAIL_SEQUENCES,
};
