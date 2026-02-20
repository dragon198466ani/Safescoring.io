"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getSupabase } from "@/libs/supabase";

/**
 * useRealtimePresence - Subscribes to real-time user presence for map display
 *
 * Returns live users grouped by country with avatar seeds and activities
 */
export function useRealtimePresence({ enabled = true } = {}) {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    totalOnline: 0,
    byCountry: 0,
    byDevice: { desktop: 0, mobile: 0, tablet: 0 },
    topPages: [],
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const supabaseRef = useRef(null);
  const refreshTimeoutRef = useRef(null);

  // Initialize supabase client
  useEffect(() => {
    supabaseRef.current = getSupabase();
  }, []);

  // Fetch current presence data
  const fetchPresence = useCallback(async () => {
    try {
      const response = await fetch("/api/presence?details=true");
      const data = await response.json();

      if (data.success) {
        setUsers(data.data.users);
        setStats(data.data.stats);
        setRecentActivities(data.data.recentActivities);
        setError(null);
      } else {
        setError(data.error);
      }
    } catch (err) {
      console.error("Failed to fetch presence:", err);
      setError("Failed to fetch presence data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (!enabled) return;
    fetchPresence();
  }, [enabled, fetchPresence]);

  // Subscribe to real-time presence changes
  useEffect(() => {
    if (!enabled || !supabaseRef.current) return;

    const supabase = supabaseRef.current;
    const channel = supabase
      .channel("map-presence")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_presence",
        },
        () => {
          // Debounce refresh to avoid too many updates
          if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
          }

          refreshTimeoutRef.current = setTimeout(() => {
            fetchPresence();
          }, 500);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Subscribed to map presence updates");
        }
      });

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [enabled, fetchPresence]);

  // Periodic refresh every 30 seconds as backup
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(fetchPresence, 30000);
    return () => clearInterval(interval);
  }, [enabled, fetchPresence]);

  // Transform users data for Globe3D format
  const usersForMap = useCallback(() => {
    return users.map((countryGroup) => ({
      country: countryGroup.country,
      count: countryGroup.count,
      userSeeds: countryGroup.users.map((user) => ({
        seed: (user.avatarSeed % 1000) / 1000, // Normalize to 0-1
        angle: (user.avatarSeed * 137.508) % (2 * Math.PI), // Golden angle distribution
        avatarSeed: user.avatarSeed,
        pseudonym: user.pseudonym || 'Anonymous',
        currentAction: user.currentAction,
        currentPage: user.currentPage,
        deviceType: user.deviceType,
      })),
    }));
  }, [users]);

  return {
    users,
    usersForMap: usersForMap(),
    stats,
    recentActivities,
    isLoading,
    error,
    refresh: fetchPresence,
  };
}

export default useRealtimePresence;
