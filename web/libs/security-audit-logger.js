/**
 * ============================================================================
 * SECURITY AUDIT LOGGER - Persistent Security Event Logging
 * ============================================================================
 *
 * Ce module fournit un logging de sécurité persistant pour:
 * - Compliance (GDPR, SOC2, ISO 27001)
 * - Forensic analysis
 * - Real-time threat monitoring
 * - Incident response
 *
 * Features:
 * - Structured logging avec niveaux de sévérité
 * - Persistence Supabase avec fallback in-memory
 * - Log rotation automatique
 * - Export pour SIEM (Splunk, Datadog, etc.)
 * - Recherche et filtrage avancés
 * - Alerting sur événements critiques
 *
 * ============================================================================
 */

import { createClient } from "@supabase/supabase-js";

// ============================================================================
// CONFIGURATION
// ============================================================================

const AUDIT_CONFIG = {
  // Log retention
  RETENTION_DAYS: 90,
  MAX_MEMORY_LOGS: 10000,

  // Batching for database writes
  BATCH_SIZE: 100,
  BATCH_INTERVAL_MS: 5000,

  // Alert thresholds
  ALERT_THRESHOLDS: {
    critical: 1,    // Alert on 1 critical event
    high: 5,        // Alert on 5 high events in 5 minutes
    medium: 20,     // Alert on 20 medium events in 5 minutes
  },
};

// ============================================================================
// LOG SEVERITY LEVELS
// ============================================================================

export const SEVERITY = {
  CRITICAL: "critical",  // Breach detected, immediate action required
  HIGH: "high",          // Attack attempt, investigate immediately
  MEDIUM: "medium",      // Suspicious activity, monitor
  LOW: "low",            // Informational, routine logging
  DEBUG: "debug",        // Development/debugging only
};

// ============================================================================
// SECURITY EVENT TYPES
// ============================================================================

export const EVENT_TYPES = {
  // Authentication events
  AUTH_SUCCESS: "AUTH_SUCCESS",
  AUTH_FAILURE: "AUTH_FAILURE",
  AUTH_LOCKOUT: "AUTH_LOCKOUT",
  SESSION_CREATED: "SESSION_CREATED",
  SESSION_DESTROYED: "SESSION_DESTROYED",
  SESSION_HIJACK_ATTEMPT: "SESSION_HIJACK_ATTEMPT",

  // Authorization events
  ACCESS_DENIED: "ACCESS_DENIED",
  PRIVILEGE_ESCALATION: "PRIVILEGE_ESCALATION",
  ADMIN_ACTION: "ADMIN_ACTION",

  // Attack detection
  SQL_INJECTION: "SQL_INJECTION",
  XSS_ATTEMPT: "XSS_ATTEMPT",
  CSRF_BLOCKED: "CSRF_BLOCKED",
  PATH_TRAVERSAL: "PATH_TRAVERSAL",
  COMMAND_INJECTION: "COMMAND_INJECTION",
  SCANNER_DETECTED: "SCANNER_DETECTED",
  BRUTE_FORCE: "BRUTE_FORCE",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",

  // Honeypot events
  HONEYPOT_TRIGGERED: "HONEYPOT_TRIGGERED",
  CANARY_TOKEN_ACCESSED: "CANARY_TOKEN_ACCESSED",

  // Data events
  DATA_EXPORT: "DATA_EXPORT",
  SENSITIVE_DATA_ACCESS: "SENSITIVE_DATA_ACCESS",
  DATA_MODIFICATION: "DATA_MODIFICATION",
  DATA_DELETION: "DATA_DELETION",

  // System events
  CONFIG_CHANGE: "CONFIG_CHANGE",
  IP_BLOCKED: "IP_BLOCKED",
  IP_UNBLOCKED: "IP_UNBLOCKED",
  SYSTEM_ERROR: "SYSTEM_ERROR",

  // Anomaly events
  ANOMALY_DETECTED: "ANOMALY_DETECTED",
  UNUSUAL_LOCATION: "UNUSUAL_LOCATION",
  DEVICE_CHANGE: "DEVICE_CHANGE",
};

// ============================================================================
// IN-MEMORY LOG BUFFER
// ============================================================================

const logBuffer = [];
const pendingLogs = [];
let batchTimer = null;

// ============================================================================
// SUPABASE CLIENT (Service Role for Admin Operations)
// ============================================================================

