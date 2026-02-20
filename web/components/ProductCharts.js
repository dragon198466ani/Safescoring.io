"use client";

import { useState, useEffect, useMemo } from "react";
import { useApi } from "@/hooks/useApi";

/**
 * ProductCharts - Data visualization component for product metrics
 * 
 * Displays:
 * - SAFE Score evolution over time
 * - TVL/Volume charts (for DeFi products)
 * - GitHub activity (for open-source products)
 * - Social mentions trend
 */

const CHART_TYPES = {
  safe_score: { label: "SAFE Score", color: "#8b5cf6", unit: "%" },
  tvl: { label: "TVL", color: "#22c55e", unit: "$", format: "currency" },
  volume_24h: { label: "24h Volume", color: "#3b82f6", unit: "$", format: "currency" },
  users_active: { label: "Active Users", color: "#f59e0b", unit: "", format: "number" },
  github_commits: { label: "GitHub Commits", color: "#6b7280", unit: "", format: "number" },
  github_stars: { label: "GitHub Stars", color: "#eab308", unit: "", format: "number" },
  social_mentions: { label: "Social Mentions", color: "#ec4899", unit: "", format: "number" },
};

const TIME_RANGES = [
  { id: "7d", label: "7D", days: 7 },
  { id: "30d", label: "1M", days: 30 },
  { id: "90d", label: "3M", days: 90 },
  { id: "1y", label: "1Y", days: 365 },
  { id: "all", label: "All", days: null },
];

function formatValue(value, format) {
  if (value === null || value === undefined) return "—";
  
  switch (format) {
    case "currency":
      if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
      if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
      if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
      return `$${value.toFixed(0)}`;
    case "number":
      if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
      if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
      return value.toFixed(0);
    default:
      return `${value.toFixed(1)}%`;
  }
}

