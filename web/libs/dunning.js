/**
 * Dunning System
 * Failed payment recovery through email sequences
 *
 * Timeline:
 * Day 0: Payment fails → Email 1 (Soft reminder)
 * Day 3: Email 2 (Reminder + help)
 * Day 7: Email 3 (Urgency - access expires in 3 days)
 * Day 10: Email 4 (Last chance)
 * Day 14: Access revoked + Email 5 (Win-back offer)
 *
 * Recovery rate target: 60-80%
 */

import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "./resend";
import config from "@/config";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Dunning email templates
export const DUNNING_EMAILS = {
  email_1: {
    step: 1,
    dayAfterFailure: 0,
    subject: "Oops! Your payment didn't go through",
    type: "dunning_1",
    template: "dunning_soft_reminder",
  },
  email_2: {
    step: 2,
    dayAfterFailure: 3,
    subject: "Need help updating your payment method?",
    type: "dunning_2",
    template: "dunning_help_offer",
  },
  email_3: {
    step: 3,
    dayAfterFailure: 7,
    subject: "Your SafeScoring access expires in 3 days",
    type: "dunning_3",
    template: "dunning_urgency",
  },
  email_4: {
    step: 4,
    dayAfterFailure: 10,
    subject: "Last chance to keep your SafeScoring data",
    type: "dunning_4",
    template: "dunning_last_chance",
  },
  email_5: {
    step: 5,
    dayAfterFailure: 14,
    subject: "We miss you - 30% off to come back",
    type: "dunning_5",
    template: "dunning_winback",
  },
};

// Grace period configuration
export const GRACE_PERIOD_DAYS = 14;
export const MAX_RETRY_ATTEMPTS = 4;

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
 * Handle payment failure event
 * Called from webhook when payment fails
 */
