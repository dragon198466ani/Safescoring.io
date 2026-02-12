"use client";

import { useState, useEffect, useMemo } from "react";

const PILLAR_COLORS = {
  overall: "#ffffff",
  S: "#22c55e",
  A: "#f59e0b",
  F: "#3b82f6",
  E: "#8b5cf6",
};

const RANGES = [
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "all", label: "All" },
];

/**
 * SetupScoreChart - Full multi-line SVG chart with time ranges and tooltips
 * Shows Overall + S/A/F/E pillar scores over time
 */
export default function SetupScoreChart({ setupId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30d");
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [activePillars, setActivePillars] = useState(["overall", "S", "A", "F", "E"]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/setups/${setupId}/score-history?range=${range}`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error("Failed to fetch score history:", err);
      } finally {
        setLoading(false);
      }
    }
    if (setupId) fetchData();
  }, [setupId, range]);

  const chartData = useMemo(() => {
    if (!data?.history?.length) return null;

    const history = data.history;
    const minScore = 0;
    const maxScore = 100;
    const scoreRange = maxScore - minScore;

    const lines = {};
    const keys = activePillars;

    keys.forEach((key) => {
      const scoreKey = key === "overall" ? "score" : `score_${key.toLowerCase()}`;
      lines[key] = history.map((entry, i) => ({
        x: history.length === 1 ? 50 : (i / (history.length - 1)) * 100,
        y: 100 - ((entry[scoreKey] || 0) / scoreRange) * 100,
        value: Math.round(entry[scoreKey] || 0),
        date: entry.date,
      }));
    });

    return { lines, history };
  }, [data, activePillars]);

  const togglePillar = (key) => {
    setActivePillars((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-base-200 border border-base-300 p-6 animate-pulse">
        <div className="h-6 bg-base-300 rounded w-1/3 mb-4" />
        <div className="h-48 bg-base-300 rounded" />
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="rounded-2xl bg-base-200 border border-base-300 p-6 text-center">
        <p className="text-base-content/60">No historical data yet.</p>
        <p className="text-sm text-base-content/40 mt-1">Score history will appear as products are re-evaluated.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-base-200 border border-base-300 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-base-300">
        <h3 className="font-semibold text-lg">Score History</h3>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`btn btn-xs ${range === r.key ? "btn-primary" : "btn-ghost"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Chart */}
        <div className="relative h-48 mb-4">
          {/* Y-axis */}
          <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-base-content/40 pr-2 w-8">
            <span>100</span>
            <span>75</span>
            <span>50</span>
            <span>25</span>
            <span>0</span>
          </div>

          {/* Chart area */}
          <div
            className="ml-10 h-full relative"
            onMouseLeave={() => setHoveredPoint(null)}
          >
            {/* Grid */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="border-t border-base-content/5 w-full" />
              ))}
            </div>

            {/* SVG */}
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              {Object.entries(chartData.lines).map(([key, points]) => {
                const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
                return (
                  <path
                    key={key}
                    d={path}
                    fill="none"
                    stroke={PILLAR_COLORS[key]}
                    strokeWidth="2"
                    strokeOpacity={hoveredPoint && hoveredPoint.key !== key ? 0.2 : 0.9}
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-200"
                  />
                );
              })}
            </svg>

            {/* Hover zones */}
            {chartData.history.map((entry, i) => {
              const x = chartData.history.length === 1 ? 50 : (i / (chartData.history.length - 1)) * 100;
              return (
                <div
                  key={i}
                  className="absolute top-0 bottom-0"
                  style={{ left: `${x}%`, width: `${100 / chartData.history.length}%`, transform: "translateX(-50%)" }}
                  onMouseEnter={() => setHoveredPoint({ index: i, x })}
                >
                  {hoveredPoint?.index === i && (
                    <div className="absolute top-0 bottom-0 left-1/2 border-l border-base-content/20 pointer-events-none" />
                  )}
                </div>
              );
            })}

            {/* Tooltip */}
            {hoveredPoint && (
              <div
                className="absolute z-20 bg-base-100 border border-base-300 rounded-lg p-3 shadow-xl pointer-events-none"
                style={{
                  left: `${hoveredPoint.x}%`,
                  top: "0",
                  transform: `translateX(${hoveredPoint.x > 70 ? "-100%" : "0"})`,
                }}
              >
                <p className="text-xs text-base-content/50 mb-1">
                  {chartData.history[hoveredPoint.index]?.date
                    ? new Date(chartData.history[hoveredPoint.index].date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : ""}
                </p>
                {Object.entries(chartData.lines).map(([key, points]) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PILLAR_COLORS[key] }} />
                    <span className="text-base-content/70">{key === "overall" ? "SAFE" : key}:</span>
                    <span className="font-bold">{points[hoveredPoint.index]?.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 justify-center">
          {Object.entries(PILLAR_COLORS).map(([key, color]) => (
            <button
              key={key}
              onClick={() => togglePillar(key)}
              className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full transition-all ${
                activePillars.includes(key) ? "bg-base-300" : "opacity-30"
              }`}
            >
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span>{key === "overall" ? "SAFE Score" : `${key} Pillar`}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
