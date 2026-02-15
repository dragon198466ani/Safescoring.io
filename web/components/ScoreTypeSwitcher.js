"use client";

import { useState } from "react";
import config from "@/config";

const SCORE_TYPES = [
  { id: "full", label: "Full", description: "All norms" },
  { id: "consumer", label: "Consumer", description: "User-facing norms" },
  { id: "essential", label: "Essential", description: "Critical norms" },
];

const getScoreColor = (score) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
};

const getScoreLabel = (score) => {
  if (score >= 80) return { label: "Strong", color: "text-green-400" };
  if (score >= 60) return { label: "Moderate", color: "text-amber-400" };
  return { label: "Developing", color: "text-red-400" };
};

/**
 * ScoreTypeSwitcher — Client component for product detail page
 * Allows switching between Full, Consumer, and Essential score views
 *
 * Props:
 * - scores: { total, s, a, f, e } (Full scores)
 * - consumerScores: { total, s, a, f, e } (Consumer scores)
 * - essentialScores: { total, s, a, f, e } (Essential scores)
 * - lastUpdate: string (date)
 */
export default function ScoreTypeSwitcher({
  scores,
  consumerScores,
  essentialScores,
  lastUpdate,
}) {
  const [scoreType, setScoreType] = useState("full");

  const currentScores =
    scoreType === "consumer"
      ? consumerScores
      : scoreType === "essential"
      ? essentialScores
      : scores;

  // Fallback if consumer/essential not available
  const activeScores = currentScores?.total ? currentScores : scores;
  const scoreInfo = getScoreLabel(activeScores.total);

  const size = 140;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (activeScores.total / 100) * circumference;
  const strokeColor =
    activeScores.total >= 80
      ? "#22c55e"
      : activeScores.total >= 60
      ? "#f59e0b"
      : "#ef4444";

  return (
    <div className="flex flex-col items-center">
      {/* Score type tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg bg-base-300/50">
        {SCORE_TYPES.map((type) => {
          const typeScores =
            type.id === "consumer"
              ? consumerScores
              : type.id === "essential"
              ? essentialScores
              : scores;
          const isAvailable = typeScores?.total > 0;

          return (
            <button
              key={type.id}
              onClick={() => isAvailable && setScoreType(type.id)}
              disabled={!isAvailable}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                scoreType === type.id
                  ? "bg-primary text-primary-content shadow-sm"
                  : isAvailable
                  ? "text-base-content/60 hover:text-base-content hover:bg-base-200"
                  : "text-base-content/30 cursor-not-allowed"
              }`}
              title={
                isAvailable
                  ? `${type.label}: ${type.description}`
                  : `${type.label} scores not available`
              }
            >
              {type.label}
            </button>
          );
        })}
      </div>

      {/* Score circle */}
      <div className="p-6 rounded-2xl bg-base-200/50 border border-base-content/10">
        <div className="relative" style={{ width: size, height: size }}>
          <svg className="score-circle" width={size} height={size}>
            <circle
              className="score-circle-bg"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={strokeWidth}
            />
            <circle
              className="score-circle-progress"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              stroke={strokeColor}
              style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={`text-4xl font-bold transition-colors duration-300 ${getScoreColor(
                activeScores.total
              )}`}
            >
              {activeScores.total}
            </span>
          </div>
        </div>
        <div className="mt-4 text-center">
          <div className="text-sm font-medium text-base-content/60 uppercase tracking-wider">
            SAFE Score
            {scoreType !== "full" && (
              <span className="ml-1 text-xs normal-case opacity-70">
                ({SCORE_TYPES.find((t) => t.id === scoreType)?.label})
              </span>
            )}
          </div>
          <div className={`text-base font-semibold mt-1 ${scoreInfo.color}`}>
            {scoreInfo.label}
          </div>
        </div>
        {lastUpdate && (
          <div className="mt-3 text-xs text-base-content/40 text-center">
            Updated {new Date(lastUpdate).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Pillar scores with current type */}
      <div className="grid grid-cols-2 gap-3 mt-4 w-full">
        {config.safe.pillars.map((pillar) => {
          const score = activeScores[pillar.code.toLowerCase()];
          return (
            <div
              key={pillar.code}
              className="p-2 rounded-lg bg-base-200/50 border border-base-content/5"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-sm font-black"
                    style={{ color: pillar.color }}
                  >
                    {pillar.code}
                  </span>
                  <span className="text-[10px] text-base-content/50">
                    {pillar.name}
                  </span>
                </div>
                <span
                  className={`text-sm font-bold ${getScoreColor(score)}`}
                >
                  {score}
                </span>
              </div>
              <div className="w-full h-1 bg-base-300 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${score}%`,
                    backgroundColor: pillar.color,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
