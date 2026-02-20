"use client";

import { useState, useEffect, useCallback } from "react";
import config from "@/config";

/**
 * Default stats from config (used as fallback)
 * Values aligned with API defaults (/api/platform-stats)
 */
const DEFAULT_STATS = {
  totalNorms: config.safe?.stats?.totalNorms || 2354,
  totalProducts: config.safe?.stats?.totalProducts || 1535,
  totalProductTypes: config.safe?.stats?.totalProductTypes || 78,
  totalEvaluations: config.safe?.stats?.totalEvaluations || 3314065,
  normsByPillar: {
    S: 872,
    A: 530,
    F: 339,
    E: 613,
  },
  productsEvaluated: 1535,
  productsPending: 0,
  scoreDistribution: {
    excellent: 190,
    good: 570,
    fair: 570,
    poor: 170,
  },
  avgScores: {
    global: 62,
    S: 65,
    A: 58,
    F: 64,
    E: 61,
  },
  lastUpdatedAt: null,
};

/**
 * Custom hook to fetch real-time statistics from Supabase
 * Falls back to config values if API fails
 *
 * Usage:
 * const { stats, loading, refetch } = useStats();
 * console.log(stats.totalNorms); // Dynamic value from database
 * console.log(stats.normsByPillar.S); // Norms count for Security pillar
 */
export function useStats() {
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    let timeoutId = null;
    
    try {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${baseUrl}/api/platform-stats`;

      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }

      const data = await res.json();

      if (data.success && data.data) {
        setStats(data.data);
        setError(null);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("[useStats] Failed to fetch stats:", err);
        setError(err.message || "Failed to load stats");
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initTimeout = setTimeout(() => {
      if (isMounted) {
        fetchStats();
      }
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(initTimeout);
    };
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

/**
 * Format stats for display in text
 * Replaces placeholders like {totalNorms} with actual values
 */
export function formatWithStats(text, stats) {
  if (!text || typeof text !== "string") return text;
  
  return text
    .replace(/\{totalNorms\}/g, stats.totalNorms?.toLocaleString() || "2354")
    .replace(/\{totalProducts\}/g, stats.totalProducts?.toLocaleString() || "1535")
    .replace(/\{totalProductTypes\}/g, stats.totalProductTypes?.toLocaleString() || "78")
    .replace(/\{normsS\}/g, stats.normsByPillar?.S?.toLocaleString() || "872")
    .replace(/\{normsA\}/g, stats.normsByPillar?.A?.toLocaleString() || "530")
    .replace(/\{normsF\}/g, stats.normsByPillar?.F?.toLocaleString() || "339")
    .replace(/\{normsE\}/g, stats.normsByPillar?.E?.toLocaleString() || "613")
    .replace(/\{avgScore\}/g, stats.avgScores?.global?.toFixed(0) || "62");
}

export default useStats;
