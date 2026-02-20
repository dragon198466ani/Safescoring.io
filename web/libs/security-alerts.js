/**
 * Real-time Security Alerts System
 * Sends alerts via multiple channels (Telegram, Slack, Email)
 */

const ALERT_CHANNELS = {
  telegram: {
    enabled: !!process.env.TELEGRAM_BOT_TOKEN,
    token: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_SECURITY_CHAT_ID,
  },
  slack: {
    enabled: !!process.env.SLACK_SECURITY_WEBHOOK,
    webhookUrl: process.env.SLACK_SECURITY_WEBHOOK,
  },
};

// Severity levels and their emoji/colors
const SEVERITY_CONFIG = {
  critical: { emoji: "🚨", color: "#FF0000", priority: 1 },
  high: { emoji: "⚠️", color: "#FF6600", priority: 2 },
  medium: { emoji: "📢", color: "#FFCC00", priority: 3 },
  low: { emoji: "ℹ️", color: "#0099FF", priority: 4 },
};

// Rate limit alerts (prevent spam)
const alertRateLimit = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_ALERTS_PER_WINDOW = 10;

/**
 * Check if alert should be rate limited
 */
function shouldRateLimit(alertType) {
  const key = alertType;
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  // Clean old entries
  const timestamps = alertRateLimit.get(key) || [];
  const recentTimestamps = timestamps.filter((t) => t > windowStart);

  if (recentTimestamps.length >= MAX_ALERTS_PER_WINDOW) {
    return true;
  }

  recentTimestamps.push(now);
  alertRateLimit.set(key, recentTimestamps);
  return false;
}

/**
 * Send alert to Telegram
 */
async function sendTelegramAlert(alert) {
  if (!ALERT_CHANNELS.telegram.enabled) return;

  const { token, chatId } = ALERT_CHANNELS.telegram;
  const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.medium;

  const message = `${config.emoji} *SafeScoring Security Alert*

*Type:* ${alert.type}
*Severity:* ${alert.severity.toUpperCase()}
*Time:* ${new Date().toISOString()}

*Details:*
${alert.message}

${alert.details ? `\`\`\`json\n${JSON.stringify(alert.details, null, 2)}\n\`\`\`` : ""}`;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    });
  } catch (error) {
    console.error("[SECURITY ALERT] Failed to send Telegram alert:", error.message);
  }
}

/**
 * Send alert to Slack
 */
async function sendSlackAlert(alert) {
  if (!ALERT_CHANNELS.slack.enabled) return;

  const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.medium;

  const payload = {
    attachments: [
      {
        color: config.color,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `${config.emoji} Security Alert: ${alert.type}`,
            },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Severity:*\n${alert.severity}` },
              { type: "mrkdwn", text: `*Time:*\n${new Date().toISOString()}` },
            ],
          },
          {
            type: "section",
            text: { type: "mrkdwn", text: `*Message:*\n${alert.message}` },
          },
        ],
      },
    ],
  };

  if (alert.details) {
    payload.attachments[0].blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Details:*\n\`\`\`${JSON.stringify(alert.details, null, 2)}\`\`\``,
      },
    });
  }

  try {
    await fetch(ALERT_CHANNELS.slack.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("[SECURITY ALERT] Failed to send Slack alert:", error.message);
  }
}

/**
 * Main alert function
 */
export async function sendSecurityAlert(alert) {
  const { type, severity = "medium", message, details = null, immediate = false } = alert;

  // Rate limit non-immediate alerts
  if (!immediate && shouldRateLimit(type)) {
    console.warn(`[SECURITY ALERT] Rate limited: ${type}`);
    return { sent: false, reason: "rate_limited" };
  }

  // Log to console
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.medium;
  console.log(`[SECURITY ${severity.toUpperCase()}] ${config.emoji} ${type}: ${message}`);

  // Send to all enabled channels in parallel
  const promises = [];

  if (ALERT_CHANNELS.telegram.enabled) {
    promises.push(sendTelegramAlert({ type, severity, message, details }));
  }

  if (ALERT_CHANNELS.slack.enabled) {
    promises.push(sendSlackAlert({ type, severity, message, details }));
  }

  await Promise.allSettled(promises);

  return { sent: true, channels: promises.length };
}

/**
 * Pre-configured alert types
 */
export const SecurityAlerts = {
  // Critical alerts
  dataBreachAttempt: (details) =>
    sendSecurityAlert({
      type: "DATA_BREACH_ATTEMPT",
      severity: "critical",
      message: "Potential data breach attempt detected",
      details,
      immediate: true,
    }),

  massDeleteAttempt: (details) =>
    sendSecurityAlert({
      type: "MASS_DELETE_ATTEMPT",
      severity: "critical",
      message: "Mass deletion attempt blocked",
      details,
      immediate: true,
    }),

  suspiciousAdminActivity: (details) =>
    sendSecurityAlert({
      type: "SUSPICIOUS_ADMIN",
      severity: "critical",
      message: "Suspicious admin activity detected",
      details,
      immediate: true,
    }),

  // High alerts
  bruteForceDetected: (details) =>
    sendSecurityAlert({
      type: "BRUTE_FORCE",
      severity: "high",
      message: "Brute force attack detected",
      details,
    }),

  sessionHijackAttempt: (details) =>
    sendSecurityAlert({
      type: "SESSION_HIJACK",
      severity: "high",
      message: "Possible session hijacking attempt",
      details,
    }),

  rateLimitExceeded: (details) =>
    sendSecurityAlert({
      type: "RATE_LIMIT_EXCEEDED",
      severity: "high",
      message: "Rate limit significantly exceeded",
      details,
    }),

  // Medium alerts
  honeypotTriggered: (details) =>
    sendSecurityAlert({
      type: "HONEYPOT_TRIGGERED",
      severity: "medium",
      message: "Honeypot field triggered (bot detected)",
      details,
    }),

  unusualLoginPattern: (details) =>
    sendSecurityAlert({
      type: "UNUSUAL_LOGIN",
      severity: "medium",
      message: "Unusual login pattern detected",
      details,
    }),

  // Low alerts
  failedLoginAttempt: (details) =>
    sendSecurityAlert({
      type: "FAILED_LOGIN",
      severity: "low",
      message: "Multiple failed login attempts",
      details,
    }),
};

export default SecurityAlerts;
