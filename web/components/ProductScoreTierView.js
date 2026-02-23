"use client";

/**
 * ProductScoreTierView - Client component that adds tier switching
 * to the product detail page score display.
 *
 * Renders the score circle, pillar breakdown, and tier tabs.
 * Used as a client island within the server-rendered product page.
 */

import { useState, useMemo } from "react";
import { SCORE_TIERS, SCORE_TIER_IDS } from "@/libs/config-constants";

const getScoreColor = (score) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
};

const getScoreColorHex = (score) => {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
};

const getScoreLabel = (score) => {
  if (score >= 80) return { label: "Excellent", color: "text-green-400" };
  if (score >= 60) return { label: "Good", color: "text-amber-400" };
  return { label: "At Risk", color: "text-red-400" };
};

/**
 * @param {Object} props
 * @param {Object} props.scores - Full scores { total, s, a, f, e }
 * @param {Object} props.consumerScores - Consumer scores { total, s, a, f, e }
 * @param {Object} props.essentialScores - Essential scores { total, s, a, f, e }
 * @param {string} props.lastUpdate - ISO date string of last score update
 * @param {string} props.locale - User locale for date formatting
 * @param {Array} props.pillars - Pillar config array from config.safe.pillars
 * @param {Object} props.pillarKeyMap - Map from pillar code to i18n key
 * @param {Object} props.translations - Pre-resolved translation strings
 */
export default function ProductScoreTierView({
  scores,
  consumerScores,
  essentialScores,
  lastUpdate,
  locale,
  pillars,
  pillarKeyMap,
  translations = {},
}) {
  const [activeTier, setActiveTier] = useState("full");

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

  const tierConfig = SCORE_TIERS[activeTier];
  const scoreInfo = getScoreLabel(activeScores.total);
  const size = 140;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (activeScores.total / 100) * circumference;
  const strokeColor = getScoreColorHex(activeScores.total);

  return (
    <div>
      {/* Tier Tabs */}
      <div className="flex gap-1 mb-3 justify-center">
        {SCORE_TIER_IDS.map((tierId) => {
          const tier = SCORE_TIERS[tierId];
          const isActive = activeTier === tierId;
          return (
            <button
              key={tierId}
              onClick={() => setActiveTier(tierId)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all border ${
                isActive
                  ? "bg-primary text-primary-content border-primary shadow-sm"
                  : "bg-base-200/70 text-base-content/50 hover:bg-base-300 border-transparent"
              }`}
            >
              {tier.label}
              <span className="ml-1 opacity-60">{tier.normPercentage}%</span>
            </button>
          );
        })}
      </div>

      {/* Score Circle */}
      <div className="flex flex-col items-center p-6 rounded-2xl bg-base-200/50 border border-base-content/10">
        <div className="relative" style={{ width: size, height: size }}>
          <svg className="score-circle" width={size} height={size}>
            <circle
              className="score-circle-bg"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={strokeWidth}
            />
            <circle
              className="score-circle-progress"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              stroke={strokeColor}
              style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={`text-4xl font-bold transition-colors ${getScoreColor(activeScores.total)}`}
            >
              {activeScores.total}
            </span>
          </div>
        </div>
        <div className="mt-4 text-center">
          <div className="text-sm font-medium text-base-content/60 uppercase tracking-wider">
            {translations.safeScore || "SAFE Score"}
            {activeTier !== "full" && (
              <span className="ml-1 text-[10px] opacity-70">
                ({tierConfig.label})
              </span>
            )}
          </div>
          <div className={`text-base font-semibold mt-1 transition-colors ${scoreInfo.color}`}>
            {scoreInfo.label}
          </div>
        </div>
        {lastUpdate && (
          <div className="mt-3 text-xs text-base-content/40">
            {translations.updatedPrefix || "Updated"}{" "}
            {new Date(lastUpdate).toLocaleDateString(locale || "en-US")}
          </div>
        )}
      </div>

      {/* Pillar Breakdown for selected tier */}
      {pillars && pillars.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {pillars.map((pillar) => {
            const pillarScore = activeScores[pillar.code.toLowerCase()] || 0;
            return (
              <div
                key={pillar.code}
                className="p-2.5 rounded-xl bg-base-200/50 border border-base-content/5"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-sm font-black"
                      style={{ color: pillar.color }}
                    >
                      {pillar.code}
                    </span>
                    <span className="text-[10px] text-base-content/50">
                      {translations.pillarNames?.[pillar.code] || pillar.name || pillar.code}
                    </span>
                  </div>
                  <span
                    className={`text-sm font-bold tabular-nums transition-colors ${getScoreColor(pillarScore)}`}
                  >
                    {pillarScore}
                  </span>
                </div>
                <div className="w-full h-1 bg-base-300 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pillarScore}%`,
                      backgroundColor: pillar.color,
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tier explanation */}
      <div className="mt-3 text-center">
        <p className="text-[10px] text-base-content/40">
          {tierConfig.description}
        </p>
      </div>
    </div>
  );
}