let supabaseAdmin = null;

function getSupabaseAdmin() {
  if (!supabaseAdmin && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false },
      }
    );
  }
  return supabaseAdmin;
}

// ============================================================================
// CORE LOGGING FUNCTION
// ============================================================================

/**
 * Log a security event
 *
 * @param {Object} event - Security event details
 * @param {string} event.type - Event type from EVENT_TYPES
 * @param {string} event.severity - Severity from SEVERITY
 * @param {string} event.message - Human-readable description
 * @param {Object} event.actor - Who performed the action (userId, ip, etc.)
 * @param {Object} event.target - What was affected (resource, endpoint, etc.)
 * @param {Object} event.metadata - Additional context
 * @param {string} event.requestId - Request ID for correlation
 */
export async function logSecurityEvent(event) {
  const {
    type,
    severity = SEVERITY.LOW,
    message,
    actor = {},
    target = {},
    metadata = {},
    requestId,
  } = event;

  // Create structured log entry
  const logEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    type,
    severity,
    message,
    actor: {
      userId: actor.userId || null,
      ip: actor.ip || null,
      userAgent: actor.userAgent?.slice(0, 500) || null,
      sessionId: actor.sessionId?.slice(0, 50) || null,
      fingerprint: actor.fingerprint?.slice(0, 50) || null,
    },
    target: {
      resource: target.resource || null,
      endpoint: target.endpoint || null,
      method: target.method || null,
      resourceId: target.resourceId || null,
    },
    metadata: sanitizeMetadata(metadata),
    requestId: requestId || null,
    environment: process.env.NODE_ENV,
  };

  // Add to memory buffer
  logBuffer.push(logEntry);
  if (logBuffer.length > AUDIT_CONFIG.MAX_MEMORY_LOGS) {
    logBuffer.shift();
  }

  // Console output for immediate visibility
  const logFn = severity === SEVERITY.CRITICAL || severity === SEVERITY.HIGH
    ? console.error
    : console.log;

  logFn(`[SECURITY][${severity.toUpperCase()}] ${type}: ${message}`, {
    actor: logEntry.actor.userId || logEntry.actor.ip,
    target: logEntry.target.resource || logEntry.target.endpoint,
  });

  // Add to pending batch for database persistence
  pendingLogs.push(logEntry);

  // Schedule batch write
  if (!batchTimer) {
    batchTimer = setTimeout(flushLogsToDB, AUDIT_CONFIG.BATCH_INTERVAL_MS);
  }

  // Check for alerts
  checkAlertThresholds(logEntry);

  return logEntry;
}

/**
 * Sanitize metadata to prevent log injection
 */
