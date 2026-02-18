/**
 * Win-Back Campaigns System
 * Re-engage churned users with targeted offers
 *
 * Timeline after churn:
 * Day 7: "We miss you" email
 * Day 14: New feature announcement
 * Day 30: 30% discount offer
 * Day 60: Data deletion warning
 * Day 90: Final 50% offer + deletion
 */

import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "./resend";
import config from "@/config";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Win-back email sequence
export const WINBACK_EMAILS = {
  email_1: {
    step: 1,
    dayAfterChurn: 7,
    subject: "We miss you at SafeScoring",
    discountCode: null,
    discountPercent: null,
    type: "winback_1",
  },
  email_2: {
    step: 2,
    dayAfterChurn: 14,
    subject: "New features you're missing",
    discountCode: null,
    discountPercent: null,
    type: "winback_2",
  },
  email_3: {
    step: 3,
    dayAfterChurn: 30,
    subject: "30% off to come back - special offer",
    discountCode: "COMEBACK30",
    discountPercent: 30,
    type: "winback_3",
  },
  email_4: {
    step: 4,
    dayAfterChurn: 60,
    subject: "Your SafeScoring data will be deleted soon",
    discountCode: "COMEBACK40",
    discountPercent: 40,
    type: "winback_4",
  },
  email_5: {
    step: 5,
    dayAfterChurn: 90,
    subject: "Last chance: 50% off before we delete your data",
    discountCode: "FINALCHANCE50",
    discountPercent: 50,
    type: "winback_5",
  },
};

