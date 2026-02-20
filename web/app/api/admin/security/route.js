/**
 * ============================================================================
 * ADMIN SECURITY MONITORING DASHBOARD API
 * ============================================================================
 *
 * Provides real-time security metrics and threat monitoring for admins.
 * Requires admin authentication.
 *
 * Endpoints:
 * - GET: Fetch security stats and recent threats
 * - POST: Execute security actions (block IP, clear lockouts, etc.)
 *
 * ============================================================================
 */

import { NextResponse } from "next/server";
import { secureAdminRoute } from "@/libs/secure-api";
import {
  getSecurityStats,
  getThreatLog,
  clearFailedAttempts,
  blockIP,
  unblockIP,
  getBlockedIPs,
  isIPBlocked,
  getClientIdentifier,
  logSecurityEvent,
} from "@/libs/security-hardcore";

// ============================================================================
// GET - Fetch Security Dashboard Data
// ============================================================================

export const GET = secureAdminRoute(async (request, { user, searchParams }) => {
  const action = searchParams.action || "dashboard";

  switch (action) {
    case "dashboard":
      return getDashboardData();

    case "threats": {
      const limit = parseInt(searchParams.limit || "100", 10);
      const offset = parseInt(searchParams.offset || "0", 10);
      return getThreatsData(limit, offset);
    }

    case "blocked":
      return getBlockedIPsData();

    case "stats":
      return getStatsData();

    default:
      return { error: "Unknown action" };
  }
});

// ============================================================================
// POST - Execute Security Actions
// ============================================================================

export const POST = secureAdminRoute(
  async (request, { user, body }) => {
    const { action, target, reason } = body;

    // Log admin action
    logSecurityEvent("ADMIN_SECURITY_ACTION", {
      adminEmail: user.email,
      action,
      target,
      reason,
    });

    switch (action) {
      case "block_ip":
        if (!target) {
          return { error: "IP address required" };
        }
        await blockIP(target, reason || "Blocked by admin");
        return {
          success: true,
          message: `IP ${target} has been blocked`,
        };

      case "unblock_ip":
        if (!target) {
          return { error: "IP address required" };
        }
        await unblockIP(target);
        return {
          success: true,
          message: `IP ${target} has been unblocked`,
        };

      case "clear_lockout":
        if (!target) {
          return { error: "Client identifier required" };
        }
        clearFailedAttempts(target);
        return {
          success: true,
          message: `Lockout cleared for ${target}`,
        };

      case "check_ip": {
        if (!target) {
          return { error: "IP address required" };
        }
        const blocked = isIPBlocked(target);
        return {
          ip: target,
          blocked,
        };
      }

      case "export_logs": {
        const logs = getThreatLog(1000, 0);
        return {
          success: true,
          logs,
          exported_at: new Date().toISOString(),
        };
      }

      default:
        return { error: "Unknown action" };
    }
  },
  {
    schema: {
      action: { type: "string", required: true },
      target: { type: "string", required: false },
      reason: { type: "string", required: false, maxLength: 500 },
    },
  }
);

// ============================================================================
// Helper Functions
// ============================================================================

function getDashboardData() {
  const stats = getSecurityStats();
  const recentThreats = getThreatLog(10, 0);
  const blockedIPs = getBlockedIPs();

  // Calculate threat severity breakdown
  const severityBreakdown = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  recentThreats.forEach((threat) => {
    if (threat.severity === "critical") severityBreakdown.critical++;
    else if (threat.severity === "high") severityBreakdown.high++;
    else if (threat.severity === "medium") severityBreakdown.medium++;
    else severityBreakdown.low++;
  });

  return {
    overview: {
      total_requests: stats.totalRequests || 0,
      blocked_requests: stats.blockedRequests || 0,
      threats_detected: stats.threatsDetected || 0,
      active_lockouts: stats.activeLockouts || 0,
      blocked_ips: blockedIPs.length,
    },
    severity_breakdown: severityBreakdown,
    recent_threats: recentThreats,
    system_status: {
      rate_limiting: "active",
      intrusion_detection: "active",
      threat_logging: "active",
      encryption: "available",
    },
    last_updated: new Date().toISOString(),
  };
}

function getThreatsData(limit, offset) {
  const threats = getThreatLog(limit, offset);
  const total = getThreatLog(10000, 0).length;

  return {
    threats,
    pagination: {
      limit,
      offset,
      total,
      has_more: offset + threats.length < total,
    },
  };
}

function getBlockedIPsData() {
  const blockedIPs = getBlockedIPs();

  return {
    blocked_ips: blockedIPs,
    total: blockedIPs.length,
  };
}

function getStatsData() {
  const stats = getSecurityStats();

  return {
    stats,
    generated_at: new Date().toISOString(),
  };
}