function sanitizeMetadata(metadata) {
  const sanitized = {};

  for (const [key, value] of Object.entries(metadata)) {
    // Skip sensitive keys
    if (/password|secret|token|key|auth|credential/i.test(key)) {
      sanitized[key] = "[REDACTED]";
      continue;
    }

    // Limit string length
    if (typeof value === "string") {
      sanitized[key] = value.slice(0, 1000);
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = JSON.stringify(value).slice(0, 1000);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// ============================================================================
// DATABASE PERSISTENCE
// ============================================================================

/**
 * Flush pending logs to database
 */
async function flushLogsToDB() {
  batchTimer = null;

  if (pendingLogs.length === 0) return;

  const logsToWrite = pendingLogs.splice(0, AUDIT_CONFIG.BATCH_SIZE);
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    console.warn("[AUDIT] No database connection, logs kept in memory only");
    return;
  }

  try {
    const { error } = await supabase
      .from("security_audit_logs")
      .insert(logsToWrite.map(log => ({
        id: log.id,
        timestamp: log.timestamp,
        event_type: log.type,
        severity: log.severity,
        message: log.message,
        actor_user_id: log.actor.userId,
        actor_ip: log.actor.ip,
        actor_user_agent: log.actor.userAgent,
        actor_session_id: log.actor.sessionId,
        target_resource: log.target.resource,
        target_endpoint: log.target.endpoint,
        target_method: log.target.method,
        metadata: log.metadata,
        request_id: log.requestId,
        environment: log.environment,
      })));

    if (error) {
      console.error("[AUDIT] Failed to write logs to database:", error);
      // Put logs back for retry
      pendingLogs.unshift(...logsToWrite);
    }
  } catch (err) {
    console.error("[AUDIT] Database error:", err);
    pendingLogs.unshift(...logsToWrite);
  }

  // Schedule next batch if more logs pending
  if (pendingLogs.length > 0 && !batchTimer) {
    batchTimer = setTimeout(flushLogsToDB, AUDIT_CONFIG.BATCH_INTERVAL_MS);
  }
}

// ============================================================================
// ALERTING
// ============================================================================

const recentEvents = new Map(); // severity -> count in last 5 minutes
const alertCallbacks = [];

/**
 * Subscribe to security alerts
 */
export function onSecurityAlert(callback) {
  alertCallbacks.push(callback);
  return () => {
    const index = alertCallbacks.indexOf(callback);
    if (index > -1) alertCallbacks.splice(index, 1);
  };
}

/**
 * Check if alert thresholds are exceeded
 */
function checkAlertThresholds(logEntry) {
  const { severity, type, actor, target, message } = logEntry;

  // Track recent events by severity
  const key = `${severity}:${Math.floor(Date.now() / 300000)}`; // 5-minute window
  recentEvents.set(key, (recentEvents.get(key) || 0) + 1);

  const count = recentEvents.get(key);
  const threshold = AUDIT_CONFIG.ALERT_THRESHOLDS[severity];

  if (threshold && count >= threshold) {
    // Trigger alert
    const alert = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      severity,
      type: "THRESHOLD_EXCEEDED",
      message: `${severity.toUpperCase()} event threshold exceeded: ${count} events in 5 minutes`,
      triggeringEvent: {
        type,
        message,
        actor: actor?.ip || actor?.userId,
        target: target?.endpoint || target?.resource,
      },
    };

    // Notify subscribers
    for (const callback of alertCallbacks) {
      try {
        callback(alert);
      } catch (err) {
        console.error("[AUDIT] Alert callback error:", err);
      }
    }

    // Log the alert itself
    console.error(`[SECURITY ALERT] ${alert.message}`, alert.triggeringEvent);

    // Reset counter after alert
    recentEvents.delete(key);
  }
}

// ============================================================================
// LOG QUERYING
// ============================================================================

/**
 * Query security logs from memory
 */
export function queryLogs(filters = {}) {
  const {
    type,
    severity,
    actorUserId,
    actorIp,
    targetEndpoint,
    startTime,
    endTime,
    limit = 100,
    offset = 0,
  } = filters;

  let results = [...logBuffer];

  // Apply filters
  if (type) {
    results = results.filter(log => log.type === type);
  }

  if (severity) {
    results = results.filter(log => log.severity === severity);
  }

  if (actorUserId) {
    results = results.filter(log => log.actor.userId === actorUserId);
  }

  if (actorIp) {
    results = results.filter(log => log.actor.ip === actorIp);
  }

  if (targetEndpoint) {
    results = results.filter(log =>
      log.target.endpoint && log.target.endpoint.includes(targetEndpoint)
    );
  }

  if (startTime) {
    const start = new Date(startTime).getTime();
    results = results.filter(log => new Date(log.timestamp).getTime() >= start);
  }

  if (endTime) {
    const end = new Date(endTime).getTime();
    results = results.filter(log => new Date(log.timestamp).getTime() <= end);
  }

  // Sort by timestamp descending
  results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Paginate
  return {
    logs: results.slice(offset, offset + limit),
    total: results.length,
    hasMore: offset + limit < results.length,
  };
}

/**
 * Get security log statistics
 */
export function getLogStats() {
  const stats = {
    total: logBuffer.length,
    bySeverity: {},
    byType: {},
    last24h: 0,
    lastHour: 0,
  };

  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const oneHourAgo = now - 60 * 60 * 1000;

  for (const log of logBuffer) {
    // By severity
    stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;

    // By type
    stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;

    // Time-based
    const logTime = new Date(log.timestamp).getTime();
    if (logTime >= oneDayAgo) stats.last24h++;
    if (logTime >= oneHourAgo) stats.lastHour++;
  }

  return stats;
}

// ============================================================================
// EXPORT FOR SIEM
// ============================================================================

/**
 * Export logs in SIEM-compatible format (JSON Lines)
 */
export function exportLogsForSIEM(filters = {}) {
  const { logs } = queryLogs({ ...filters, limit: 10000 });

  // Convert to JSON Lines format (one JSON object per line)
  return logs.map(log => JSON.stringify({
    // Common Event Format (CEF) like structure
    timestamp: log.timestamp,
    severity: log.severity,
    event_type: log.type,
    message: log.message,
    src_ip: log.actor.ip,
    src_user: log.actor.userId,
    dst_resource: log.target.resource,
    dst_endpoint: log.target.endpoint,
    request_id: log.requestId,
    metadata: log.metadata,
  })).join("\n");
}

/**
 * Export in CSV format
 */
export function exportLogsAsCSV(filters = {}) {
  const { logs } = queryLogs({ ...filters, limit: 10000 });

  const headers = [
    "timestamp",
    "severity",
    "type",
    "message",
    "actor_ip",
    "actor_user_id",
    "target_endpoint",
    "request_id",
  ];

  const rows = logs.map(log => [
    log.timestamp,
    log.severity,
    log.type,
    `"${(log.message || "").replace(/"/g, '""')}"`,
    log.actor.ip || "",
    log.actor.userId || "",
    log.target.endpoint || "",
    log.requestId || "",
  ].join(","));

  return [headers.join(","), ...rows].join("\n");
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Log authentication success
 */
export function logAuthSuccess(userId, ip, metadata = {}) {
  return logSecurityEvent({
    type: EVENT_TYPES.AUTH_SUCCESS,
    severity: SEVERITY.LOW,
    message: `User ${userId} authenticated successfully`,
    actor: { userId, ip },
    metadata,
  });
}

/**
 * Log authentication failure
 */
export function logAuthFailure(identifier, ip, reason, metadata = {}) {
  return logSecurityEvent({
    type: EVENT_TYPES.AUTH_FAILURE,
    severity: SEVERITY.MEDIUM,
    message: `Authentication failed for ${identifier}: ${reason}`,
    actor: { ip },
    metadata: { identifier, reason, ...metadata },
  });
}

/**
 * Log attack detection
 */
export function logAttack(type, ip, details, metadata = {}) {
  return logSecurityEvent({
    type,
    severity: SEVERITY.HIGH,
    message: `Attack detected: ${type} from ${ip}`,
    actor: { ip },
    metadata: { details, ...metadata },
  });
}

/**
 * Log critical security event
 */
export function logCritical(type, message, actor, metadata = {}) {
  return logSecurityEvent({
    type,
    severity: SEVERITY.CRITICAL,
    message,
    actor,
    metadata,
  });
}

/**
 * Log admin action
 */
export function logAdminAction(adminUserId, action, target, metadata = {}) {
  return logSecurityEvent({
    type: EVENT_TYPES.ADMIN_ACTION,
    severity: SEVERITY.MEDIUM,
    message: `Admin ${adminUserId} performed ${action} on ${target}`,
    actor: { userId: adminUserId },
    target: { resource: target },
    metadata: { action, ...metadata },
  });
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Force flush all pending logs
 */
export async function forceFlush() {
  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }

  while (pendingLogs.length > 0) {
    await flushLogsToDB();
  }
}

/**
 * Cleanup old logs from memory
 */
export function cleanupOldLogs(maxAge = 7 * 24 * 60 * 60 * 1000) {
  const cutoff = Date.now() - maxAge;

  while (logBuffer.length > 0) {
    const oldest = new Date(logBuffer[0].timestamp).getTime();
    if (oldest < cutoff) {
      logBuffer.shift();
    } else {
      break;
    }
  }

  // Also clean recent events tracker
  const now = Date.now();
  for (const key of recentEvents.keys()) {
    const [, timestamp] = key.split(":");
    if (parseInt(timestamp) * 300000 < now - 600000) {
      recentEvents.delete(key);
    }
  }
}

// Run cleanup every hour
if (typeof setInterval !== "undefined") {
  setInterval(cleanupOldLogs, 60 * 60 * 1000);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Core logging
  logSecurityEvent,
  SEVERITY,
  EVENT_TYPES,

  // Convenience functions
  logAuthSuccess,
  logAuthFailure,
  logAttack,
  logCritical,
  logAdminAction,

  // Querying
  queryLogs,
  getLogStats,

  // Export
  exportLogsForSIEM,
  exportLogsAsCSV,

  // Alerting
  onSecurityAlert,

  // Maintenance
  forceFlush,
  cleanupOldLogs,
};
