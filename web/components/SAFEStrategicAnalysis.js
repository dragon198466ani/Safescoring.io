"use client";

/**
 * SAFEStrategicAnalysis - AI-generated strategic analysis per pillar
 *
 * Displays:
 * - Global risk overview (overall_risk_level, attack_vectors, mitigations)
 * - Per-pillar analysis cards (narrative, strengths, weaknesses, recommendations)
 * - Expand/collapse for worst-case scenarios
 *
 * Data sources:
 * - /api/products/[slug]/analysis → product_pillar_narratives + product_risk_analysis
 * - /api/products/[slug]/strategic-analyses → product_pillar_analyses (recommendations[])
 */

import { useState, useEffect } from "react";
import { PILLAR_COLORS } from "@/libs/design-tokens";

const PILLAR_ORDER = ["S", "A", "F", "E"];

const RISK_BADGES = {
  low: { label: "Low Risk", bg: "bg-green-500/15", text: "text-green-400", border: "border-green-500/30", dot: "bg-green-400" },
  medium: { label: "Medium Risk", bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30", dot: "bg-amber-400" },
  high: { label: "High Risk", bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30", dot: "bg-orange-400" },
  critical: { label: "Critical", bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30", dot: "bg-red-400" },
};

function RiskBadge({ level }) {
  const badge = RISK_BADGES[level] || RISK_BADGES.medium;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
      {badge.label}
    </span>
  );
}

function PillarCard({ pillar, analysis, strategicData, isExpanded, onToggle }) {
  const colors = PILLAR_COLORS[pillar];
  if (!colors) return null;

  const score = analysis?.score || 0;
  const summary = analysis?.summary;
  const strengths = analysis?.strengths;
  const weaknesses = analysis?.weaknesses;
  const strategy = analysis?.securityStrategy;
  const worstCase = analysis?.worstCase;
  const mitigation = analysis?.mitigation;
  const riskLevel = analysis?.riskLevel || "medium";

  // Recommendations from strategic-analyses API
  const recommendations = strategicData?.recommendations || [];
  const criticalRisks = strategicData?.critical_risks || [];

  // Parse strengths/weaknesses (they come as newline-separated TEXT from analysis API)
  const strengthsList = strengths ? strengths.split("\n").filter(s => s.trim()) : [];
  const weaknessesList = weaknesses ? weaknesses.split("\n").filter(s => s.trim()) : [];

  const isPending = !summary || summary === "Analysis pending...";

  return (
    <div className={`rounded-xl border ${colors.border} bg-base-200/50 overflow-hidden transition-all duration-200`}>
      {/* Header */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 p-4 ${colors.bgHover} transition-colors cursor-pointer`}
      >
        <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${colors.bg}`}>
          <span className={`text-lg font-black ${colors.text}`}>{pillar}</span>
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-base-content">{colors.name}</span>
            <RiskBadge level={riskLevel} />
          </div>
          <div className="text-sm text-base-content/50">
            Score: <span className={`font-bold ${colors.text}`}>{score}/100</span>
            {analysis?.evaluatedCount > 0 && (
              <span className="ml-2">
                ({analysis.failedCount} failed / {analysis.evaluatedCount} norms)
              </span>
            )}
          </div>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className={`w-5 h-5 text-base-content/40 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-base-300/50">
          {isPending ? (
            <div className="py-6 text-center text-base-content/40">
              <div className="animate-pulse mb-2">
                <div className="h-3 bg-base-300 rounded w-3/4 mx-auto mb-2" />
                <div className="h-3 bg-base-300 rounded w-1/2 mx-auto" />
              </div>
              <p className="text-sm">Analysis in progress...</p>
            </div>
          ) : (
            <>
              {/* Narrative Summary */}
              {summary && (
                <div className="pt-4">
                  <p className="text-sm text-base-content/80 leading-relaxed">{summary}</p>
                </div>
              )}

              {/* Strengths & Weaknesses */}
              <div className="grid md:grid-cols-2 gap-3">
                {strengthsList.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Strengths</h4>
                    {strengthsList.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-base-content/70">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                )}
                {weaknessesList.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider">Weaknesses</h4>
                    {weaknessesList.map((w, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-base-content/70">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-400 shrink-0 mt-0.5">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Critical Risks */}
              {criticalRisks.length > 0 && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                  <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Critical Risks</h4>
                  <ul className="space-y-1">
                    {criticalRisks.map((r, i) => (
                      <li key={i} className="text-sm text-red-300/80 flex items-start gap-2">
                        <span className="text-red-400 mt-0.5">!</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {recommendations.length > 0 && (
                <div className="rounded-lg bg-primary/10 border border-primary/20 p-3">
                  <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Recommendations</h4>
                  <ul className="space-y-1">
                    {recommendations.map((r, i) => (
                      <li key={i} className="text-sm text-base-content/70 flex items-start gap-2">
                        <span className="text-primary font-bold mt-0.5">{i + 1}.</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Security Strategy */}
              {strategy && (
                <div className="rounded-lg bg-base-300/30 p-3">
                  <h4 className="text-xs font-semibold text-base-content/60 uppercase tracking-wider mb-1">Security Strategy</h4>
                  <p className="text-sm text-base-content/70 leading-relaxed">{strategy}</p>
                </div>
              )}

              {/* Worst Case Scenario (collapsible) */}
              {worstCase && (
                <details className="group">
                  <summary className="cursor-pointer text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1 hover:text-amber-300 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 transition-transform group-open:rotate-90">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                    Worst Case Scenario
                  </summary>
                  <div className="mt-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                    <p className="text-sm text-amber-300/80 leading-relaxed">{worstCase}</p>
                    {mitigation && (
                      <div className="mt-2 pt-2 border-t border-amber-500/20">
                        <p className="text-xs font-semibold text-emerald-400 mb-1">Mitigation</p>
                        <p className="text-sm text-base-content/70 leading-relaxed">{mitigation}</p>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line no-unused-vars
export default function SAFEStrategicAnalysis({ productSlug, pillarScores }) {
  const [analysisData, setAnalysisData] = useState(null);
  const [strategicData, setStrategicData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedPillar, setExpandedPillar] = useState(null);

  useEffect(() => {
    if (!productSlug) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch both APIs in parallel
        const [analysisRes, strategicRes] = await Promise.all([
          fetch(`/api/products/${productSlug}/analysis`),
          fetch(`/api/products/${productSlug}/strategic-analyses`),
        ]);

        if (analysisRes.ok) {
          const data = await analysisRes.json();
          setAnalysisData(data);
        }

        if (strategicRes.ok) {
          const data = await strategicRes.json();
          setStrategicData(data);
        }
      } catch (err) {
        console.error("[SAFEStrategicAnalysis] Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [productSlug]);

  // Don't render if no data at all
  if (loading) {
    return (
      <div className="mb-12">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-base-300 rounded w-1/3" />
          <div className="h-24 bg-base-300/50 rounded-xl" />
          <div className="grid md:grid-cols-2 gap-4">
            <div className="h-16 bg-base-300/50 rounded-xl" />
            <div className="h-16 bg-base-300/50 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const pillarAnalysis = analysisData?.pillarAnalysis;
  const riskAnalysis = analysisData?.riskAnalysis;

  // Check if we have any real data (not just "Analysis pending...")
  const hasNarratives = pillarAnalysis && PILLAR_ORDER.some(p =>
    pillarAnalysis[p]?.summary && pillarAnalysis[p].summary !== "Analysis pending..."
  );

  if (!hasNarratives && !riskAnalysis) {
    return null; // Don't render empty section
  }

  return (
    <div className="mb-12">
      {/* Section Title */}
      <div className="flex items-center gap-3 mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-primary">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
        <h2 className="text-xl font-bold text-base-content">Strategic Analysis</h2>
        {riskAnalysis && <RiskBadge level={riskAnalysis.overallRisk} />}
      </div>

      {/* Global Risk Overview */}
      {riskAnalysis?.narrative && (
        <div className="rounded-xl bg-base-200/80 border border-base-300 p-5 mb-6">
          <p className="text-sm text-base-content/80 leading-relaxed mb-4">{riskAnalysis.narrative}</p>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Attack Vectors */}
            {riskAnalysis.attackVectors?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Attack Vectors</h4>
                <ul className="space-y-1">
                  {riskAnalysis.attackVectors.map((v, i) => (
                    <li key={i} className="text-sm text-base-content/60 flex items-start gap-2">
                      <span className="text-red-400 shrink-0">&#x2022;</span>
                      <span>{typeof v === 'string' ? v : v.description || JSON.stringify(v)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Priority Mitigations */}
            {riskAnalysis.priorityMitigations?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Priority Actions</h4>
                <ul className="space-y-1">
                  {riskAnalysis.priorityMitigations.map((m, i) => (
                    <li key={i} className="text-sm text-base-content/60 flex items-start gap-2">
                      <span className="text-emerald-400 font-bold shrink-0">{i + 1}.</span>
                      <span>{typeof m === 'string' ? m : m.description || JSON.stringify(m)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Per-Pillar Cards */}
      <div className="space-y-3">
        {PILLAR_ORDER.map((pillar) => (
          <PillarCard
            key={pillar}
            pillar={pillar}
            analysis={pillarAnalysis?.[pillar]}
            strategicData={strategicData?.[pillar]}
            isExpanded={expandedPillar === pillar}
            onToggle={() => setExpandedPillar(expandedPillar === pillar ? null : pillar)}
          />
        ))}
      </div>

      {/* Last updated */}
      {analysisData?.generatedAt && (
        <p className="text-xs text-base-content/30 mt-3 text-right">
          Analysis updated: {new Date(analysisData.generatedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
