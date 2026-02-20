"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";

/**
 * Pillar colors for the chart
 */
const PILLAR_COLORS = {
  total: "#3b82f6", // blue
  S: "#22c55e", // green
  A: "#f59e0b", // amber
  F: "#3b82f6", // blue
  E: "#8b5cf6", // purple
};

/**
 * Trend icons
 */
const TrendIcons = {
  improving: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-green-400">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  ),
  declining: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-red-400">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" />
    </svg>
  ),
  stable: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-blue-400">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  ),
};

/**
 * Simple SVG line chart component
 */
const LineChart = memo(function LineChart({
  data,
  width = 400,
  height = 200,
  showPillars = false,
  selectedPillar = "total",
}) {
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate scales
  const { points, yMin, yMax, xLabels } = useMemo(() => {
    if (!data || data.length === 0) {
      return { points: [], yMin: 0, yMax: 100, xLabels: [] };
    }

    const values = data.map((d) =>
      showPillars ? d.scores[selectedPillar] : d.scores.total
    );
    const min = Math.max(0, Math.min(...values) - 10);
    const max = Math.min(100, Math.max(...values) + 10);

    const pts = data.map((d, i) => ({
      x: padding.left + (i / (data.length - 1 || 1)) * chartWidth,
      y:
        padding.top +
        chartHeight -
        ((d.scores[showPillars ? selectedPillar : "total"] - min) /
          (max - min || 1)) *
          chartHeight,
      value: d.scores[showPillars ? selectedPillar : "total"],
      date: d.date,
    }));

    // Generate x-axis labels (show ~5 labels)
    const labelInterval = Math.ceil(data.length / 5);
    const labels = data
      .filter((_, i) => i % labelInterval === 0 || i === data.length - 1)
      .map((d, i, arr) => ({
        x:
          padding.left +
          (data.indexOf(d) / (data.length - 1 || 1)) * chartWidth,
        label: formatDate(d.date),
      }));

    return { points: pts, yMin: min, yMax: max, xLabels: labels };
  }, [data, chartWidth, chartHeight, showPillars, selectedPillar, padding]);

  // Create path string
  const pathD = useMemo(() => {
    if (points.length === 0) return "";
    return points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");
  }, [points]);

  // Create area path (for gradient fill)
  const areaD = useMemo(() => {
    if (points.length === 0) return "";
    const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`);
    path.push(`L ${points[points.length - 1].x} ${padding.top + chartHeight}`);
    path.push(`L ${points[0].x} ${padding.top + chartHeight}`);
    path.push("Z");
    return path.join(" ");
  }, [points, chartHeight, padding]);

  const color = PILLAR_COLORS[showPillars ? selectedPillar : "total"];

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-base-300/50 rounded-lg"
        style={{ width, height }}
      >
        <p className="text-sm text-base-content/40">No data available</p>
      </div>
    );
  }

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Gradient definition */}
      <defs>
        <linearGradient
          id={`gradient-${selectedPillar}`}
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((pct) => {
        const y =
          padding.top +
          chartHeight -
          ((pct - yMin) / (yMax - yMin || 1)) * chartHeight;
        if (y < padding.top || y > padding.top + chartHeight) return null;
        return (
          <g key={pct}>
            <line
              x1={padding.left}
              y1={y}
              x2={padding.left + chartWidth}
              y2={y}
              stroke="currentColor"
              strokeOpacity="0.1"
              strokeDasharray="4 4"
            />
            <text
              x={padding.left - 8}
              y={y + 4}
              textAnchor="end"
              className="text-xs fill-base-content/40"
            >
              {pct}
            </text>
          </g>
        );
      })}

      {/* X-axis labels */}
      {xLabels.map((label, i) => (
        <text
          key={i}
          x={label.x}
          y={height - 8}
          textAnchor="middle"
          className="text-xs fill-base-content/40"
        >
          {label.label}
        </text>
      ))}

      {/* Area fill */}
      <path d={areaD} fill={`url(#gradient-${selectedPillar})`} />

      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill={color} />
          <circle cx={p.x} cy={p.y} r="6" fill={color} fillOpacity="0.2" />
          {/* Tooltip on hover (simplified) */}
          <title>
            {formatDate(p.date)}: {p.value}
          </title>
        </g>
      ))}
    </svg>
  );
});

/**
 * Format date for display
 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Stats display component
 */
