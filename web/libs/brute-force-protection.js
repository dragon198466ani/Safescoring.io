/**
 * ============================================================================
 * BRUTE FORCE PROTECTION & SECURITY EVENT LOGGING
 * ============================================================================
 *
 * Features:
 * - Login attempt tracking with lockout
 * - Progressive delays after failed attempts
 * - IP-based and email-based blocking
 * - Security event logging to database
 * - Account compromise detection
 * - Trusted device management
 *
 * ============================================================================
 */

import { getSupabaseAdmin } from "@/libs/supabase";
import crypto from "crypto";

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Brute force protection
  maxFailedAttempts: 5, // Lock after 5 failed attempts
  lockoutDurationMinutes: 30, // 30 minute lockout
  attemptWindowMinutes: 15, // Count attempts in 15 min window

  // Progressive delays (ms) after each failed attempt
  progressiveDelays: [0, 1000, 2000, 4000, 8000, 16000],

  // IP blocking thresholds
  ipBlockThreshold: 10, // Block IP after 10 failed attempts across all accounts
  ipBlockDurationHours: 24,

  // Suspicious activity thresholds
  suspiciousLoginThreshold: 3, // Alert after 3 failed attempts
  newDeviceAlertEnabled: true,
  geoAnomalyAlertEnabled: true,
};

// ============================================================================
// SECURITY EVENT TYPES
// ============================================================================

export const SECURITY_EVENTS = {
  // Authentication events
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILED: "LOGIN_FAILED",
  LOGIN_BLOCKED: "LOGIN_BLOCKED",
  LOGOUT: "LOGOUT",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  PASSWORD_RESET_REQUESTED: "PASSWORD_RESET_REQUESTED",
  PASSWORD_RESET_COMPLETED: "PASSWORD_RESET_COMPLETED",

  // Account events
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  ACCOUNT_UNLOCKED: "ACCOUNT_UNLOCKED",
  ACCOUNT_CREATED: "ACCOUNT_CREATED",
  ACCOUNT_DELETED: "ACCOUNT_DELETED",
  EMAIL_CHANGED: "EMAIL_CHANGED",

  // Security events
  SUSPICIOUS_ACTIVITY: "SUSPICIOUS_ACTIVITY",
  NEW_DEVICE_LOGIN: "NEW_DEVICE_LOGIN",
  GEO_ANOMALY: "GEO_ANOMALY",
  SESSION_HIJACK_ATTEMPT: "SESSION_HIJACK_ATTEMPT",
  BRUTE_FORCE_DETECTED: "BRUTE_FORCE_DETECTED",
  IP_BLOCKED: "IP_BLOCKED",

  // API events
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  INVALID_API_KEY: "INVALID_API_KEY",
  UNAUTHORIZED_ACCESS: "UNAUTHORIZED_ACCESS",

  // Attack events
  SQL_INJECTION_ATTEMPT: "SQL_INJECTION_ATTEMPT",
  XSS_ATTEMPT: "XSS_ATTEMPT",
  PATH_TRAVERSAL_ATTEMPT: "PATH_TRAVERSAL_ATTEMPT",
  HONEYPOT_TRIGGERED: "HONEYPOT_TRIGGERED",
  BOT_DETECTED: "BOT_DETECTED",
};

export const SEVERITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

// ============================================================================
// SECURITY EVENT LOGGING
// ============================================================================

/**
 * Log a security event to the database
 */
