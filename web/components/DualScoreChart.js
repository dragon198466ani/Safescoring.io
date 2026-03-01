"use client";

/**
 * DualScoreChart - Dual curve chart: AI vs Community
 *
 * Displays two distinct curves in the same chart:
 * - Blue curve: AI Scores (automated evaluations)
 * - Green curve: Community Scores (validated by votes)
 *
 * Allows visualization of convergence/divergence between AI and humans
 */

import { useState, useMemo } from "react";
import { useApi } from "@/hooks/useApi";

// Couleurs des courbes
const COLORS = {
  ai: {
    line: "#3b82f6", // blue-500
    fill: "rgba(59, 130, 246, 0.1)",
    dot: "#2563eb", // blue-600
  },
  community: {
    line: "#22c55e", // green-500
    fill: "rgba(34, 197, 94, 0.1)",
    dot: "#16a34a", // green-600
  },
  grid: "rgba(255, 255, 255, 0.1)",
  axis: "rgba(255, 255, 255, 0.3)",
};

export default function DualScoreChart({
  productId,
  productSlug,
  height = 200,
  showLegend = true,
  showTooltip = true,
  timeRange = "30d", // 7d, 30d, 90d, all
  pillar = null, // null = global SAFE, or S/A/F/E
}) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [activeRange, setActiveRange] = useState(timeRange);

  // Build API URL with dynamic params
  const apiUrl = useMemo(() => {
    const slug = productSlug || productId;
    if (!slug) return null;

    const params = new URLSearchParams({
      metric: "dual_score",
      range: activeRange,
      ...(pillar && { pillar }),
      ...(productId && { productId }),
    });
    return `/api/products/${slug}/chart-data?${params}`;
  }, [productId, productSlug, activeRange, pillar]);

  // Use useApi for chart data with 2-minute cache
  const { data, isLoading: loading } = useApi(apiUrl, {
    ttl: 2 * 60 * 1000,
  });

  // Process data for rendering
  const isDemo = !data?.history || data.history.length === 0;

  const chartData = useMemo(() => {
    if (isDemo) {
      return [];
    }

    return data.history.map((point) => ({
      date: new Date(point.date),
      dateLabel: formatDate(point.date),
      aiScore: point.ai_score ?? point.score ?? null,
      communityScore: point.community_score ?? null,
      votesCount: point.votes_count ?? 0,
    }));
  }, [data, isDemo]);

  // Calculate chart dimensions
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = 100; // percentage
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate scales
  const { xScale, yScale, minScore, maxScore } = useMemo(() => {
    const scores = chartData.flatMap((d) => [d.aiScore, d.communityScore].filter((s) => s !== null));
    const min = Math.max(0, Math.min(...scores) - 5);
    const max = Math.min(100, Math.max(...scores) + 5);

    return {
      xScale: (index) => (index / (chartData.length - 1)) * 100,
      yScale: (score) => ((max - score) / (max - min)) * chartHeight,
      minScore: min,
      maxScore: max,
    };
  }, [chartData, chartHeight]);

  // Generate SVG path for a line
  const generatePath = (dataKey) => {
    const points = chartData
      .map((d, i) => {
        const value = d[dataKey];
        if (value === null) return null;
        return `${xScale(i)},${yScale(value)}`;
      })
      .filter(Boolean);

    if (points.length < 2) return "";
    return `M ${points.join(" L ")}`;
  };

  // Generate area path (for fill)
  const generateAreaPath = (dataKey) => {
    const points = chartData
      .map((d, i) => {
        const value = d[dataKey];
        if (value === null) return null;
        return { x: xScale(i), y: yScale(value) };
      })
      .filter(Boolean);

    if (points.length < 2) return "";

    const linePath = points.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(" ");
    const closePath = `L ${points[points.length - 1].x},${chartHeight} L ${points[0].x},${chartHeight} Z`;

    return linePath + closePath;
  };

  if (loading) {
    return (
      <div className="animate-pulse" style={{ height }}>
        <div className="h-full bg-base-300 rounded-lg" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Score evolution</span>
        </div>
        <div
          className="flex flex-col items-center justify-center text-base-content/40 text-sm gap-2 rounded-lg bg-base-200 border border-base-300"
          style={{ height }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 opacity-50">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
          <span>No score history yet</span>
          <span className="text-xs text-base-content/30">Data will appear after score updates</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Time range selector */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Score evolution</span>
          {pillar && (
            <span className={`text-xs px-2 py-0.5 rounded bg-base-300`}>
              Pillar {pillar}
            </span>
          )}
        </div>

        <div className="flex gap-1">
          {["7d", "30d", "90d", "all"].map((range) => (
            <button
              key={range}
              onClick={() => setActiveRange(range)}
              className={`px-2 py-1 text-xs rounded transition-all ${
                activeRange === range
                  ? "bg-primary text-primary-content"
                  : "bg-base-300 text-base-content/60 hover:text-base-content"
              }`}
            >
              {range === "all" ? "All" : range}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex items-center gap-4 mb-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-0.5 rounded"
              style={{ backgroundColor: COLORS.ai.line }}
            />
            <span className="text-base-content/70">AI Score</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-0.5 rounded"
              style={{ backgroundColor: COLORS.community.line }}
            />
            <span className="text-base-content/70">Community Score</span>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="relative" style={{ height }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none"
          className="overflow-visible"
        >
          {/* Grid lines */}
          <g className="grid-lines">
            {[0, 25, 50, 75, 100].map((percent) => {
              const score = minScore + (maxScore - minScore) * (1 - percent / 100);
              const y = padding.top + (percent / 100) * chartHeight;
              return (
                <g key={percent}>
                  <line
                    x1="0"
                    x2="100"
                    y1={y}
                    y2={y}
                    stroke={COLORS.grid}
                    strokeWidth="0.2"
                    vectorEffect="non-scaling-stroke"
                  />
                  <text
                    x="-2"
                    y={y}
                    fill={COLORS.axis}
                    fontSize="3"
                    textAnchor="end"
                    dominantBaseline="middle"
                  >
                    {Math.round(score)}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Translate for padding */}
          <g transform={`translate(0, ${padding.top})`}>
            {/* Area fills */}
            <path
              d={generateAreaPath("aiScore")}
              fill={COLORS.ai.fill}
              className="transition-all duration-300"
            />
            <path
              d={generateAreaPath("communityScore")}
              fill={COLORS.community.fill}
              className="transition-all duration-300"
            />

            {/* Lines */}
            <path
              d={generatePath("aiScore")}
              fill="none"
              stroke={COLORS.ai.line}
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke"
              className="transition-all duration-300"
            />
            <path
              d={generatePath("communityScore")}
              fill="none"
              stroke={COLORS.community.line}
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke"
              strokeDasharray="2,1"
              className="transition-all duration-300"
            />

            {/* Data points */}
            {chartData.map((point, i) => (
              <g key={i}>
                {point.aiScore !== null && (
                  <circle
                    cx={xScale(i)}
                    cy={yScale(point.aiScore)}
                    r="1"
                    fill={COLORS.ai.dot}
                    className="transition-all duration-200"
                    onMouseEnter={() => setHoveredPoint({ ...point, index: i, type: "ai" })}
                    onMouseLeave={() => setHoveredPoint(null)}
                    style={{ cursor: "pointer" }}
                  />
                )}
                {point.communityScore !== null && (
                  <circle
                    cx={xScale(i)}
                    cy={yScale(point.communityScore)}
                    r="1"
                    fill={COLORS.community.dot}
                    className="transition-all duration-200"
                    onMouseEnter={() => setHoveredPoint({ ...point, index: i, type: "community" })}
                    onMouseLeave={() => setHoveredPoint(null)}
                    style={{ cursor: "pointer" }}
                  />
                )}
              </g>
            ))}
          </g>

          {/* X-axis labels */}
          <g>
            {chartData.filter((_, i) => i % Math.ceil(chartData.length / 5) === 0 || i === chartData.length - 1).map((point, i, arr) => {
              const originalIndex = chartData.indexOf(point);
              return (
                <text
                  key={i}
                  x={xScale(originalIndex)}
                  y={height - 5}
                  fill={COLORS.axis}
                  fontSize="2.5"
                  textAnchor="middle"
                >
                  {point.dateLabel}
                </text>
              );
            })}
          </g>
        </svg>

        {/* Tooltip */}
        {showTooltip && hoveredPoint && (
          <div
            className="absolute z-10 bg-base-300 border border-base-content/20 rounded-lg shadow-lg p-2 text-xs pointer-events-none"
            style={{
              left: `${xScale(hoveredPoint.index)}%`,
              top: padding.top + yScale(hoveredPoint.type === "ai" ? hoveredPoint.aiScore : hoveredPoint.communityScore) - 60,
              transform: "translateX(-50%)",
            }}
          >
            <div className="font-medium mb-1">{hoveredPoint.dateLabel}</div>
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: COLORS.ai.line }}
              />
              <span>AI: {hoveredPoint.aiScore ?? "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: COLORS.community.line }}
              />
              <span>Community: {hoveredPoint.communityScore ?? "—"}</span>
            </div>
            {hoveredPoint.votesCount > 0 && (
              <div className="text-base-content/50 mt-1">
                {hoveredPoint.votesCount} votes
              </div>
            )}
          </div>
        )}
      </div>

      {/* Divergence indicator */}
      <DivergenceIndicator data={chartData} />
    </div>
  );
}

// Show when AI and community scores diverge significantly
function DivergenceIndicator({ data }) {
  const divergence = useMemo(() => {
    const validPoints = data.filter(
      (d) => d.aiScore !== null && d.communityScore !== null
    );

    if (validPoints.length === 0) return null;

    const lastPoint = validPoints[validPoints.length - 1];
    const diff = Math.abs(lastPoint.aiScore - lastPoint.communityScore);

    if (diff < 5) return null;

    return {
      diff,
      direction: lastPoint.communityScore > lastPoint.aiScore ? "up" : "down",
      aiScore: lastPoint.aiScore,
      communityScore: lastPoint.communityScore,
    };
  }, [data]);

  if (!divergence) return null;

  return (
    <div
      className={`mt-2 p-2 rounded-lg text-xs flex items-center gap-2 ${
        divergence.direction === "up"
          ? "bg-green-500/10 text-green-400"
          : "bg-amber-500/10 text-amber-400"
      }`}
    >
      <span className="text-lg">
        {divergence.direction === "up" ? "📈" : "📉"}
      </span>
      <span>
        {divergence.diff.toFixed(0)}-point divergence:{" "}
        {divergence.direction === "up"
          ? "Community rates higher than AI"
          : "Community rates lower than AI"}
      </span>
    </div>
  );
}

// Format date for display
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = date.toLocaleDateString("en-US", { month: "short" });
  return `${day} ${month}`;
}

// Generate demo data for visualization when no real data
function generateDemoData(range) {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 180;
  const now = new Date();
  const data = [];

  let aiScore = 70 + Math.random() * 10;
  let communityScore = null;

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // AI score with slight random walk
    aiScore += (Math.random() - 0.5) * 3;
    aiScore = Math.max(50, Math.min(95, aiScore));

    // Community score appears after some days with votes
    if (i < days * 0.7) {
      if (communityScore === null) {
        communityScore = aiScore + (Math.random() - 0.5) * 10;
      } else {
        // Community score converges toward AI over time
        const convergence = 0.1;
        communityScore = communityScore + (aiScore - communityScore) * convergence + (Math.random() - 0.5) * 2;
      }
      communityScore = Math.max(50, Math.min(95, communityScore));
    }

    data.push({
      date,
      dateLabel: formatDate(date.toISOString()),
      aiScore: Math.round(aiScore * 10) / 10,
      communityScore: communityScore ? Math.round(communityScore * 10) / 10 : null,
      votesCount: communityScore ? Math.floor(Math.random() * 20) + 5 : 0,
    });
  }

  return data;
}

// Export mini version for cards/previews
export function DualScoreChartMini({ productId, productSlug }) {
  return (
    <DualScoreChart
      productId={productId}
      productSlug={productSlug}
      height={100}
      showLegend={false}
      showTooltip={false}
      timeRange="30d"
    />
  );
}

// Export pillar-specific chart
export function PillarDualChart({ productId, productSlug, pillar }) {
  return (
    <DualScoreChart
      productId={productId}
      productSlug={productSlug}
      height={150}
      pillar={pillar}
      timeRange="30d"
    />
  );
}
