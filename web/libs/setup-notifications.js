/**
 * Setup Notifications Service
 *
 * Handles email and Telegram notifications for setups
 */

import { sendEmail } from "./resend";
import {
  sendIncidentAlert,
  sendScoreChangeAlert,
  sendProductUpdateAlert,
} from "./telegram-notifications";

/**
 * Email template styles
 */
const emailStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #0f172a; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .card { background: #1e293b; border-radius: 12px; padding: 24px; margin-bottom: 16px; }
  .header { text-align: center; margin-bottom: 24px; }
  .logo { font-size: 24px; font-weight: bold; color: #3b82f6; }
  .title { font-size: 20px; font-weight: bold; color: #f1f5f9; margin-top: 8px; }
  .subtitle { color: #94a3b8; font-size: 14px; }
  .score-badge { display: inline-block; padding: 8px 16px; border-radius: 999px; font-size: 24px; font-weight: bold; }
  .score-green { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
  .score-amber { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
  .score-red { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
  .severity-critical { background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 4px 12px; border-radius: 4px; }
  .severity-high { background: rgba(245, 158, 11, 0.2); color: #f59e0b; padding: 4px 12px; border-radius: 4px; }
  .severity-medium { background: rgba(59, 130, 246, 0.2); color: #3b82f6; padding: 4px 12px; border-radius: 4px; }
  .content { color: #e2e8f0; font-size: 14px; line-height: 1.6; }
  .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; }
  .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 24px; }
  .change-positive { color: #22c55e; }
  .change-negative { color: #ef4444; }
`;

/**
 * Get score badge class based on score
 */
function getScoreClass(score) {
  if (score >= 80) return "score-green";
  if (score >= 60) return "score-amber";
  return "score-red";
}

/**
 * Send incident notification email
 *
 * @param {Object} user - User object with email
 * @param {Object} setup - Setup details
 * @param {Object} incident - Incident details
 */
export async function sendIncidentNotificationEmail(user, setup, incident) {
  const severityClass = `severity-${incident.severity?.toLowerCase() || "medium"}`;

  const html = `
<!DOCTYPE html>
<html>
<head><style>${emailStyles}</style></head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">SafeScoring</div>
      <div class="title">\u26A0\uFE0F Security Incident Alert</div>
    </div>

    <div class="card">
      <p class="content">
        A security incident has been detected affecting a product in your stack <strong>${setup.name}</strong>.
      </p>

      <table style="width: 100%; margin: 16px 0;">
        <tr>
          <td style="color: #94a3b8; padding: 8px 0;">Severity</td>
          <td><span class="${severityClass}">${(incident.severity || "UNKNOWN").toUpperCase()}</span></td>
        </tr>
        <tr>
          <td style="color: #94a3b8; padding: 8px 0;">Product</td>
          <td style="color: #f1f5f9;">${incident.product_name || "Unknown"}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; padding: 8px 0;">Incident</td>
          <td style="color: #f1f5f9;">${incident.title || "Security incident"}</td>
        </tr>
        ${incident.date ? `
        <tr>
          <td style="color: #94a3b8; padding: 8px 0;">Date</td>
          <td style="color: #f1f5f9;">${new Date(incident.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</td>
        </tr>
        ` : ""}
      </table>

      ${incident.description ? `<p class="content" style="margin-top: 16px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px;">${incident.description}</p>` : ""}

      <div style="text-align: center; margin-top: 24px;">
        <a href="https://safescoring.io/dashboard/setups/${setup.id}" class="button">View Stack Details</a>
      </div>
    </div>

    <div class="footer">
      <p>You received this because you have incident alerts enabled for your stacks.</p>
      <p><a href="https://safescoring.io/dashboard/settings" style="color: #3b82f6;">Manage notification preferences</a></p>
    </div>
  </div>
</body>
</html>
`;

  return sendEmail({
    to: user.email,
    subject: `[SafeScoring Alert] ${(incident.severity || "").toUpperCase()}: ${incident.title || "Security Incident"}`,
    html,
  });
}

/**
 * Send score change notification email
 *
 * @param {Object} user - User object with email
 * @param {Object} setup - Setup details
 * @param {number} oldScore - Previous score
 * @param {number} newScore - New score
 */
export async function sendScoreChangeNotificationEmail(user, setup, oldScore, newScore) {
  const change = newScore - oldScore;
  const changeClass = change > 0 ? "change-positive" : "change-negative";
  const changeText = change > 0 ? `+${change}` : String(change);
  const direction = change > 0 ? "\u{1F4C8}" : "\u{1F4C9}";

  const html = `
<!DOCTYPE html>
<html>
<head><style>${emailStyles}</style></head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">SafeScoring</div>
      <div class="title">${direction} Score Update</div>
    </div>

    <div class="card">
      <p class="content">
        The SAFE score for your stack <strong>${setup.name}</strong> has changed.
      </p>

      <div style="display: flex; justify-content: center; gap: 24px; margin: 24px 0; text-align: center;">
        <div>
          <div style="color: #94a3b8; font-size: 12px; margin-bottom: 4px;">Previous</div>
          <span class="score-badge ${getScoreClass(oldScore)}">${oldScore}</span>
        </div>
        <div style="font-size: 24px; color: #64748b; padding-top: 20px;">\u2192</div>
        <div>
          <div style="color: #94a3b8; font-size: 12px; margin-bottom: 4px;">New</div>
          <span class="score-badge ${getScoreClass(newScore)}">${newScore}</span>
        </div>
      </div>

      <div style="text-align: center; margin: 16px 0;">
        <span class="${changeClass}" style="font-size: 18px; font-weight: bold;">${changeText} points</span>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="https://safescoring.io/dashboard/setups/${setup.id}" class="button">View Stack Details</a>
      </div>
    </div>

    <div class="footer">
      <p>You received this because you have score change alerts enabled.</p>
      <p><a href="https://safescoring.io/dashboard/settings" style="color: #3b82f6;">Manage notification preferences</a></p>
    </div>
  </div>
</body>
</html>
`;

  return sendEmail({
    to: user.email,
    subject: `[SafeScoring] Your "${setup.name}" score ${change > 0 ? "improved" : "decreased"} (${changeText})`,
    html,
  });
}

/**
 * Send notification via all enabled channels
 *
 * @param {Object} params - Notification parameters
 */
export async function sendSetupNotification({
  user,
  setup,
  type,
  prefs,
  data,
}) {
  const results = { email: null, telegram: null };

  // Check if user wants this type of notification
  const shouldNotify = {
    incident: prefs.notify_incidents,
    score_change: prefs.notify_score_changes,
    product_update: prefs.notify_product_updates,
  }[type];

  if (!shouldNotify) {
    return { skipped: true, reason: "Notification type disabled" };
  }

  // Send email if enabled
  if (prefs.email_enabled && user.email) {
    try {
      switch (type) {
        case "incident":
          results.email = await sendIncidentNotificationEmail(
            user,
            setup,
            data.incident
          );
          break;
        case "score_change":
          results.email = await sendScoreChangeNotificationEmail(
            user,
            setup,
            data.oldScore,
            data.newScore
          );
          break;
      }
    } catch (error) {
      console.error("Email notification failed:", error);
      results.email = { error: error.message };
    }
  }

  // Send Telegram if enabled
  if (prefs.telegram_enabled && prefs.telegram_chat_id) {
    try {
      switch (type) {
        case "incident":
          results.telegram = await sendIncidentAlert(
            prefs.telegram_chat_id,
            setup,
            data.incident
          );
          break;
        case "score_change":
          results.telegram = await sendScoreChangeAlert(
            prefs.telegram_chat_id,
            setup,
            data.oldScore,
            data.newScore
          );
          break;
        case "product_update":
          results.telegram = await sendProductUpdateAlert(
            prefs.telegram_chat_id,
            setup,
            data.action,
            data.product
          );
          break;
      }
    } catch (error) {
      console.error("Telegram notification failed:", error);
      results.telegram = { error: error.message };
    }
  }

  return results;
}

export default {
  sendIncidentNotificationEmail,
  sendScoreChangeNotificationEmail,
  sendSetupNotification,
};