export async function logSecurityEvent({
  eventType,
  severity = SEVERITY.MEDIUM,
  userId = null,
  ipAddress = null,
  userAgent = null,
  countryCode = null,
  details = {},
  fingerprint = null,
  requestId = null,
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.warn("[SECURITY] Supabase not configured, logging to console only");
    console.log("[SECURITY EVENT]", { eventType, severity, userId, ipAddress, details });
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("security_events")
      .insert({
        event_type: eventType,
        severity,
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        country_code: countryCode,
        details,
        fingerprint,
        request_id: requestId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[SECURITY] Failed to log event:", error.message);
      return null;
    }

    // Trigger alert for high/critical events
    if (severity === SEVERITY.HIGH || severity === SEVERITY.CRITICAL) {
      await createSecurityAlert({
        alertType: eventType,
        severity: severity === SEVERITY.CRITICAL ? "critical" : "warning",
        title: `Security Event: ${eventType}`,
        description: `${severity.toUpperCase()} severity event detected`,
        details: { eventId: data.id, ...details, ipAddress },
      });
    }

    return data.id;
  } catch (e) {
    console.error("[SECURITY] Error logging event:", e.message);
    return null;
  }
}

// ============================================================================
// LOGIN ATTEMPT TRACKING
// ============================================================================

/**
 * Record a login attempt
 */
export async function recordLoginAttempt({
  email,
  ipAddress,
  userAgent = null,
  success = false,
  failureReason = null,
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    await supabase.from("login_attempts").insert({
      email: email.toLowerCase(),
      ip_address: ipAddress,
      user_agent: userAgent,
      success,
      failure_reason: failureReason,
    });

    // Log security event
    await logSecurityEvent({
      eventType: success ? SECURITY_EVENTS.LOGIN_SUCCESS : SECURITY_EVENTS.LOGIN_FAILED,
      severity: success ? SEVERITY.LOW : SEVERITY.MEDIUM,
      ipAddress,
      userAgent,
      details: {
        email: email.toLowerCase(),
        failureReason,
      },
    });

    // Check if we need to lock the account
    if (!success) {
      await checkAndLockAccount(email, ipAddress);
    }
  } catch (e) {
    console.error("[SECURITY] Error recording login attempt:", e.message);
  }
}

/**
 * Check if account should be locked based on failed attempts
 */
async function checkAndLockAccount(email, ipAddress) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    // Count recent failed attempts
    const windowStart = new Date(Date.now() - CONFIG.attemptWindowMinutes * 60 * 1000);

    const { count: emailAttempts } = await supabase
      .from("login_attempts")
      .select("*", { count: "exact", head: true })
      .eq("email", email.toLowerCase())
      .eq("success", false)
      .gte("created_at", windowStart.toISOString());

    const { count: ipAttempts } = await supabase
      .from("login_attempts")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", ipAddress)
      .eq("success", false)
      .gte("created_at", windowStart.toISOString());

    // Lock account if threshold exceeded
    if (emailAttempts >= CONFIG.maxFailedAttempts) {
      await lockAccount(email, ipAddress, "BRUTE_FORCE_EMAIL");
    }

    // Block IP if threshold exceeded
    if (ipAttempts >= CONFIG.ipBlockThreshold) {
      await blockIP(ipAddress, "BRUTE_FORCE_IP");
    }

    // Create alert for suspicious activity
    if (emailAttempts >= CONFIG.suspiciousLoginThreshold) {
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.BRUTE_FORCE_DETECTED,
        severity: SEVERITY.HIGH,
        ipAddress,
        details: {
          email: email.toLowerCase(),
          attemptCount: emailAttempts,
          threshold: CONFIG.maxFailedAttempts,
        },
      });
    }
  } catch (e) {
    console.error("[SECURITY] Error checking account lock:", e.message);
  }
}

/**
 * Lock an account
 */
export async function lockAccount(email, ipAddress, reason) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    const lockedUntil = new Date(Date.now() + CONFIG.lockoutDurationMinutes * 60 * 1000);

    await supabase.from("account_lockouts").insert({
      email: email.toLowerCase(),
      ip_address: ipAddress,
      reason,
      locked_until: lockedUntil.toISOString(),
    });

    await logSecurityEvent({
      eventType: SECURITY_EVENTS.ACCOUNT_LOCKED,
      severity: SEVERITY.HIGH,
      ipAddress,
      details: {
        email: email.toLowerCase(),
        reason,
        lockedUntil: lockedUntil.toISOString(),
        durationMinutes: CONFIG.lockoutDurationMinutes,
      },
    });

    console.warn(`[SECURITY] Account locked: ${email} until ${lockedUntil.toISOString()}`);
  } catch (e) {
    console.error("[SECURITY] Error locking account:", e.message);
  }
}

/**
 * Check if an account is locked
 */
