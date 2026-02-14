"use client";

import { useState, useEffect } from "react";

/**
 * ScoreSecurityPanel - Unified component combining Score Evolution and Security Status
 * Minimalist, coherent design with all English text
 */

const PERIODS = [
  { id: 'month', label: '1 Month', limit: 30 },
  { id: 'year', label: '1 Year', limit: 12 },
  { id: '5y', label: '5 Years', limit: 60 },
  { id: 'all', label: 'All', limit: 120 },
];

export default function ScoreSecurityPanel({ slug, productName: _productName }) {
  const [historyData, setHistoryData] = useState(null);
  const [securityData, setSecurityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('year');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const period = PERIODS.find(p => p.id === selectedPeriod);

        // Fetch both history and incidents in parallel
        const [historyRes, incidentsRes] = await Promise.all([
          fetch(`/api/products/${slug}/history?limit=${period?.limit || 12}`),
          fetch(`/api/products/${slug}/incidents?limit=5`)
        ]);

        if (historyRes.ok) {
          const history = await historyRes.json();
          setHistoryData(history);
        }

        if (incidentsRes.ok) {
          const incidents = await incidentsRes.json();
          const incidentsList = incidents.incidents || [];

          // Check for recent critical incidents
          const recentIncidents = incidentsList.filter(inc => {
            const incDate = new Date(inc.incident_date);
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            return incDate > threeMonthsAgo;
          });

          const hasActiveAlert = recentIncidents.some(inc =>
            inc.severity === 'critical' || inc.severity === 'high'
          );

          setSecurityData({
            hasAlert: hasActiveAlert,
            recentIncidents,
            lastCheck: new Date().toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),
            totalIncidents: incidents.stats?.total || 0,
            totalFundsLost: incidents.stats?.totalFundsLost || 0,
            criticalCount: incidents.stats?.bySeverity?.critical || 0,
            hasActiveIncidents: incidents.stats?.hasActiveIncidents || false,
          });
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      fetchData();
    }
  }, [slug, selectedPeriod]);

  if (loading) {
    return (
      <div className="animate-pulse bg-base-200 rounded-xl p-6">
        <div className="h-5 bg-base-300 rounded w-1/3 mb-6"></div>
        <div className="h-40 bg-base-300 rounded mb-6"></div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-base-300 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const { history = [], stats = {} } = historyData || {};
  const chartData = [...history].reverse();

  // Trend indicator
  const getTrendBadge = () => {
    if (!stats.trend) return null;
    const config = {
      improving: { icon: "↗", color: "text-green-400", label: "Improving" },
      declining: { icon: "↘", color: "text-red-400", label: "Declining" },
      stable: { icon: "→", color: "text-base-content/60", label: "Stable" }
    };
    const trend = config[stats.trend] || config.stable;
    return (
      <span className={`flex items-center gap-1 text-sm font-medium ${trend.color}`}>
        <span className="text-lg">{trend.icon}</span>
        {trend.label}
      </span>
    );
  };

  return (
    <div className="bg-base-200 rounded-xl overflow-hidden">
      {/* Header with Security Status */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-lg">Score & Security</h3>
            {getTrendBadge()}
          </div>

          {/* Security Status Badge */}
          {securityData && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
              securityData.hasAlert
                ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                : 'bg-green-500/15 text-green-400 border border-green-500/30'
            }`}>
              {securityData.hasAlert ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Alert Active
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Secure
                </>
              )}
            </div>
          )}
        </div>

        {/* Period Selector */}
        <div className="flex gap-2">
          {PERIODS.map((period) => (
            <button
              key={period.id}
              onClick={() => setSelectedPeriod(period.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedPeriod === period.id
                  ? 'bg-primary text-primary-content'
                  : 'bg-base-300 text-base-content/60 hover:text-base-content hover:bg-base-content/10'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Section */}
      {chartData.length > 0 ? (
        <div className="px-6 pb-4">
          <div className="relative h-36">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-base-content/40 w-8">
              <span>100%</span>
              <span>50%</span>
              <span>0%</span>
            </div>

            {/* Chart */}
            <div className="ml-10 h-full relative">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgb(139, 92, 246)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="rgb(139, 92, 246)" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* Area fill */}
                <path
                  d={`M 0 ${100 - (chartData[0]?.safe_score || 0)} ${chartData.map((record, index) => {
                    const x = chartData.length === 1 ? 50 : (index / (chartData.length - 1)) * 100;
                    const y = 100 - (record.safe_score || 0);
                    return `L ${x} ${y}`;
                  }).join(' ')} L ${chartData.length === 1 ? 50 : 100} 100 L 0 100 Z`}
                  fill="url(#scoreGradient)"
                />

                {/* Line */}
                <path
                  d={`M ${chartData.length === 1 ? 50 : 0} ${100 - (chartData[0]?.safe_score || 0)} ${chartData.map((record, index) => {
                    const x = chartData.length === 1 ? 50 : (index / (chartData.length - 1)) * 100;
                    const y = 100 - (record.safe_score || 0);
                    return `L ${x} ${y}`;
                  }).join(' ')}`}
                  fill="none"
                  stroke="rgb(139, 92, 246)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>

              {/* Data points */}
              <div className="absolute inset-0">
                {chartData.map((record, index) => {
                  const top = 100 - (record.safe_score || 0);
                  const left = chartData.length === 1 ? 50 : (index / (chartData.length - 1)) * 100;
                  return (
                    <div
                      key={record.id || index}
                      className="absolute group"
                      style={{ left: `${left}%`, top: `${top}%`, transform: 'translate(-50%, -50%)' }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full border-2 border-primary bg-base-200 group-hover:scale-150 group-hover:bg-primary transition-all"></div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                        <div className="bg-base-100 shadow-lg rounded-lg px-2 py-1 text-xs whitespace-nowrap border border-base-content/10">
                          <div className="font-semibold text-primary">{record.safe_score?.toFixed(1)}%</div>
                          <div className="text-base-content/50">
                            {new Date(record.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
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
            <span>{chartData[0]?.recorded_at ? new Date(chartData[0].recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
            <span>{chartData[chartData.length - 1]?.recorded_at ? new Date(chartData[chartData.length - 1].recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
          </div>
        </div>
      ) : (
        <div className="px-6 pb-4 text-center text-base-content/50 text-sm py-8">
          No historical data available yet
        </div>
      )}

      {/* Stats Grid - Combined Score & Security */}
      <div className="px-6 pb-6">
        <div className="grid grid-cols-4 gap-3">
          {/* Score Stats */}
          <div className="bg-base-100 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-primary">
              {stats.highestScore?.toFixed(1) || '—'}%
            </div>
            <div className="text-xs text-base-content/50">Highest</div>
          </div>
          <div className="bg-base-100 rounded-lg p-3 text-center">
            <div className="text-xl font-bold">
              {stats.averageScore || '—'}%
            </div>
            <div className="text-xs text-base-content/50">Average</div>
          </div>
          <div className="bg-base-100 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-red-400">
              {stats.lowestScore?.toFixed(1) || '—'}%
            </div>
            <div className="text-xs text-base-content/50">Lowest</div>
          </div>

          {/* Security Stats */}
          <div className="bg-base-100 rounded-lg p-3 text-center">
            <div className={`text-xl font-bold ${securityData?.totalIncidents > 0 ? 'text-amber-400' : 'text-green-400'}`}>
              {securityData?.totalIncidents || 0}
            </div>
            <div className="text-xs text-base-content/50">Incidents</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-base-100/50 border-t border-base-content/5 flex items-center justify-between text-xs text-base-content/40">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            24/7 Monitoring
          </span>
          <span>{stats.dataPoints || 0} records</span>
        </div>
        <span>Last check: {securityData?.lastCheck || '—'}</span>
      </div>
    </div>
  );
}
