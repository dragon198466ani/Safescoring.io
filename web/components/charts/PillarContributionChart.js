"use client";

import { useState } from "react";
import { useTranslation } from "@/libs/i18n/LanguageProvider";
import config from "@/config";

/**
 * PillarContributionChart - Horizontal stacked bar chart showing
 * each product's weighted contribution to each SAFE pillar.
 *
 * Props:
 *  - products: [{ name, role, score_s, score_a, score_f, score_e, score }]
 *  - combinedScore: { S, A, F, E, total }
 *  - className: optional extra classes
 */
export default function PillarContributionChart({
  products = [],
  combinedScore,
  className = "",
}) {
  const { t } = useTranslation();
  const [hoveredSegment, setHoveredSegment] = useState(null);

  if (!products.length) {
    return (
      <div className={`text-center py-6 text-base-content/50 text-sm ${className}`}>
        {t("charts.contribution.noProducts")}
      </div>
    );
  }

  // Map pillar code to the product score key
  const pillarScoreKey = { S: "score_s", A: "score_a", F: "score_f", E: "score_e" };

  // Opacity variants for segment colours per product index
  const opacityVariants = ["/80", "/60", "/40", "/70", "/50", "/90", "/55", "/45"];

  return (
    <div className={`space-y-4 ${className}`}>
      {config.safe.pillars.map((pillar) => {
        const key = pillarScoreKey[pillar.code];

        // Compute weighted values per product for this pillar
        const segments = products.map((product, idx) => {
          const weight = product.role === "wallet" ? 2 : 1;
          const rawScore = product[key] || 0;
          return {
            product,
            weight,
            rawScore,
            weighted: rawScore * weight,
            idx,
          };
        });

        const totalWeighted = segments.reduce((sum, s) => sum + s.weighted, 0);

        // Find the product with the lowest raw score on this pillar
        const lowestIdx =
          segments.length > 0
            ? segments.reduce((minI, s, i, arr) =>
                s.rawScore < arr[minI].rawScore ? i : minI,
              0)
            : -1;

        const pillarCombined = combinedScore?.[pillar.code] ?? 0;

        return (
          <div key={pillar.code} className="space-y-1">
            {/* Pillar label row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-bold w-5 text-center"
                  style={{ color: pillar.color }}
                >
                  {pillar.code}
                </span>
                <span className="text-xs text-base-content/70">
                  {pillar.name}
                </span>
              </div>
              <span
                className="text-sm font-semibold"
                style={{ color: pillar.color }}
              >
                {pillarCombined}
              </span>
            </div>

            {/* Stacked bar */}
            <div className="relative flex h-7 rounded-lg overflow-hidden bg-base-300">
              {segments.map((seg, i) => {
                const widthPercent =
                  totalWeighted > 0
                    ? (seg.weighted / totalWeighted) * 100
                    : 0;

                const isWeakest = i === lowestIdx && products.length > 1;
                const isHovered =
                  hoveredSegment?.pillar === pillar.code &&
                  hoveredSegment?.idx === i;
                const opacitySuffix =
                  opacityVariants[i % opacityVariants.length];

                return (
                  <div
                    key={`${pillar.code}-${i}`}
                    className={`relative flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      isWeakest ? "border-l-2 border-red-500" : ""
                    } ${isHovered ? "brightness-125 z-10" : ""}`}
                    style={{
                      width: `${widthPercent}%`,
                      backgroundColor: `color-mix(in srgb, ${pillar.color} ${
                        40 + ((i * 15) % 50)
                      }%, transparent)`,
                      minWidth: widthPercent > 0 ? "18px" : "0",
                    }}
                    onMouseEnter={() =>
                      setHoveredSegment({ pillar: pillar.code, idx: i })
                    }
                    onMouseLeave={() => setHoveredSegment(null)}
                  >
                    {/* 2x badge for wallets */}
                    {seg.product.role === "wallet" && widthPercent > 8 && (
                      <span className="text-[9px] font-bold text-white/80 bg-white/20 rounded px-0.5">
                        2x
                      </span>
                    )}

                    {/* Tooltip */}
                    {isHovered && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 whitespace-nowrap">
                        <div className="bg-base-100 text-base-content border border-base-300 rounded-lg px-3 py-1.5 shadow-lg text-xs">
                          <span className="font-semibold">
                            {seg.product.name}
                          </span>
                          <span className="mx-1 text-base-content/40">|</span>
                          <span style={{ color: pillar.color }}>
                            {seg.rawScore}
                          </span>
                          {seg.product.role === "wallet" && (
                            <span className="ml-1 text-purple-400 font-medium">
                              ({t("charts.contribution.weight", {
                                weight: "2",
                              })})
                            </span>
                          )}
                          {isWeakest && (
                            <span className="ml-1 text-red-400">
                              {t("charts.contribution.weakLink", {
                                product: seg.product.name,
                                pillar: pillar.name,
                              })}
                            </span>
                          )}
                        </div>
                        {/* Tooltip arrow */}
                        <div className="w-2 h-2 bg-base-100 border-b border-r border-base-300 rotate-45 mx-auto -mt-1" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend for weak link */}
            {products.length > 1 && lowestIdx >= 0 && (
              <div className="text-[10px] text-red-400/70 flex items-center gap-1">
                <span className="inline-block w-2 h-2 border-l-2 border-red-500" />
                {t("charts.contribution.weakLink", {
                  product: segments[lowestIdx].product.name,
                  pillar: pillar.name,
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