export async function isAccountLocked(email, ipAddress = null) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  try {
    let query = supabase
      .from("account_lockouts")
      .select("id, locked_until")
      .eq("email", email.toLowerCase())
      .gt("locked_until", new Date().toISOString())
      .is("unlocked_at", null);

    if (ipAddress) {
      query = query.or(`ip_address.is.null,ip_address.eq.${ipAddress}`);
    }

    const { data } = await query.limit(1).single();

    return !!data;
  } catch (e) {
    return false;
  }
}

/**
 * Get remaining lockout time in seconds
 */
export async function getLockoutRemaining(email) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;

  try {
    const { data } = await supabase
      .from("account_lockouts")
      .select("locked_until")
      .eq("email", email.toLowerCase())
      .gt("locked_until", new Date().toISOString())
      .is("unlocked_at", null)
      .limit(1)
      .single();

    if (data) {
      const remaining = Math.ceil((new Date(data.locked_until) - new Date()) / 1000);
      return Math.max(0, remaining);
    }

    return 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Get progressive delay based on failed attempt count
 */
export async function getProgressiveDelay(email, ipAddress) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;

  try {
    const windowStart = new Date(Date.now() - CONFIG.attemptWindowMinutes * 60 * 1000);

    const { count } = await supabase
      .from("login_attempts")
      .select("*", { count: "exact", head: true })
      .eq("email", email.toLowerCase())
      .eq("success", false)
      .gte("created_at", windowStart.toISOString());

    const delayIndex = Math.min(count || 0, CONFIG.progressiveDelays.length - 1);
    return CONFIG.progressiveDelays[delayIndex];
  } catch (e) {
    return 0;
  }
}

// ============================================================================
// IP BLOCKING
// ============================================================================

/**
 * Block an IP address
 */
export async function blockIP(ipAddress, reason, durationHours = CONFIG.ipBlockDurationHours) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    const blockedUntil = durationHours
      ? new Date(Date.now() + durationHours * 60 * 60 * 1000)
      : null;

    await supabase.from("ip_blocklist").insert({
      ip_address: ipAddress,
      reason,
      blocked_until: blockedUntil?.toISOString(),
    });

    await logSecurityEvent({
      eventType: SECURITY_EVENTS.IP_BLOCKED,
      severity: SEVERITY.HIGH,
      ipAddress,
      details: {
        reason,
        blockedUntil: blockedUntil?.toISOString(),
        permanent: !durationHours,
      },
    });

    console.warn(`[SECURITY] IP blocked: ${ipAddress} - ${reason}`);
  } catch (e) {
    // Ignore duplicate key errors
    if (!e.message?.includes("duplicate")) {
      console.error("[SECURITY] Error blocking IP:", e.message);
    }
  }
}

/**
 * Check if an IP is blocked
 */
export async function isIPBlocked(ipAddress) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  try {
    const { data } = await supabase
      .from("ip_blocklist")
      .select("id")
      .eq("ip_address", ipAddress)
      .is("unblocked_at", null)
      .or(`blocked_until.is.null,blocked_until.gt.${new Date().toISOString()}`)
      .limit(1)
      .single();

    return !!data;
  } catch (e) {
    return false;
  }
}

// ============================================================================
// TRUSTED DEVICES
// ============================================================================

/**
 * Generate device fingerprint
 */
export function generateDeviceFingerprint(userAgent, acceptLanguage, clientHints = {}) {
  const components = [
    userAgent || "",
    acceptLanguage || "",
    clientHints.platform || "",
    clientHints.mobile || "",
    clientHints.brands || "",
  ].join("|");

  return crypto.createHash("sha256").update(components).digest("hex").slice(0, 32);
}

/**
 * Check if device is trusted for user
 */
export async function isDeviceTrusted(userId, fingerprint) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  try {
    const { data } = await supabase
      .from("trusted_devices")
      .select("id")
      .eq("user_id", userId)
      .eq("device_fingerprint", fingerprint)
      .is("revoked_at", null)
      .limit(1)
      .single();

    return !!data;
  } catch (e) {
    return false;
  }
}

/**
 * Add trusted device
 */
export async function addTrustedDevice(userId, fingerprint, deviceName, ipAddress) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    await supabase.from("trusted_devices").upsert(
      {
        user_id: userId,
        device_fingerprint: fingerprint,
        device_name: deviceName,
        last_ip: ipAddress,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "user_id,device_fingerprint" }
    );
  } catch (e) {
    console.error("[SECURITY] Error adding trusted device:", e.message);
  }
}

