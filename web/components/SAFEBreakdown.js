"use client";

/**
 * SAFEBreakdown Component
 *
 * Displays the SAFE pillar scores with periodic advice updates.
 * Refreshes data every hour to stay current without overloading the server.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/libs/supabase";
import { PILLARS, getPillarAdvice } from "@/libs/design-tokens";
import { getScoreColor, getPillarScore, normalizeScoresObject } from "@/libs/score-utils";

// Refresh interval: 1 hour in milliseconds
const REFRESH_INTERVAL = 60 * 60 * 1000;

// Score interpretation messages for beginners
const getScoreInterpretation = (score) => {
  if (score >= 80) return {
    verdict: "Excellent Security",
    message: "This product meets high security standards. Suitable for significant holdings.",
    action: "You can use this product with confidence for most use cases.",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
  };
  if (score >= 60) return {
    verdict: "Good Security",
    message: "Solid security with some areas for improvement. Good for moderate use.",
    action: "Consider complementing with additional security measures for large holdings.",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
  };
  return {
    verdict: "Needs Improvement",
    message: "Security gaps identified. Use with caution and only for small amounts.",
    action: "We recommend exploring higher-rated alternatives before committing funds.",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
  };
};

// Pillar explanations for beginners
const PILLAR_EXPLANATIONS = {
  S: "How well your data and keys are protected",
  A: "Protection against physical threats and coercion",
  F: "Track record of security audits and updates",
  E: "Usability and compatibility with other tools",
};

export default function SAFEBreakdown({
  productId,
  productSlug,
  productType,
  initialScores,
  initialEvaluations,
  initialEvaluationDetails,
}) {
  const [scores, setScores] = useState(initialScores);
  const [pillarEvaluations, setPillarEvaluations] = useState(initialEvaluations || {});
  const [evaluationDetails, setEvaluationDetails] = useState(initialEvaluationDetails || {});

  // Compute pillar data
  const pillarScores = PILLARS.map((pillar) => ({
    ...pillar,
    score: getPillarScore(scores, pillar.code),
  }));

  const sorted = [...pillarScores].sort((a, b) => b.score - a.score);
  const allScoresEqual = pillarScores.every((p) => p.score === pillarScores[0].score);
  const allScoresZero = pillarScores.every((p) => p.score === 0);
  const hasEvaluations = (evaluationDetails.totalNorms || 0) > 0;
  const isEvaluated = hasEvaluations && !allScoresZero;
  const showBestWorst = isEvaluated && !allScoresEqual;
  const strongestPillar = sorted[0];
  const weakestPillar = sorted[sorted.length - 1];

  // Fetch fresh evaluation data
  const fetchEvaluations = useCallback(async () => {
    if (!productId) return;

    try {
      const { data: evaluations } = await supabase
        .from("evaluations")
        .select(`
          norm_id, result, why_this_result,
          norms (id, code, pillar, title)
        `)
        .eq("product_id", productId);

      if (evaluations) {
        const newPillarEvaluations = { S: [], A: [], F: [], E: [] };
        const stats = { totalNorms: evaluations.length, yes: 0, no: 0, na: 0, tbd: 0 };

        evaluations.forEach((e) => {
          const result = e.result?.toUpperCase();
          if (result === "YES" || result === "YESP") stats.yes++;
          else if (result === "NO") stats.no++;
          else if (result === "N/A" || result === "NA") stats.na++;
          else if (result === "TBD") stats.tbd++;

          const norm = e.norms;
          if (norm?.pillar && newPillarEvaluations[norm.pillar]) {
            newPillarEvaluations[norm.pillar].push({
              code: norm.code,
              title: norm.title,
              result: result,
              reason: e.why_this_result,
            });
          }
        });

        setPillarEvaluations(newPillarEvaluations);
        setEvaluationDetails(stats);
      }
    } catch (error) {
      console.error("[SAFEBreakdown] Error fetching evaluations:", error);
    }
  }, [productId]);

  // Fetch fresh scores
  const fetchScores = useCallback(async () => {
    if (!productId) return;

    try {
      const { data: scoring } = await supabase
        .from("safe_scoring_results")
        .select("*")
        .eq("product_id", productId)
        .order("calculated_at", { ascending: false })
        .limit(1)
        .single();

      if (scoring) {
        setScores(normalizeScoresObject(scoring));
      }
    } catch (error) {
      console.error("[SAFEBreakdown] Error fetching scores:", error);
    }
  }, [productId]);

  // Periodic refresh every hour
  useEffect(() => {
    if (!productId) return;

    const refreshData = () => {
      fetchEvaluations();
      fetchScores();
    };

    // Set up hourly refresh interval
    const intervalId = setInterval(refreshData, REFRESH_INTERVAL);

    // Cleanup on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [productId, fetchEvaluations, fetchScores]);

  return (
    <div className="rounded-xl bg-base-200/30 border border-base-content/10 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-base-content/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">SAFE Breakdown</h2>
          {hasEvaluations ? (
            <span className="text-sm text-base-content/60">
              {evaluationDetails.totalNorms} norms evaluated
            </span>
          ) : (
            <span className="badge badge-warning badge-sm">Pending evaluation</span>
          )}
        </div>
        <Link href="/methodology" className="text-sm text-primary hover:underline flex items-center gap-1">
          Learn about SAFE
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
          </svg>
        </Link>
      </div>

      {/* Score Interpretation - What does this mean? */}
      {isEvaluated && scores.total > 0 && (() => {
        const interpretation = getScoreInterpretation(scores.total);
        return (
          <div className={`px-5 py-4 border-b border-base-content/10 ${interpretation.bgColor}`}>
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-bold ${interpretation.color}`}>{interpretation.verdict}</span>
                  <span className="text-xs text-base-content/50">(Score: {scores.total}/100)</span>
                </div>
                <p className="text-sm text-base-content/70 mb-1">{interpretation.message}</p>
                <p className="text-xs text-base-content/50 italic">{interpretation.action}</p>
              </div>
              {productSlug && (
                <Link
                  href={`/products?compare=${productSlug}`}
                  className="btn btn-sm btn-outline gap-2 shrink-0"
                  aria-label="Compare with similar products"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                  </svg>
                  Compare alternatives
                </Link>
              )}
            </div>
          </div>
        );
      })()}

      {/* Not evaluated state */}
      {!isEvaluated && (
        <div className="px-5 py-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-base-300 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-base-content/50">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-base-content/60 mb-2">This product is awaiting full security evaluation</p>
          <p className="text-sm text-base-content/40">Scores will be available once our team completes the assessment</p>
        </div>
      )}

      {/* Pillar Grid */}
      {isEvaluated && (
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {pillarScores.map((pillar, index) => {
            const isWeakest = pillar.code === weakestPillar.code && showBestWorst;
            const isStrongest = pillar.code === strongestPillar.code && showBestWorst;

            return (
              <div
                key={pillar.code}
                className={`p-4 relative ${
                  index % 2 === 0 ? "border-r border-base-content/10" : ""
                } ${index < 2 ? "border-b lg:border-b-0 border-base-content/10" : ""} ${
                  index < 3 ? "lg:border-r" : ""
                } ${isStrongest ? "bg-emerald-500/5" : isWeakest && pillar.score < 80 ? "bg-amber-500/5" : ""}`}
              >
                {/* Badge indicator */}
                {isStrongest && (
                  <div
                    className="absolute top-2 right-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400"
                    role="status"
                    aria-label={`${pillar.name} is the strongest pillar`}
                  >
                    ★ Best
                  </div>
                )}
                {isWeakest && pillar.score < 80 && !isStrongest && (
                  <div
                    className="absolute top-2 right-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400"
                    role="status"
                    aria-label={`${pillar.name} needs attention`}
                  >
                    ⚠ Focus
                  </div>
                )}

                {/* Score & Letter */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-3xl font-black" style={{ color: pillar.color }}>
                    {pillar.code}
                  </span>
                  <span className={`text-2xl font-bold ${getScoreColor(pillar.score)}`}>
                    {pillar.score}
                  </span>
                </div>

                {/* Name with explanation tooltip */}
                <div className="font-medium text-sm mb-1 group/tooltip relative">
                  <span className="flex items-center gap-1">
                    {pillar.name}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-base-content/30">
                      <path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0Zm-6 3.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7.293 5.293a1 1 0 1 1 .99 1.667c-.169.012-.293.153-.293.325v.292a.75.75 0 0 0 1.5 0v-.082a2.5 2.5 0 1 0-3.197-2.41.75.75 0 0 0 1.5.143.999.999 0 0 1-.5-.935Z" clipRule="evenodd" />
                    </svg>
                  </span>
                  {/* Tooltip */}
                  <div className="absolute left-0 bottom-full mb-2 px-2 py-1 bg-base-300 rounded text-xs text-base-content/80 whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                    {PILLAR_EXPLANATIONS[pillar.code]}
                  </div>
                </div>

                {/* Status text - more actionable */}
                <p className="text-xs text-base-content/50 leading-relaxed mb-2">
                  {pillar.score >= 80
                    ? "Strong protection ✓"
                    : pillar.score >= 60
                    ? "Adequate, room to grow"
                    : "Requires attention ⚠"}
                </p>

                {/* Advice - real-time from evaluations */}
                <p className="text-xs text-base-content/70 leading-relaxed italic">
                  💡 {getPillarAdvice(pillar.code, pillar.score, pillarEvaluations[pillar.code])}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom summary */}
      {isEvaluated && showBestWorst && (
        <div className="px-5 py-3 bg-base-300/30 border-t border-base-content/10 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-400">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
            <span className="text-base-content/60">Strongest:</span>
            <span className="font-semibold" style={{ color: strongestPillar.color }}>{strongestPillar.name}</span>
          </div>
          {weakestPillar.score < 80 && (
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-400">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <span className="text-base-content/60">Priority:</span>
              <span className="font-semibold" style={{ color: weakestPillar.color }}>{weakestPillar.name}</span>
            </div>
          )}
        </div>
      )}

      {/* Balanced scores */}
      {isEvaluated && !showBestWorst && (
        <div className="px-5 py-3 bg-base-300/30 border-t border-base-content/10 text-sm text-base-content/60">
          <span className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-400">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
            </svg>
            Balanced scores across all pillars
          </span>
        </div>
      )}
    </div>
  );
}
