"use client";

/**
 * DashboardSAFEOverview - Layer 2: Dashboard SAFE Overview
 *
 * Provides an overview of all user setups with:
 * - Same visual language as Layer 1 (Product) and Layer 3 (Setup Detail)
 * - Quick SAFE score summary for each setup
 * - Alerts for setups needing attention
 * - Navigation to setup details (Layer 3)
 * - Real-time sync indicator with last update time
 *
 * Design coordination:
 * - Layer 1 (Product): Individual product analysis
 * - Layer 2 (Dashboard): This component - overview of all setups
 * - Layer 3 (Setup Detail): Deep dive into one setup
 */

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import ProductLogo from "@/components/ProductLogo";
import { PILLARS, PILLAR_COLORS } from "@/libs/design-tokens";
import { getScoreColor, getScoreHexColor } from "@/libs/design-tokens";
import { DashboardAnalytics, SetupCompatibilityMatrix } from "@/components/SAFEAnalytics";

// Pillar icons (same as Layer 1 & 3)
const PILLAR_ICONS = {
  S: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  ),
  A: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  ),
  F: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
    </svg>
  ),
  E: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
};

// Score interpretation for overall dashboard
const getDashboardInterpretation = (setups) => {
  if (setups.length === 0) return null;

  const avgScore = setups.reduce((sum, s) => sum + (s.combinedScore?.note_finale || 0), 0) / setups.length;
  const lowScoreSetups = setups.filter(s => (s.combinedScore?.note_finale || 0) < 60);

  if (avgScore >= 80 && lowScoreSetups.length === 0) return {
    verdict: "Excellent Portfolio",
    message: "All your setups maintain high security standards.",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
  };
  if (avgScore >= 60) return {
    verdict: "Good Portfolio",
    message: `${lowScoreSetups.length > 0 ? `${lowScoreSetups.length} setup${lowScoreSetups.length > 1 ? 's' : ''} need attention.` : "Solid security with room for improvement."}`,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
  };
  return {
    verdict: "Needs Attention",
    message: `${lowScoreSetups.length} setup${lowScoreSetups.length > 1 ? 's' : ''} require immediate review.`,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
  };
};

