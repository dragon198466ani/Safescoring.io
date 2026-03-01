"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/libs/supabase";

/**
 * useSupabaseSubscription - Factory hook for Supabase realtime subscriptions
 *
 * This hook abstracts the common pattern used across:
 * - useRealtimeProducts
 * - useRealtimeMap
 * - useRealtimePresence
 * - usePresence
 *
 * @param {Object} options Configuration options
 * @param {string} options.channelName - Unique channel name
 * @param {Array} options.subscriptions - Array of subscription configs
 * @param {function} options.onUpdate - Callback when data changes
 * @param {boolean} options.enabled - Whether subscription is active
 * @param {number} options.debounceMs - Debounce time for updates (default: 2000)
 * @param {number} options.maxRetries - Max retry attempts (default: 3)
 *
 * @example
 * // Subscribe to product score changes
 * useSupabaseSubscription({
 *   channelName: "product_scores",
 *   subscriptions: [
 *     { event: "UPDATE", schema: "public", table: "safe_scoring_results" },
 *     { event: "INSERT", schema: "public", table: "products" },
 *   ],
 *   onUpdate: (payload) => console.log("Changed:", payload),
 *   enabled: true,
 * });
 */
export function useSupabaseSubscription({
  channelName,
  subscriptions = [],
  onUpdate,
  enabled = true,
  debounceMs = 500, // Réduit de 2000ms à 500ms pour un temps réel plus réactif
  maxRetries = 3,
}) {
  const supabaseRef = useRef(null);
  const channelRef = useRef(null);
  const lastUpdateRef = useRef(null);
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef(null);

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [connectionFailed, setConnectionFailed] = useState(false);

  // Initialize Supabase client
  useEffect(() => {
    if (isSupabaseConfigured()) {
      supabaseRef.current = getSupabase();
    }
  }, []);

  // Debounced change handler
  const handleChange = useCallback(
    (payload) => {
      const now = Date.now();
      if (lastUpdateRef.current && now - lastUpdateRef.current < debounceMs) {
        return;
      }
      lastUpdateRef.current = now;

      if (onUpdate && mountedRef.current) {
        onUpdate(payload);
      }
    },
    [onUpdate, debounceMs]
  );

  // Setup channel with subscriptions
  const setupChannel = useCallback(() => {
    if (!supabaseRef.current || !mountedRef.current) return null;

    let channel = supabaseRef.current.channel(channelName);

    // Add each subscription
    subscriptions.forEach((sub) => {
      channel = channel.on(
        "postgres_changes",
        {
          event: sub.event || "*",
          schema: sub.schema || "public",
          table: sub.table,
          filter: sub.filter,
        },
        handleChange
      );
    });

    // Subscribe and handle status
    channel.subscribe((status, err) => {
      if (!mountedRef.current) return;

      if (status === "SUBSCRIBED") {
        setIsConnected(true);
        setConnectionError(null);
        retryCountRef.current = 0;
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setIsConnected(false);
        setConnectionError(err?.message || "Connection failed");

        // Retry with exponential backoff
        if (retryCountRef.current < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);
          retryTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current && channelRef.current && supabaseRef.current) {
              supabaseRef.current.removeChannel(channelRef.current);
              retryCountRef.current++;
              channelRef.current = setupChannel();
            }
          }, delay);
        } else {
          // All retries exhausted - mark as failed
          setConnectionFailed(true);
        }
      } else if (status === "CLOSED") {
        setIsConnected(false);
      }
    });

    return channel;
  }, [channelName, subscriptions, handleChange, maxRetries]);

  // Main effect - setup/teardown subscription
  useEffect(() => {
    mountedRef.current = true;

    // If Supabase not configured, consider it "connected" (offline mode)
    if (!enabled || !isSupabaseConfigured() || !supabaseRef.current) {
      setIsConnected(true);
      setConnectionError(null);
      return;
    }

    channelRef.current = setupChannel();

    // Cleanup
    return () => {
      mountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (channelRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, setupChannel]);

  // Manual refresh function
  const forceRefresh = useCallback(() => {
    if (onUpdate) {
      onUpdate({ eventType: "MANUAL_REFRESH" });
    }
  }, [onUpdate]);

  // Reconnect function
  const reconnect = useCallback(() => {
    if (channelRef.current && supabaseRef.current) {
      supabaseRef.current.removeChannel(channelRef.current);
    }
    retryCountRef.current = 0;
    setConnectionFailed(false);
    setConnectionError(null);
    channelRef.current = setupChannel();
  }, [setupChannel]);

  return {
    isConnected,
    connectionError,
    connectionFailed,
    forceRefresh,
    reconnect,
  };
}

/**
 * Preset configurations for common subscription patterns
 */

/**
 * useProductScoreSubscription - Subscribe to product score changes
 */
export function useProductScoreSubscription({ onUpdate, enabled = true }) {
  return useSupabaseSubscription({
    channelName: "safe_scoring_changes",
    subscriptions: [
      { event: "UPDATE", table: "safe_scoring_results" },
      { event: "INSERT", table: "products" },
      { event: "DELETE", table: "products" },
    ],
    onUpdate,
    enabled,
  });
}

/**
 * useIncidentSubscription - Subscribe to security incident changes
 */
export function useIncidentSubscription({ onUpdate, enabled = true }) {
  return useSupabaseSubscription({
    channelName: "incident_changes",
    subscriptions: [
      { event: "*", table: "security_incidents" },
      { event: "*", table: "physical_incidents" },
    ],
    onUpdate,
    enabled,
    debounceMs: 1000, // Réduit de 5000ms à 1000ms - les incidents sont critiques
  });
}

/**
 * useUserDataSubscription - Subscribe to user-specific data changes
 */
export function useUserDataSubscription({ userId, onUpdate, enabled = true }) {
  return useSupabaseSubscription({
    channelName: `user_data_${userId}`,
    subscriptions: [
      { event: "*", table: "user_setups", filter: `user_id=eq.${userId}` },
      { event: "*", table: "user_watchlist", filter: `user_id=eq.${userId}` },
    ],
    onUpdate,
    enabled: enabled && !!userId,
  });
}

/**
 * useSetupSubscription - Subscribe to a specific setup's real-time changes
 * Monitors: setup changes, product score updates, security incidents
 */
export function useSetupSubscription({ setupId, productIds = [], onUpdate, enabled = true }) {
  return useSupabaseSubscription({
    channelName: `setup_${setupId}`,
    subscriptions: [
      // Setup itself changes (products added/removed, renamed)
      { event: "*", table: "user_setups", filter: `id=eq.${setupId}` },
      // Product scores change (affects combined score)
      { event: "UPDATE", table: "safe_scoring_results" },
      // New security incidents
      { event: "INSERT", table: "security_incidents" },
      // Setup history updates
      { event: "INSERT", table: "setup_history", filter: `setup_id=eq.${setupId}` },
    ],
    onUpdate,
    enabled: enabled && !!setupId,
    debounceMs: 1000, // Faster updates for better UX
  });
}

/**
 * useSetupHistorySubscription - Subscribe to setup history changes only
 */
export function useSetupHistorySubscription({ setupId, onUpdate, enabled = true }) {
  return useSupabaseSubscription({
    channelName: `setup_history_${setupId}`,
    subscriptions: [
      { event: "INSERT", table: "setup_history", filter: `setup_id=eq.${setupId}` },
    ],
    onUpdate,
    enabled: enabled && !!setupId,
    debounceMs: 500,
  });
}

/**
 * useEvaluationVoteSubscription - Subscribe to community evaluation vote changes
 * Monitors new votes (INSERT on evaluation_votes) and consensus decisions
 * (UPDATE on evaluations for community_status changes)
 */
export function useEvaluationVoteSubscription({ productId, onUpdate, enabled = true }) {
  return useSupabaseSubscription({
    channelName: productId ? `eval_votes_${productId}` : "eval_votes_global",
    subscriptions: [
      // New community votes submitted
      { event: "INSERT", table: "evaluation_votes" },
      // Consensus reached or community_status changed on evaluations
      { event: "UPDATE", table: "evaluations" },
      // Vote count denormalized updates
      { event: "UPDATE", table: "evaluation_vote_counts" },
    ],
    onUpdate,
    enabled,
    debounceMs: 1000,
  });
}

/**
 * useThreeTrackSubscription - Subscribe to 3-track score changes (AI + Community + Hybrid)
 * Monitors product_scores_3track updates and evaluation changes
 */
export function useThreeTrackSubscription({ productId, onUpdate, enabled = true }) {
  return useSupabaseSubscription({
    channelName: `three_track_${productId}`,
    subscriptions: [
      // 3-track scores recalculated
      { event: "UPDATE", table: "product_scores_3track", filter: `product_id=eq.${productId}` },
      // AI evaluation results changed
      { event: "UPDATE", table: "safe_scoring_results", filter: `product_id=eq.${productId}` },
      // Community consensus changed evaluation status
      { event: "UPDATE", table: "evaluations" },
    ],
    onUpdate,
    enabled: enabled && !!productId,
    debounceMs: 1000,
  });
}

export default useSupabaseSubscription;