const StatsDisplay = memo(function StatsDisplay({ stats, trend }) {
  if (!stats) return null;

  const changeColor =
    stats.change > 0
      ? "text-green-400"
      : stats.change < 0
      ? "text-red-400"
      : "text-base-content/60";

  return (
    <div className="grid grid-cols-4 gap-2 text-center">
      <div className="p-2 rounded-lg bg-base-300/50">
        <p className="text-xs text-base-content/40">Current</p>
        <p className="text-lg font-bold">{stats.current}</p>
      </div>
      <div className="p-2 rounded-lg bg-base-300/50">
        <p className="text-xs text-base-content/40">Highest</p>
        <p className="text-lg font-bold text-green-400">{stats.highest}</p>
      </div>
      <div className="p-2 rounded-lg bg-base-300/50">
        <p className="text-xs text-base-content/40">Average</p>
        <p className="text-lg font-bold">{stats.average}</p>
      </div>
      <div className="p-2 rounded-lg bg-base-300/50">
        <p className="text-xs text-base-content/40">Change</p>
        <p className={`text-lg font-bold ${changeColor}`}>
          {stats.change > 0 ? "+" : ""}
          {stats.change}
        </p>
      </div>
    </div>
  );
});

/**
 * Pillar selector tabs
 */
const PillarSelector = memo(function PillarSelector({
  selected,
  onChange,
  scores,
}) {
  const pillars = [
    { key: "total", label: "SAFE", color: PILLAR_COLORS.total },
    { key: "S", label: "S", color: PILLAR_COLORS.S },
    { key: "A", label: "A", color: PILLAR_COLORS.A },
    { key: "F", label: "F", color: PILLAR_COLORS.F },
    { key: "E", label: "E", color: PILLAR_COLORS.E },
  ];

  return (
    <div className="flex gap-1">
      {pillars.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
            selected === p.key
              ? "text-white"
              : "text-base-content/60 hover:text-base-content"
          }`}
          style={{
            backgroundColor: selected === p.key ? p.color : "transparent",
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
});

/**
 * Setup score evolution chart component
 */
function SetupScoreEvolution({ setupId, days = 30 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPillar, setSelectedPillar] = useState("total");

  // Fetch snapshots
  const fetchSnapshots = useCallback(async () => {
    if (!setupId) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/setups/${setupId}/snapshots?days=${days}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch score evolution");
      }

      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [setupId, days]);

  // Initial load
  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  if (error) {
    return (
      <div className="bg-base-200 rounded-xl p-4 border border-base-300 text-center">
        <p className="text-sm text-red-400">Failed to load score evolution</p>
        <button onClick={fetchSnapshots} className="btn btn-xs btn-ghost mt-2">
          Retry
        </button>
      </div>
    );
  }

  const hasData = data?.snapshots?.length > 0;

  return (
    <div className="bg-base-200 rounded-xl border border-base-300 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-base-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5 text-primary"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6"
              />
            </svg>
            Score Evolution
          </h3>
          {data?.trend && (
            <div className="flex items-center gap-1">
              {TrendIcons[data.trend]}
              <span className="text-xs text-base-content/40 capitalize">
                {data.trend}
              </span>
            </div>
          )}
        </div>

        {hasData && (
          <PillarSelector
            selected={selectedPillar}
            onChange={setSelectedPillar}
            scores={data.snapshots[data.snapshots.length - 1]?.scores}
          />
        )}
      </div>

      {/* Chart */}
      <div className="p-4">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <span className="loading loading-spinner loading-md text-primary" />
          </div>
        ) : !hasData ? (
          <div className="h-48 flex flex-col items-center justify-center text-base-content/40">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-12 h-12 mb-2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5"
              />
            </svg>
            <p className="text-sm">No historical data yet</p>
            <p className="text-xs mt-1">
              Score history will be recorded daily
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <LineChart
              data={data.snapshots}
              width={Math.max(400, data.snapshots.length * 30)}
              height={200}
              showPillars={selectedPillar !== "total"}
              selectedPillar={selectedPillar}
            />
          </div>
        )}
      </div>

      {/* Stats */}
      {hasData && data.stats && (
        <div className="px-4 pb-4">
          <StatsDisplay stats={data.stats} trend={data.trend} />
        </div>
      )}

      {/* Period info */}
      {data?.period && (
        <div className="px-4 py-2 bg-base-100/50 border-t border-base-content/5 text-xs text-base-content/40 text-center">
          Last {data.period.days} days ({data.snapshots?.length || 0} data
          points)
        </div>
      )}
    </div>
  );
}

export default memo(SetupScoreEvolution);
export { LineChart, StatsDisplay, PILLAR_COLORS };
