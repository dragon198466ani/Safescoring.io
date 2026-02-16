"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTranslation } from "@/libs/i18n/LanguageProvider";
import config from "@/config";

const MAX_SETUPS = 5;

function scoreColor(score) {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-error";
}

function scoreBgColor(score) {
  if (score >= 80) return "bg-success/20";
  if (score >= 60) return "bg-warning/20";
  return "bg-error/20";
}

export default function SetupComparisonChart({ setups, className = "" }) {
  const { t } = useTranslation();
  const pillars = config.safe.pillars;

  const displaySetups = useMemo(
    () => (setups ? setups.slice(0, MAX_SETUPS) : []),
    [setups]
  );

  const bestIndex = useMemo(() => {
    if (displaySetups.length < 2) return -1;
    let best = 0;
    for (let i = 1; i < displaySetups.length; i++) {
      if (
        (displaySetups[i].combinedScore?.note_finale ?? 0) >
        (displaySetups[best].combinedScore?.note_finale ?? 0)
      ) {
        best = i;
      }
    }
    return best;
  }, [displaySetups]);

  // --- Empty state ---
  if (!displaySetups.length) {
    return (
      <div className={`rounded-xl bg-base-300/30 border border-base-300 p-8 flex flex-col items-center justify-center gap-4 text-center ${className}`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12 text-base-content/30"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 13h2v8H3zm6-4h2v12H9zm6-6h2v18h-2zm6 10h2v8h-2z"
          />
        </svg>
        <p className="text-base-content/50 text-sm">
          {t("charts.comparison.noSetups")}
        </p>
        <Link
          href="/dashboard/setups"
          className="btn btn-primary btn-sm"
        >
          {t("charts.comparison.createFirst")}
        </Link>
      </div>
    );
  }

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold mb-4">
        {t("charts.comparison.title")}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displaySetups.map((setup, idx) => {
          const score = setup.combinedScore ?? {};
          const overall = score.note_finale ?? 0;
          const isBest = idx === bestIndex;
          const weakest = score.weakest_pillar;

          return (
            <div
              key={setup.name ?? idx}
              className="rounded-xl bg-base-300/30 border border-base-300 p-4 flex flex-col gap-3"
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-medium text-sm truncate">
                  {setup.name}
                </h4>
                {isBest && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-warning whitespace-nowrap">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
                    </svg>
                    {t("charts.comparison.bestSetup")}
                  </span>
                )}
              </div>

              {/* Overall score */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-base-content/60">
                  {t("charts.comparison.overall")}
                </span>
                <span
                  className={`text-2xl font-bold ${scoreColor(overall)} ${scoreBgColor(overall)} px-2 py-0.5 rounded-lg`}
                >
                  {Math.round(overall)}
                </span>
              </div>

              {/* Pillar bars */}
              <div className="flex flex-col gap-2">
                {pillars.map((pillar) => {
                  const key = `score_${pillar.code.toLowerCase()}`;
                  const pillarScore = score[key] ?? 0;

                  return (
                    <div key={pillar.code} className="flex flex-col gap-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-base-content/70">
                          {pillar.code} - {pillar.name}
                        </span>
                        <span className="text-xs font-medium text-base-content/80">
                          {Math.round(pillarScore)}
                        </span>
                      </div>
                      <div className="w-full bg-base-300/50 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-r-full transition-all duration-700 ease-out"
                          style={{
                            width: `${Math.min(Math.max(pillarScore, 0), 100)}%`,
                            backgroundColor: pillar.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Weakest pillar warning */}
              {weakest && (
                <div className="flex items-center gap-1.5 text-xs text-warning/80 mt-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5 shrink-0"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>
                    {t("charts.comparison.weakestPillar", {
                      pillar: weakest.code,
                    })}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Single-setup hint */}
      {displaySetups.length === 1 && (
        <p className="text-xs text-base-content/40 mt-3 text-center">
          {t("charts.comparison.saveMoreSetups")}
        </p>
      )}
    </div>
  );
}
