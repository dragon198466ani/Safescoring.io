/**
 * Telegram Notifications Service
 *
 * Sends notifications via Telegram Bot API
 *
 * Required environment variable:
 * - TELEGRAM_BOT_TOKEN: Bot token from @BotFather
 */

const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

/**
 * Get the bot token from environment
 */
function getBotToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN not configured");
    return null;
  }
  return token;
}

/**
 * Send a message via Telegram
 *
 * @param {string} chatId - Telegram chat ID
 * @param {string} text - Message text (supports HTML)
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Telegram API response
 */
export async function sendTelegramMessage(chatId, text, options = {}) {
  const token = getBotToken();
  if (!token) {
    return { ok: false, error: "Bot token not configured" };
  }

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}${token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options.parseMode || "HTML",
        disable_web_page_preview: options.disablePreview ?? true,
        ...options,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error("Telegram API error:", data.description);
    }

    return data;
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
    return { ok: false, error: error.message };
  }
}

/**
 * Send an incident alert via Telegram
 *
 * @param {string} chatId - Telegram chat ID
 * @param {Object} setup - Setup details
 * @param {Object} incident - Incident details
 */
export async function sendIncidentAlert(chatId, setup, incident) {
  const severityEmoji = {
    critical: "\u{1F6A8}", // police light
    high: "\u{26A0}\u{FE0F}", // warning
    medium: "\u{2139}\u{FE0F}", // info
    low: "\u{1F4AC}", // speech bubble
  };

  const emoji = severityEmoji[incident.severity?.toLowerCase()] || "\u{1F514}";
  const severity = (incident.severity || "UNKNOWN").toUpperCase();

  const message = `
${emoji} <b>Security Incident Alert</b>

<b>Severity:</b> ${severity}
<b>Stack:</b> ${setup.name}
<b>Product:</b> ${incident.product_name || "Unknown"}

<b>Title:</b> ${incident.title || "Security incident detected"}

${incident.description ? `<i>${incident.description.substring(0, 200)}${incident.description.length > 200 ? "..." : ""}</i>` : ""}

<a href="https://safescoring.io/dashboard/setups/${setup.id}">View Stack Details</a>

<i>SafeScoring's editorial opinions based on our published methodology. Scores are not guarantees of security. https://safescoring.io/legal</i>
`;

  return sendTelegramMessage(chatId, message.trim());
}

/**
 * Send a score change notification via Telegram
 *
 * @param {string} chatId - Telegram chat ID
 * @param {Object} setup - Setup details
 * @param {number} oldScore - Previous score
 * @param {number} newScore - New score
 */
export async function sendScoreChangeAlert(chatId, setup, oldScore, newScore) {
  const change = newScore - oldScore;
  const direction = change > 0 ? "\u{1F4C8}" : "\u{1F4C9}"; // chart up/down
  const changeText = change > 0 ? `+${change}` : String(change);

  const message = `
${direction} <b>Score Update</b>

<b>Stack:</b> ${setup.name}
<b>Previous Score:</b> ${oldScore}
<b>New Score:</b> ${newScore}
<b>Change:</b> ${changeText} points

<a href="https://safescoring.io/dashboard/setups/${setup.id}">View Details</a>

<i>SafeScoring's editorial opinions based on our published methodology. Scores are not guarantees of security. https://safescoring.io/legal</i>
`;

  return sendTelegramMessage(chatId, message.trim());
}

/**
 * Send a product update notification via Telegram
 *
 * @param {string} chatId - Telegram chat ID
 * @param {Object} setup - Setup details
 * @param {string} action - Action type (added/removed)
 * @param {Object} product - Product details
 */
export async function sendProductUpdateAlert(chatId, setup, action, product) {
  const emoji = action === "added" ? "\u{2795}" : "\u{2796}"; // plus/minus

  const message = `
${emoji} <b>Stack Updated</b>

<b>Stack:</b> ${setup.name}
<b>Action:</b> Product ${action}
<b>Product:</b> ${product.name || "Unknown"}

<a href="https://safescoring.io/dashboard/setups/${setup.id}">View Stack</a>

<i>SafeScoring's editorial opinions based on our published methodology. Scores are not guarantees of security. https://safescoring.io/legal</i>
`;

  return sendTelegramMessage(chatId, message.trim());
}

/**
 * Generate a linking code for Telegram authentication
 *
 * @param {string} userId - User ID to link
 * @returns {string} Unique linking code
 */
export function generateLinkingCode(userId) {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}-${userId.substring(0, 8)}`;
}

/**
 * Verify a linking code
 *
 * @param {string} code - Linking code to verify
 * @returns {Object} { valid: boolean, userId?: string, expired?: boolean }
 */
export function verifyLinkingCode(code) {
  try {
    const parts = code.split("-");
    if (parts.length !== 3) {
      return { valid: false };
    }

    const timestamp = parseInt(parts[0], 36);
    const now = Date.now();
    const maxAge = 15 * 60 * 1000; // 15 minutes

    if (now - timestamp > maxAge) {
      return { valid: false, expired: true };
    }

    return { valid: true, userIdPrefix: parts[2] };
  } catch {
    return { valid: false };
  }
}

/**
 * Get bot info (useful for generating start links)
 */
export async function getBotInfo() {
  const token = getBotToken();
  if (!token) {
    return { ok: false, error: "Bot token not configured" };
  }

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}${token}/getMe`);
    return await response.json();
  } catch (error) {
    console.error("Failed to get bot info:", error);
    return { ok: false, error: error.message };
  }
}

/**
 * Generate a deep link to start the bot with a linking code
 *
 * @param {string} linkingCode - Linking code
 * @returns {string} Telegram deep link URL
 */
export async function generateBotLink(linkingCode) {
  const botInfo = await getBotInfo();
  if (!botInfo.ok || !botInfo.result?.username) {
    return null;
  }

  return `https://t.me/${botInfo.result.username}?start=${linkingCode}`;
}

export default {
  sendTelegramMessage,
  sendIncidentAlert,
  sendScoreChangeAlert,
  sendProductUpdateAlert,
  generateLinkingCode,
  verifyLinkingCode,
  getBotInfo,
  generateBotLink,
};
