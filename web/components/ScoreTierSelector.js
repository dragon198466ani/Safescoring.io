"use client";

/**
 * ScoreTierSelector - Client component for switching between Full/Consumer/Essential score tiers.
 *
 * Used on product detail pages and compare pages where the data is
 * server-rendered but tier switching needs to be interactive.
 *
 * Props:
 *   - scores: { total, s, a, f, e } for "full" tier
 *   - consumerScores: { total, s, a, f, e } for "consumer" tier
 *   - essentialScores: { total, s, a, f, e } for "essential" tier
 *   - children: render prop function(activeScores, activeTierId) => ReactNode
 *   - defaultTier: initial tier to show (default: "full")
 *   - compact: if true, uses a more compact layout
 */

import { useState, useMemo, useCallback } from "react";
import { SCORE_TIERS, SCORE_TIER_IDS } from "@/libs/config-constants";

export default function ScoreTierSelector({
  scores,
  consumerScores,
  essentialScores,
  children,
  defaultTier = "full",
  compact = false,
}) {
  const [activeTier, setActiveTier] = useState(defaultTier);

  const activeScores = useMemo(() => {
    switch (activeTier) {
      case "consumer":
        return consumerScores || { total: 0, s: 0, a: 0, f: 0, e: 0 };
      case "essential":
        return essentialScores || { total: 0, s: 0, a: 0, f: 0, e: 0 };
      default:
        return scores || { total: 0, s: 0, a: 0, f: 0, e: 0 };
    }
  }, [activeTier, scores, consumerScores, essentialScores]);

  const handleTierChange = useCallback((tierId) => {
    setActiveTier(tierId);
  }, []);

  return (
    <div>
      {/* Tier Tabs */}
      <div className={`flex gap-1.5 ${compact ? "mb-3" : "mb-4"}`}>
        {SCORE_TIER_IDS.map((tierId) => {
          const tier = SCORE_TIERS[tierId];
          const isActive = activeTier === tierId;
          return (
            <button
              key={tierId}
              onClick={() => handleTierChange(tierId)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                isActive
                  ? "bg-primary text-primary-content border-primary"
                  : "bg-base-200 text-base-content/60 hover:bg-base-300 border-transparent hover:border-base-content/10"
              }`}
            >
              <span>{tier.label}</span>
              {!compact && (
                <span className="ml-1 opacity-70">({tier.normPercentage}%)</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tier Description */}
      {!compact && (
        <p className="text-xs text-base-content/50 mb-3">
          {SCORE_TIERS[activeTier].description}
        </p>
      )}

      {/* Render children with active scores */}
      {typeof children === "function"
        ? children(activeScores, activeTier)
        : children}
    </div>
  );
}

/**
 * TierBadge - Small inline badge showing which tier a score belongs to.
 * Useful in cards, tables, and compact views.
 */
export function TierBadge({ tierId, size = "sm" }) {
  const tier = SCORE_TIERS[tierId];
  if (!tier || tierId === "full") return null; // Don't show badge for "full" (default)

  const sizeClasses = size === "xs" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-0.5";

  const colorClasses =
    tierId === "essential"
      ? "bg-red-500/10 text-red-400 border-red-500/20"
      : "bg-blue-500/10 text-blue-400 border-blue-500/20";

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${sizeClasses} ${colorClasses}`}
    >
      {tier.label}
    </span>
  );
}
