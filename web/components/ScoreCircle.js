"use client";

export function getScoreColor(score) {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

export function getScoreBg(score) {
  if (score >= 80) return "bg-green-400/10";
  if (score >= 60) return "bg-amber-400/10";
  return "bg-red-400/10";
}

export const SAFEPillars = [
  { code: "S", name: "Security", color: "#3b82f6" },
  { code: "A", name: "Audit", color: "#8b5cf6" },
  { code: "F", name: "Financial", color: "#f59e0b" },
  { code: "E", name: "Experience", color: "#22c55e" },
];

export const MiniScoreCircle = ({ score, size = 72, strokeWidth = 6 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeScore = Math.max(0, Math.min(100, score || 0));
  const offset = circumference - (safeScore / 100) * circumference;

  const getColor = (s) => {
    if (s >= 80) return "#22c55e";
    if (s >= 60) return "#f59e0b";
    if (s >= 40) return "#f97316";
    return "#ef4444";
  };

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="opacity-10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor(safeScore)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-sm font-bold">{safeScore > 0 ? safeScore : "-"}</span>
    </div>
  );
};

export default MiniScoreCircle;
