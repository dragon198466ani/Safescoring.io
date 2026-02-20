"use client";

import { useState, useEffect, useMemo } from "react";
import { useApi } from "@/hooks/useApi";

/**
 * ThreeTrackScores - Display AI, Community, and Hybrid scores
 *
 * Shows 3 parallel score tracks:
 * 1. AI Score (purple) - Pure AI evaluations, immutable
 * 2. Community Score (green) - Community consensus results
 * 3. Hybrid Score (blue) - Weighted combination
 *
 * Features:
 * - Per-pillar breakdown (S, A, F, E)
 * - Overall scores
 * - Historical timeline view
 * - Confidence indicators
 */

const PILLARS = {
  S: { name: "Security", color: "#ef4444", icon: "shield" },
  A: { name: "Adversity", color: "#f59e0b", icon: "flame" },
  F: { name: "Fidelity", color: "#22c55e", icon: "clock" },
  E: { name: "Ecosystem", color: "#3b82f6", icon: "globe" },
};

const TRACK_COLORS = {
  ai: { main: "#8b5cf6", light: "#8b5cf620" },
  community: { main: "#22c55e", light: "#22c55e20" },
  hybrid: { main: "#3b82f6", light: "#3b82f620" },
};

const TIME_RANGES = [
  { id: "7d", label: "7D", days: 7 },
  { id: "30d", label: "1M", days: 30 },
  { id: "90d", label: "3M", days: 90 },
];

function ScoreBar({ value, maxValue = 100, color, label, confidence }) {
  const percentage = Math.min(100, (value / maxValue) * 100);

  return (
    <div className="flex items-center gap-3">
      <div className="w-20 text-xs text-base-content/60 font-medium">{label}</div>
      <div className="flex-1 h-3 bg-base-300 rounded-full overflow-hidden relative">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
            opacity: confidence ? 0.4 + confidence * 0.6 : 1,
          }}
        />
        {confidence !== undefined && confidence < 0.5 && (
          <div className="absolute inset-0 flex items-center justify-end pr-2">
            <span className="text-[10px] text-base-content/40">Low data</span>
          </div>
        )}
      </div>
      <div className="w-14 text-right font-bold" style={{ color }}>
        {value !== null && value !== undefined ? `${Math.round(value)}%` : "—"}
      </div>
    </div>
  );
}

