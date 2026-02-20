/**
 * Crypto Subscription Retention System
 * Handles renewal reminders and retention for crypto payments
 */

import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "./resend";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Get users with expiring crypto subscriptions
 * @param {number} daysUntilExpiry - Days before expiry to check
 */
export async function getExpiringCryptoSubscriptions(daysUntilExpiry = 7) {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase not configured");
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);

  const { data, error } = await supabase
    .from("subscriptions")
    .select(`
      id,
      user_id,
      plan_type,
      payment_method,
      current_period_end,
      users (
        id,
        email,
        name
      )
    `)
    .eq("payment_method", "crypto")
    .eq("status", "active")
    .lte("current_period_end", expiryDate.toISOString())
    .gte("current_period_end", new Date().toISOString());

  if (error) throw error;
  return data || [];
}

/**
 * Send renewal reminder email
 */
export async function sendRenewalReminder(subscription, daysLeft) {
  const user = subscription.users;
  if (!user?.email) return;

  const planName = subscription.plan_type?.charAt(0).toUpperCase() +
                   subscription.plan_type?.slice(1) || "Premium";

  const renewalUrl = `${process.env.NEXTAUTH_URL}/dashboard?renew=crypto&plan=${subscription.plan_type}`;

  await sendEmail({
    to: user.email,
    subject: `Your SafeScoring ${planName} subscription expires in ${daysLeft} days`,
    html: `
      <h2>Hey ${user.name || "there"}!</h2>
      <p>Your <strong>${planName}</strong> subscription will expire in <strong>${daysLeft} days</strong>.</p>
      <p>Since you paid with crypto, we can't auto-renew your subscription. Please renew manually to keep your access.</p>
      <p>
        <a href="${renewalUrl}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px;">
          Renew Now
        </a>
      </p>
      <p>If you have any questions, reply to this email!</p>
      <p>- The SafeScoring Team</p>
    `,
  });

  // Log the reminder
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  await supabase.from("retention_emails").insert({
    user_id: user.id,
    subscription_id: subscription.id,
    email_type: "crypto_renewal_reminder",
    days_until_expiry: daysLeft,
    sent_at: new Date().toISOString(),
  });
}

/**
 * Process all expiring subscriptions
 */
export async function processExpiringSubscriptions() {
  const results = {
    processed: 0,
    errors: [],
  };

  // Check 7 days, 3 days, and 1 day before expiry
  const checkDays = [7, 3, 1];

  for (const days of checkDays) {
    try {
      const subscriptions = await getExpiringCryptoSubscriptions(days);

      for (const sub of subscriptions) {
        try {
          // Calculate exact days left
          const expiryDate = new Date(sub.current_period_end);
          const now = new Date();
          const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

          // Only send if we haven't sent for this day range
          if (daysLeft === days) {
            await sendRenewalReminder(sub, daysLeft);
            results.processed++;
          }
        } catch (err) {
          results.errors.push({
            subscriptionId: sub.id,
            error: err.message,
          });
        }
      }
    } catch (err) {
      results.errors.push({
        days,
        error: err.message,
      });
    }
  }

  return results;
}

/**
 * Check if user has active crypto subscription
 */
export async function hasActiveCryptoSubscription(userId) {
  if (!supabaseUrl || !supabaseServiceKey) return false;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data } = await supabase
    .from("subscriptions")
    .select("id, current_period_end")
    .eq("user_id", userId)
    .eq("payment_method", "crypto")
    .eq("status", "active")
    .single();

  if (!data) return false;

  return new Date(data.current_period_end) > new Date();
}

/**
 * Get days until crypto subscription expires
 */
export async function getDaysUntilExpiry(userId) {
  if (!supabaseUrl || !supabaseServiceKey) return null;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data } = await supabase
    .from("subscriptions")
    .select("current_period_end")
    .eq("user_id", userId)
    .eq("payment_method", "crypto")
    .eq("status", "active")
    .single();

  if (!data) return null;

  const expiryDate = new Date(data.current_period_end);
  const now = new Date();
  return Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
}

export default {
  getExpiringCryptoSubscriptions,
  sendRenewalReminder,
  processExpiringSubscriptions,
  hasActiveCryptoSubscription,
  getDaysUntilExpiry,
};
