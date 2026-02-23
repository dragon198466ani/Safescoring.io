"use client";

import { useState } from "react";
import { PILLARS, getScoreColor } from "@/libs/score-utils";

/**
 * ScoreTransparency - Shows exactly how a SAFE score is calculated.
 *
 * Displays the formula, per-pillar breakdown of YES/NO/TBD/N/A counts,
 * and lets users expand each pillar for deeper understanding.
 *
 * @param {Object} props
 * @param {Object} props.safeScoring - Scoring data from safe_scoring_results
 * @param {Object} props.evaluationDetails - { totalNorms, yes, no, na, tbd }
 * @param {Array}  props.pillarEvaluations - Per-pillar evaluation breakdowns
 * @param {string} props.className - Additional CSS classes
 */
const ScoreTransparency = ({
  safeScoring,
  evaluationDetails,
  pillarEvaluations,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedPillar, setExpandedPillar] = useState(null);

  if (!safeScoring || !evaluationDetails) return null;

  const { totalNorms, yes, no, na, tbd } = evaluationDetails;
  const scorable = yes + no;
  const score = scorable > 0 ? ((yes / scorable) * 100).toFixed(1) : null;

  const pillarScores = [
    { code: "S", score: safeScoring.score_s, name: "Security" },
    { code: "A", score: safeScoring.score_a, name: "Adversity" },
    { code: "F", score: safeScoring.score_f, name: "Fidelity" },
    { code: "E", score: safeScoring.score_e, name: "Ecosystem" },
  ];

  return (
    <div className={`bg-base-200 rounded-xl p-4 ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 opacity-60"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          <span className="font-semibold text-sm">How is this score calculated?</span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Formula */}
          <div className="bg-base-300 rounded-lg p-3">
            <p className="text-xs opacity-60 mb-1">SAFE Score Formula</p>
            <code className="text-sm font-mono">
              Score = (YES + YESp) / (YES + YESp + NO) &times; 100
            </code>
            <p className="text-xs opacity-50 mt-1">
              TBD and N/A norms are excluded from the calculation.
            </p>
          </div>

          {/* Overall stats */}
          <div>
            <p className="text-xs opacity-60 mb-2">Evaluation Summary</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <StatBox label="Total norms" value={totalNorms} />
              <StatBox label="YES" value={yes} color="text-success" />
              <StatBox label="NO" value={no} color="text-error" />
              <StatBox label="N/A" value={na} color="opacity-50" />
              <StatBox label="TBD" value={tbd} color="text-warning" />
            </div>
            {scorable > 0 && (
              <p className="text-xs opacity-60 mt-2">
                {yes} / {scorable} scorable norms passed = <strong>{score}%</strong>
              </p>
            )}
          </div>

          {/* Per-pillar breakdown */}
          <div>
            <p className="text-xs opacity-60 mb-2">Score by Pillar (25% each)</p>
            <div className="space-y-2">
              {pillarScores.map((pillar) => {
                const pillarData = pillarEvaluations?.find?.(
                  (p) => p.pillar === pillar.code || p.code === pillar.code
                );

                return (
                  <div key={pillar.code}>
                    <button
                      onClick={() =>
                        setExpandedPillar(
                          expandedPillar === pillar.code ? null : pillar.code
                        )
                      }
                      className="w-full flex items-center justify-between py-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm w-6">
                          {pillar.code}
                        </span>
                        <span className="text-sm">{pillar.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {pillar.score != null ? (
                          <span
                            className="font-semibold text-sm"
                            style={{ color: getScoreColor(pillar.score) }}
                          >
                            {pillar.score.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-sm opacity-40">N/A</span>
                        )}
                        {pillarData && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-3 w-3 transition-transform ${
                              expandedPillar === pillar.code ? "rotate-180" : ""
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        )}
                      </div>
                    </button>

                    {/* Progress bar */}
                    {pillar.score != null && (
                      <div className="w-full bg-base-300 rounded-full h-1.5 ml-8 mr-16">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{
                            width: `${Math.min(pillar.score, 100)}%`,
                            backgroundColor: getScoreColor(pillar.score),
                          }}
                        />
                      </div>
                    )}

                    {/* Expanded pillar detail */}
                    {expandedPillar === pillar.code && pillarData && (
                      <div className="ml-8 mt-2 mb-2 text-xs space-y-1 bg-base-300 rounded-lg p-2">
                        <div className="flex gap-3">
                          <span className="text-success">
                            YES: {pillarData.yes || 0}
                          </span>
                          <span className="text-error">
                            NO: {pillarData.no || 0}
                          </span>
                          <span className="opacity-50">
                            N/A: {pillarData.na || 0}
                          </span>
                          <span className="text-warning">
                            TBD: {pillarData.tbd || 0}
                          </span>
                        </div>
                        {(pillarData.yes || 0) + (pillarData.no || 0) > 0 && (
                          <p className="opacity-60">
                            {pillarData.yes || 0} /{" "}
                            {(pillarData.yes || 0) + (pillarData.no || 0)} scorable
                            norms passed
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Methodology link */}
          <div className="text-xs opacity-50 pt-2 border-t border-base-300">
            Scores use the{" "}
            <a href="/methodology" className="link link-primary">
              SAFE Methodology v2.0
            </a>{" "}
            with equal 25% weight per pillar.
          </div>
        </div>
      )}
    </div>
  );
};

function StatBox({ label, value, color = "" }) {
  return (
    <div className="bg-base-300 rounded-lg p-2 text-center">
      <p className={`text-lg font-bold ${color}`}>{value ?? "-"}</p>
      <p className="text-xs opacity-60">{label}</p>
    </div>
  );
}

export default ScoreTransparency;
