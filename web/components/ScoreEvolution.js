"use client";

import { useState, useEffect } from "react";

/**
 * ScoreEvolution - Displays score history evolution for a product
 * This is a key "MOAT" feature - showing unique historical data
 */
export default function ScoreEvolution({ slug, showChart = true }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const response = await fetch(`/api/products/${slug}/history?limit=12`);
        if (!response.ok) throw new Error("Failed to fetch history");
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      fetchHistory();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="animate-pulse bg-base-200 rounded-lg p-6 h-64">
        <div className="h-4 bg-base-300 rounded w-1/3 mb-4"></div>
        <div className="h-40 bg-base-300 rounded"></div>
      </div>
    );
  }

  if (error || !data?.history?.length) {
    return (
      <div className="bg-base-200 rounded-lg p-6 text-center">
        <p className="text-base-content/60">
          No historical data available yet.
        </p>
        <p className="text-sm text-base-content/40 mt-2">
          Score history will be tracked over time.
        </p>
      </div>
    );
  }

  const { history, stats } = data;

  // Prepare chart data (reverse to show oldest first)
  const chartData = [...history].reverse();

  // Get trend indicator
  const getTrendIcon = () => {
    switch (stats.trend) {
      case "improving":
        return (
          <span className="text-success flex items-center gap-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
              />
            </svg>
            Improving
          </span>
        );
      case "declining":
        return (
          <span className="text-error flex items-center gap-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z"
              />
            </svg>
            Declining
          </span>
        );
      default:
        return (
          <span className="text-base-content/60 flex items-center gap-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z"
              />
            </svg>
            Stable
          </span>
        );
    }
  };

  // Filter out records with null scores for chart rendering
  const validChartData = chartData.filter((d) => d.safe_score !== null && d.safe_score !== undefined);
  const _maxScore = Math.max(...validChartData.map((d) => d.safe_score), 100);

  return (
    <div className="bg-base-200 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg">Score Evolution</h3>
        <div className="flex items-center gap-4">
          {getTrendIcon()}
          <span className="badge badge-ghost">{stats.dataPoints} records</span>
        </div>
      </div>

      {showChart && (
        <div className="mb-6">
          {/* Line chart with area */}
          <div className="relative h-40">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-base-content/40 pr-2">
              <span>100%</span>
              <span>50%</span>
              <span>0%</span>
            </div>

            {/* Chart area */}
            <div className="ml-10 h-full relative">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                <div className="border-t border-base-content/10 w-full"></div>
                <div className="border-t border-base-content/10 w-full"></div>
                <div className="border-t border-base-content/10 w-full"></div>
              </div>

              {/* SVG Line Chart */}
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                {/* Gradient for area fill */}
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgb(139, 92, 246)" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="rgb(139, 92, 246)" stopOpacity="0.05" />
                  </linearGradient>
                </defs>

                {/* Area fill */}
                <path
                  d={`M 0 ${100 - (validChartData[0]?.safe_score ?? 0)} ${validChartData.map((record, index) => {
                    const x = validChartData.length === 1 ? 50 : (index / (validChartData.length - 1)) * 100;
                    const y = 100 - (record.safe_score ?? 0);
                    return `L ${x} ${y}`;
                  }).join(' ')} L ${validChartData.length === 1 ? 50 : 100} 100 L 0 100 Z`}
                  fill="url(#scoreGradient)"
                />

                {/* Line */}
                <path
                  d={`M ${validChartData.length === 1 ? 50 : 0} ${100 - (validChartData[0]?.safe_score ?? 0)} ${validChartData.map((record, index) => {
                    const x = validChartData.length === 1 ? 50 : (index / (validChartData.length - 1)) * 100;
                    const y = 100 - (record.safe_score ?? 0);
                    return `L ${x} ${y}`;
                  }).join(' ')}`}
                  fill="none"
                  stroke="rgb(139, 92, 246)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>

              {/* Data points with tooltips */}
              <div className="absolute inset-0 flex justify-between items-start">
                {validChartData.map((record, index) => {
                  const top = 100 - (record.safe_score ?? 0);
                  const left = validChartData.length === 1 ? 50 : (index / (validChartData.length - 1)) * 100;

                  return (
                    <div
                      key={record.id || index}
                      className="absolute group"
                      style={{
                        left: `${left}%`,
                        top: `${top}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
                      {/* Point */}
                      <div className={`w-3 h-3 rounded-full border-2 border-primary bg-base-200 transition-all group-hover:scale-150 group-hover:bg-primary`}></div>

                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                        <div className="bg-base-100 shadow-lg rounded-lg p-2 text-xs whitespace-nowrap border border-base-content/10">
                          <div className="font-semibold text-primary">
                            {record.safe_score?.toFixed(1)}%
                          </div>
                          <div className="text-base-content/60">
                            {new Date(record.recorded_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                          </div>
                          {record.score_change && (
                            <div
                              className={
                                record.score_change > 0
                                  ? "text-success"
                                  : "text-error"
                              }
                            >
                              {record.score_change > 0 ? "+" : ""}
                              {record.score_change.toFixed(1)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* X-axis labels */}
          <div className="flex justify-between text-xs text-base-content/40 mt-2 ml-10">
            <span>
              {chartData[0]?.recorded_at
                ? new Date(chartData[0].recorded_at).toLocaleDateString(
                    "en-US",
                    { day: "numeric", month: "short" }
                  )
                : ""}
            </span>
            <span>
              {chartData[chartData.length - 1]?.recorded_at
                ? new Date(
                    chartData[chartData.length - 1].recorded_at
                  ).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                  })
                : ""}
            </span>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-base-100 rounded-lg p-3">
          <div className="text-xl font-bold text-primary">
            {stats.highestScore?.toFixed(1)}%
          </div>
          <div className="text-xs text-base-content/60">Highest</div>
        </div>
        <div className="bg-base-100 rounded-lg p-3">
          <div className="text-xl font-bold">{stats.averageScore}%</div>
          <div className="text-xs text-base-content/60">Average</div>
        </div>
        <div className="bg-base-100 rounded-lg p-3">
          <div className="text-xl font-bold text-error">
            {stats.lowestScore?.toFixed(1)}%
          </div>
          <div className="text-xs text-base-content/60">Lowest</div>
        </div>
      </div>

      {/* Unique data badge */}
      <div className="mt-4 text-center">
        <span className="badge badge-outline badge-sm">
          Unique historical data - Cannot be replicated
        </span>
      </div>
    </div>
  );
}
