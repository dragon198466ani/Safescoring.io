"use client";

/**
 * ScoreSparkline - Compact SVG sparkline chart for dashboard widgets
 * Reuses SVG path pattern from ScoreEvolution.js
 */
export default function ScoreSparkline({
  data = [],
  width = 120,
  height = 40,
  color = "#8b5cf6",
  showDots = false,
}) {
  if (!data || data.length < 2) {
    return (
      <div style={{ width, height }} className="flex items-center justify-center">
        <span className="text-xs text-base-content/30">No data</span>
      </div>
    );
  }

  const scores = data.map((d) => (typeof d === "number" ? d : d.score || d.safe_score || 0));
  const min = Math.min(...scores) - 5;
  const max = Math.max(...scores) + 5;
  const range = max - min || 1;

  const points = scores.map((score, i) => ({
    x: (i / (scores.length - 1)) * 100,
    y: 100 - ((score - min) / range) * 100,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L 100 100 L 0 100 Z`;

  const gradientId = `sparkline-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="overflow-visible"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <path d={areaPath} fill={`url(#${gradientId})`} />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dots */}
      {showDots &&
        points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="1.5"
            fill={color}
            vectorEffect="non-scaling-stroke"
          />
        ))}
    </svg>
  );
}