/**
 * Update device last used
 */
export async function updateDeviceLastUsed(userId, fingerprint, ipAddress) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    await supabase
      .from("trusted_devices")
      .update({
        last_ip: ipAddress,
        last_used_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("device_fingerprint", fingerprint)
      .is("revoked_at", null);
  } catch (e) {
    // Ignore errors
  }
}

// ============================================================================
// SECURITY ALERTS
// ============================================================================

/**
 * Create a security alert
 */
export async function createSecurityAlert({
  alertType,
  severity = "warning",
  title,
  description = null,
  details = {},
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.warn("[SECURITY ALERT]", { alertType, severity, title });
    return;
  }

  try {
    await supabase.from("security_alerts").insert({
      alert_type: alertType,
      severity,
      title,
      description,
      details,
    });

    // Log to console for immediate visibility
    console.warn(`[SECURITY ALERT] [${severity.toUpperCase()}] ${title}`);

    // TODO: Send to external alerting service (PagerDuty, Slack, etc.)
  } catch (e) {
    console.error("[SECURITY] Error creating alert:", e.message);
  }
}

// ============================================================================
// ACCOUNT COMPROMISE DETECTION
// ============================================================================

/**
 * Check for signs of account compromise
 */
export async function checkAccountCompromise(userId, currentIP, currentFingerprint) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { compromised: false };

  const warnings = [];

  try {
    // Check if device is trusted
    const isTrusted = await isDeviceTrusted(userId, currentFingerprint);

    if (!isTrusted && CONFIG.newDeviceAlertEnabled) {
      warnings.push("NEW_DEVICE");

      await logSecurityEvent({
        eventType: SECURITY_EVENTS.NEW_DEVICE_LOGIN,
        severity: SEVERITY.MEDIUM,
        userId,
        ipAddress: currentIP,
        fingerprint: currentFingerprint,
        details: { warning: "Login from new device" },
      });
    }

    // Check for geographic anomaly (simplified - compare to last login IP)
    const { data: lastLogin } = await supabase
      .from("security_events")
      .select("ip_address, created_at")
      .eq("user_id", userId)
      .eq("event_type", SECURITY_EVENTS.LOGIN_SUCCESS)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (lastLogin && lastLogin.ip_address !== currentIP) {
      // Simple check: different first octet = different region
      const lastPrefix = lastLogin.ip_address?.split(".")[0];
      const currentPrefix = currentIP?.split(".")[0];

      if (lastPrefix && currentPrefix && lastPrefix !== currentPrefix) {
        const timeSinceLastLogin = Date.now() - new Date(lastLogin.created_at).getTime();
        const hoursAgo = timeSinceLastLogin / (1000 * 60 * 60);

        // If login from different region within 1 hour, flag as suspicious
        if (hoursAgo < 1 && CONFIG.geoAnomalyAlertEnabled) {
          warnings.push("GEO_ANOMALY");

          await logSecurityEvent({
            eventType: SECURITY_EVENTS.GEO_ANOMALY,
            severity: SEVERITY.HIGH,
            userId,
            ipAddress: currentIP,
            details: {
              previousIP: lastLogin.ip_address,
              timeSinceLastLogin: `${hoursAgo.toFixed(2)} hours`,
            },
          });
        }
      }
    }

    return {
      compromised: warnings.length > 0,
      warnings,
      requiresVerification: warnings.includes("GEO_ANOMALY"),
    };
  } catch (e) {
    console.error("[SECURITY] Error checking account compromise:", e.message);
    return { compromised: false };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Configuration
  CONFIG,
  SECURITY_EVENTS,
  SEVERITY,

  // Event logging
  logSecurityEvent,

  // Login protection
  recordLoginAttempt,
  isAccountLocked,
  getLockoutRemaining,
  getProgressiveDelay,
  lockAccount,

  // IP blocking
  blockIP,
  isIPBlocked,

  // Trusted devices
  generateDeviceFingerprint,
  isDeviceTrusted,
  addTrustedDevice,
  updateDeviceLastUsed,

  // Alerts
  createSecurityAlert,

  // Compromise detection
  checkAccountCompromise,
};