// Score Circle Component (same as other layers)
function ScoreCircle({ score, size = 48, strokeWidth = 4 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const safeScore = score ?? 0;
  const offset = circumference - (safeScore / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="score-circle -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-base-300"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          stroke={getScoreHexColor(safeScore)}
          className="fill-none"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-bold ${getScoreColor(safeScore)}`}>
          {safeScore > 0 ? Math.round(safeScore) : "-"}
        </span>
      </div>
    </div>
  );
}

// Setup Card Component
function SetupCard({ setup, onSelect, isActive, isDemoMode }) {
  const score = setup.combinedScore?.note_finale || 0;
  const products = setup.productDetails || [];

  // Find weakest pillar
  const pillarScores = ["S", "A", "F", "E"].map(code => ({
    code,
    score: setup.combinedScore?.[`score_${code.toLowerCase()}`] || 0,
    color: PILLAR_COLORS[code]?.primary,
  }));
  const sortedPillars = [...pillarScores].sort((a, b) => a.score - b.score);
  const weakestPillar = sortedPillars[0];

  return (
    <button
      onClick={() => onSelect(setup)}
      className={`w-full text-left rounded-xl bg-base-200/30 border overflow-hidden transition-all hover:scale-[1.01] ${
        isActive
          ? "border-primary ring-2 ring-primary/30"
          : "border-base-content/10 hover:border-primary/30"
      }`}
    >
      {/* Card Header */}
      <div className="p-4 flex items-center gap-3">
        <ScoreCircle score={score} size={48} strokeWidth={4} />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{setup.name}</h3>
          <p className="text-xs text-base-content/50">
            {products.length} product{products.length !== 1 ? "s" : ""}
          </p>
        </div>
        {isActive && (
          <div className="badge badge-primary badge-sm">Active</div>
        )}
      </div>

      {/* SAFE Mini Grid */}
      <div className="px-4 pb-3">
        <div className="grid grid-cols-4 gap-1">
          {pillarScores.map((pillar) => (
            <div
              key={pillar.code}
              className={`text-center py-1.5 rounded ${
                pillar.code === weakestPillar.code && pillar.score < 70
                  ? "bg-amber-500/10"
                  : "bg-base-300/50"
              }`}
            >
              <div
                className="text-xs font-bold"
                style={{ color: pillar.score > 0 ? pillar.color : "var(--fallback-bc,oklch(var(--bc)/0.4))" }}
              >
                {pillar.score > 0 ? pillar.score : "-"}
              </div>
              <div className="text-[10px] text-base-content/50 font-medium">
                {pillar.code}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Product Avatars */}
      {products.length > 0 && (
        <div className="px-4 pb-3 flex items-center gap-1">
          {products.slice(0, 4).map((p) => (
            <div key={p.id} className="w-6 h-6 rounded-md border border-base-content/20 overflow-hidden">
              <ProductLogo logoUrl={p.logoUrl} name={p.name} size="xs" />
            </div>
          ))}
          {products.length > 4 && (
            <span className="text-xs text-base-content/50 ml-1">+{products.length - 4}</span>
          )}
        </div>
      )}

      {/* Alert Badge */}
      {weakestPillar.score < 60 && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-1 text-xs text-amber-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <span>Focus on {PILLAR_COLORS[weakestPillar.code]?.name || weakestPillar.code}</span>
          </div>
        </div>
      )}

      {/* View Details Link */}
      <div className="px-4 py-2 bg-base-300/30 border-t border-base-content/10 flex items-center justify-between">
        <span className="text-xs text-base-content/50">
          {score >= 80 ? "Excellent" : score >= 60 ? "Good" : "Needs work"}
        </span>
        {!isDemoMode && (
          <Link
            href={`/dashboard/setups/${setup.id}`}
            className="text-xs text-primary flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            Details
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        )}
      </div>
    </button>
  );
}

export default function DashboardSAFEOverview({
  setups = [],
  activeSetupId,
  onSetupSelect,
  isConnected = false,
  isDemoMode = false,
  onCreateNew,
}) {
  const interpretation = useMemo(() => getDashboardInterpretation(setups), [setups]);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Track when setups data changes (real-time update received)
  useEffect(() => {
    if (setups.length > 0) {
      setLastRefresh(new Date());
    }
  }, [setups]);

  // Format time ago helper
  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  // Calculate overall stats
  const stats = useMemo(() => {
    if (setups.length === 0) return null;

    const scores = setups.map(s => s.combinedScore?.note_finale || 0).filter(s => s > 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const totalProducts = setups.reduce((sum, s) => sum + (s.productDetails?.length || 0), 0);
    const lowScoreCount = setups.filter(s => (s.combinedScore?.note_finale || 0) < 60).length;

    return { avgScore, totalProducts, lowScoreCount, setupCount: setups.length };
  }, [setups]);

  // No setups state
  if (setups.length === 0) {
    return (
      <div className="rounded-xl bg-base-200/30 border border-base-content/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-base-content/10">
          <h2 className="text-lg font-bold">Your Setups</h2>
        </div>
        <div className="px-5 py-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-base-300 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-base-content/50">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
            </svg>
          </div>
          <p className="text-base-content/60 mb-2">Create your first setup to get started</p>
          <p className="text-sm text-base-content/40 mb-4">Combine products to analyze your overall security</p>
          {onCreateNew && (
            <button onClick={onCreateNew} className="btn btn-primary btn-sm">
              Create Setup
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-base-200/30 border border-base-content/10 overflow-hidden">
      {/* Header - Same style as Layer 1 & 3 */}
      <div className="px-5 py-4 border-b border-base-content/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              Portfolio Overview
              {isConnected && (
                <span className="relative flex h-2 w-2" title="Real-time sync">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              )}
            </h2>
            <p className="text-sm text-base-content/60">
              {stats?.setupCount} setup{stats?.setupCount !== 1 ? "s" : ""} • {stats?.totalProducts} products
              {!isDemoMode && (
                <span className="ml-2 text-xs text-base-content/40">
                  • Updated {formatTimeAgo(lastRefresh)}
                </span>
              )}
            </p>
          </div>
        </div>
        {onCreateNew && (
          <button onClick={onCreateNew} className="btn btn-sm btn-outline gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Setup
          </button>
        )}
      </div>

      {/* Interpretation Banner - Same style as Layer 1 & 3 */}
      {interpretation && (
        <div className={`px-5 py-4 border-b ${interpretation.borderColor} ${interpretation.bgColor}`}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-2 mb-1">
                <span className={`font-bold ${interpretation.color}`}>{interpretation.verdict}</span>
                <span className="text-xs text-base-content/50">(Avg: {stats?.avgScore}/100)</span>
              </div>
              <p className="text-sm text-base-content/70">{interpretation.message}</p>
            </div>
            {/* Quick Stats */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className={`text-xl font-bold ${getScoreColor(stats?.avgScore)}`}>
                  {stats?.avgScore}
                </div>
                <div className="text-[10px] text-base-content/50">AVG SCORE</div>
              </div>
              {stats?.lowScoreCount > 0 && (
                <div className="text-center">
                  <div className="text-xl font-bold text-amber-400">
                    {stats?.lowScoreCount}
                  </div>
                  <div className="text-[10px] text-base-content/50">NEED WORK</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Setups Grid */}
      <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
        {setups.map((setup) => (
          <SetupCard
            key={setup.id}
            setup={setup}
            onSelect={onSetupSelect}
            isActive={setup.id === activeSetupId}
            isDemoMode={isDemoMode}
          />
        ))}
      </div>

      {/* Analytics Section - Layer 2 Data */}
      <div className="border-t border-base-content/10">
        <div className="px-3 sm:px-5 py-3 sm:py-4">
          <DashboardAnalytics
            setups={setups}
            isConnected={isConnected}
          />
        </div>
      </div>

      {/* Setup-to-Setup Compatibility */}
      <div className="border-t border-base-content/10">
        <div className="px-3 sm:px-5 py-3 sm:py-4">
          <SetupCompatibilityMatrix
            setups={setups}
            isConnected={isConnected}
          />
        </div>
      </div>

      {/* Footer Summary - Same as Layer 1 & 3 */}
      <div className="px-5 py-3 bg-base-300/30 border-t border-base-content/10 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-4">
          {/* Pillar summary across all setups */}
          {["S", "A", "F", "E"].map((code) => {
            const avgPillarScore = setups.reduce((sum, s) => {
              return sum + (s.combinedScore?.[`score_${code.toLowerCase()}`] || 0);
            }, 0) / setups.length;

            return (
              <div key={code} className="flex items-center gap-1">
                <span style={{ color: PILLAR_COLORS[code]?.primary }}>{PILLAR_ICONS[code]}</span>
                <span className={`text-xs font-medium ${getScoreColor(avgPillarScore)}`}>
                  {Math.round(avgPillarScore) || "-"}
                </span>
              </div>
            );
          })}
        </div>
        <Link href="/methodology" className="text-xs text-base-content/50 hover:text-primary transition-colors">
          Learn about SAFE scoring
        </Link>
      </div>
    </div>
  );
}
