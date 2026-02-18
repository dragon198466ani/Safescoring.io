/**
 * Anti-Copy Logger
 *
 * Logs all API accesses with fingerprint data for detection of unauthorized copying.
 * Stores data in Supabase for analysis and provides alerting capabilities.
 */

import { supabase, isSupabaseConfigured } from "@/libs/supabase";

// In-memory buffer for batch logging (reduces DB writes)
const logBuffer = [];
const BUFFER_FLUSH_SIZE = 50;
const BUFFER_FLUSH_INTERVAL = 30000; // 30 seconds

/**
 * Log an API access with fingerprint data
 */
export async function logAntiCopyAccess({
  clientId,
  clientFingerprint,
  endpoint,
  honeypotServed,
  honeypotIds = [],
  userAgent,
  ipHash,
  isAuthenticated = false,
  userId = null,
}) {
  const logEntry = {
    client_id: clientId,
    client_fingerprint: typeof clientFingerprint === 'object'
      ? clientFingerprint.fullHash
      : clientFingerprint,
    endpoint,
    honeypot_served: honeypotServed,
    honeypot_ids: honeypotIds,
    user_agent: userAgent?.substring(0, 500), // Limit size
    ip_hash: ipHash,
    is_authenticated: isAuthenticated,
    user_id: userId,
    timestamp: new Date().toISOString(),
  };

  // Add to buffer
  logBuffer.push(logEntry);

  // Flush if buffer is full
  if (logBuffer.length >= BUFFER_FLUSH_SIZE) {
    await flushLogBuffer();
  }

  return logEntry;
}

/**
 * Flush log buffer to database
 */
async function flushLogBuffer() {
  if (logBuffer.length === 0) return;

  const logsToFlush = [...logBuffer];
  logBuffer.length = 0; // Clear buffer

  if (!isSupabaseConfigured()) {
    console.warn("[Anti-Copy] Supabase not configured, logs discarded:", logsToFlush.length);
    return;
  }

  try {
    const { error } = await supabase
      .from("anti_copy_logs")
      .insert(logsToFlush);

    if (error) {
      // If table doesn't exist, log warning but don't crash
      if (error.code === "42P01") {
        console.warn("[Anti-Copy] anti_copy_logs table not found. Run migration to create it.");
        return;
      }
      console.error("[Anti-Copy] Failed to flush logs:", error);
    }
  } catch (err) {
    console.error("[Anti-Copy] Error flushing logs:", err);
  }
}

/**
 * Get suspicious clients based on access patterns
 */
export async function getSuspiciousClients(options = {}) {
  const {
    minAccesses = 100,
    timeWindowHours = 24,
    honeypotOnly = false
  } = options;

  if (!isSupabaseConfigured()) {
    return { data: [], error: "Supabase not configured" };
  }

  const since = new Date();
  since.setHours(since.getHours() - timeWindowHours);

  try {
    let query = supabase
      .from("anti_copy_logs")
      .select("client_id, client_fingerprint, count(*)")
      .gte("timestamp", since.toISOString())
      .order("count", { ascending: false });

    if (honeypotOnly) {
      query = query.eq("honeypot_served", true);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Filter by minimum accesses
    const suspicious = (data || []).filter(
      (client) => parseInt(client.count) >= minAccesses
    );

    return { data: suspicious, error: null };
  } catch (err) {
    console.error("[Anti-Copy] Error getting suspicious clients:", err);
    return { data: [], error: err.message };
  }
}

/**
 * Get honeypots served to a specific client
 */
export async function getHoneypotsForClient(clientId) {
  if (!isSupabaseConfigured()) {
    return { data: [], error: "Supabase not configured" };
  }

  try {
    const { data, error } = await supabase
      .from("anti_copy_logs")
      .select("honeypot_ids, timestamp")
      .eq("client_id", clientId)
      .eq("honeypot_served", true)
      .order("timestamp", { ascending: false })
      .limit(100);

    if (error) throw error;

    // Flatten and dedupe honeypot IDs
    const allHoneypots = new Set();
    (data || []).forEach(log => {
      (log.honeypot_ids || []).forEach(id => allHoneypots.add(id));
    });

    return {
      data: Array.from(allHoneypots),
      logs: data,
      error: null
    };
  } catch (err) {
    console.error("[Anti-Copy] Error getting honeypots for client:", err);
    return { data: [], error: err.message };
  }
}

/**
 * Check if a product might be a copied honeypot
 */
export async function checkForCopiedHoneypot(productName, productSlug) {
  // Import dynamically to avoid circular dependency
  const { detectHoneypotCopy, generateHoneypotEvidence } = await import("./honeypot-products");

  const detection = detectHoneypotCopy({ name: productName, slug: productSlug });

  if (detection.isHoneypot) {
    // Generate evidence
    const evidence = generateHoneypotEvidence(detection);

    // Alert (could be Telegram, Slack, email, etc.)
    await sendAntiCopyAlert({
      type: "HONEYPOT_DETECTED",
      productName,
      productSlug,
      evidence,
    });

    return { isCopy: true, evidence };
  }

  return { isCopy: false };
}

/**
 * Send alert for suspicious activity
 */
export async function sendAntiCopyAlert(alertData) {
  const { type, ...details } = alertData;

  console.warn(`[Anti-Copy Alert] ${type}:`, details);

  // Try Telegram notification
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID) {
    try {
      const message = `
*Anti-Copy Alert: ${type}*

${JSON.stringify(details, null, 2)}

Time: ${new Date().toISOString()}
      `.trim();

      await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: process.env.TELEGRAM_ADMIN_CHAT_ID,
            text: message,
            parse_mode: "Markdown",
          }),
        }
      );
    } catch (err) {
      console.error("[Anti-Copy] Failed to send Telegram alert:", err);
    }
  }

  // Store alert in database for dashboard
  if (isSupabaseConfigured()) {
    try {
      await supabase.from("anti_copy_alerts").insert({
        type,
        details,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      // Table might not exist yet
      console.warn("[Anti-Copy] Could not store alert:", err.message);
    }
  }
}

/**
 * Get client access statistics
 */
export async function getClientStats(clientId) {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase not configured" };
  }

  try {
    const { data, error } = await supabase
      .from("anti_copy_logs")
      .select("endpoint, honeypot_served, timestamp")
      .eq("client_id", clientId)
      .order("timestamp", { ascending: false })
      .limit(1000);

    if (error) throw error;

    const stats = {
      totalAccesses: data.length,
      endpoints: {},
      honeypotsReceived: 0,
      firstSeen: null,
      lastSeen: null,
    };

    data.forEach(log => {
      // Count by endpoint
      stats.endpoints[log.endpoint] = (stats.endpoints[log.endpoint] || 0) + 1;

      // Count honeypots
      if (log.honeypot_served) {
        stats.honeypotsReceived++;
      }

      // Track first/last seen
      if (!stats.lastSeen || log.timestamp > stats.lastSeen) {
        stats.lastSeen = log.timestamp;
      }
      if (!stats.firstSeen || log.timestamp < stats.firstSeen) {
        stats.firstSeen = log.timestamp;
      }
    });

    return { data: stats, error: null };
  } catch (err) {
    console.error("[Anti-Copy] Error getting client stats:", err);
    return { error: err.message };
  }
}

// Set up periodic buffer flush
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    flushLogBuffer().catch(console.error);
  }, BUFFER_FLUSH_INTERVAL);
}

// Export for testing
export const __testExports = {
  logBuffer,
  flushLogBuffer,
};
