"use client";

/**
 * SAFEAnalytics - Shared Analytics Component for All Layers
 *
 * Provides consistent analytics display across:
 * - Layer 1 (Product): Individual product metrics
 * - Layer 2 (Dashboard): Portfolio-wide metrics
 * - Layer 3 (Setup): Multi-product setup metrics
 *
 * Features:
 * - Mini sparkline charts
 * - Trend indicators (real-time)
 * - Comparison metrics (vs avg, vs category)
 * - Risk score visualization
 *
 * Real-time updates via Supabase subscriptions
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/libs/supabase";
import { getScoreColor, getScoreHexColor } from "@/libs/design-tokens";

// Mini Sparkline Chart Component
function Sparkline({ data = [], color = "#22c55e", height = 32, width = 80 }) {
  if (data.length < 2) {
    return (
      <div
        style={{ width, height }}
        className="flex items-center justify-center text-xs text-base-content/30"
      >
        No data
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  const lastPoint = data[data.length - 1];
  const prevPoint = data[data.length - 2];
  const trend = lastPoint - prevPoint;

  return (
    <div className="relative" style={{ width, height }}>
      <svg width={width} height={height} className="overflow-visible">
        {/* Gradient fill */}
        <defs>
          <linearGradient id={`sparkline-gradient-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Area fill */}
        <polygon
          points={`0,${height} ${points} ${width},${height}`}
          fill={`url(#sparkline-gradient-${color.replace("#", "")})`}
        />
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Current point */}
        <circle
          cx={width}
          cy={height - ((lastPoint - min) / range) * (height - 4) - 2}
          r="3"
          fill={color}
          className="animate-pulse"
        />
      </svg>
    </div>
  );
}

// Metric Card Component
function MetricCard({ label, value, unit = "", trend = null, sparkData = [], color, size = "md" }) {
  const trendColor = trend > 0 ? "text-green-400" : trend < 0 ? "text-red-400" : "text-base-content/50";
  const trendIcon = trend > 0 ? "↑" : trend < 0 ? "↓" : "→";

  return (
    <div className={`flex flex-col ${size === "sm" ? "gap-0.5" : "gap-1"}`}>
      <div className="text-[10px] text-base-content/50 uppercase tracking-wider">{label}</div>
      <div className="flex items-end gap-2">
        <span className={`font-bold ${size === "sm" ? "text-lg" : "text-2xl"} ${color || getScoreColor(value)}`}>
          {typeof value === "number" ? value.toFixed(0) : value}
          {unit && <span className="text-xs font-normal text-base-content/50">{unit}</span>}
        </span>
        {trend !== null && (
          <span className={`text-xs ${trendColor} flex items-center gap-0.5`}>
            {trendIcon}
            {Math.abs(trend).toFixed(1)}
          </span>
        )}
      </div>
      {sparkData.length > 0 && (
        <Sparkline data={sparkData} color={getScoreHexColor(value)} height={24} width={60} />
      )}
    </div>
  );
}

