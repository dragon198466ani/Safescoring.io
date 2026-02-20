"use client";

/**
 * useRealtimeNotifications - Hooks pour écouter TOUTES les notifications temps réel
 * 
 * Ce fichier centralise l'écoute des pg_notify et postgres_changes pour:
 * - Scores (score_updates, watchlist_alert)
 * - Setups (setup_updated, setup_history)
 * - Présence (presence_update)
 * - Incidents (incident_new, incident_status)
 * - Dashboard (dashboard_stats_refreshed)
 * - Subscriptions (subscription_changed)
 */

import { useEffect, useCallback, useRef, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/libs/supabase";

// ============================================================================
// HOOK GÉNÉRIQUE: Écouter une table Supabase en temps réel
// ============================================================================

export function useRealtimeTable({
  table,
  event = "*",
  filter,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
}) {
  const supabaseRef = useRef(null);
  const channelRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      supabaseRef.current = getSupabase();
    }
  }, []);

  useEffect(() => {
    if (!enabled || !supabaseRef.current || !table) return;

    const channelName = `realtime_${table}_${Date.now()}`;
    
    channelRef.current = supabaseRef.current
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event,
          schema: "public",
          table,
          filter,
        },
        (payload) => {
          if (payload.eventType === "INSERT" && onInsert) {
            onInsert(payload.new, payload);
          } else if (payload.eventType === "UPDATE" && onUpdate) {
            onUpdate(payload.new, payload.old, payload);
          } else if (payload.eventType === "DELETE" && onDelete) {
            onDelete(payload.old, payload);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      if (channelRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(channelRef.current);
      }
    };
  }, [enabled, table, event, filter, onInsert, onUpdate, onDelete]);

  return { isConnected };
}


// ============================================================================
// HOOK: Notifications utilisateur temps réel
// ============================================================================

export function useUserNotifications({ userId, onNewNotification, enabled = true }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleInsert = useCallback((newNotification) => {
    setNotifications((prev) => [newNotification, ...prev].slice(0, 50));
    setUnreadCount((prev) => prev + 1);
    
    if (onNewNotification) {
      onNewNotification(newNotification);
    }
  }, [onNewNotification]);

  const { isConnected } = useRealtimeTable({
    table: "user_notifications",
    event: "INSERT",
    filter: userId ? `user_id=eq.${userId}` : undefined,
    onInsert: handleInsert,
    enabled: enabled && !!userId,
  });

  const markAsRead = useCallback(async (notificationId) => {
    if (!isSupabaseConfigured()) return;
    
    const supabase = getSupabase();
    await supabase
      .from("user_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notificationId);
    
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!isSupabaseConfigured() || !userId) return;
    
    const supabase = getSupabase();
    await supabase
      .from("user_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("is_read", false);
    
    setUnreadCount(0);
  }, [userId]);

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
  };
}


// ============================================================================
// HOOK: Watchlist alerts temps réel
// ============================================================================

export function useWatchlistAlerts({ userId, onAlert, enabled = true }) {
  const [alerts, setAlerts] = useState([]);

  const handleScoreChange = useCallback((newScore, oldScore, payload) => {
    // Vérifier si c'est un changement significatif
    if (Math.abs((newScore?.note_finale || 0) - (oldScore?.note_finale || 0)) >= 5) {
      const alert = {
        productId: newScore.product_id,
        oldScore: oldScore?.note_finale,
        newScore: newScore?.note_finale,
        change: (newScore?.note_finale || 0) - (oldScore?.note_finale || 0),
        timestamp: new Date(),
      };
      
      setAlerts((prev) => [alert, ...prev].slice(0, 20));
      
      if (onAlert) {
        onAlert(alert);
      }
    }
  }, [onAlert]);

  const { isConnected } = useRealtimeTable({
    table: "safe_scoring_results",
    event: "UPDATE",
    onUpdate: handleScoreChange,
    enabled,
  });

  return { alerts, isConnected };
}


// ============================================================================
// HOOK: Setup changes temps réel
// ============================================================================

export function useSetupRealtime({ setupId, onUpdate, onHistoryChange, enabled = true }) {
  const [lastUpdate, setLastUpdate] = useState(null);

  const handleSetupUpdate = useCallback((newSetup, oldSetup) => {
    setLastUpdate({
      setup: newSetup,
      timestamp: new Date(),
    });
    
    if (onUpdate) {
      onUpdate(newSetup, oldSetup);
    }
  }, [onUpdate]);

  const handleHistoryInsert = useCallback((historyEntry) => {
    if (onHistoryChange) {
      onHistoryChange(historyEntry);
    }
  }, [onHistoryChange]);

  const { isConnected: setupConnected } = useRealtimeTable({
    table: "user_setups",
    event: "UPDATE",
    filter: setupId ? `id=eq.${setupId}` : undefined,
    onUpdate: handleSetupUpdate,
    enabled: enabled && !!setupId,
  });

  const { isConnected: historyConnected } = useRealtimeTable({
    table: "setup_history",
    event: "INSERT",
    filter: setupId ? `setup_id=eq.${setupId}` : undefined,
    onInsert: handleHistoryInsert,
    enabled: enabled && !!setupId,
  });

  return {
    lastUpdate,
    isConnected: setupConnected && historyConnected,
  };
}


// ============================================================================
// HOOK: 3D Map Presence temps réel
// ============================================================================

