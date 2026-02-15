"use client";

import { useState, useEffect, useId } from "react";
import { useTranslation } from "@/libs/i18n/LanguageProvider";
import config from "@/config";

const PILLARS = config.safe.pillars; // [{code, name, color, ...}, ...]
const CENTER = 100;
const MAX_RADIUS = 80;
const ANGLES = {
  S: -Math.PI / 2, // top
  A: 0,            // right
  F: Math.PI / 2,  // bottom
  E: Math.PI,      // left
};

function polarToXY(angle, radius) {
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  };
}

function buildPolygonPoints(values, scale = 1) {
  return PILLARS.map((p) => {
    const val = (values[p.code] || 0) / 100;
    const r = val * MAX_RADIUS * scale;
    const { x, y } = polarToXY(ANGLES[p.code], r);
    return `${x},${y}`;
  }).join(" ");
}

function referencePolygon(pct) {
  const r = (pct / 100) * MAX_RADIUS;
  return PILLARS.map((p) => {
    const { x, y } = polarToXY(ANGLES[p.code], r);
    return `${x},${y}`;
  }).join(" ");
}

export default function RadarChart({ scores, benchmark, size = 280, className = "" }) {
  const { t } = useTranslation();
  const gradId = useId();
  const [progress, setProgress] = useState(0);

  // Mount animation
  useEffect(() => {
    if (!scores) return;
    const start = performance.now();
    const duration = 600;
    let raf;

    function step(now) {
      const elapsed = now - start;
      const raw = Math.min(elapsed / duration, 1);
      // ease-out: 1 - (1 - t)^3
      const eased = 1 - Math.pow(1 - raw, 3);
      setProgress(eased);
      if (raw < 1) {
        raf = requestAnimationFrame(step);
      }
    }

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [scores]);

  // Empty state
  if (!scores) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
        <p className="text-base-content/50 text-sm text-center">
          {t("charts.radar.noSetup")}
        </p>
      </div>
    );
  }

  // Compute animated polygon
  const animatedScores = {};
  PILLARS.forEach((p) => {
    animatedScores[p.code] = (scores[p.code] || 0) * progress;
  });

  // Detect weak pillars (>10pts below benchmark)
  const weakPillars = [];
  if (benchmark) {
    PILLARS.forEach((p) => {
      const gap = (benchmark[p.code] || 0) - (scores[p.code] || 0);
      if (gap > 10) {
        weakPillars.push(p.code);
      }
    });
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={`${gradId}-fill`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(var(--p))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="oklch(var(--p))" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Concentric reference polygons at 25%, 50%, 75%, 100% */}
        {[25, 50, 75, 100].map((pct) => (
          <polygon
            key={pct}
            points={referencePolygon(pct)}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-base-content/10"
          />
        ))}

        {/* Axis lines from center to corners */}
        {PILLARS.map((p) => {
          const { x, y } = polarToXY(ANGLES[p.code], MAX_RADIUS);
          return (
            <line
              key={p.code}
              x1={CENTER}
              y1={CENTER}
              x2={x}
              y2={y}
              stroke="currentColor"
              strokeWidth="0.5"
              strokeDasharray="2 2"
              className="text-base-content/15"
            />
          );
        })}

        {/* Benchmark polygon (dashed, no fill) */}
        {benchmark && (
          <polygon
            points={buildPolygonPoints(benchmark)}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            className="text-base-content/40"
          />
        )}

        {/* User polygon (filled + solid stroke) */}
        <polygon
          points={buildPolygonPoints(animatedScores)}
          fill={`url(#${gradId}-fill)`}
          stroke="oklch(var(--p))"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Data points on user polygon */}
        {PILLARS.map((p) => {
          const val = animatedScores[p.code] / 100;
          const r = val * MAX_RADIUS;
          const { x, y } = polarToXY(ANGLES[p.code], r);
          const isWeak = weakPillars.includes(p.code);

          return (
            <g key={`point-${p.code}`}>
              {/* Score dot */}
              <circle
                cx={x}
                cy={y}
                r="3"
                fill="oklch(var(--p))"
                stroke="oklch(var(--b2))"
                strokeWidth="1"
              />
              {/* Pulsing red circle for weak pillars */}
              {isWeak && progress >= 1 && (
                <circle
                  cx={x}
                  cy={y}
                  r="5"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  opacity="0.8"
                >
                  <animate
                    attributeName="r"
                    values="5;9;5"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.8;0.2;0.8"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </g>
          );
        })}

        {/* Pillar labels at axis endpoints */}
        {PILLARS.map((p) => {
          const labelR = MAX_RADIUS + 16;
          const { x, y } = polarToXY(ANGLES[p.code], labelR);
          const scoreVal = Math.round(scores[p.code] || 0);

          // Adjust text anchor based on position
          let anchor = "middle";
          if (p.code === "A") anchor = "start";
          if (p.code === "E") anchor = "end";

          // Nudge label positions slightly
          let dy = 0;
          if (p.code === "S") dy = -4;
          if (p.code === "F") dy = 8;

          return (
            <g key={`label-${p.code}`}>
              <text
                x={x}
                y={y + dy}
                textAnchor={anchor}
                dominantBaseline="central"
                fontSize="11"
                fontWeight="700"
                fill={p.color}
              >
                {p.code}
              </text>
              <text
                x={x}
                y={y + dy + 12}
                textAnchor={anchor}
                dominantBaseline="central"
                fontSize="9"
                fill="currentColor"
                className="text-base-content/60"
              >
                {scoreVal}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-base-content/60">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-4 h-0.5 rounded"
            style={{ backgroundColor: "oklch(var(--p))" }}
          />
          <span>{t("charts.radar.yourSetup")}</span>
        </div>
        {benchmark && (
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 rounded border-t border-dashed border-base-content/40" />
            <span>{t("charts.radar.marketAverage")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
