"use client";

import { useState, useEffect } from "react";

/**
 * MoatStats - Display unique data statistics (competitive advantage)
 * Shows the GPT-Proof data that cannot be replicated
 */
export default function MoatStats({ compact = false }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats/moat")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setStats(data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const moatColors = {
    FORTRESS: "text-success",
    STRONG: "text-info",
    BUILDING: "text-warning",
    EMERGING: "text-primary",
    STARTING: "text-base-content/50",
  };

  if (compact) {
    return (
      <div className="stats stats-vertical lg:stats-horizontal shadow bg-base-200 w-full">
        <div className="stat">
          <div className="stat-title">Unique Data Points</div>
          <div className="stat-value text-primary">
            {stats.uniqueData.total.toLocaleString()}
          </div>
          <div className="stat-desc">Cannot be replicated</div>
        </div>
        <div className="stat">
          <div className="stat-title">Days Tracking</div>
          <div className="stat-value">{stats.tracking.daysOfData}</div>
          <div className="stat-desc">Competitor catch-up time</div>
        </div>
        <div className="stat">
          <div className="stat-title">Moat Strength</div>
          <div className={`stat-value ${moatColors[stats.moat.strength]}`}>
            {stats.moat.strength}
          </div>
          <div className="stat-desc">
            {stats.moat.dataPointsPerDay} pts/day
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <h2 className="card-title flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          Proprietary Data Moat
          <span
            className={`badge ${
              stats.moat.strength === "FORTRESS"
                ? "badge-success"
                : stats.moat.strength === "STRONG"
                ? "badge-info"
                : "badge-warning"
            }`}
          >
            {stats.moat.strength}
          </span>
        </h2>

        <p className="text-sm text-base-content/70 mb-4">{stats.messageFr}</p>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-base-300 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-primary">
              {stats.uniqueData.dailySnapshots.toLocaleString()}
            </div>
            <div className="text-xs text-base-content/50">Daily Snapshots</div>
          </div>
          <div className="bg-base-300 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-secondary">
              {stats.uniqueData.hourlySnapshots.toLocaleString()}
            </div>
            <div className="text-xs text-base-content/50">Hourly Snapshots</div>
          </div>
          <div className="bg-base-300 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-error">
              {stats.uniqueData.securityIncidents.toLocaleString()}
            </div>
            <div className="text-xs text-base-content/50">Security Incidents</div>
          </div>
          <div className="bg-base-300 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-success">
              {stats.uniqueData.productEvaluations.toLocaleString()}
            </div>
            <div className="text-xs text-base-content/50">Evaluations</div>
          </div>
          <div className="bg-base-300 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-info">
              {stats.uniqueData.predictions.toLocaleString()}
            </div>
            <div className="text-xs text-base-content/50">Predictions</div>
          </div>
          <div className="bg-base-300 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-warning">
              {stats.uniqueData.userCorrections.toLocaleString()}
            </div>
            <div className="text-xs text-base-content/50">Corrections</div>
          </div>
        </div>

        {/* Prediction Accuracy */}
        {stats.predictions.total > 0 && (
          <div className="alert bg-base-300 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <div>
              <h4 className="font-semibold">Prediction Accuracy</h4>
              <p className="text-sm">
                {stats.predictions.correct} of {stats.predictions.total}{" "}
                predictions were correct
                {stats.predictions.accuracyRate && (
                  <span className="badge badge-success ml-2">
                    {stats.predictions.accuracyRate}%
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Competitive Advantages */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.entries(stats.competitiveAdvantage).map(([key, value]) => (
            <div
              key={key}
              className={`flex items-center gap-2 p-2 rounded ${
                value ? "bg-success/10" : "bg-base-300"
              }`}
            >
              {value ? (
                <svg
                  className="w-4 h-4 text-success"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-base-content/30"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <span className="text-xs capitalize">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </span>
            </div>
          ))}
        </div>

        {/* Tracking Info */}
        <div className="mt-4 text-xs text-base-content/50 flex justify-between">
          <span>
            Tracking since:{" "}
            {stats.tracking.historyStartDate
              ? new Date(stats.tracking.historyStartDate).toLocaleDateString()
              : "N/A"}
          </span>
          <span>{stats.moat.competitorCatchUpTime} to replicate</span>
        </div>
      </div>
    </div>
  );
}