function MiniChart({ data, color, height = 60, metricLabel = "data" }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-base-content/40 text-sm gap-2 p-4">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 opacity-50">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
        </svg>
        <span>No {metricLabel} history yet</span>
        <span className="text-xs text-base-content/30">Data will appear after score updates</span>
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * 100;
    const y = 100 - ((d.value - min) / range) * 100;
    return `${x},${y}`;
  }).join(" ");

  const areaPath = `M 0,100 L 0,${100 - ((data[0].value - min) / range) * 100} ${data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * 100;
    const y = 100 - ((d.value - min) / range) * 100;
    return `L ${x},${y}`;
  }).join(" ")} L 100,100 Z`;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
    >
      <defs>
        <linearGradient id={`gradient-${color.replace("#", "")}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path
        d={areaPath}
        fill={`url(#gradient-${color.replace("#", "")})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default function ProductCharts({
  productSlug,
  productId,
  defillamaSlug,
  coingeckoId,
  githubRepo,
  initialData = {},
}) {
  const [chartData, setChartData] = useState(initialData);
  const [selectedMetric, setSelectedMetric] = useState("safe_score");
  const [timeRange, setTimeRange] = useState("30d");
  const [expandedView, setExpandedView] = useState(false);

  // Determine available metrics based on product data
  const availableMetrics = useMemo(() => {
    const metrics = ["safe_score"];
    if (defillamaSlug) {
      metrics.push("tvl", "volume_24h");
    }
    if (githubRepo) {
      metrics.push("github_commits", "github_stars");
    }
    return metrics;
  }, [defillamaSlug, githubRepo]);

  // Build dynamic chart data URL
  const chartDataUrl = useMemo(() => {
    if (!productSlug) return null;
    const range = TIME_RANGES.find((r) => r.id === timeRange);
    const params = new URLSearchParams({
      metric: selectedMetric,
      days: range?.days || 365,
    });
    return `/api/products/${productSlug}/chart-data?${params}`;
  }, [productSlug, selectedMetric, timeRange]);

  // Use useApi hook for better caching and error handling
  const { data: chartResponse, isLoading: loading } = useApi(chartDataUrl, {
    ttl: 2 * 60 * 1000, // Cache for 2 minutes
  });

  // Update chartData when new data arrives
  useEffect(() => {
    if (chartResponse?.data) {
      setChartData((prev) => ({
        ...prev,
        [selectedMetric]: chartResponse.data || [],
      }));
    }
  }, [chartResponse, selectedMetric]);

  // Rule: Don't display if no product slug (can't fetch data)
  if (!productSlug) {
    return null;
  }

  const currentData = chartData[selectedMetric] || [];
  const metricConfig = CHART_TYPES[selectedMetric];

  // Calculate stats
  const stats = useMemo(() => {
    if (!currentData.length) return null;

    const values = currentData.map((d) => d.value);
    const current = values[values.length - 1];
    const previous = values[0];
    const change = previous ? ((current - previous) / previous) * 100 : 0;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    return { current, previous, change, max, min, avg };
  }, [currentData]);

  return (
    <div className="rounded-xl bg-base-200 border border-base-300 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-base-300">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Analytics</h2>
              <p className="text-sm text-base-content/60">Performance over time</p>
            </div>
          </div>
          <button
            onClick={() => setExpandedView(!expandedView)}
            className="btn btn-sm btn-ghost gap-1"
          >
            {expandedView ? "Collapse" : "Expand"}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 transition-transform ${expandedView ? "rotate-180" : ""}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        </div>

        {/* Metric Selector */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {availableMetrics.map((metric) => (
            <button
              key={metric}
              onClick={() => setSelectedMetric(metric)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                selectedMetric === metric
                  ? "bg-primary text-primary-content"
                  : "bg-base-300 text-base-content/60 hover:text-base-content"
              }`}
            >
              {CHART_TYPES[metric]?.label || metric}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Area */}
      <div className="p-5">
        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="bg-base-300/50 rounded-lg p-3">
              <div className="text-xs text-base-content/50 mb-1">Current</div>
              <div className="text-lg font-bold" style={{ color: metricConfig?.color }}>
                {formatValue(stats.current, metricConfig?.format)}
              </div>
            </div>
            <div className="bg-base-300/50 rounded-lg p-3">
              <div className="text-xs text-base-content/50 mb-1">Change</div>
              <div className={`text-lg font-bold ${stats.change >= 0 ? "text-green-400" : "text-red-400"}`}>
                {stats.change >= 0 ? "+" : ""}{stats.change.toFixed(1)}%
              </div>
            </div>
            <div className="bg-base-300/50 rounded-lg p-3">
              <div className="text-xs text-base-content/50 mb-1">High</div>
              <div className="text-lg font-bold text-base-content/80">
                {formatValue(stats.max, metricConfig?.format)}
              </div>
            </div>
            <div className="bg-base-300/50 rounded-lg p-3">
              <div className="text-xs text-base-content/50 mb-1">Low</div>
              <div className="text-lg font-bold text-base-content/80">
                {formatValue(stats.min, metricConfig?.format)}
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className={`relative ${expandedView ? "h-64" : "h-32"} transition-all`}>
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="loading loading-spinner loading-md text-primary"></span>
            </div>
          ) : (
            <MiniChart
              data={currentData}
              color={metricConfig?.color || "#8b5cf6"}
              height={expandedView ? 256 : 128}
              metricLabel={metricConfig?.label || "score"}
            />
          )}
        </div>

        {/* Time Range Selector */}
        <div className="flex justify-center gap-2 mt-4">
          {TIME_RANGES.map((range) => (
            <button
              key={range.id}
              onClick={() => setTimeRange(range.id)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                timeRange === range.id
                  ? "bg-base-content/20 text-base-content"
                  : "text-base-content/50 hover:text-base-content"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Expanded View - Additional Charts */}
      {expandedView && availableMetrics.length > 1 && (
        <div className="px-5 pb-5 border-t border-base-300 pt-4">
          <h3 className="text-sm font-medium text-base-content/70 mb-3">Other Metrics</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {availableMetrics
              .filter((m) => m !== selectedMetric)
              .map((metric) => {
                const config = CHART_TYPES[metric];
                const data = chartData[metric] || [];
                const lastValue = data[data.length - 1]?.value;

                return (
                  <button
                    key={metric}
                    onClick={() => setSelectedMetric(metric)}
                    className="bg-base-300/50 rounded-lg p-3 text-left hover:bg-base-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-base-content/50">{config?.label}</span>
                      <span className="text-sm font-bold" style={{ color: config?.color }}>
                        {lastValue !== undefined ? formatValue(lastValue, config?.format) : "—"}
                      </span>
                    </div>
                    <div className="h-8">
                      <MiniChart data={data} color={config?.color || "#666"} height={32} />
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 bg-base-300/50 border-t border-base-300 flex items-center justify-between text-xs text-base-content/50">
        <span>
          {currentData.length > 0 && (
            <>
              {currentData.length} data points •{" "}
              {new Date(currentData[0]?.recorded_at).toLocaleDateString()} -{" "}
              {new Date(currentData[currentData.length - 1]?.recorded_at).toLocaleDateString()}
            </>
          )}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          Live data
        </span>
      </div>
    </div>
  );
}
