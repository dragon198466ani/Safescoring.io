"use client";

import { useCallback } from "react";
import { useLanguage } from "@/libs/i18n/LanguageProvider";

/**
 * Hook for tracking share events
 *
 * @example
 * const { trackShare } = useShareTracking();
 *
 * // Track a product share to Twitter
 * await trackShare('product', 'ledger-nano-x', 'twitter');
 *
 * // Track a comparison share
 * await trackShare('comparison', 'ledger-nano-x/trezor-model-t', 'linkedin');
 */
export function useShareTracking() {
  const { language } = useLanguage();

  const trackShare = useCallback(async (shareType, targetId, platform) => {
    try {
      // Fire and forget - don't block the share action
      fetch("/api/track/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          share_type: shareType,
          target_id: targetId,
          platform: platform,
          locale: language || "en",
        }),
        // Use keepalive to ensure request completes even if page navigates
        keepalive: true,
      }).catch(() => {
        // Silently ignore tracking errors
      });

      return true;
    } catch {
      // Tracking errors should never affect user experience
      return false;
    }
  }, [language]);

  /**
   * Track a product share
   */
  const trackProductShare = useCallback((slug, platform) => {
    return trackShare("product", slug, platform);
  }, [trackShare]);

  /**
   * Track a comparison share
   * @param {string[]} slugs - Array of product slugs being compared
   */
  const trackComparisonShare = useCallback((slugs, platform) => {
    return trackShare("comparison", slugs.join("/"), platform);
  }, [trackShare]);

  /**
   * Track a setup share
   */
  const trackSetupShare = useCallback((setupId, platform) => {
    return trackShare("setup", setupId, platform);
  }, [trackShare]);

  /**
   * Track a leaderboard share
   */
  const trackLeaderboardShare = useCallback((category, platform) => {
    return trackShare("leaderboard", category || "all", platform);
  }, [trackShare]);

  /**
   * Track a badge/achievement share
   */
  const trackBadgeShare = useCallback((badgeType, platform) => {
    return trackShare("badge", badgeType, platform);
  }, [trackShare]);

  return {
    trackShare,
    trackProductShare,
    trackComparisonShare,
    trackSetupShare,
    trackLeaderboardShare,
    trackBadgeShare,
  };
}

export default useShareTracking;
