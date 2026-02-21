"use client";

import { getScoreColor, getScoreColorHex, getScoreVerdict } from "@/libs/score-utils";

/**
 * ScoreCircleFull - Full-size animated score circle with label and date.
 *
 * Used on product pages, setup detail pages, etc.
 * Imports all color logic from score-utils (single source of truth).
 *
 * @param {number} score - 0-100 score value
 * @param {number} size - Circle size in px (default: 140)
 * @param {number} strokeWidth - Stroke width (default: 10)
 * @param {string} lastUpdate - ISO date of last score update
 * @param {function} t - Translation function
 * @param {string} locale - Locale string for date formatting
 */
const ScoreCircleFull = ({ score, size = 140, strokeWidth = 10, lastUpdate, t, locale }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  const verdict = getScoreVerdict(score);
  const strokeColor = getScoreColorHex(score);
  const textColor = getScoreColor(score);

  // Translated label with fallback
  const label = t
    ? (score >= 80
        ? t("productDetail.scoreBands.excellentShort")
        : score >= 60
        ? t("productDetail.scoreBands.goodShort")
        : t("productDetail.scoreBands.atRisk"))
    : verdict.text;

  return (
    <div
      className="flex flex-col items-center p-6 rounded-2xl bg-base-200/50 border border-base-content/10"
      role="figure"
      aria-label={`SAFE Score: ${score} out of 100, rated ${verdict.text}`}
    >
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
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-bold ${textColor}`}>
            {score}
          </span>
        </div>
      </div>
      <div className="mt-4 text-center">
        <div className="text-sm font-medium text-base-content/60 uppercase tracking-wider">
          {t ? t("product.safeScore") : "SAFE Score"}
        </div>
        <div className={`text-base font-semibold mt-1 ${textColor}`}>{label}</div>
      </div>
      {lastUpdate && (
        <div className="mt-3 text-xs text-base-content/40">
          {t
            ? t("product.updated", { date: new Date(lastUpdate).toLocaleDateString(locale || "en-US") })
            : `Updated ${new Date(lastUpdate).toLocaleDateString(locale || "en-US")}`}
        </div>
      )}
    </div>
  );
};

export default ScoreCircleFull;
