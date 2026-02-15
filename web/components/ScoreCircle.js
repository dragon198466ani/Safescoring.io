"use client";

/**
 * MiniScoreCircle - Circular SVG score indicator
 */
export function MiniScoreCircle({ score = 0, size = 72, strokeWidth = 6 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const center = size / 2;

  const getColor = (s) => {
    if (s >= 80) return "#22c55e";
    if (s >= 60) return "#f59e0b";
    if (s >= 40) return "#f97316";
    return "#ef4444";
  };

  const getLabel = (s) => {
    if (s >= 80) return "Strong";
    if (s >= 60) return "Moderate";
    if (s >= 40) return "Developing";
    return "Emerging";
  };

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`SafeScore: ${Math.round(score)} out of 100 — ${getLabel(score)}`}
      title={`${Math.round(score)}/100 — ${getLabel(score)}`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-base-300"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={getColor(score)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span
        className="absolute text-sm font-bold tabular-nums"
        style={{ color: getColor(score) }}
        aria-hidden="true"
      >
        {Math.round(score)}
      </span>
    </div>
  );
}

export default MiniScoreCircle;
