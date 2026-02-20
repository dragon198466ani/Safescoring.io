"use client";

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

export function getScoreColor(score) {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  if (score >= 40) return "text-orange-500";
  return "text-error";
}

export function getScoreBg(score) {
  if (score >= 80) return "bg-success/10";
  if (score >= 60) return "bg-warning/10";
  if (score >= 40) return "bg-orange-500/10";
  return "bg-error/10";
}

export const SAFEPillars = [
  { code: "S", name: "Security", color: "#3b82f6" },
  { code: "A", name: "Adversity", color: "#f59e0b" },
  { code: "F", name: "Fidelity", color: "#22c55e" },
  { code: "E", name: "Efficiency", color: "#a855f7" },
];

export default MiniScoreCircle;
