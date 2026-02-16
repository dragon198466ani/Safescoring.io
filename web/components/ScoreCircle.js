"use client";

import { useTranslation } from "@/libs/i18n/LanguageProvider";

/**
 * ScoreCircle — Circular score visualization for SAFE scores.
 * Used on product cards (MiniScoreCircle) and detail pages (ScoreCircle).
 */

const getScoreColor = (score) => {
  if (score >= 80) return "#22c55e"; // green
  if (score >= 60) return "#f59e0b"; // amber
  return "#ef4444"; // red
};

const getScoreTextColor = (score) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
};

/**
 * MiniScoreCircle — Compact version for product cards and lists.
 * Props: score (0-100), size (px), strokeWidth (px)
 */
export function MiniScoreCircle({ score = 0, size = 72, strokeWidth = 6 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  const strokeColor = getScoreColor(score);
  const hasScore = score > 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-base-300"
        />
        {/* Progress circle */}
        {hasScore && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-lg font-bold ${hasScore ? getScoreTextColor(score) : "text-base-content/30"}`}>
          {hasScore ? score : "—"}
        </span>
      </div>
    </div>
  );
}

/**
 * ScoreCircle — Full version with label, for detail pages.
 * Props: score, size, strokeWidth, label, lastUpdate
 */
export default function ScoreCircle({ score = 0, size = 140, strokeWidth = 10, label, lastUpdate }) {
  const { t } = useTranslation();
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  const strokeColor = getScoreColor(score);
  const hasScore = score > 0;

  const getLabel = () => {
    if (!hasScore) return { text: t("scoreCircle.notEvaluated"), color: "text-base-content/40" };
    if (score >= 80) return { text: t("scoreCircle.excellent"), color: "text-green-400" };
    if (score >= 60) return { text: t("scoreCircle.good"), color: "text-amber-400" };
    return { text: t("scoreCircle.atRisk"), color: "text-red-400" };
  };

  const scoreLabel = getLabel();
  const dateLocale = t("lang") === "fr" ? "fr-FR" : "en-GB";

  return (
    <div className="flex flex-col items-center p-6 rounded-2xl bg-base-200/50 border border-base-content/10">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-base-300"
          />
          {hasScore && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-bold ${hasScore ? getScoreTextColor(score) : "text-base-content/30"}`}>
            {hasScore ? score : "—"}
          </span>
        </div>
      </div>
      <div className="mt-4 text-center">
        <div className="text-sm font-medium text-base-content/60 uppercase tracking-wider">
          {label || t("scoreCircle.safeScore")}
        </div>
        <div className={`text-base font-semibold mt-1 ${scoreLabel.color}`}>
          {scoreLabel.text}
        </div>
      </div>
      {lastUpdate && (
        <div className="mt-3 text-xs text-base-content/40">
          {t("scoreCircle.updated")} {new Date(lastUpdate).toLocaleDateString(dateLocale)}
        </div>
      )}
    </div>
  );
}
