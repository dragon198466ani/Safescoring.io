"use client";

/**
 * SAFEAnalysis - Unified SAFE Pillar Analysis Component
 *
 * Combines SAFEBreakdown + SAFEPriorityZone into a single powerful component:
 * - Score interpretation with actionable advice
 * - Priority alerts for weak pillars
 * - Interactive pillar cards with expandable strategies
 * - Periodic data refresh (1 hour)
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/libs/supabase";
import { PILLARS, getPillarAdvice, PILLAR_COLORS } from "@/libs/design-tokens";
import { getScoreColor, getPillarScore, normalizeScoresObject } from "@/libs/score-utils";
import { ProductAnalytics } from "@/components/SAFEAnalytics";
import { useApi } from "@/hooks/useApi";

const REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour

// Pillar icons
const PILLAR_ICONS = {
  S: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  ),
  A: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  ),
  F: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
    </svg>
  ),
  E: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
};

// Descriptions for each pillar (aligned with methodology page)
const PILLAR_DESCRIPTIONS = {
  S: "Cryptographic foundations - encryption, signatures, key management",
  A: "Duress & coercion resistance - protection under physical threat",
  F: "Long-term reliability - audits, bug bounties, track record",
  E: "Usability & accessibility - UX, multi-chain, ecosystem",
};

// Risk badges for strategies
const RISK_BADGES = {
  low: { label: "Low Concern", class: "bg-green-500/20 text-green-400 border-green-500/30" },
  medium: { label: "Moderate Concern", class: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  high: { label: "Elevated Concern", class: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  critical: { label: "High Concern", class: "bg-red-500/20 text-red-400 border-red-500/30" },
};


export default function SAFEAnalysis({
  productId,
  productSlug,
  productType,
  initialScores,
  initialEvaluations,
  initialEvaluationDetails,
  priorityPillar = null,
  priorityReason = null,
  isConnected = false,
}) {
  const [scores, setScores] = useState(initialScores);
  const [pillarEvaluations, setPillarEvaluations] = useState(initialEvaluations || {});
  const [evaluationDetails, setEvaluationDetails] = useState(initialEvaluationDetails || {});
  const [expandedPillar, setExpandedPillar] = useState(null);

  // Use useApi hook for fetching strategies with auto-caching and retry
  const { data: strategiesData, isLoading: loadingStrategies } = useApi(
    productSlug ? `/api/products/${productSlug}/strategies` : null,
    { ttl: 5 * 60 * 1000 } // Cache for 5 minutes
  );
  const strategies = strategiesData?.strategies || [];

  // Compute pillar data
  const pillarScores = PILLARS.map((pillar) => ({
    ...pillar,
    score: getPillarScore(scores, pillar.code),
    icon: PILLAR_ICONS[pillar.code],
    description: PILLAR_DESCRIPTIONS[pillar.code],
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
      console.error("[SAFEAnalysis] Error fetching evaluations:", error);
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
      console.error("[SAFEAnalysis] Error fetching scores:", error);
    }
  }, [productId]);

  // Periodic refresh every hour
  useEffect(() => {
    if (!productId) return;

    const refreshData = () => {
      fetchEvaluations();
      fetchScores();
    };

    const intervalId = setInterval(refreshData, REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [productId, fetchEvaluations, fetchScores]);

  // Get strategies for a pillar
  const getPillarStrategies = (pillarCode) => {
    return strategies.filter((s) => s.pillar === pillarCode);
  };

  // Not evaluated state
  if (!isEvaluated) {
    return (
      <div className="rounded-xl bg-base-200/30 border border-base-content/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-base-content/10">
          <h2 className="text-lg font-bold">SAFE Analysis</h2>
        </div>
        <div className="px-5 py-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-base-300 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-base-content/50">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-base-content/60 mb-2">This product is awaiting full security evaluation</p>
          <p className="text-sm text-base-content/40">Scores will be available once our team completes the assessment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-base-200/30 border border-base-content/10 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-base-content/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold">SAFE Analysis</h2>
            <p className="text-sm text-base-content/60">
              {evaluationDetails.totalNorms} norms evaluated
            </p>
          </div>
        </div>
        <Link href="/methodology" className="btn btn-sm btn-ghost gap-1">
          Learn more
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      </div>

      {/* Priority Alert */}
      {weakestPillar && weakestPillar.score < 70 && (
        <div className="px-5 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-amber-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-400">
              Priority: {weakestPillar.name} ({weakestPillar.score}%)
            </p>
            <p className="text-sm text-base-content/70 mt-0.5">
              {priorityReason || `Focus on improving ${weakestPillar.name.toLowerCase()} to strengthen your overall security posture.`}
            </p>
          </div>
        </div>
      )}

      {/* Pillar Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {pillarScores.map((pillar, index) => {
          const isWeakest = pillar.code === weakestPillar.code && showBestWorst;
          const isStrongest = pillar.code === strongestPillar.code && showBestWorst;
          const isPriority = priorityPillar === pillar.code || (isWeakest && pillar.score < 80);
          const pillarStrategies = getPillarStrategies(pillar.code);
          const isExpanded = expandedPillar === pillar.code;

          return (
            <button
              key={pillar.code}
              onClick={() => setExpandedPillar(isExpanded ? null : pillar.code)}
              className={`p-4 text-left relative transition-all hover:bg-base-content/5 ${
                index % 2 === 0 ? "border-r border-base-content/10" : ""
              } ${index < 2 ? "border-b lg:border-b-0 border-base-content/10" : ""} ${
                index < 3 ? "lg:border-r" : ""
              } ${isStrongest ? "bg-emerald-500/5" : isPriority ? "bg-amber-500/5" : ""} ${
                isExpanded ? "ring-2 ring-primary/30 ring-inset" : ""
              }`}
            >
              {/* Badge */}
              {isStrongest && (
                <div className="absolute top-2 right-2 text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                  Best
                </div>
              )}
              {isPriority && !isStrongest && (
                <div className="absolute top-2 right-2 text-xs font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                  Focus
                </div>
              )}

              {/* Icon + Letter + Score */}
              <div className="flex items-center gap-2 mb-2">
                <span style={{ color: pillar.color }}>{pillar.icon}</span>
                <span className="text-2xl font-black" style={{ color: pillar.color }}>
                  {pillar.code}
                </span>
                <span className={`text-xl font-bold ${getScoreColor(pillar.score)}`}>
                  {pillar.score}
                </span>
              </div>

              {/* Name */}
              <p className="font-medium text-sm mb-1">{pillar.name}</p>

              {/* Description */}
              <p className="text-xs text-base-content/50 line-clamp-2 mb-2">
                {pillar.description}
              </p>

              {/* Status + Advice */}
              <p className="text-xs text-base-content/60 leading-relaxed">
                {pillar.score >= 80
                  ? "Strong protection"
                  : pillar.score >= 60
                  ? "Adequate, room to grow"
                  : "Requires attention"}
              </p>

              {/* Strategies count */}
              {pillarStrategies.length > 0 && (
                <div className="mt-2 flex items-center gap-1 text-xs text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
                  </svg>
                  {pillarStrategies.length} action{pillarStrategies.length > 1 ? "s" : ""}
                </div>
              )}

              {/* Expand indicator */}
              <div className="mt-2 flex items-center gap-1 text-xs text-base-content/40">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
                {isExpanded ? "Close" : "Details"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Expanded Panel */}
      {expandedPillar && (
        <div className="border-t border-base-content/10 bg-base-300/30">
          <div className="p-5">
            {/* Panel Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span style={{ color: PILLAR_COLORS[expandedPillar]?.primary }}>
                  {PILLAR_ICONS[expandedPillar]}
                </span>
                <h3 className="font-semibold">
                  {PILLAR_COLORS[expandedPillar]?.name} Details
                </h3>
              </div>
              <button
                onClick={() => setExpandedPillar(null)}
                className="btn btn-sm btn-ghost btn-circle"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Advice */}
            <div className="p-3 rounded-lg bg-base-200 border border-base-content/10 mb-4">
              <p className="text-sm text-base-content/80 flex items-start gap-2">
                <span className="text-primary">💡</span>
                {getPillarAdvice(expandedPillar, getPillarScore(scores, expandedPillar), pillarEvaluations[expandedPillar])}
              </p>
            </div>

            {/* Strategies */}
            {loadingStrategies ? (
              <div className="flex items-center justify-center py-6">
                <span className="loading loading-spinner loading-sm text-primary"></span>
              </div>
            ) : getPillarStrategies(expandedPillar).length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-base-content/60 mb-2">
                  Improvement Strategies
                </h4>
                {getPillarStrategies(expandedPillar).map((strategy, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg bg-base-200 border border-base-content/10"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h4 className="font-medium">{strategy.strategy_title}</h4>
                      {strategy.risk_level && RISK_BADGES[strategy.risk_level] && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${RISK_BADGES[strategy.risk_level].class}`}>
                          {RISK_BADGES[strategy.risk_level].label}
                        </span>
                      )}
                    </div>
                    {strategy.strategy_description && (
                      <p className="text-sm text-base-content/70">
                        {strategy.strategy_description}
                      </p>
                    )}
                    {strategy.action_items && strategy.action_items.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {strategy.action_items.map((action, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-primary shrink-0 mt-0.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                            </svg>
                            <span className="text-base-content/80">{action}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-base-content/50">
                <p className="text-sm">No specific strategies available yet.</p>
                <p className="text-xs mt-1">Check back after the next evaluation update.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Section - Layer 1 Data */}
      <div className="border-t border-base-content/10">
        <div className="px-3 sm:px-5 py-3 sm:py-4">
          <ProductAnalytics
            productId={productId}
            productSlug={productSlug}
            currentScore={scores.total}
            isConnected={isConnected}
          />
        </div>
      </div>

      {/* Footer - Simple */}
      {strategies.length > 0 && (
        <div className="px-5 py-2 bg-base-300/20 border-t border-base-content/10 text-center">
          <span className="text-xs text-base-content/50">
            {strategies.length} improvement {strategies.length === 1 ? 'strategy' : 'strategies'} available
          </span>
        </div>
      )}
    </div>
  );
}
