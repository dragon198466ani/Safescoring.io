"use client";

import { useState, useEffect, memo } from "react";
import ScoreCircle, { SAFEPillars, getScoreColor, getScoreBg } from "@/components/ScoreCircle";
import { useAnimatedScore, useScoreChange } from "@/hooks/useSetupScores";

/**
 * Live connection indicator - pulsing green dot
 */
const LiveIndicator = memo(function LiveIndicator({ isConnected, size = "sm" }) {
  const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5",
    lg: "h-3 w-3",
  };

  if (!isConnected) {
    return (
      <div className="flex items-center gap-1.5">
        <span className={`${sizeClasses[size]} rounded-full bg-gray-400`} />
        <span className="text-xs text-base-content/40">Offline</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="relative flex">
        <span
          className={`animate-ping absolute inline-flex ${sizeClasses[size]} rounded-full bg-green-400 opacity-75`}
        />
        <span
          className={`relative inline-flex ${sizeClasses[size]} rounded-full bg-green-500`}
        />
      </span>
      <span className="text-xs text-base-content/40">Live</span>
    </div>
  );
});

/**
 * Score change indicator - shows direction and magnitude
 */
const ScoreChangeIndicator = memo(function ScoreChangeIndicator({ change }) {
  if (!change.direction) return null;

  const isUp = change.direction === "up";

  return (
    <div
      className={`absolute -top-2 -right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold animate-bounce ${
        isUp ? "bg-green-500 text-white" : "bg-red-500 text-white"
      }`}
    >
      {isUp ? (
        <svg
          className="w-3 h-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M5 15l7-7 7 7"
          />
        </svg>
      ) : (
        <svg
          className="w-3 h-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      )}
      <span>{change.magnitude}</span>
    </div>
  );
});

/**
 * Animated score circle wrapper
 */
const AnimatedScoreCircle = memo(function AnimatedScoreCircle({
  score,
  size = 80,
  hasChanges,
}) {
  const animatedScore = useAnimatedScore(score, 800);

  return (
    <div
      className={`relative transition-transform duration-300 ${
        hasChanges ? "scale-110" : ""
      }`}
    >
      <ScoreCircle score={animatedScore} size={size} label="" />
      {hasChanges && (
        <div className="absolute inset-0 rounded-full animate-pulse bg-white/10" />
      )}
    </div>
  );
});

/**
 * Setup statistics and score display
 * Now with real-time updates, animations, and English translations
 */
function SetupStats({
  combinedScore,
  productCount = 0,
  isConnected = true,
  hasChanges = false,
  showLiveIndicator = true,
  onRecommendationClick,
}) {
  const [previousScore, setPreviousScore] = useState(null);
  const scoreChange = useScoreChange(combinedScore);

  // Update previous score on change
  useEffect(() => {
    if (combinedScore && !previousScore) {
      setPreviousScore(combinedScore);
    }
  }, [combinedScore, previousScore]);

  if (!combinedScore) {
    return (
      <div className="bg-base-200 rounded-xl p-6 border border-base-300 text-center">
        <div className="w-16 h-16 rounded-full bg-base-300 flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl text-base-content/30">?</span>
        </div>
        <p className="text-sm text-base-content/60">Score unavailable</p>
        <p className="text-xs text-base-content/40 mt-1">
          Add products to calculate the score
        </p>
      </div>
    );
  }

  const score = combinedScore.note_finale || combinedScore.total || 0;
  const scores = {
    S: combinedScore.score_s || combinedScore.S || 0,
    A: combinedScore.score_a || combinedScore.A || 0,
    F: combinedScore.score_f || combinedScore.F || 0,
    E: combinedScore.score_e || combinedScore.E || 0,
  };

  // Find weakest and strongest pillars
  const pillars = Object.entries(scores).map(([code, value]) => ({
    code,
    value,
  }));
  const weakest = pillars.reduce((min, p) => (p.value < min.value ? p : min));
  const strongest = pillars.reduce((max, p) =>
    p.value > max.value ? p : max
  );

  const pillarNames = {
    S: "Security",
    A: "Adversity",
    F: "Fidelity",
    E: "Efficiency",
  };

  const pillarDescriptions = {
    S: "Protection against attacks and vulnerabilities",
    A: "Resilience to external threats",
    F: "Reliability and trust in the system",
    E: "Operational performance and usability",
  };

  return (
    <div
      className={`rounded-xl p-5 bg-gradient-to-br border transition-all duration-500 ${getScoreBg(
        score
      )} ${hasChanges ? "ring-2 ring-green-500/50 shadow-lg shadow-green-500/20" : ""}`}
    >
      {/* Header with live indicator */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-base-content/60">
              Combined SAFE Score
            </h3>
            {showLiveIndicator && <LiveIndicator isConnected={isConnected} />}
          </div>
          <p className="text-xs text-base-content/40">
            {productCount} product{productCount !== 1 ? "s" : ""} in stack
          </p>
        </div>

        {/* Animated score with change indicator */}
        <div className="relative">
          <AnimatedScoreCircle
            score={score}
            size={80}
            hasChanges={hasChanges}
          />
          <ScoreChangeIndicator change={scoreChange} />
        </div>
      </div>

      {/* SAFE pillars breakdown */}
      <div className="pt-4 border-t border-base-content/10">
        <SAFEPillars scores={scores} compact />
      </div>

      {/* Insights */}
      <div className="mt-4 space-y-2">
        {/* Weakest pillar warning with recommendation CTA */}
        {weakest.value < 70 && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4 text-amber-400 mt-0.5 shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            <div className="flex-1 text-xs">
              <span className="font-medium text-amber-400">
                Weakness: {pillarNames[weakest.code]}
              </span>
              <p className="text-base-content/60 mt-0.5">
                Score of {weakest.value}/100 -{" "}
                {pillarDescriptions[weakest.code]}
              </p>
              {onRecommendationClick && (
                <button
                  onClick={() => onRecommendationClick(weakest.code)}
                  className="mt-1.5 text-amber-400 hover:text-amber-300 underline underline-offset-2"
                >
                  View recommendations to improve
                </button>
              )}
            </div>
          </div>
        )}

        {/* Strongest pillar highlight */}
        {strongest.value >= 80 && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4 text-green-400 mt-0.5 shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-xs">
              <span className="font-medium text-green-400">
                Strength: {pillarNames[strongest.code]}
              </span>
              <p className="text-base-content/60 mt-0.5">
                Score of {strongest.value}/100 - Excellent protection
              </p>
            </div>
          </div>
        )}

        {/* Pillar change indicators */}
        {scoreChange.direction && Object.keys(scoreChange.pillarChanges).length > 0 && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4 text-blue-400 mt-0.5 shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
              />
            </svg>
            <div className="text-xs">
              <span className="font-medium text-blue-400">Score updated</span>
              <div className="flex gap-2 mt-1 text-base-content/60">
                {Object.entries(scoreChange.pillarChanges)
                  .filter(([_, v]) => v !== 0)
                  .map(([pillar, change]) => (
                    <span
                      key={pillar}
                      className={change > 0 ? "text-green-400" : "text-red-400"}
                    >
                      {pillar}: {change > 0 ? "+" : ""}
                      {change}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(SetupStats);
export { LiveIndicator, ScoreChangeIndicator, AnimatedScoreCircle };
