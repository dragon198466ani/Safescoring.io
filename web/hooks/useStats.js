"use client";

import { useState, useEffect } from "react";

/**
 * useStats - Fetches global platform statistics
 */
export function useStats() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalNorms: 916,
    totalIncidents: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/leaderboard?limit=1");
        if (res.ok) {
          const data = await res.json();
          setStats((prev) => ({
            ...prev,
            totalProducts: data.stats?.totalProducts || 0,
          }));
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return { stats, loading };
}

export default useStats;
