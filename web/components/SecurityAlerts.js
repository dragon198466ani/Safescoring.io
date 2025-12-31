"use client";

import { useState, useEffect } from "react";

/**
 * SecurityAlerts - Displays real-time security alerts and status for a product
 * Inspired by GetMyKey's security news section
 */
export default function SecurityAlerts({ slug, productName }) {
  const [alertData, setAlertData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        // Fetch incidents to determine if there are recent alerts
        const response = await fetch(`/api/products/${slug}/incidents?limit=5`);
        if (!response.ok) throw new Error("Failed to fetch alerts");
        const data = await response.json();

        // Process incidents to determine alert status
        const incidents = data.incidents || [];
        const recentIncidents = incidents.filter(inc => {
          const incDate = new Date(inc.incident_date);
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
          return incDate > threeMonthsAgo;
        });

        const hasActiveAlert = recentIncidents.some(inc =>
          inc.severity === 'critical' || inc.severity === 'high'
        );

        setAlertData({
          hasAlert: hasActiveAlert,
          recentIncidents,
          lastCheck: new Date().toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          totalIncidents: data.stats?.total || 0,
        });
      } catch (err) {
        // Fallback to no alerts on error
        setAlertData({
          hasAlert: false,
          recentIncidents: [],
          lastCheck: new Date().toLocaleDateString('en-US'),
          totalIncidents: 0,
        });
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      fetchAlerts();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="bg-base-200 rounded-lg p-6 animate-pulse">
        <div className="h-5 bg-base-300 rounded w-1/3 mb-4"></div>
        <div className="h-20 bg-base-300 rounded"></div>
      </div>
    );
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/30';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
      case 'medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
      case 'low': return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
      default: return 'text-base-content/60 bg-base-300 border-base-content/20';
    }
  };

  return (
    <div className="bg-base-200 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
        </svg>
        <h3 className="font-semibold text-lg">Security Status</h3>
      </div>

      {/* Main status card */}
      {alertData.hasAlert ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold text-red-400">Active Alert</span>
          </div>
          <p className="text-sm text-red-300">
            {alertData.recentIncidents[0]?.title || 'Recent security incident detected'}
          </p>
          <p className="text-xs text-red-400/70 mt-2">
            {alertData.recentIncidents[0]?.incident_date
              ? new Date(alertData.recentIncidents[0].incident_date).toLocaleDateString('en-US')
              : 'Unknown date'
            }
          </p>
        </div>
      ) : (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold text-green-400">No Alerts</span>
          </div>
          <p className="text-sm text-green-300">
            No critical security incident detected recently
          </p>
        </div>
      )}

      {/* Recent incidents list */}
      {alertData.recentIncidents.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-base-content/70 mb-2">Recent Incidents</h4>
          <div className="space-y-2">
            {alertData.recentIncidents.slice(0, 3).map((incident, index) => (
              <div
                key={index}
                className={`rounded-lg p-3 border ${getSeverityColor(incident.severity)}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium uppercase">
                    {incident.severity || 'Info'}
                  </span>
                  <span className="text-xs opacity-70">
                    {incident.incident_date
                      ? new Date(incident.incident_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                      : ''
                    }
                  </span>
                </div>
                <p className="text-sm line-clamp-2">{incident.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats footer */}
      <div className="flex items-center justify-between text-xs text-base-content/50 pt-3 border-t border-base-content/10">
        <span>Last check: {alertData.lastCheck}</span>
        <span>{alertData.totalIncidents} incidents recorded</span>
      </div>

      {/* Monitoring badge */}
      <div className="mt-4 text-center">
        <span className="badge badge-outline badge-sm gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          24/7 Active Monitoring
        </span>
      </div>
    </div>
  );
}
