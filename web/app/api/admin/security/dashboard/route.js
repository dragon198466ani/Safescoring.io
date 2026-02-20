/**
 * Security Dashboard API
 * Provides security metrics and recent events for admin monitoring
 */

import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/libs/admin-auth";
import { getSupabaseAdmin } from "@/libs/supabase";

export async function GET(request) {
  // Require admin authentication
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const url = new URL(request.url);
    const timeRange = url.searchParams.get("range") || "24h";

    // Calculate time window
    const hours = timeRange === "7d" ? 168 : timeRange === "30d" ? 720 : 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    // Fetch security metrics in parallel
    const [
      eventCounts,
      recentEvents,
      blockedIPs,
      lockedAccounts,
      loginStats,
      alertsUnack,
    ] = await Promise.all([
      // Event counts by severity
      supabase
        .from("security_events")
        .select("severity", { count: "exact" })
        .gte("created_at", since),

      // Recent critical/high events
      supabase
        .from("security_events")
        .select("*")
        .in("severity", ["critical", "high"])
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20),

      // Currently blocked IPs
      supabase
        .from("ip_blocklist")
        .select("ip_address, reason, created_at, blocked_until")
        .is("unblocked_at", null)
        .or(`blocked_until.is.null,blocked_until.gt.${new Date().toISOString()}`)
        .order("created_at", { ascending: false })
        .limit(50),

      // Currently locked accounts
      supabase
        .from("account_lockouts")
        .select("email, reason, locked_until, attempts_count")
        .gt("locked_until", new Date().toISOString())
        .is("unlocked_at", null)
        .order("created_at", { ascending: false })
        .limit(50),

      // Login statistics
      supabase.rpc("get_login_stats", { since_time: since }).catch(() => ({ data: null })),

      // Unacknowledged alerts
      supabase
        .from("security_alerts")
        .select("*")
        .is("acknowledged_at", null)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    // Count events by severity
    const severityCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    if (eventCounts.data) {
      for (const event of eventCounts.data) {
        if (Object.prototype.hasOwnProperty.call(severityCounts, event.severity)) {
          severityCounts[event.severity]++;
        }
      }
    }

    // Count events by type
    const eventTypeCounts = {};
    if (recentEvents.data) {
      for (const event of recentEvents.data) {
        eventTypeCounts[event.event_type] = (eventTypeCounts[event.event_type] || 0) + 1;
      }
    }

    // Build response
    const dashboard = {
      timeRange,
      generatedAt: new Date().toISOString(),

      summary: {
        totalEvents: eventCounts.count || 0,
        severityCounts,
        blockedIPCount: blockedIPs.data?.length || 0,
        lockedAccountCount: lockedAccounts.data?.length || 0,
        unacknowledgedAlerts: alertsUnack.data?.length || 0,
      },

      eventsByType: eventTypeCounts,

      recentCriticalEvents: (recentEvents.data || []).map((e) => ({
        id: e.id,
        type: e.event_type,
        severity: e.severity,
        ip: e.ip_address,
        details: e.details,
        createdAt: e.created_at,
      })),

      blockedIPs: (blockedIPs.data || []).map((ip) => ({
        ip: ip.ip_address,
        reason: ip.reason,
        blockedAt: ip.created_at,
        expiresAt: ip.blocked_until,
        permanent: !ip.blocked_until,
      })),

      lockedAccounts: (lockedAccounts.data || []).map((acc) => ({
        email: acc.email.replace(/(.{2}).*@/, "$1***@"), // Mask email
        reason: acc.reason,
        lockedUntil: acc.locked_until,
        attempts: acc.attempts_count,
      })),

      unacknowledgedAlerts: (alertsUnack.data || []).map((a) => ({
        id: a.id,
        type: a.alert_type,
        severity: a.severity,
        title: a.title,
        createdAt: a.created_at,
      })),

      loginStats: loginStats.data || {
        totalAttempts: 0,
        successfulLogins: 0,
        failedLogins: 0,
        successRate: 0,
      },
    };

    // Log admin access
    await logAdminAction({
      adminEmail: admin.email,
      action: "VIEW",
      resource: "security_dashboard",
      details: { timeRange },
      request,
    });

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error("[SECURITY DASHBOARD] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch security dashboard" },
      { status: 500 }
    );
  }
}

/**
 * Acknowledge a security alert
 */
export async function PATCH(request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const { alertId, action } = await request.json();

    if (!alertId) {
      return NextResponse.json({ error: "Alert ID required" }, { status: 400 });
    }

    const updateData = {};

    if (action === "acknowledge") {
      updateData.acknowledged_at = new Date().toISOString();
      updateData.acknowledged_by = admin.email;
    } else if (action === "resolve") {
      updateData.resolved_at = new Date().toISOString();
      updateData.resolved_by = admin.email;
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { error } = await supabase
      .from("security_alerts")
      .update(updateData)
      .eq("id", alertId);

    if (error) {
      throw error;
    }

    await logAdminAction({
      adminEmail: admin.email,
      action: action.toUpperCase(),
      resource: "security_alert",
      details: { alertId },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SECURITY DASHBOARD] Error updating alert:", error);
    return NextResponse.json(
      { error: "Failed to update alert" },
      { status: 500 }
    );
  }
}

/**
 * Unblock an IP or unlock an account
 */
export async function DELETE(request) {
  const admin = await requireAdmin({ requireSuperAdmin: true });
  if (!admin) {
    return NextResponse.json({ error: "Super admin required" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const id = url.searchParams.get("id");

    if (!type || !id) {
      return NextResponse.json({ error: "Type and ID required" }, { status: 400 });
    }

    if (type === "ip") {
      const { error } = await supabase
        .from("ip_blocklist")
        .update({
          unblocked_at: new Date().toISOString(),
          unblocked_by: admin.email,
        })
        .eq("ip_address", id);

      if (error) throw error;

      await logAdminAction({
        adminEmail: admin.email,
        action: "UNBLOCK_IP",
        resource: "ip_blocklist",
        details: { ip: id },
        request,
      });
    } else if (type === "account") {
      const { error } = await supabase
        .from("account_lockouts")
        .update({
          unlocked_at: new Date().toISOString(),
          unlocked_by: admin.email,
        })
        .eq("email", id)
        .is("unlocked_at", null);

      if (error) throw error;

      await logAdminAction({
        adminEmail: admin.email,
        action: "UNLOCK_ACCOUNT",
        resource: "account_lockouts",
        details: { email: id },
        request,
      });
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SECURITY DASHBOARD] Error:", error);
    return NextResponse.json(
      { error: "Operation failed" },
      { status: 500 }
    );
  }
}
