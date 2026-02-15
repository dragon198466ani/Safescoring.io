"use client";

import { useTranslation } from "@/libs/i18n/LanguageProvider";
import config from "@/config";

/**
 * WeakestPillarHighlight - Alert card that highlights the setup's weakest
 * SAFE pillar and provides actionable improvement advice.
 *
 * Props:
 *  - weakestPillar: { code, score } | null
 *  - allScores: { S, A, F, E }
 *  - benchmark: { S, A, F, E } | null  (market average)
 *  - className: optional extra classes
 */
export default function WeakestPillarHighlight({
  weakestPillar,
  allScores,
  benchmark,
  className = "",
}) {
  const { t } = useTranslation();

  // Resolve pillar metadata from config
  const pillarMeta = weakestPillar
    ? config.safe.pillars.find((p) => p.code === weakestPillar.code)
    : null;

  // Check if all pillars are at or above benchmark
  const allAtTarget =
    !benchmark ||
    !weakestPillar ||
    config.safe.pillars.every(
      (p) => (allScores?.[p.code] ?? 0) >= (benchmark?.[p.code] ?? 0)
    );

  // Success state: everything at or above market average
  if (!weakestPillar || allAtTarget) {
    return (
      <div
        className={`rounded-xl bg-green-500/10 border border-green-500/30 p-5 flex items-center gap-3 ${className}`}
      >
        <span className="text-2xl">&#x2705;</span>
        <p className="text-sm text-green-400 font-medium">
          {t("charts.weakness.atTarget")}
        </p>
      </div>
    );
  }

  // Compute gap
  const benchmarkScore = benchmark?.[weakestPillar.code] ?? 0;
  const gap = Math.max(0, benchmarkScore - weakestPillar.score);
  const progressPercent =
    benchmarkScore > 0
      ? Math.min(100, (weakestPillar.score / benchmarkScore) * 100)
      : 100;

  return (
    <div
      className={`rounded-xl bg-base-200 border border-base-300 overflow-hidden ${className}`}
      style={{
        background: pillarMeta
          ? `linear-gradient(135deg, ${pillarMeta.color}0D 0%, transparent 60%)`
          : undefined,
      }}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Left: Large pillar letter + down arrow */}
          <div className="flex flex-col items-center gap-1 pt-1">
            <span
              className="text-3xl font-black leading-none"
              style={{ color: pillarMeta?.color }}
            >
              {weakestPillar.code}
            </span>
            {/* Down arrow icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke={pillarMeta?.color || "currentColor"}
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"
              />
            </svg>
          </div>

          {/* Center content */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Title */}
            <h4 className="font-semibold text-sm">
              {t("charts.weakness.title")}
            </h4>

            {/* Pillar name + scores */}
            <div className="flex items-baseline gap-2 flex-wrap">
              <span
                className="font-bold"
                style={{ color: pillarMeta?.color }}
              >
                {pillarMeta?.name}
              </span>
              <span className="text-base-content/60 text-sm">
                {weakestPillar.score}
                {benchmark && (
                  <span className="text-base-content/40">
                    {" / "}
                    {benchmarkScore}
                  </span>
                )}
              </span>
            </div>

            {/* Progress bar: current vs benchmark */}
            <div className="relative h-3 rounded-full bg-base-300 overflow-hidden">
              {/* Current score */}
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: pillarMeta?.color,
                }}
              />
              {/* Gap portion in red */}
              {gap > 0 && (
                <div
                  className="absolute inset-y-0 rounded-r-full bg-red-500/40"
                  style={{
                    left: `${progressPercent}%`,
                    width: `${100 - progressPercent}%`,
                  }}
                />
              )}
            </div>

            {/* Gap text */}
            {gap > 0 && (
              <p className="text-xs text-red-400">
                {t("charts.weakness.gap", { gap })}
              </p>
            )}
          </div>
        </div>

        {/* Bottom: advice + improvement text */}
        <div className="mt-4 pt-3 border-t border-base-content/10 space-y-2">
          <p className="text-xs text-base-content/60">
            {t(`charts.weakness.advice_${weakestPillar.code}`)}
          </p>
          <p className="text-xs text-base-content/50 italic">
            {t("charts.weakness.improvement", {
              pillar: pillarMeta?.name || weakestPillar.code,
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
