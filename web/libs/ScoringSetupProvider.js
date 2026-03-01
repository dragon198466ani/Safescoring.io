"use client";

/**
 * ScoringSetupProvider — Global context for custom pillar weight scoring.
 *
 * Provides the active scoring setup weights to all score-displaying components.
 * SAFE score is computed client-side: (S*wS + A*wA + F*wF + E*wE) / 100
 *
 * Usage:
 *   const { weights, computeSAFE, isCustom, activeSetup } = useScoringSetup();
 *   const customTotal = computeSAFE({ s: 80, a: 60, f: 90, e: 70 }); // => weighted score
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";

const ScoringSetupContext = createContext(null);

const DEFAULT_WEIGHTS = { s: 25, a: 25, f: 25, e: 25 };
const STORAGE_KEY = "ss_scoring_setup";

export function ScoringSetupProvider({ children }) {
  const { data: session, status } = useSession();
  const [setups, setSetups] = useState([]);
  const [activeSetup, setActiveSetupState] = useState(null);
  const [loading, setLoading] = useState(false);

  // Derive weights from active setup or defaults
  const weights = useMemo(() => {
    if (!activeSetup) return DEFAULT_WEIGHTS;
    return {
      s: activeSetup.weight_s,
      a: activeSetup.weight_a,
      f: activeSetup.weight_f,
      e: activeSetup.weight_e,
    };
  }, [activeSetup]);

  // Whether custom weights are active
  const isCustom = activeSetup !== null;

  /**
   * Compute weighted SAFE score from pillar scores.
   * @param {Object} scores - { s, a, f, e } pillar scores (0-100)
   * @returns {number|null} Weighted SAFE score
   */
  const computeSAFE = useCallback(
    (scores) => {
      if (!scores) return null;
      const { s, a, f, e } = scores;

      // Need at least 2 pillar scores
      const available = [
        { val: s, w: weights.s },
        { val: a, w: weights.a },
        { val: f, w: weights.f },
        { val: e, w: weights.e },
      ].filter((p) => p.val != null && p.val !== undefined);

      if (available.length < 2) return null;

      const totalWeight = available.reduce((sum, p) => sum + p.w, 0);
      if (totalWeight === 0) return null;

      const weightedSum = available.reduce((sum, p) => sum + p.val * p.w, 0);
      return Math.round(weightedSum / totalWeight);
    },
    [weights]
  );

  // Fetch scoring setups from API
  const fetchSetups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/scoring-setups");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setSetups(data.setups || []);
        const active = (data.setups || []).find((s) => s.is_active);
        setActiveSetupState(active || null);
        // Cache active setup for instant hydration
        if (active) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
          } catch {}
        } else {
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {}
        }
      }
    } catch (err) {
      console.error("Failed to fetch scoring setups:", err);
    }
    setLoading(false);
  }, []);

  // Load from localStorage on mount (instant, before API call)
  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.weight_s !== undefined) {
          setActiveSetupState(parsed);
        }
      }
    } catch {}
  }, []);

  // Fetch from API when authenticated
  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      fetchSetups();
    } else if (status === "unauthenticated") {
      // Clear custom setup for logged-out users
      setSetups([]);
      setActiveSetupState(null);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  }, [status, session?.user?.id, fetchSetups]);

  /**
   * Set a setup as active (or deactivate all by passing null)
   */
  const setActiveSetup = useCallback(
    async (setupId) => {
      if (!setupId) {
        // Deactivate current
        if (activeSetup) {
          try {
            await fetch("/api/user/scoring-setups", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: activeSetup.id, is_active: false }),
            });
          } catch {}
        }
        setActiveSetupState(null);
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
        await fetchSetups();
        return;
      }

      try {
        const res = await fetch("/api/user/scoring-setups", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: setupId, is_active: true }),
        });
        if (res.ok) {
          await fetchSetups();
        }
      } catch (err) {
        console.error("Failed to set active setup:", err);
      }
    },
    [activeSetup, fetchSetups]
  );

  const value = useMemo(
    () => ({
      setups,
      activeSetup,
      weights,
      isCustom,
      loading,
      computeSAFE,
      setActiveSetup,
      refetch: fetchSetups,
    }),
    [setups, activeSetup, weights, isCustom, loading, computeSAFE, setActiveSetup, fetchSetups]
  );

  return <ScoringSetupContext.Provider value={value}>{children}</ScoringSetupContext.Provider>;
}

/**
 * Hook to access the scoring setup context.
 * Safe to call outside the provider (returns defaults).
 */
export function useScoringSetup() {
  const ctx = useContext(ScoringSetupContext);
  if (!ctx) {
    // Outside provider (SSR / tests) — return safe defaults
    return {
      setups: [],
      activeSetup: null,
      weights: DEFAULT_WEIGHTS,
      isCustom: false,
      loading: false,
      computeSAFE: () => null,
      setActiveSetup: () => {},
      refetch: () => {},
    };
  }
  return ctx;
}
