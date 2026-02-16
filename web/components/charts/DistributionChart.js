"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/libs/i18n/LanguageProvider";

const BUCKETS = [
  { key: "excellent", color: "#22c55e", min: 90, max: 100 },
  { key: "good", color: "#84cc16", min: 70, max: 89 },
  { key: "average", color: "#f59e0b", min: 50, max: 69 },
  { key: "poor", color: "#f97316", min: 30, max: 49 },
  { key: "critical", color: "#ef4444", min: 0, max: 29 },
];

function getUserBucket(score) {
  if (score == null) return null;
  if (score >= 90) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "average";
  if (score >= 30) return "poor";
  return "critical";
}

export default function DistributionChart({ distribution, userScore, className = "" }) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger bar grow animation after mount
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  if (!distribution) return null;

  const maxCount = Math.max(
    ...BUCKETS.map((b) => distribution[b.key]?.count || 0),
    1
  );
  const MAX_BAR_HEIGHT = 160;
  const userBucket = getUserBucket(userScore);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Bars container */}
      <div className="flex items-end justify-center gap-3 sm:gap-5 w-full" style={{ height: `${MAX_BAR_HEIGHT + 40}px` }}>
        {BUCKETS.map((bucket, i) => {
          const count = distribution[bucket.key]?.count || 0;
          const heightPx = maxCount > 0 ? (count / maxCount) * MAX_BAR_HEIGHT : 0;
          const isUserBucket = userBucket === bucket.key;

          return (
            <div
              key={bucket.key}
              className="flex flex-col items-center flex-1 max-w-[64px]"
            >
              {/* User position badge */}
              {isUserBucket && userScore != null && (
                <div className="flex flex-col items-center mb-1 animate-pulse">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-base-300 text-base-content whitespace-nowrap">
                    {t("charts.distribution.yourPosition")}
                  </span>
                  <span
                    className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent"
                    style={{ borderTopColor: "oklch(var(--bc) / 0.3)" }}
                  />
                </div>
              )}

              {/* Count above bar */}
              <span className="text-xs font-medium text-base-content/70 mb-1">
                {count}
              </span>

              {/* Bar */}
              <div
                className={`relative w-full rounded-t-lg transition-all duration-700 ease-out hover:scale-105 hover:brightness-110 cursor-default ${
                  isUserBucket ? "ring-2 ring-offset-2 ring-offset-base-200" : ""
                }`}
                style={{
                  height: mounted ? `${Math.max(heightPx, 4)}px` : "4px",
                  backgroundColor: bucket.color,
                  transitionDelay: `${i * 100}ms`,
                  ...(isUserBucket ? { ringColor: bucket.color, boxShadow: `0 0 12px ${bucket.color}40` } : {}),
                }}
              />

              {/* Label below */}
              <span className="text-[10px] sm:text-xs text-base-content/60 mt-2 text-center leading-tight">
                {t(`charts.distribution.${bucket.key}`)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