// Campaign types based on user value
export const CAMPAIGN_TYPES = {
  standard: {
    type: "standard",
    description: "Standard win-back sequence",
    maxDiscount: 30,
    emailCount: 5,
  },
  high_value: {
    type: "high_value",
    description: "For users with LTV > $200",
    maxDiscount: 50,
    emailCount: 5,
    personalOutreach: true,
  },
  feature_request: {
    type: "feature_request",
    description: "User left for missing feature",
    maxDiscount: 40,
    emailCount: 4,
    notifyOnFeatureRelease: true,
  },
  competitor_switch: {
    type: "competitor_switch",
    description: "User switched to competitor",
    maxDiscount: 50,
    emailCount: 5,
    competitiveOffer: true,
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
 * Create win-back campaign for churned user
 */
export async function createWinbackCampaign(userId, churnReason = null, previousPlan = null, previousLtv = 0) {
  const supabase = getSupabaseAdmin();

  // Determine campaign type based on user value and reason
  let campaignType = "standard";

  if (previousLtv > 200) {
    campaignType = "high_value";
  } else if (churnReason === "missing_feature") {
    campaignType = "feature_request";
  } else if (churnReason === "competitor") {
    campaignType = "competitor_switch";
  }

  // Calculate data deletion date (90 days)
  const dataDeleteAt = new Date();
  dataDeleteAt.setDate(dataDeleteAt.getDate() + 90);

  // Calculate expiration (same as deletion)
  const expiresAt = new Date(dataDeleteAt);

  const { data: campaign, error } = await supabase
    .from("winback_campaigns")
    .insert({
      user_id: userId,
      campaign_type: campaignType,
      churned_at: new Date().toISOString(),
      churn_reason: churnReason,
      previous_plan: previousPlan,
      previous_ltv: previousLtv,
      status: "active",
      data_deletion_scheduled_at: dataDeleteAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating win-back campaign:", error);
    throw error;
  }

  return campaign;
}

/**
 * Send win-back email
 */
export async function sendWinbackEmail(campaignId, step) {
  const supabase = getSupabaseAdmin();

  // Get campaign and user info
  const { data: campaign } = await supabase
    .from("winback_campaigns")
    .select(`
      *,
      users (
        id,
        email,
        name
      )
    `)
    .eq("id", campaignId)
    .single();

  if (!campaign || !campaign.users) {
    console.error("Campaign or user not found");
    return { success: false, error: "Not found" };
  }

  const emailConfig = Object.values(WINBACK_EMAILS).find(e => e.step === step);
  if (!emailConfig) {
    console.error("Invalid win-back step:", step);
    return { success: false, error: "Invalid step" };
  }

  const user = campaign.users;

  // Generate email content
  const emailContent = generateWinbackEmailContent(step, {
    userName: user.name || "there",
    previousPlan: campaign.previous_plan,
    churnReason: campaign.churn_reason,
    dataDeletesAt: campaign.data_deletion_scheduled_at,
    discountCode: emailConfig.discountCode,
    discountPercent: emailConfig.discountPercent,
  });

  // Send email
  try {
    await sendEmail({
      to: user.email,
      subject: emailConfig.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    // Update campaign
    await supabase
      .from("winback_campaigns")
      .update({
        [`email_${step}_sent_at`]: new Date().toISOString(),
        discount_offered: emailConfig.discountPercent,
        discount_code: emailConfig.discountCode,
        discount_expires_at: emailConfig.discountCode
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    // Track in engagement emails
    await supabase
      .from("engagement_emails")
      .insert({
        user_id: user.id,
        email_type: emailConfig.type,
        email_subject: emailConfig.subject,
        status: "sent",
        sent_at: new Date().toISOString(),
        metadata: { campaign_id: campaignId, step },
      });

    return { success: true, step };
  } catch (error) {
    console.error("Error sending win-back email:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate win-back email content
 */
function generateWinbackEmailContent(step, data) {
  const baseUrl = `https://${config.domainName}`;
  const { userName, previousPlan, dataDeletesAt, discountCode, discountPercent } = data;

  const deleteDate = new Date(dataDeletesAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const ctaUrl = discountCode
    ? `${baseUrl}/pricing?code=${discountCode}`
    : `${baseUrl}/pricing`;

  const templates = {
    1: {
      // Day 7: We miss you
      html: `
        <h2>Hi ${userName},</h2>
        <p>We noticed you're no longer with us at SafeScoring, and we wanted to reach out.</p>
        <p>Your crypto security setups and analysis history are still safe with us. If there's anything we could have done better, we'd love to hear about it.</p>
        <p>If you ever want to come back, your data will be waiting for you.</p>
        <p><a href="${baseUrl}/pricing" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">See What's New</a></p>
        <p>Best,<br>The SafeScoring Team</p>
        <p style="color: #6b7280; font-size: 12px;">Reply to this email if you have any feedback - we read every message.</p>
      `,
      text: `Hi ${userName},\n\nWe noticed you're no longer with us at SafeScoring.\n\nYour data is still safe with us. Visit ${baseUrl}/pricing to see what's new.\n\nBest,\nThe SafeScoring Team`,
    },
    2: {
      // Day 14: New features
      html: `
        <h2>Hi ${userName},</h2>
        <p>Since you left, we've been busy improving SafeScoring. Here's what's new:</p>
        <ul>
          <li><strong>Improved score accuracy</strong> - We've added 50+ new security norms</li>
          <li><strong>Faster comparisons</strong> - Compare products in seconds</li>
          <li><strong>New products</strong> - 30+ new products evaluated this month</li>
          <li><strong>Better alerts</strong> - Get notified when scores change</li>
        </ul>
        <p>Your previous setups and history are still saved. Come back and see what's changed!</p>
        <p><a href="${baseUrl}/pricing" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Explore New Features</a></p>
        <p>Best,<br>The SafeScoring Team</p>
      `,
      text: `Hi ${userName},\n\nSince you left, we've been busy improving SafeScoring.\n\nYour previous setups are still saved. Visit ${baseUrl}/pricing to explore.\n\nBest,\nThe SafeScoring Team`,
    },
    3: {
      // Day 30: 30% discount
      html: `
        <h2>Hi ${userName},</h2>
        <p>It's been a month since you left SafeScoring, and we'd love to have you back.</p>
        <p style="background-color: #f0fdf4; border: 1px solid #10b981; padding: 16px; border-radius: 8px; text-align: center;">
          <strong style="font-size: 18px; color: #10b981;">Special Offer: ${discountPercent}% OFF</strong><br>
          Use code: <strong>${discountCode}</strong><br>
          <span style="color: #6b7280; font-size: 14px;">Valid for 7 days</span>
        </p>
        <p>Your security setups and analysis history are still preserved. Pick up right where you left off.</p>
        <p><a href="${ctaUrl}" style="background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Come Back with ${discountPercent}% Off</a></p>
        <p>Best,<br>The SafeScoring Team</p>
      `,
      text: `Hi ${userName},\n\nWe'd love to have you back! Use code ${discountCode} for ${discountPercent}% off.\n\n${ctaUrl}\n\nBest,\nThe SafeScoring Team`,
    },
    4: {
      // Day 60: Data deletion warning
      html: `
        <h2>Hi ${userName},</h2>
        <p style="color: #f59e0b; font-weight: bold;">Your SafeScoring data will be deleted on ${deleteDate}.</p>
        <p>We've been holding onto your security setups, analysis history, and preferences, but our data retention policy requires us to delete inactive accounts after 90 days.</p>
        <p>Here's what will be permanently deleted:</p>
        <ul>
          <li>Your ${previousPlan || "account"} setup configurations</li>
          <li>Historical score tracking data</li>
          <li>Saved comparisons and reports</li>
          <li>Alert preferences</li>
        </ul>
        <p style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 16px; border-radius: 8px; text-align: center;">
          <strong style="font-size: 18px; color: #f59e0b;">Save Your Data: ${discountPercent}% OFF</strong><br>
          Use code: <strong>${discountCode}</strong>
        </p>
        <p><a href="${ctaUrl}" style="background-color: #f59e0b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Reactivate Now</a></p>
        <p>Best,<br>The SafeScoring Team</p>
      `,
      text: `Hi ${userName},\n\nYour SafeScoring data will be deleted on ${deleteDate}.\n\nUse code ${discountCode} for ${discountPercent}% off to save your data: ${ctaUrl}\n\nBest,\nThe SafeScoring Team`,
    },
    5: {
      // Day 90: Final offer
      html: `
        <h2>Hi ${userName},</h2>
        <p style="color: #ef4444; font-weight: bold; font-size: 18px;">This is your final notice before we delete your account.</p>
        <p>Tomorrow, all your SafeScoring data will be permanently deleted:</p>
        <ul style="color: #ef4444;">
          <li>Security setups - DELETED</li>
          <li>Analysis history - DELETED</li>
          <li>Saved comparisons - DELETED</li>
          <li>Account preferences - DELETED</li>
        </ul>
        <p style="background-color: #fef2f2; border: 2px solid #ef4444; padding: 20px; border-radius: 8px; text-align: center;">
          <strong style="font-size: 20px; color: #ef4444;">LAST CHANCE: ${discountPercent}% OFF</strong><br>
          Use code: <strong style="font-size: 18px;">${discountCode}</strong><br>
          <span style="color: #6b7280;">Our biggest discount ever - only for you</span>
        </p>
        <p><a href="${ctaUrl}" style="background-color: #ef4444; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">Save My Data Now</a></p>
        <p>If we don't hear from you, we'll miss you. Thanks for being part of SafeScoring.</p>
        <p>Best,<br>The SafeScoring Team</p>
      `,
      text: `Hi ${userName},\n\nFINAL NOTICE: Your SafeScoring data will be deleted tomorrow.\n\nLast chance: Use code ${discountCode} for ${discountPercent}% off: ${ctaUrl}\n\nBest,\nThe SafeScoring Team`,
    },
  };

  return templates[step] || templates[1];
}

/**
 * Process win-back campaigns (run via cron)
 */
export async function processWinbackCampaigns() {
  const supabase = getSupabaseAdmin();

  // Get all active win-back campaigns
  const { data: campaigns } = await supabase
    .from("winback_campaigns")
    .select("*")
    .eq("status", "active");

  if (!campaigns || campaigns.length === 0) {
    return { processed: 0 };
  }

  let processed = 0;
  let emailsSent = 0;
  let expired = 0;

  for (const campaign of campaigns) {
    const daysSinceChurn = Math.floor(
      (new Date() - new Date(campaign.churned_at)) / (1000 * 60 * 60 * 24)
    );

    // Check if campaign has expired
    if (new Date() >= new Date(campaign.expires_at)) {
      await supabase
        .from("winback_campaigns")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", campaign.id);

      // Schedule data deletion (or mark for deletion)
      expired++;
      processed++;
      continue;
    }

    // Find next email to send
    for (const [key, emailConfig] of Object.entries(WINBACK_EMAILS)) {
      const stepField = `email_${emailConfig.step}_sent_at`;

      // Check if this email should be sent
      if (
        daysSinceChurn >= emailConfig.dayAfterChurn &&
        !campaign[stepField]
      ) {
        await sendWinbackEmail(campaign.id, emailConfig.step);
        emailsSent++;
        break; // Only send one email per processing
      }
    }

    processed++;
  }

  return { processed, emailsSent, expired };
}

/**
 * Handle win-back conversion
 */
export async function handleWinbackConversion(userId, newPlan) {
  const supabase = getSupabaseAdmin();

  // Update win-back campaign
  const { data: campaign } = await supabase
    .from("winback_campaigns")
    .update({
      status: "converted",
      converted_at: new Date().toISOString(),
      converted_plan: newPlan,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("status", "active")
    .select()
    .single();

  return { success: true, campaignId: campaign?.id };
}

/**
 * Get win-back statistics
 */
export async function getWinbackStats(days = 90) {
  const supabase = getSupabaseAdmin();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: campaigns } = await supabase
    .from("winback_campaigns")
    .select("*")
    .gte("churned_at", startDate.toISOString());

  if (!campaigns || campaigns.length === 0) {
    return {
      total: 0,
      converted: 0,
      expired: 0,
      active: 0,
      conversionRate: 0,
      avgDaysToConvert: 0,
      topReasons: [],
    };
  }

  const stats = {
    total: campaigns.length,
    converted: campaigns.filter(c => c.status === "converted").length,
    expired: campaigns.filter(c => c.status === "expired").length,
    active: campaigns.filter(c => c.status === "active").length,
  };

  stats.conversionRate = ((stats.converted / stats.total) * 100).toFixed(1);

  // Calculate average days to convert
  const convertedCampaigns = campaigns.filter(c => c.status === "converted" && c.converted_at);
  if (convertedCampaigns.length > 0) {
    const totalDays = convertedCampaigns.reduce((sum, c) => {
      const days = Math.floor(
        (new Date(c.converted_at) - new Date(c.churned_at)) / (1000 * 60 * 60 * 24)
      );
      return sum + days;
    }, 0);
    stats.avgDaysToConvert = (totalDays / convertedCampaigns.length).toFixed(1);
  } else {
    stats.avgDaysToConvert = 0;
  }

  // Top churn reasons
  const reasonCounts = {};
  campaigns.forEach(c => {
    if (c.churn_reason) {
      reasonCounts[c.churn_reason] = (reasonCounts[c.churn_reason] || 0) + 1;
    }
  });

  stats.topReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => ({ reason, count }));

  return stats;
}

export default {
  createWinbackCampaign,
  sendWinbackEmail,
  processWinbackCampaigns,
  handleWinbackConversion,
  getWinbackStats,
  WINBACK_EMAILS,
  CAMPAIGN_TYPES,
};
