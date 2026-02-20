"use client";

import { useState } from "react";

/**
 * TrustIndicators - Displays all AI-proof trust signals
 *
 * Shows:
 * - Blockchain verification status
 * - Methodology version
 * - Data integrity indicators
 * - Prediction accuracy (if available)
 */
export default function TrustIndicators({
  product,
  showAll = false,
  className = "",
}) {
  const [expanded, setExpanded] = useState(false);

  // Simplified trust indicators - only essential info
  const totalNorms = product?.stats?.totalNorms || 0;
  const indicators = [
    // Show evaluation count if > 0
    totalNorms > 0 && {
      id: "norms",
      label: `${totalNorms} norms`,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      active: true,
      color: "blue",
      tooltip: `${totalNorms} security norms evaluated`,
    },
    // Show "Updated" only if recent
    isRecentUpdate(product?.lastUpdate) && {
      id: "updated",
      label: "Updated",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      active: true,
      color: "emerald",
      tooltip: "Updated within last 30 days",
    },
  ].filter(Boolean);

  const activeIndicators = indicators.filter((i) => i.active);
  const displayIndicators = showAll ? indicators : activeIndicators;

  if (displayIndicators.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {displayIndicators.slice(0, expanded ? undefined : 3).map((indicator) => (
        <TrustBadge key={indicator.id} {...indicator} />
      ))}

      {!expanded && displayIndicators.length > 3 && (
        <button
          onClick={() => setExpanded(true)}
          className="text-xs text-base-content/50 hover:text-base-content transition-colors"
        >
          +{displayIndicators.length - 3} more
        </button>
      )}
    </div>
  );
}

/**
 * Individual trust badge
 */
function TrustBadge({ label, icon, active, color, tooltip }) {
  const colorClasses = {
    emerald: active
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      : "bg-base-300/50 text-base-content/30 border-base-300",
    blue: active
      ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
      : "bg-base-300/50 text-base-content/30 border-base-300",
    purple: active
      ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
      : "bg-base-300/50 text-base-content/30 border-base-300",
    amber: active
      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
      : "bg-base-300/50 text-base-content/30 border-base-300",
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium transition-all ${colorClasses[color]}`}
      title={tooltip}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

/**
 * Compact trust score display
 */
export function TrustScore({ score, size = "md", className = "" }) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-base",
  };

  const getColor = (s) => {
    if (s >= 90) return "text-emerald-400 border-emerald-500/50";
    if (s >= 70) return "text-blue-400 border-blue-500/50";
    if (s >= 50) return "text-amber-400 border-amber-500/50";
    return "text-red-400 border-red-500/50";
  };

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full border-2 font-bold ${sizeClasses[size]} ${getColor(score)} ${className}`}
      title={`Trust Score: ${score}/100`}
    >
      {score}
    </div>
  );
}

/**
 * AI-Proof methodology badge for product pages
 */
export function MethodologyBadge({ version = "2.0", className = "" }) {
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-500/10 via-amber-500/10 to-purple-500/10 border border-base-300 ${className}`}
    >
      {/* SAFE Logo */}
      <div className="flex items-center gap-0.5">
        <span className="text-green-400 font-bold text-sm">S</span>
        <span className="text-amber-400 font-bold text-sm">A</span>
        <span className="text-blue-400 font-bold text-sm">F</span>
        <span className="text-purple-400 font-bold text-sm">E</span>
      </div>
      <span className="text-xs text-base-content/70">v{version}</span>
      <span className="text-xs text-base-content/50">|</span>
      <span className="text-xs text-emerald-400">AI-Proof</span>
    </div>
  );
}

/**
 * Data provenance indicator
 */
export function DataProvenance({ lastUpdate, evaluationCount, className = "" }) {
  const formatDate = (date) => {
    if (!date) return "Unknown";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className={`flex items-center gap-4 text-xs text-base-content/60 ${className}`}>
      <div className="flex items-center gap-1">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Updated {formatDate(lastUpdate)}</span>
      </div>
      {evaluationCount > 1 && (
        <div className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{evaluationCount} evaluations</span>
        </div>
      )}
    </div>
  );
}

// Helper function
function isRecentUpdate(date) {
  if (!date) return false;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return new Date(date).getTime() > thirtyDaysAgo;
}