export function useMapPresence({ onUserJoin, onUserLeave, onUserUpdate, enabled = true }) {
  const [activeUsers, setActiveUsers] = useState([]);
  const [userCount, setUserCount] = useState(0);

  const handleInsert = useCallback((user) => {
    setActiveUsers((prev) => {
      const filtered = prev.filter((u) => u.session_id !== user.session_id);
      return [...filtered, user];
    });
    setUserCount((prev) => prev + 1);
    
    if (onUserJoin) {
      onUserJoin(user);
    }
  }, [onUserJoin]);

  const handleUpdate = useCallback((user, oldUser) => {
    setActiveUsers((prev) =>
      prev.map((u) => (u.session_id === user.session_id ? user : u))
    );
    
    if (onUserUpdate) {
      onUserUpdate(user, oldUser);
    }
  }, [onUserUpdate]);

  const handleDelete = useCallback((user) => {
    setActiveUsers((prev) =>
      prev.filter((u) => u.session_id !== user.session_id)
    );
    setUserCount((prev) => Math.max(0, prev - 1));
    
    if (onUserLeave) {
      onUserLeave(user);
    }
  }, [onUserLeave]);

  const { isConnected } = useRealtimeTable({
    table: "user_presence",
    event: "*",
    onInsert: handleInsert,
    onUpdate: handleUpdate,
    onDelete: handleDelete,
    enabled,
  });

  return {
    activeUsers,
    userCount,
    isConnected,
  };
}


// ============================================================================
// HOOK: Incidents temps réel (pour 3D map)
// ============================================================================

export function useIncidentsRealtime({ onNewIncident, onStatusChange, enabled = true }) {
  const [recentIncidents, setRecentIncidents] = useState([]);

  const handlePhysicalInsert = useCallback((incident) => {
    const formatted = {
      id: incident.id,
      type: "physical",
      title: incident.title,
      incidentType: incident.incident_type,
      country: incident.location_country,
      city: incident.location_city,
      severity: incident.severity_score,
      amountStolen: incident.amount_stolen_usd,
      timestamp: new Date(),
    };
    
    setRecentIncidents((prev) => [formatted, ...prev].slice(0, 50));
    
    if (onNewIncident) {
      onNewIncident(formatted);
    }
  }, [onNewIncident]);

  const handleSecurityInsert = useCallback((incident) => {
    if (!incident.is_published) return;
    
    const formatted = {
      id: incident.id,
      type: "security",
      title: incident.title,
      incidentType: incident.incident_type,
      severity: incident.severity,
      fundsLost: incident.funds_lost_usd,
      timestamp: new Date(),
    };
    
    setRecentIncidents((prev) => [formatted, ...prev].slice(0, 50));
    
    if (onNewIncident) {
      onNewIncident(formatted);
    }
  }, [onNewIncident]);

  const { isConnected: physicalConnected } = useRealtimeTable({
    table: "physical_incidents",
    event: "INSERT",
    onInsert: handlePhysicalInsert,
    enabled,
  });

  const { isConnected: securityConnected } = useRealtimeTable({
    table: "security_incidents",
    event: "INSERT",
    onInsert: handleSecurityInsert,
    enabled,
  });

  return {
    recentIncidents,
    isConnected: physicalConnected && securityConnected,
  };
}


// ============================================================================
// HOOK: Dashboard stats temps réel
// ============================================================================

export function useDashboardStats({ refreshInterval = 30000, enabled = true }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("mv_dashboard_stats")
        .select("*")
        .single();
      
      if (!error && data) {
        setStats(data);
      }
    } catch (e) {
      console.warn("[useDashboardStats] Error fetching stats:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchStats();
    }
  }, [enabled, fetchStats]);

  // Periodic refresh
  useEffect(() => {
    if (!enabled || refreshInterval <= 0) return;
    
    const interval = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(interval);
  }, [enabled, refreshInterval, fetchStats]);

  // Listen for refresh notifications
  const { isConnected } = useRealtimeTable({
    table: "safe_scoring_results",
    event: "UPDATE",
    onUpdate: () => {
      // Debounce refresh
      setTimeout(fetchStats, 1000);
    },
    enabled,
  });

  return {
    stats,
    loading,
    isConnected,
    refresh: fetchStats,
  };
}


// ============================================================================
// HOOK COMBINÉ: Toutes les notifications temps réel
// ============================================================================

export function useAllRealtimeNotifications({
  userId,
  setupId,
  onScoreChange,
  onSetupChange,
  onNewIncident,
  onNewNotification,
  enabled = true,
}) {
  const scores = useWatchlistAlerts({ userId, onAlert: onScoreChange, enabled });
  const setup = useSetupRealtime({ setupId, onUpdate: onSetupChange, enabled: enabled && !!setupId });
  const incidents = useIncidentsRealtime({ onNewIncident, enabled });
  const notifications = useUserNotifications({ userId, onNewNotification, enabled: enabled && !!userId });
  const presence = useMapPresence({ enabled });
  const dashboard = useDashboardStats({ enabled });

  return {
    scores,
    setup,
    incidents,
    notifications,
    presence,
    dashboard,
    isFullyConnected:
      scores.isConnected &&
      incidents.isConnected &&
      presence.isConnected &&
      dashboard.isConnected,
  };
}

export default useAllRealtimeNotifications;
