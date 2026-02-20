"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import { getSupabase } from "@/libs/supabase";

// Generate a unique session ID for this browser tab
function generateSessionId() {
  if (typeof window === "undefined") return null;

  // Check for existing session ID in sessionStorage (per-tab)
  let sessionId = sessionStorage.getItem("presence_session_id");

  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem("presence_session_id", sessionId);
  }

  return sessionId;
}

// Detect device type
function getDeviceType() {
  if (typeof window === "undefined") return "desktop";

  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "tablet";
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return "mobile";
  }
  return "desktop";
}

// Generate consistent avatar seed from session ID
function getAvatarSeed(sessionId) {
  if (!sessionId) return 1;
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    const char = sessionId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Pseudonym generation arrays
const ADJECTIVES = [
  'Gold', 'Silver', 'Cosmic', 'Electric', 'Crystal', 'Shadow', 'Neon',
  'Mystic', 'Cyber', 'Quantum', 'Stellar', 'Lunar', 'Solar', 'Frost',
  'Thunder', 'Phoenix', 'Ruby', 'Emerald', 'Sapphire', 'Diamond',
  'Swift', 'Silent', 'Brave', 'Noble', 'Royal', 'Wild', 'Zen'
];

const ANIMALS = [
  'Tiger', 'Wolf', 'Fox', 'Eagle', 'Hawk', 'Bear', 'Lion', 'Panther',
  'Dragon', 'Phoenix', 'Falcon', 'Raven', 'Owl', 'Shark', 'Dolphin',
  'Whale', 'Cobra', 'Viper', 'Jaguar', 'Leopard', 'Lynx', 'Puma',
  'Orca', 'Kraken', 'Griffin', 'Sphinx', 'Hydra', 'Chimera'
];

// Generate consistent pseudonym from session ID
function generatePseudonym(sessionId) {
  if (!sessionId) return 'Anonymous';

  // Check for stored custom pseudonym
  if (typeof window !== "undefined") {
    const customPseudo = sessionStorage.getItem("presence_pseudonym");
    if (customPseudo) return customPseudo;
  }

  const seed = getAvatarSeed(sessionId);
  const adjIndex = seed % ADJECTIVES.length;
  const animalIndex = Math.floor(seed / ADJECTIVES.length) % ANIMALS.length;

  return `${ADJECTIVES[adjIndex]} ${ANIMALS[animalIndex]}`;
}

// Allow user to set custom pseudonym
function setCustomPseudonym(pseudonym) {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("presence_pseudonym", pseudonym);
  }
}

/**
 * usePresence hook - Tracks user presence for real-time map display
 *
 * Features:
 * - Sends heartbeat every 30 seconds
 * - Updates on page navigation
 * - Detects country via IP geolocation
 * - Cleans up on tab close
 * - Subscribes to real-time presence updates
 */
