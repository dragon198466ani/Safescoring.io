"use client";

import { useState } from "react";
import Link from "next/link";
import { PILLAR_COLORS, getScoreColor } from "@/libs/design-tokens";
import { useApi } from "@/hooks/useApi";

/**
 * SAFEPriorityZone - Priority zone showing SAFE pillar analysis with user strategies
 * 
 * Displays:
 * - Visual breakdown of S, A, F, E pillars with scores
 * - Priority pillar highlighted (weakest area)
 * - Actionable strategies for the user based on evaluations
 * - Risk level indicators
 */

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

const PILLAR_DESCRIPTIONS = {
  S: "Cryptographic foundations - encryption, signatures, key management",
  A: "Duress & coercion resistance - protection under physical threat",
  F: "Long-term reliability - audits, bug bounties, track record",
  E: "Usability & accessibility - UX, multi-chain, ecosystem",
};

const RISK_BADGES = {
  low: { label: "Low Risk", class: "bg-green-500/20 text-green-400 border-green-500/30" },
  medium: { label: "Medium Risk", class: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  high: { label: "High Risk", class: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  critical: { label: "Critical", class: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export default function SAFEPriorityZone({
  productId,
  productSlug,
  scores = {},
  strategies = [],
  priorityPillar = null,
  priorityReason = null,
}) {
  const [expandedPillar, setExpandedPillar] = useState(null);

  // Use useApi to fetch strategies if not provided (5-minute cache)
  const shouldFetch = strategies.length === 0 && productSlug;
  const { data: strategiesData, isLoading: loading } = useApi(
    shouldFetch ? `/api/products/${productSlug}/strategies` : null,
    { ttl: 5 * 60 * 1000 }
  );

  // Use provided strategies or fetched strategies
  const loadedStrategies = strategies.length > 0 ? strategies : (strategiesData?.strategies || []);

  // Calculate pillar data
  const pillars = ["S", "A", "F", "E"].map((code) => {
    const score = scores[code.toLowerCase()] || 0;
    const pillarStrategies = loadedStrategies.filter((s) => s.pillar === code);
    const isPriority = priorityPillar === code || (!priorityPillar && score === Math.min(scores.s || 0, scores.a || 0, scores.f || 0, scores.e || 0) && score < 80);
    
    return {
      code,
      name: PILLAR_COLORS[code].name,
      color: PILLAR_COLORS[code].primary,
      score,
      strategies: pillarStrategies,
      isPriority,
      icon: PILLAR_ICONS[code],
      description: PILLAR_DESCRIPTIONS[code],
    };
  });

  const sortedPillars = [...pillars].sort((a, b) => a.score - b.score);
  const weakestPillar = sortedPillars[0];
  const strongestPillar = sortedPillars[sortedPillars.length - 1];

  // Rule: Don't display if no data exists
  const hasScores = scores.s > 0 || scores.a > 0 || scores.f > 0 || scores.e > 0;
  if (!hasScores) {
    return null;
  }

  return (
    <div className="rounded-xl bg-base-200/50 border border-base-content/10 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-base-content/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold">SAFE Priority Zone</h2>
            <p className="text-sm text-base-content/60">Your security roadmap</p>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-base-content/10">
        {pillars.map((pillar) => (
          <button
            key={pillar.code}
            onClick={() => setExpandedPillar(expandedPillar === pillar.code ? null : pillar.code)}
            className={`p-4 text-left transition-all hover:bg-base-content/5 ${
              pillar.isPriority ? "bg-amber-500/5" : ""
            } ${expandedPillar === pillar.code ? "bg-base-content/5" : ""}`}
          >
            {/* Pillar Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span style={{ color: pillar.color }}>{pillar.icon}</span>
                <span className="font-bold text-2xl" style={{ color: pillar.color }}>
                  {pillar.code}
                </span>
              </div>
              {pillar.isPriority && (
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                  Priority
                </span>
              )}
            </div>

            {/* Score */}
            <div className="flex items-baseline gap-1 mb-1">
              <span className={`text-xl font-bold ${getScoreColor(pillar.score)}`}>
                {pillar.score}
              </span>
              <span className="text-sm text-base-content/40">/100</span>
            </div>

            {/* Name & Description */}
            <p className="font-medium text-sm">{pillar.name}</p>
            <p className="text-xs text-base-content/50 line-clamp-2 mt-1">
              {pillar.description}
            </p>

            {/* Strategies count */}
            {pillar.strategies.length > 0 && (
              <div className="mt-2 flex items-center gap-1 text-xs text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
                </svg>
                {pillar.strategies.length} action{pillar.strategies.length > 1 ? "s" : ""}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Expanded Strategies Panel */}
      {expandedPillar && (
        <div className="border-t border-base-content/10 bg-base-300/30">
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span style={{ color: PILLAR_COLORS[expandedPillar].primary }}>
                {PILLAR_ICONS[expandedPillar]}
              </span>
              <h3 className="font-semibold">
                {PILLAR_COLORS[expandedPillar].name} Strategies
              </h3>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-6">
                <span className="loading loading-spinner loading-sm text-primary"></span>
              </div>
            ) : pillars.find((p) => p.code === expandedPillar)?.strategies.length > 0 ? (
              <div className="space-y-3">
                {pillars
                  .find((p) => p.code === expandedPillar)
                  ?.strategies.map((strategy, idx) => (
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
              <div className="text-center py-6 text-base-content/50">
                <p className="text-sm">No specific strategies available yet.</p>
                <p className="text-xs mt-1">Check back after the next evaluation update.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary Footer */}
      <div className="px-5 py-3 bg-base-300/30 border-t border-base-content/10 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="text-base-content/60">Strongest:</span>
            <span className="font-medium" style={{ color: strongestPillar.color }}>
              {strongestPillar.name}
            </span>
          </div>
          {weakestPillar.score < strongestPillar.score && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-base-content/60">Focus:</span>
              <span className="font-medium" style={{ color: weakestPillar.color }}>
                {weakestPillar.name}
              </span>
            </div>
          )}
        </div>
        <span className="text-xs text-base-content/40">
          {loadedStrategies.length} total strategies
        </span>
      </div>
    </div>
  );
}
