"use client";

import { useState, useEffect } from "react";

/**
 * Client-side hook to fetch norm stats from /api/stats/norms.
 * Returns { totalNorms, totalProducts, totalProductTypes, totalEvaluations, pillarCounts, loading }
 */
export function useNormStats() {
  const [stats, setStats] = useState({
    totalNorms: null,
    totalProducts: null,
    totalProductTypes: null,
    totalEvaluations: null,
    pillarCounts: { S: 0, A: 0, F: 0, E: 0 },
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      try {
        const res = await fetch("/api/stats/norms");
        if (!res.ok) throw new Error("Failed to fetch norm stats");
        const data = await res.json();
        if (!cancelled) {
          setStats({
            totalNorms: data.totalNorms,
            totalProducts: data.totalProducts,
            totalProductTypes: data.totalProductTypes,
            totalEvaluations: data.totalEvaluations,
            pillarCounts: data.pillarCounts || { S: 0, A: 0, F: 0, E: 0 },
            loading: false,
          });
        }
      } catch (e) {
        console.error("useNormStats error:", e);
        if (!cancelled) {
          setStats((prev) => ({ ...prev, loading: false }));
        }
      }
    }

    fetchStats();
    return () => { cancelled = true; };
  }, []);

  return stats;
}
