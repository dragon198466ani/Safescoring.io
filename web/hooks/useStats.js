/**
 * @deprecated REMOVED in Phase 2.6 — Do NOT use this hook.
 *
 * Migration guide:
 *   import { useGlobalStats } from "@/libs/StatsProvider";
 *   const { stats, loading, error, refetch } = useGlobalStats();
 *
 * For formatWithStats:
 *   import { formatWithStats } from "@/libs/StatsProvider";
 *
 * This file will be deleted in a future release.
 */

export { formatWithStats } from "@/libs/StatsProvider";

/** @deprecated Use useGlobalStats from @/libs/StatsProvider */
export function useStats() {
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[useStats] DEPRECATED: Replace with useGlobalStats from @/libs/StatsProvider. " +
      "This hook will be removed in a future release."
    );
  }
  // Lazy-import to avoid pulling in React context in non-React environments
  const { useGlobalStats } = require("@/libs/StatsProvider");
  return useGlobalStats();
}

export default useStats;