// Ring Progress Component
function RingProgress({ value, maxValue = 100, size = 48, strokeWidth = 4, color, label }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(value / maxValue, 1);
  const offset = circumference - progress * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="-rotate-90" width={size} height={size}>
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
            stroke={color || getScoreHexColor(value)}
            className="fill-none transition-all duration-500"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xs font-bold ${getScoreColor(value)}`}>{Math.round(value)}</span>
        </div>
      </div>
      {label && <span className="text-[10px] text-base-content/50">{label}</span>}
    </div>
  );
}

// ============================================================================
// LAYER 1: Product Analytics
// ============================================================================

export function ProductAnalytics({ productId, productSlug, currentScore, isConnected }) {
  const [history, setHistory] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch historical data
  useEffect(() => {
    if (!productId) return;

    const fetchData = async () => {
      try {
        // Fetch score history (last 30 days)
        const { data: historyData } = await supabase
          .from("safe_scoring_results")
          .select("note_finale, calculated_at")
          .eq("product_id", productId)
          .order("calculated_at", { ascending: true })
          .limit(30);

        if (historyData) {
          setHistory(historyData.map(h => h.note_finale));
        }

        // Fetch comparison data (category average)
        const { data: product } = await supabase
          .from("products")
          .select("product_type_id")
          .eq("id", productId)
          .single();

        if (product?.product_type_id) {
          const { data: categoryAvg } = await supabase
            .from("safe_scoring_results")
            .select("note_finale, products!inner(product_type_id)")
            .eq("products.product_type_id", product.product_type_id);

          if (categoryAvg) {
            const avg = categoryAvg.reduce((sum, r) => sum + r.note_finale, 0) / categoryAvg.length;
            setComparison({
              categoryAvg: Math.round(avg),
              diff: currentScore - Math.round(avg),
            });
          }
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [productId, currentScore]);

  // Real-time subscription for score updates
  useEffect(() => {
    if (!productId) return;

    const channel = supabase
      .channel(`product-analytics-${productId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "safe_scoring_results",
          filter: `product_id=eq.${productId}`,
        },
        (payload) => {
          setHistory((prev) => [...prev.slice(-29), payload.new.note_finale]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [productId]);

  // Calculate metrics
  const metrics = useMemo(() => {
    if (history.length < 2) return null;

    const trend = history[history.length - 1] - history[history.length - 2];
    const weekTrend = history.length >= 7
      ? history[history.length - 1] - history[history.length - 7]
      : null;
    const monthTrend = history.length >= 30
      ? history[history.length - 1] - history[0]
      : null;
    const volatility = history.length > 1
      ? Math.sqrt(history.reduce((sum, v, i, arr) => {
          if (i === 0) return 0;
          return sum + Math.pow(v - arr[i - 1], 2);
        }, 0) / (history.length - 1))
      : 0;

    return { trend, weekTrend, monthTrend, volatility };
  }, [history]);

  if (loading) {
    return (
      <div className="animate-pulse h-24 bg-base-300/50 rounded-lg" />
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-base-300/30 rounded-lg">
      {/* Current Score with Trend */}
      <MetricCard
        label="Score"
        value={currentScore}
        trend={metrics?.trend}
        sparkData={history}
      />

      {/* vs Category Average */}
      <MetricCard
        label="vs Category"
        value={comparison?.diff || 0}
        unit=" pts"
        color={comparison?.diff >= 0 ? "text-green-400" : "text-red-400"}
      />

      {/* 7-Day Trend */}
      <MetricCard
        label="7-Day"
        value={metrics?.weekTrend || 0}
        unit=" pts"
        color={metrics?.weekTrend >= 0 ? "text-green-400" : "text-red-400"}
      />

      {/* Stability */}
      <MetricCard
        label="Stability"
        value={Math.max(0, 100 - (metrics?.volatility || 0) * 10)}
        unit="%"
      />

      {/* Real-time indicator */}
      {isConnected && (
        <div className="col-span-full flex items-center gap-2 text-xs text-base-content/50">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Live analytics
        </div>
      )}
    </div>
  );
}

// ============================================================================
// LAYER 2: Dashboard/Portfolio Analytics
// ============================================================================

export function DashboardAnalytics({ setups = [], isConnected }) {
  const [portfolioHistory, setPortfolioHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Calculate current portfolio metrics
  const portfolioMetrics = useMemo(() => {
    if (setups.length === 0) return null;

    const scores = setups.map(s => s.combinedScore?.note_finale || 0).filter(s => s > 0);
    if (scores.length === 0) return null;

    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const riskScore = Math.round((100 - minScore) * 0.7 + (maxScore - minScore) * 0.3);

    // Pillar breakdown across all setups
    const pillarTotals = { S: 0, A: 0, F: 0, E: 0 };
    let pillarCount = 0;
    setups.forEach(s => {
      if (s.combinedScore) {
        pillarTotals.S += s.combinedScore.score_s || 0;
        pillarTotals.A += s.combinedScore.score_a || 0;
        pillarTotals.F += s.combinedScore.score_f || 0;
        pillarTotals.E += s.combinedScore.score_e || 0;
        pillarCount++;
      }
    });

    const pillarAvgs = pillarCount > 0 ? {
      S: Math.round(pillarTotals.S / pillarCount),
      A: Math.round(pillarTotals.A / pillarCount),
      F: Math.round(pillarTotals.F / pillarCount),
      E: Math.round(pillarTotals.E / pillarCount),
    } : null;

    const weakestPillar = pillarAvgs
      ? Object.entries(pillarAvgs).sort(([,a], [,b]) => a - b)[0]
      : null;

    return {
      avgScore: Math.round(avgScore),
      minScore,
      maxScore,
      riskScore,
      pillarAvgs,
      weakestPillar,
      setupCount: setups.length,
      productCount: setups.reduce((sum, s) => sum + (s.productDetails?.length || 0), 0),
    };
  }, [setups]);

  // Simulate portfolio history (would come from API in production)
  useEffect(() => {
    if (portfolioMetrics) {
      // Generate mock history based on current score
      const mockHistory = Array(14).fill(0).map((_, i) => {
        const variance = Math.sin(i * 0.5) * 5 + Math.random() * 3;
        return Math.max(0, Math.min(100, portfolioMetrics.avgScore + variance - 7 + (i / 14) * 7));
      });
      setPortfolioHistory(mockHistory);
      setLoading(false);
    }
  }, [portfolioMetrics]);

  if (loading || !portfolioMetrics) {
    return (
      <div className="animate-pulse h-32 bg-base-300/50 rounded-lg" />
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 p-4 bg-base-300/30 rounded-lg">
        {/* Portfolio Score */}
        <div className="col-span-2 sm:col-span-1">
          <MetricCard
            label="Portfolio Score"
            value={portfolioMetrics.avgScore}
            sparkData={portfolioHistory}
          />
        </div>

        {/* Risk Level */}
        <div>
          <MetricCard
            label="Risk Level"
            value={portfolioMetrics.riskScore}
            unit="%"
            color={portfolioMetrics.riskScore < 30 ? "text-green-400" : portfolioMetrics.riskScore < 60 ? "text-amber-400" : "text-red-400"}
          />
        </div>

        {/* Score Range */}
        <div>
          <div className="text-[10px] text-base-content/50 uppercase tracking-wider mb-1">Range</div>
          <div className="flex items-center gap-1">
            <span className={`text-sm font-bold ${getScoreColor(portfolioMetrics.minScore)}`}>
              {portfolioMetrics.minScore}
            </span>
            <span className="text-xs text-base-content/30">→</span>
            <span className={`text-sm font-bold ${getScoreColor(portfolioMetrics.maxScore)}`}>
              {portfolioMetrics.maxScore}
            </span>
          </div>
        </div>

        {/* Weakest Pillar */}
        {portfolioMetrics.weakestPillar && (
          <div>
            <div className="text-[10px] text-base-content/50 uppercase tracking-wider mb-1">Focus</div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-amber-400">
                {portfolioMetrics.weakestPillar[0]}
              </span>
              <span className="text-xs text-base-content/50">
                {portfolioMetrics.weakestPillar[1]}%
              </span>
            </div>
          </div>
        )}

        {/* Setups Count */}
        <div>
          <MetricCard
            label="Setups"
            value={portfolioMetrics.setupCount}
            color="text-primary"
          />
        </div>

        {/* Products Count */}
        <div>
          <MetricCard
            label="Products"
            value={portfolioMetrics.productCount}
            color="text-primary"
          />
        </div>
      </div>

      {/* Pillar Distribution */}
      {portfolioMetrics.pillarAvgs && (
        <div className="flex items-center justify-around p-2 sm:p-3 bg-base-300/20 rounded-lg overflow-x-auto">
          {Object.entries(portfolioMetrics.pillarAvgs).map(([code, score]) => (
            <RingProgress
              key={code}
              value={score}
              size={36}
              strokeWidth={3}
              label={code}
            />
          ))}
          {isConnected && (
            <div className="flex flex-col items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-[10px] text-base-content/50">Live</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// LAYER 3: Setup Analytics
// ============================================================================

export function SetupAnalytics({ setupId, products = [], combinedScore, compatibility = [], isConnected }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch setup history
  useEffect(() => {
    if (!setupId) return;

    const fetchHistory = async () => {
      try {
        const { data } = await supabase
          .from("setup_history")
          .select("score, created_at")
          .eq("setup_id", setupId)
          .order("created_at", { ascending: true })
          .limit(30);

        if (data) {
          setHistory(data.map(h => h.score));
        }
      } catch (error) {
        console.error("Failed to fetch setup history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [setupId]);

  // Real-time subscription
  useEffect(() => {
    if (!setupId) return;

    const channel = supabase
      .channel(`setup-analytics-${setupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "setup_history",
          filter: `setup_id=eq.${setupId}`,
        },
        (payload) => {
          setHistory((prev) => [...prev.slice(-29), payload.new.score]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [setupId]);

  // Calculate setup metrics
  const metrics = useMemo(() => {
    if (products.length === 0) return null;

    const scores = products.map(p => p.scores?.total || p.scores?.note_finale || 0);
    const avgProductScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const minProductScore = Math.min(...scores);
    const maxProductScore = Math.max(...scores);

    // Compatibility score
    const compatScore = compatibility.length > 0
      ? Math.round(compatibility.reduce((sum, c) => sum + (c.score || 0), 0) / compatibility.length)
      : null;

    // Find weakest link
    const weakestProduct = products.reduce((weakest, p) => {
      const score = p.scores?.total || p.scores?.note_finale || 0;
      const weakestScore = weakest?.scores?.total || weakest?.scores?.note_finale || Infinity;
      return score < weakestScore ? p : weakest;
    }, null);

    // Diversity score (how different are the product types)
    const types = new Set(products.map(p => p.product_type_id || p.type));
    const diversityScore = Math.min(100, (types.size / products.length) * 100);

    // Trend
    const trend = history.length >= 2
      ? history[history.length - 1] - history[history.length - 2]
      : null;

    return {
      avgProductScore,
      minProductScore,
      maxProductScore,
      compatScore,
      weakestProduct,
      diversityScore: Math.round(diversityScore),
      trend,
    };
  }, [products, compatibility, history]);

  // Pillar breakdown
  const pillarBreakdown = useMemo(() => {
    if (!combinedScore) return null;

    return {
      S: combinedScore.score_s || 0,
      A: combinedScore.score_a || 0,
      F: combinedScore.score_f || 0,
      E: combinedScore.score_e || 0,
    };
  }, [combinedScore]);

  if (loading) {
    return (
      <div className="animate-pulse h-32 bg-base-300/50 rounded-lg" />
    );
  }

  const totalScore = combinedScore?.note_finale || 0;

  return (
    <div className="space-y-4">
      {/* Main Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-base-300/30 rounded-lg">
        {/* Setup Score */}
        <MetricCard
          label="Setup Score"
          value={totalScore}
          trend={metrics?.trend}
          sparkData={history}
        />

        {/* Compatibility */}
        {metrics?.compatScore !== null && (
          <MetricCard
            label="Compatibility"
            value={metrics.compatScore}
            unit="%"
          />
        )}

        {/* Product Range */}
        <div>
          <div className="text-[10px] text-base-content/50 uppercase tracking-wider mb-1">Product Scores</div>
          <div className="flex items-center gap-1">
            <span className={`text-sm font-bold ${getScoreColor(metrics?.minProductScore || 0)}`}>
              {metrics?.minProductScore || 0}
            </span>
            <span className="text-xs text-base-content/30">→</span>
            <span className={`text-sm font-bold ${getScoreColor(metrics?.maxProductScore || 0)}`}>
              {metrics?.maxProductScore || 0}
            </span>
          </div>
        </div>

        {/* Diversity */}
        <MetricCard
          label="Diversity"
          value={metrics?.diversityScore || 0}
          unit="%"
        />
      </div>

      {/* Pillar Rings + Weakest Link */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-2 sm:p-3 bg-base-300/20 rounded-lg">
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {pillarBreakdown && Object.entries(pillarBreakdown).map(([code, score]) => (
            <RingProgress
              key={code}
              value={score}
              size={40}
              strokeWidth={3}
              label={code}
            />
          ))}
        </div>

        {/* Weakest Link Warning */}
        {metrics?.weakestProduct && metrics.minProductScore < 70 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-red-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <span className="text-xs text-red-400 font-medium truncate max-w-[100px]">
              {metrics.weakestProduct.name}
            </span>
            <span className="text-xs text-red-400">
              {metrics.minProductScore}%
            </span>
          </div>
        )}

        {/* Live indicator */}
        {isConnected && (
          <div className="flex flex-col items-center gap-0.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-[9px] text-base-content/50">Live</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Setup-to-Setup Compatibility
export function SetupCompatibilityMatrix({ setups = [], isConnected }) {
  const matrix = useMemo(() => {
    if (setups.length < 2) return null;
    const pairs = [];
    for (let i = 0; i < setups.length; i++) {
      for (let j = i + 1; j < setups.length; j++) {
        const ids1 = new Set((setups[i].productDetails||[]).map(p=>p.id));
        const ids2 = new Set((setups[j].productDetails||[]).map(p=>p.id));
        const shared = [...ids1].filter(id=>ids2.has(id)).length;
        const p1 = {S:setups[i].combinedScore?.score_s||0,A:setups[i].combinedScore?.score_a||0,F:setups[i].combinedScore?.score_f||0,E:setups[i].combinedScore?.score_e||0};
        const p2 = {S:setups[j].combinedScore?.score_s||0,A:setups[j].combinedScore?.score_a||0,F:setups[j].combinedScore?.score_f||0,E:setups[j].combinedScore?.score_e||0};
        let syn = 0; ['S','A','F','E'].forEach(k=>{if((p1[k]<70&&p2[k]>=80)||(p2[k]<70&&p1[k]>=80))syn+=10;});
        pairs.push({s1:setups[i].name,s2:setups[j].name,score:Math.min(100,Math.max(0,70-shared*15+syn)),shared,syn:syn>0});
      }
    }
    return pairs;
  }, [setups]);

  if (setups.length<2) return <div className="p-3 bg-base-300/30 rounded text-xs text-base-content/50 text-center">2+ setups needed</div>;
  if (!matrix) return null;
  const color = s => s>=80?"text-green-400":s>=60?"text-amber-400":"text-red-400";
  const bg = s => s>=80?"bg-green-500/10 border-green-500/30":s>=60?"bg-amber-500/10 border-amber-500/30":"bg-red-500/10 border-red-500/30";

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm font-semibold">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-primary"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/></svg>
        <span className="hidden sm:inline">Setup Compatibility</span>
        <span className="sm:hidden">Compatibility</span>
        {isConnected && <span className="ml-auto relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-75"/><span className="relative rounded-full h-2 w-2 bg-green-500"/></span>}
      </div>
      {/* Compatibility pairs - responsive */}
      <div className="space-y-2">
        {matrix.map((p,i)=>(
          <div key={i} className={`p-2 sm:p-3 rounded-lg border ${bg(p.score)} flex flex-col sm:flex-row sm:items-center justify-between gap-2`}>
            {/* Setup names */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-medium text-xs sm:text-sm truncate max-w-[80px] sm:max-w-[100px]">{p.s1}</span>
              <span className="text-base-content/30 text-xs">↔</span>
              <span className="font-medium text-xs sm:text-sm truncate max-w-[80px] sm:max-w-[100px]">{p.s2}</span>
            </div>
            {/* Score + badges */}
            <div className="flex items-center gap-2 justify-end">
              {p.shared>0&&<span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[10px]">{p.shared}×</span>}
              {p.syn&&<span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-[10px]">✓</span>}
              <span className={`text-sm sm:text-base font-bold ${color(p.score)}`}>{p.score}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Export all components
export { Sparkline, MetricCard, RingProgress };
