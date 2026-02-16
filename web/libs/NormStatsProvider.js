"use client";

import { createContext, useContext } from "react";

/**
 * Context for norm stats fetched from the database.
 * Stats are loaded server-side in the root layout and passed down.
 * Client components use `useNormStats()` to access them.
 */
const NormStatsContext = createContext(null);

export function NormStatsProvider({ stats, children }) {
  return (
    <NormStatsContext.Provider value={stats}>
      {children}
    </NormStatsContext.Provider>
  );
}

/**
 * Hook for client components to access norm stats.
 * Returns { totalNorms, byPillar, totalProducts, totalProductTypes, totalEvaluations } or null.
 */
export function useNormStats() {
  return useContext(NormStatsContext);
}
