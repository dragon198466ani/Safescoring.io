"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { getSupabase } from "@/libs/supabase";

/**
 * Hook for real-time map updates
 * Subscribes to products table changes and triggers data refresh
 */
export function useRealtimeMap({ onProductChange, onIncidentChange, enabled = true }) {
  const channelRef = useRef(null);
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Debounce function to avoid too many refreshes
  const debounceRef = useRef(null);
  const debouncedRefresh = useCallback((callback) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      callback();
    }, 1000); // Wait 1 second before refreshing
  }, []);

  useEffect(() => {
    if (!isClient || !enabled) return;

    const supabase = getSupabase();
    if (!supabase) return;

    // Create a channel for real-time updates
    const channel = supabase.channel("map-updates");

    // Subscribe to products table changes
    channel
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to INSERT, UPDATE, DELETE
          schema: "public",
          table: "products",
        },
        (payload) => {
          console.log("📦 Product change detected:", payload.eventType);
          if (onProductChange) {
            debouncedRefresh(() => onProductChange(payload));
          }
        }
      )
      // Subscribe to physical_incidents changes
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "physical_incidents",
        },
        (payload) => {
          console.log("🚨 Physical incident change:", payload.eventType);
          if (onIncidentChange) {
            debouncedRefresh(() => onIncidentChange(payload));
          }
        }
      )
      // Subscribe to security_incidents changes
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "security_incidents",
        },
        (payload) => {
          console.log("🔐 Security incident change:", payload.eventType);
          if (onIncidentChange) {
            debouncedRefresh(() => onIncidentChange(payload));
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Real-time map subscription active");
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Real-time subscription error");
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (channelRef.current) {
        const sb = getSupabase();
        if (sb) {
          sb.removeChannel(channelRef.current);
        }
      }
    };
  }, [isClient, enabled, onProductChange, onIncidentChange, debouncedRefresh]);

  // Manual refresh function
  const forceRefresh = useCallback(() => {
    if (onProductChange) onProductChange({ eventType: "MANUAL_REFRESH" });
    if (onIncidentChange) onIncidentChange({ eventType: "MANUAL_REFRESH" });
  }, [onProductChange, onIncidentChange]);

  return { forceRefresh };
}
