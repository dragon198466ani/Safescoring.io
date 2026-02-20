"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import config from "@/config";

/**
 * Default stats (fallback values)
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

const StatsContext = createContext({
  stats: DEFAULT_STATS,
  loading: false,
  error: null,
  refetch: () => {},
});

/**
 * StatsProvider - Global stats context provider
 * 
 * Wrap your app with this provider to make stats available everywhere.
 * Stats are fetched once and cached, with automatic refresh every 5 minutes.
 */
export function StatsProvider({ children }) {
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/platform-stats", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }

      const data = await res.json();

      if (data.success && data.data) {
        setStats(data.data);
        setError(null);
      }
    } catch (err) {
      console.error("[StatsProvider] Failed to fetch stats:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    // Refresh every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchStats]);

  return (
    <StatsContext.Provider value={{ stats, loading, error, refetch: fetchStats }}>
      {children}
    </StatsContext.Provider>
  );
}

/**
 * Hook to access global stats
 */
export function useGlobalStats() {
  const context = useContext(StatsContext);
  if (!context) {
    console.warn("useGlobalStats must be used within a StatsProvider");
    return { stats: DEFAULT_STATS, loading: false, error: null, refetch: () => {} };
  }
  return context;
}

/**
 * Format text with dynamic stats
 * Replaces placeholders like {totalNorms} with actual values
 * 
 * @param {string} text - Text with placeholders
 * @param {object} stats - Stats object
 * @returns {string} - Formatted text
 */
export function formatWithStats(text, stats) {
  if (!text || typeof text !== "string") return text;
  
  const s = stats || DEFAULT_STATS;
  
  return text
    .replace(/\{totalNorms\}/g, s.totalNorms?.toLocaleString() || "2354")
    .replace(/\{totalProducts\}/g, s.totalProducts?.toLocaleString() || "1535")
    .replace(/\{totalProductTypes\}/g, s.totalProductTypes?.toLocaleString() || "78")
    .replace(/\{normsS\}/g, s.normsByPillar?.S?.toLocaleString() || "872")
    .replace(/\{normsA\}/g, s.normsByPillar?.A?.toLocaleString() || "530")
    .replace(/\{normsF\}/g, s.normsByPillar?.F?.toLocaleString() || "339")
    .replace(/\{normsE\}/g, s.normsByPillar?.E?.toLocaleString() || "613")
    .replace(/\{avgScore\}/g, s.avgScores?.global?.toFixed?.(0) || "62")
    .replace(/\{productsEvaluated\}/g, s.productsEvaluated?.toLocaleString() || "1535");
}

/**
 * Get dynamic tagline with current stats
 */
export function getDynamicTagline(stats) {
  const s = stats || DEFAULT_STATS;
  return `${s.totalNorms?.toLocaleString()} norms. ${s.totalProducts?.toLocaleString()}+ products scored.`;
}

/**
 * Get dynamic description with current stats
 */
export function getDynamicDescription(stats) {
  const s = stats || DEFAULT_STATS;
  return `The first unified security rating for all crypto products. ${s.totalNorms?.toLocaleString()} norms. ${s.totalProducts?.toLocaleString()}+ products scored. Hardware wallets, software wallets, and DeFi protocols - all evaluated with the same rigorous SAFE methodology.`;
}

export default StatsProvider;