function MiniTimelineChart({ data, colors, height = 80 }) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-base-content/40 text-sm"
        style={{ height }}
      >
        No history data yet
      </div>
    );
  }

  const allValues = data.flatMap((d) => [d.ai, d.community, d.hybrid].filter((v) => v !== null));
  const min = Math.min(...allValues, 0);
  const max = Math.max(...allValues, 100);
  const range = max - min || 1;

  const getPoints = (key) => {
    return data
      .map((d, i) => {
        if (d[key] === null || d[key] === undefined) return null;
        const x = (i / (data.length - 1 || 1)) * 100;
        const y = 100 - ((d[key] - min) / range) * 100;
        return `${x},${y}`;
      })
      .filter((p) => p !== null)
      .join(" ");
  };

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full" style={{ height }}>
      {/* AI line */}
      <polyline
        points={getPoints("ai")}
        fill="none"
        stroke={colors.ai.main}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        strokeDasharray="4,2"
      />
      {/* Community line */}
      <polyline
        points={getPoints("community")}
        fill="none"
        stroke={colors.community.main}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      {/* Hybrid line */}
      <polyline
        points={getPoints("hybrid")}
        fill="none"
        stroke={colors.hybrid.main}
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function PillarCard({ pillar, data, isExpanded, onToggle }) {
  const config = PILLARS[pillar];
  if (!config || !data) return null;

  const hasData = data.ai?.score !== null || data.community?.score !== null;

  return (
    <div className="bg-base-200 rounded-xl border border-base-300 overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-base-300/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: config.color }}
          >
            {pillar}
          </div>
          <div className="text-left">
            <div className="font-semibold">{config.name}</div>
            {hasData && (
              <div className="text-xs text-base-content/60">
                {data.community?.totalVotes || 0} community votes
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {hasData && (
            <div className="text-right">
              <div className="text-lg font-bold" style={{ color: TRACK_COLORS.hybrid.main }}>
                {data.hybrid?.score !== null ? `${Math.round(data.hybrid.score)}%` : "—"}
              </div>
              <div className="text-xs text-base-content/50">Hybrid</div>
            </div>
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-base-300 pt-4 space-y-3">
          <ScoreBar
            value={data.ai?.score}
            color={TRACK_COLORS.ai.main}
            label="AI"
            confidence={data.ai?.confidence}
          />
          <ScoreBar
            value={data.community?.score}
            color={TRACK_COLORS.community.main}
            label="Community"
            confidence={data.community?.confidence}
          />
          <ScoreBar
            value={data.hybrid?.score}
            color={TRACK_COLORS.hybrid.main}
            label="Hybrid"
          />

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 pt-2">
            <div className="text-center p-2 bg-base-300/50 rounded-lg">
              <div className="text-lg font-bold text-base-content/80">
                {data.ai?.evaluated || 0}
              </div>
              <div className="text-[10px] text-base-content/50">Evaluated</div>
            </div>
            <div className="text-center p-2 bg-base-300/50 rounded-lg">
              <div className="text-lg font-bold text-green-400">
                {data.community?.confirmed || 0}
              </div>
              <div className="text-[10px] text-base-content/50">Confirmed</div>
            </div>
            <div className="text-center p-2 bg-base-300/50 rounded-lg">
              <div className="text-lg font-bold text-red-400">
                {data.community?.challenged || 0}
              </div>
              <div className="text-[10px] text-base-content/50">Challenged</div>
            </div>
            <div className="text-center p-2 bg-base-300/50 rounded-lg">
              <div className="text-lg font-bold text-yellow-400">
                {data.community?.pending || 0}
              </div>
              <div className="text-[10px] text-base-content/50">Pending</div>
            </div>
          </div>

          {/* Weight display */}
          {data.hybrid?.aiWeight && (
            <div className="flex items-center gap-2 text-xs text-base-content/50 pt-2">
              <span>Weights:</span>
              <span className="px-2 py-0.5 rounded bg-base-300">
                AI {Math.round(data.hybrid.aiWeight * 100)}%
              </span>
              <span className="px-2 py-0.5 rounded bg-base-300">
                Community {Math.round(data.hybrid.communityWeight * 100)}%
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ThreeTrackScores({ productSlug, initialData = null }) {
  const [expandedPillars, setExpandedPillars] = useState(new Set(["S"]));
  const [showTimeline, setShowTimeline] = useState(false);
  const [timeRange, setTimeRange] = useState("30d");

  // Build API URL with dynamic params
  const apiUrl = useMemo(() => {
    if (!productSlug) return null;
    const range = TIME_RANGES.find((r) => r.id === timeRange);
    const params = new URLSearchParams({
      history: showTimeline ? "true" : "false",
      days: range?.days || 30,
    });
    return `/api/products/${productSlug}/scores-3track?${params}`;
  }, [productSlug, showTimeline, timeRange]);

  // Use useApi for 3-track scores with 2-minute cache
  const { data: fetchedData, isLoading, error } = useApi(apiUrl, {
    ttl: 2 * 60 * 1000,
  });

  // Use initialData if provided, otherwise use fetched data
  const data = fetchedData || initialData;
  const loading = !initialData && isLoading;
  const history = data?.history || [];

  const togglePillar = (pillar) => {
    setExpandedPillars((prev) => {
      const next = new Set(prev);
      if (next.has(pillar)) {
        next.delete(pillar);
      } else {
        next.add(pillar);
      }
      return next;
    });
  };

  // Calculate overall stats
  const overallStats = useMemo(() => {
    if (!data?.scores) return null;
    return {
      ai: data.scores.overall?.ai,
      community: data.scores.overall?.community,
      hybrid: data.scores.overall?.hybrid,
      totalEvaluations: data.scores.totals?.evaluations || 0,
      totalVotes: data.scores.totals?.communityVotes || 0,
      confirmed: data.scores.totals?.confirmed || 0,
      challenged: data.scores.totals?.challenged || 0,
    };
  }, [data]);

  if (!productSlug) return null;

  if (loading && !data) {
    return (
      <div className="rounded-xl bg-base-200 border border-base-300 p-8 flex items-center justify-center">
        <span className="loading loading-spinner loading-md text-primary"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-base-200 border border-base-300 p-8 text-center text-error">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Card - Overall Scores */}
      <div className="rounded-xl bg-gradient-to-br from-primary/10 via-base-200 to-secondary/10 border border-base-300 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-primary"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold">3-Track Scoring</h2>
              <p className="text-sm text-base-content/60">AI + Community + Hybrid</p>
            </div>
          </div>
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className={`btn btn-sm gap-2 ${showTimeline ? "btn-primary" : "btn-ghost"}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            Timeline
          </button>
        </div>

        {/* 3 Score Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* AI Score */}
          <div className="bg-base-200 rounded-xl p-4 border-2 border-transparent hover:border-purple-500/30 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TRACK_COLORS.ai.main }} />
              <span className="text-xs font-medium text-base-content/60">AI Score</span>
            </div>
            <div className="text-3xl font-bold" style={{ color: TRACK_COLORS.ai.main }}>
              {overallStats?.ai !== null && overallStats?.ai !== undefined
                ? `${Math.round(overallStats.ai)}%`
                : "—"}
            </div>
            <div className="text-xs text-base-content/40 mt-1">
              {overallStats?.totalEvaluations || 0} evaluations
            </div>
          </div>

          {/* Community Score */}
          <div className="bg-base-200 rounded-xl p-4 border-2 border-transparent hover:border-green-500/30 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TRACK_COLORS.community.main }} />
              <span className="text-xs font-medium text-base-content/60">Community</span>
            </div>
            <div className="text-3xl font-bold" style={{ color: TRACK_COLORS.community.main }}>
              {overallStats?.community !== null && overallStats?.community !== undefined
                ? `${Math.round(overallStats.community)}%`
                : "—"}
            </div>
            <div className="text-xs text-base-content/40 mt-1">
              {overallStats?.totalVotes || 0} votes
            </div>
          </div>

          {/* Hybrid Score */}
          <div className="bg-base-200 rounded-xl p-4 border-2 border-primary/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TRACK_COLORS.hybrid.main }} />
              <span className="text-xs font-medium text-base-content/60">Hybrid</span>
              <span className="badge badge-primary badge-xs">Final</span>
            </div>
            <div className="text-3xl font-bold" style={{ color: TRACK_COLORS.hybrid.main }}>
              {overallStats?.hybrid !== null && overallStats?.hybrid !== undefined
                ? `${Math.round(overallStats.hybrid)}%`
                : "—"}
            </div>
            <div className="text-xs text-base-content/40 mt-1">
              AI + Community weighted
            </div>
          </div>
        </div>

        {/* Consensus Stats */}
        {(overallStats?.confirmed > 0 || overallStats?.challenged > 0) && (
          <div className="flex items-center gap-4 p-3 bg-base-300/50 rounded-lg text-sm">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-green-400 font-medium">{overallStats.confirmed}</span>
              <span className="text-base-content/50">confirmed by community</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-red-400 font-medium">{overallStats.challenged}</span>
              <span className="text-base-content/50">challenged</span>
            </div>
          </div>
        )}
      </div>

      {/* Timeline View */}
      {showTimeline && (
        <div className="rounded-xl bg-base-200 border border-base-300 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Score Evolution</h3>
            <div className="flex gap-1">
              {TIME_RANGES.map((range) => (
                <button
                  key={range.id}
                  onClick={() => setTimeRange(range.id)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    timeRange === range.id
                      ? "bg-primary text-primary-content"
                      : "bg-base-300 text-base-content/60 hover:text-base-content"
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-4 mb-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 border-t-2 border-dashed" style={{ borderColor: TRACK_COLORS.ai.main }} />
              <span style={{ color: TRACK_COLORS.ai.main }}>AI</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5" style={{ backgroundColor: TRACK_COLORS.community.main }} />
              <span style={{ color: TRACK_COLORS.community.main }}>Community</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-1" style={{ backgroundColor: TRACK_COLORS.hybrid.main }} />
              <span style={{ color: TRACK_COLORS.hybrid.main }}>Hybrid</span>
            </div>
          </div>

          <MiniTimelineChart data={history} colors={TRACK_COLORS} height={120} />

          {history.length > 0 && (
            <div className="flex justify-between text-xs text-base-content/40 mt-2">
              <span>{new Date(history[0]?.timestamp).toLocaleDateString()}</span>
              <span>{new Date(history[history.length - 1]?.timestamp).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Per-Pillar Breakdown */}
      <div className="space-y-2">
        <h3 className="font-semibold text-base-content/80 px-1">Per Pillar</h3>
        {["S", "A", "F", "E"].map((pillar) => (
          <PillarCard
            key={pillar}
            pillar={pillar}
            data={data?.scores?.pillars?.[pillar]}
            isExpanded={expandedPillars.has(pillar)}
            onToggle={() => togglePillar(pillar)}
          />
        ))}
      </div>

      {/* Global Stats */}
      {data?.globalStats && (
        <div className="rounded-xl bg-base-200 border border-base-300 p-4">
          <h3 className="font-semibold mb-3 text-sm text-base-content/70">Platform Statistics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div>
              <div className="text-2xl font-bold text-base-content">
                {data.globalStats.totalEvaluations?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-base-content/50">Total Evaluations</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">
                {data.globalStats.communityConfirmed?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-base-content/50">Confirmed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">
                {data.globalStats.communityChallenged?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-base-content/50">Challenged</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">
                {data.globalStats.aiErrorRatePct || 0}%
              </div>
              <div className="text-xs text-base-content/50">AI Error Rate</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
