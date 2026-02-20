"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";

/**
 * Hook for checking feature access and usage limits
 *
 * Usage:
 * const { canAccess, checkAccess, usage, loading } = useFeatureAccess();
 *
 * // Check before action
 * const result = await checkAccess('comparison');
 * if (!result.canAccess) {
 *   // Show upgrade prompt with result.upgradeInfo
 * }
 */
export function useFeatureAccess() {
  const [checking, setChecking] = useState(false);

  // Fetch current usage summary
  const { data: usage, error, mutate } = useSWR(
    "/api/user/usage",
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch usage");
      return res.json();
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    }
  );

  /**
   * Check if user can access a feature
   */
  const checkAccess = useCallback(async (feature, options = {}) => {
    setChecking(true);
    try {
      const res = await fetch("/api/user/feature-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature, ...options }),
      });

      if (!res.ok) {
        throw new Error("Failed to check feature access");
      }

      const result = await res.json();

      // Refresh usage data if limit was hit
      if (!result.canAccess) {
        mutate();
      }

      return result;
    } catch (error) {
      console.error("Error checking feature access:", error);
      return {
        canAccess: true, // Fail open
        error: error.message,
      };
    } finally {
      setChecking(false);
    }
  }, [mutate]);

  /**
   * Track feature usage
   */
  const trackUsage = useCallback(async (feature) => {
    try {
      await fetch("/api/user/track-feature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature }),
      });
      // Refresh usage data
      mutate();
    } catch (error) {
      console.error("Error tracking feature usage:", error);
    }
  }, [mutate]);

  /**
   * Check if approaching limit (for proactive upsell)
   */
  const isApproachingLimit = useCallback((feature) => {
    if (!usage?.usage?.[feature]) return false;

    const { used, limit } = usage.usage[feature];
    if (limit < 0) return false; // Unlimited

    return (used / limit) >= 0.8;
  }, [usage]);

  /**
   * Get remaining usage for a feature
   */
  const getRemaining = useCallback((feature) => {
    if (!usage?.usage?.[feature]) return null;

    const { remaining, limit } = usage.usage[feature];
    if (limit < 0) return -1; // Unlimited

    return remaining;
  }, [usage]);

  return {
    // Current usage data
    usage: usage?.usage || null,
    features: usage?.features || null,
    plan: usage?.plan || "free",

    // Functions
    checkAccess,
    trackUsage,
    isApproachingLimit,
    getRemaining,

    // Loading states
    loading: !usage && !error,
    checking,
    error,

    // Refresh
    refresh: mutate,
  };
}

/**
 * Hook for upgrade prompt state
 */
export function useUpgradePrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const [promptData, setPromptData] = useState(null);

  const showPrompt = useCallback((data) => {
    setPromptData(data);
    setIsOpen(true);
  }, []);

  const hidePrompt = useCallback(() => {
    setIsOpen(false);
    setPromptData(null);
  }, []);

  /**
   * Check access and show prompt if needed
   */
  const checkAndPrompt = useCallback(async (feature, options = {}) => {
    const { checkAccess } = useFeatureAccess();
    const result = await checkAccess(feature, options);

    if (!result.canAccess) {
      showPrompt({
        triggerType: result.triggerType,
        upgradeInfo: result.upgradeInfo,
        currentUsage: result.currentUsage,
        limit: result.limit,
        plan: result.plan,
      });
      return false;
    }

    return true;
  }, [showPrompt]);

  return {
    isOpen,
    promptData,
    showPrompt,
    hidePrompt,
    checkAndPrompt,
  };
}

export default useFeatureAccess;