export async function handlePaymentFailure(userId, failureReason = null) {
  const supabase = getSupabaseAdmin();

  // Check for existing dunning sequence
  const { data: existingDunning } = await supabase
    .from("dunning_sequences")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (existingDunning) {
    // Update existing sequence
    await supabase
      .from("dunning_sequences")
      .update({
        failure_count: existingDunning.failure_count + 1,
        last_failure_at: new Date().toISOString(),
        failure_reason: failureReason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingDunning.id);

    return { dunningId: existingDunning.id, isNew: false };
  }

  // Create new dunning sequence
  const gracePeriodEnds = new Date();
  gracePeriodEnds.setDate(gracePeriodEnds.getDate() + GRACE_PERIOD_DAYS);

  const { data: dunning, error } = await supabase
    .from("dunning_sequences")
    .insert({
      user_id: userId,
      failure_count: 1,
      first_failure_at: new Date().toISOString(),
      last_failure_at: new Date().toISOString(),
      failure_reason: failureReason,
      status: "active",
      current_step: 0,
      grace_period_ends_at: gracePeriodEnds.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating dunning sequence:", error);
    throw error;
  }

  // Send first dunning email
  await sendDunningEmail(dunning.id, 1);

  return { dunningId: dunning.id, isNew: true };
}

/**
 * Send dunning email based on step
 */
export async function sendDunningEmail(dunningId, step) {
  const supabase = getSupabaseAdmin();

  // Get dunning and user info
  const { data: dunning } = await supabase
    .from("dunning_sequences")
    .select(`
      *,
      users (
        id,
        email,
        name,
        plan_type,
        lemon_squeezy_customer_id
      )
    `)
    .eq("id", dunningId)
    .single();

  if (!dunning || !dunning.users) {
    console.error("Dunning sequence or user not found");
    return { success: false, error: "Not found" };
  }

  const emailConfig = Object.values(DUNNING_EMAILS).find(e => e.step === step);
  if (!emailConfig) {
    console.error("Invalid dunning step:", step);
    return { success: false, error: "Invalid step" };
  }

  const user = dunning.users;

  // Generate email content
  const emailContent = generateDunningEmailContent(step, {
    userName: user.name || "there",
    planName: user.plan_type,
    gracePeriodEnds: dunning.grace_period_ends_at,
    updatePaymentUrl: `${config.domainName}/dashboard/settings?tab=billing`,
  });

  // Send email
  try {
    await sendEmail({
      to: user.email,
      subject: emailConfig.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    // Record email sent
    await supabase
      .from("dunning_sequences")
      .update({
        [`email_${step}_sent_at`]: new Date().toISOString(),
        current_step: step,
        updated_at: new Date().toISOString(),
      })
      .eq("id", dunningId);

    // Track in engagement emails
    await supabase
      .from("engagement_emails")
      .insert({
        user_id: user.id,
        email_type: emailConfig.type,
        email_subject: emailConfig.subject,
        status: "sent",
        sent_at: new Date().toISOString(),
        metadata: { dunning_id: dunningId, step },
      });

    return { success: true, step };
  } catch (error) {
    console.error("Error sending dunning email:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate dunning email content
 */
function generateDunningEmailContent(step, data) {
  const baseUrl = `https://${config.domainName}`;
  const { userName, planName, gracePeriodEnds, updatePaymentUrl } = data;

  const graceDate = new Date(gracePeriodEnds).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const templates = {
    1: {
      html: `
        <h2>Hi ${userName},</h2>
        <p>We tried to process your payment for SafeScoring ${planName}, but it didn't go through.</p>
        <p>This can happen for a few reasons:</p>
        <ul>
          <li>Your card expired</li>
          <li>Insufficient funds</li>
          <li>Your bank blocked the transaction</li>
        </ul>
        <p><strong>Don't worry - your access is still active.</strong></p>
        <p>Please update your payment method to continue using SafeScoring without interruption:</p>
        <p><a href="${updatePaymentUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Update Payment Method</a></p>
        <p>If you have any questions, just reply to this email.</p>
        <p>Best,<br>The SafeScoring Team</p>
      `,
      text: `Hi ${userName},\n\nWe tried to process your payment for SafeScoring ${planName}, but it didn't go through.\n\nPlease update your payment method: ${updatePaymentUrl}\n\nBest,\nThe SafeScoring Team`,
    },
    2: {
      html: `
        <h2>Hi ${userName},</h2>
        <p>We noticed your payment still hasn't been updated. Need help?</p>
        <p>Here are some quick solutions:</p>
        <ul>
          <li><strong>Card expired?</strong> Add a new card in your billing settings</li>
          <li><strong>Bank blocking it?</strong> Contact your bank to authorize the charge</li>
          <li><strong>Want to switch to annual?</strong> Save 20% and avoid monthly charges</li>
        </ul>
        <p><a href="${updatePaymentUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Update Payment Method</a></p>
        <p>Your access remains active until <strong>${graceDate}</strong>.</p>
        <p>Reply to this email if you need any assistance - we're here to help!</p>
        <p>Best,<br>The SafeScoring Team</p>
      `,
      text: `Hi ${userName},\n\nWe noticed your payment still hasn't been updated.\n\nYour access remains active until ${graceDate}.\n\nUpdate your payment: ${updatePaymentUrl}\n\nBest,\nThe SafeScoring Team`,
    },
    3: {
      html: `
        <h2>Hi ${userName},</h2>
        <p style="color: #f59e0b; font-weight: bold;">Your SafeScoring access expires in 3 days.</p>
        <p>We haven't been able to process your payment, and your subscription will be paused on <strong>${graceDate}</strong>.</p>
        <p>Here's what you'll lose access to:</p>
        <ul>
          <li>All your saved setups and security analyses</li>
          <li>Score tracking and alerts</li>
          <li>Product comparisons</li>
          <li>PDF exports</li>
        </ul>
        <p><a href="${updatePaymentUrl}" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Keep My Access</a></p>
        <p>Your data will be preserved, but you won't be able to access premium features until payment is updated.</p>
        <p>Best,<br>The SafeScoring Team</p>
      `,
      text: `Hi ${userName},\n\nYour SafeScoring access expires in 3 days (${graceDate}).\n\nUpdate your payment to keep access: ${updatePaymentUrl}\n\nBest,\nThe SafeScoring Team`,
    },
    4: {
      html: `
        <h2>Hi ${userName},</h2>
        <p style="color: #ef4444; font-weight: bold;">This is your last chance to keep your SafeScoring access.</p>
        <p>Tomorrow, your subscription will be paused and you'll lose access to:</p>
        <ul>
          <li>Your security setups and tracking history</li>
          <li>Real-time score alerts</li>
          <li>All premium features</li>
        </ul>
        <p><strong>Your data will be preserved for 90 days</strong>, so you can come back anytime.</p>
        <p><a href="${updatePaymentUrl}" style="background-color: #ef4444; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Update Payment Now</a></p>
        <p>Questions? Just reply to this email.</p>
        <p>Best,<br>The SafeScoring Team</p>
      `,
      text: `Hi ${userName},\n\nThis is your last chance to keep your SafeScoring access.\n\nUpdate your payment now: ${updatePaymentUrl}\n\nBest,\nThe SafeScoring Team`,
    },
    5: {
      html: `
        <h2>Hi ${userName},</h2>
        <p>Your SafeScoring subscription has been paused due to payment issues.</p>
        <p>We've preserved all your data - your setups, history, and preferences are safe.</p>
        <p><strong>Want to come back? Here's 30% off your next 3 months.</strong></p>
        <p>Use code: <strong style="background-color: #f3f4f6; padding: 4px 8px; border-radius: 4px;">WELCOME30</strong></p>
        <p><a href="${baseUrl}/pricing?code=WELCOME30" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reactivate with 30% Off</a></p>
        <p>Your data will be deleted after 90 days of inactivity.</p>
        <p>We hope to see you back soon!</p>
        <p>Best,<br>The SafeScoring Team</p>
      `,
      text: `Hi ${userName},\n\nYour SafeScoring subscription has been paused.\n\nWant to come back? Use code WELCOME30 for 30% off: ${baseUrl}/pricing?code=WELCOME30\n\nBest,\nThe SafeScoring Team`,
    },
  };

  return templates[step] || templates[1];
}

/**
 * Process dunning sequences (run via cron)
 * Checks all active dunning sequences and sends appropriate emails
 */
export async function processDunningSequences() {
  const supabase = getSupabaseAdmin();

  // Get all active dunning sequences
  const { data: dunningSequences } = await supabase
    .from("dunning_sequences")
    .select("*")
    .eq("status", "active");

  if (!dunningSequences || dunningSequences.length === 0) {
    return { processed: 0 };
  }

  let processed = 0;
  let emailsSent = 0;
  let accessRevoked = 0;

  for (const dunning of dunningSequences) {
    const daysSinceFailure = Math.floor(
      (new Date() - new Date(dunning.first_failure_at)) / (1000 * 60 * 60 * 24)
    );

    // Find next email to send
    for (const [key, emailConfig] of Object.entries(DUNNING_EMAILS)) {
      const stepField = `email_${emailConfig.step}_sent_at`;

      // Check if this email should be sent
      if (
        daysSinceFailure >= emailConfig.dayAfterFailure &&
        !dunning[stepField]
      ) {
        await sendDunningEmail(dunning.id, emailConfig.step);
        emailsSent++;
        break; // Only send one email per processing
      }
    }

    // Check if grace period has ended
    if (new Date() >= new Date(dunning.grace_period_ends_at)) {
      // Revoke access
      await supabase
        .from("users")
        .update({
          has_access: false,
        })
        .eq("id", dunning.user_id);

      // Update dunning status
      await supabase
        .from("dunning_sequences")
        .update({
          status: "churned",
          access_revoked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", dunning.id);

      accessRevoked++;
    }

    processed++;
  }

  return { processed, emailsSent, accessRevoked };
}

/**
 * Handle successful payment recovery
 */
export async function handlePaymentRecovered(userId, recoveryMethod = "automatic_retry") {
  const supabase = getSupabaseAdmin();

  // Update dunning sequence
  const { data: dunning } = await supabase
    .from("dunning_sequences")
    .update({
      status: "recovered",
      recovered_at: new Date().toISOString(),
      recovery_method: recoveryMethod,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("status", "active")
    .select()
    .single();

  // Ensure user has access
  await supabase
    .from("users")
    .update({
      has_access: true,
    })
    .eq("id", userId);

  return { success: true, dunningId: dunning?.id };
}

/**
 * Get dunning statistics
 */
export async function getDunningStats(days = 30) {
  const supabase = getSupabaseAdmin();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: sequences } = await supabase
    .from("dunning_sequences")
    .select("*")
    .gte("first_failure_at", startDate.toISOString());

  if (!sequences || sequences.length === 0) {
    return {
      total: 0,
      recovered: 0,
      churned: 0,
      active: 0,
      recoveryRate: 0,
      avgRecoveryDays: 0,
    };
  }

  const stats = {
    total: sequences.length,
    recovered: sequences.filter(s => s.status === "recovered").length,
    churned: sequences.filter(s => s.status === "churned").length,
    active: sequences.filter(s => s.status === "active").length,
  };

  stats.recoveryRate = ((stats.recovered / stats.total) * 100).toFixed(1);

  // Calculate average recovery time
  const recoveredSequences = sequences.filter(s => s.status === "recovered" && s.recovered_at);
  if (recoveredSequences.length > 0) {
    const totalDays = recoveredSequences.reduce((sum, s) => {
      const days = Math.floor(
        (new Date(s.recovered_at) - new Date(s.first_failure_at)) / (1000 * 60 * 60 * 24)
      );
      return sum + days;
    }, 0);
    stats.avgRecoveryDays = (totalDays / recoveredSequences.length).toFixed(1);
  } else {
    stats.avgRecoveryDays = 0;
  }

  return stats;
}

export default {
  handlePaymentFailure,
  sendDunningEmail,
  processDunningSequences,
  handlePaymentRecovered,
  getDunningStats,
  DUNNING_EMAILS,
  GRACE_PERIOD_DAYS,
};