export function usePresence({
  enabled = true,
  heartbeatInterval = 30000, // 30 seconds
  onPresenceUpdate = null,
} = {}) {
  const pathname = usePathname();
  const sessionIdRef = useRef(null);
  const heartbeatRef = useRef(null);
  const geoDataRef = useRef(null);
  const supabaseRef = useRef(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize supabase client
  useEffect(() => {
    supabaseRef.current = getSupabase();
  }, []);

  // Initialize session ID
  useEffect(() => {
    sessionIdRef.current = generateSessionId();
  }, []);

  // Fetch geo data once
  useEffect(() => {
    if (!enabled || geoDataRef.current) return;

    async function fetchGeoData() {
      try {
        const response = await fetch("https://ipapi.co/json/");
        const data = await response.json();
        geoDataRef.current = {
          country: data.country_code,
          city: data.city,
          lat: data.latitude,
          lng: data.longitude,
        };
      } catch (error) {
        console.warn("Could not fetch geo data:", error);
        geoDataRef.current = { country: null, city: null, lat: null, lng: null };
      }
    }

    fetchGeoData();
  }, [enabled]);

  // Send presence update
  const updatePresence = useCallback(async (action = null) => {
    if (!enabled || !sessionIdRef.current) return;

    try {
      const pseudonym = generatePseudonym(sessionIdRef.current);
      const response = await fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          country: geoDataRef.current?.country,
          city: geoDataRef.current?.city,
          lat: geoDataRef.current?.lat,
          lng: geoDataRef.current?.lng,
          currentPage: pathname,
          currentAction: action,
          deviceType: getDeviceType(),
          avatarSeed: getAvatarSeed(sessionIdRef.current),
          pseudonym,
        }),
      });

      if (response.ok) {
        setIsConnected(true);
      }
    } catch (error) {
      console.warn("Failed to update presence:", error);
      setIsConnected(false);
    }
  }, [enabled, pathname]);

  // Remove presence on disconnect
  const removePresence = useCallback(async () => {
    if (!sessionIdRef.current) return;

    try {
      // Use sendBeacon for reliability on page unload
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          `/api/presence?sessionId=${sessionIdRef.current}`,
          new Blob([], { type: "application/json" })
        );
      } else {
        await fetch(`/api/presence?sessionId=${sessionIdRef.current}`, {
          method: "DELETE",
          keepalive: true,
        });
      }
    } catch (error) {
      // Ignore errors on disconnect
    }
  }, []);

  // Send initial presence and start heartbeat
  useEffect(() => {
    if (!enabled) return;

    // Wait for geo data to be available
    const initTimeout = setTimeout(() => {
      updatePresence();
    }, 1000);

    // Start heartbeat
    heartbeatRef.current = setInterval(() => {
      updatePresence();
    }, heartbeatInterval);

    // Cleanup on unmount
    return () => {
      clearTimeout(initTimeout);
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [enabled, heartbeatInterval, updatePresence]);

  // Update presence on page navigation
  useEffect(() => {
    if (!enabled || !sessionIdRef.current) return;

    // Small delay to ensure geo data is available
    const navTimeout = setTimeout(() => {
      updatePresence();
    }, 100);

    return () => clearTimeout(navTimeout);
  }, [pathname, enabled, updatePresence]);

  // Handle page visibility changes
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updatePresence();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, updatePresence]);

  // Handle page unload
  useEffect(() => {
    if (!enabled) return;

    const handleUnload = () => {
      removePresence();
    };

    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
    };
  }, [enabled, removePresence]);

  // Subscribe to real-time presence changes
  useEffect(() => {
    if (!enabled || !onPresenceUpdate || !supabaseRef.current) return;

    const supabase = supabaseRef.current;
    const channel = supabase
      .channel("presence-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_presence",
        },
        (payload) => {
          onPresenceUpdate(payload);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Subscribed to presence updates");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, onPresenceUpdate]);

  // Fetch initial online count
  useEffect(() => {
    if (!enabled) return;

    async function fetchOnlineCount() {
      try {
        const response = await fetch("/api/presence");
        const data = await response.json();
        if (data.success) {
          setOnlineCount(data.data.stats.totalOnline);
        }
      } catch (error) {
        // Ignore errors
      }
    }

    fetchOnlineCount();

    // Refresh count periodically
    const countInterval = setInterval(fetchOnlineCount, 60000);

    return () => clearInterval(countInterval);
  }, [enabled]);

  // Track specific action
  const trackAction = useCallback((action) => {
    updatePresence(action);
  }, [updatePresence]);

  // Get current pseudonym
  const getPseudonym = useCallback(() => {
    return generatePseudonym(sessionIdRef.current);
  }, []);

  // Update pseudonym (saves to sessionStorage and sends update)
  const updatePseudonym = useCallback((newPseudonym) => {
    setCustomPseudonym(newPseudonym);
    updatePresence(); // Send update with new pseudonym
  }, [updatePresence]);

  return {
    sessionId: sessionIdRef.current,
    isConnected,
    onlineCount,
    trackAction,
    updatePresence,
    pseudonym: sessionIdRef.current ? generatePseudonym(sessionIdRef.current) : 'Anonymous',
    getPseudonym,
    updatePseudonym,
  };
}

export default usePresence;
