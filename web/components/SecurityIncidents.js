"use client";

import { useState, useEffect } from "react";

/**
 * SecurityIncidents - Displays security incidents for a product
 * Balanced presentation - professional but informative
 */
export default function SecurityIncidents({ slug }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchIncidents() {
      try {
        // Static JSON first (CDN, zero cost) → fallback to API
        const staticRes = await fetch(`/data/incidents/${slug}.json`);
        if (staticRes.ok) {
          const result = await staticRes.json();
          setData(result);
          return;
        }

        // Fallback: API route (Supabase query)
        const response = await fetch(`/api/products/${slug}/incidents`);
        if (!response.ok) throw new Error("Failed to fetch incidents");
        const result = await response.json();
        setData(result);
      } catch (_err) {
        // No incidents file and API failed = product has no incidents
        setData({ incidents: [], stats: {} });
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      fetchIncidents();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="animate-pulse bg-base-200 rounded-lg p-6">
        <div className="h-4 bg-base-300 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-16 bg-base-300 rounded"></div>
          <div className="h-16 bg-base-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-base-200 rounded-lg p-6 text-center">
        <p className="text-base-content/60">Unable to load security data</p>
      </div>
    );
  }

  const { incidents, stats } = data || { incidents: [], stats: {} };

  // Severity colors
  const getSeverityStyle = (severity) => {
    const styles = {
      critical: "bg-red-500/15 text-red-400 border-red-500/30",
      high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
      medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      low: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    };
    return styles[severity] || styles.low;
  };

  // Risk level styling
  const getRiskStyle = (level) => {
    const styles = {
      critical: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
      high: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30" },
      medium: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
      low: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
    };
    return styles[level] || styles.low;
  };

  // Determine if all incidents are resolved
  const allResolved = incidents.length > 0 && incidents.every(i => i.status === "resolved");

  // Use a more reassuring style if all incidents are resolved
  const _effectiveRiskLevel = allResolved ? "resolved" : stats.riskLevel;

  const riskStyle = allResolved
    ? { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" }
    : getRiskStyle(stats.riskLevel);

  // Format currency
  const formatUSD = (amount) => {
    if (!amount) return "$0";
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  // Format type
  const formatType = (type) => (type || "other").replace(/_/g, " ");

  // Chain display name
  const getChainLabel = (chain) => {
    if (!chain) return null;
    const names = {
      ethereum: "Ethereum", bsc: "BSC", solana: "Solana",
      polygon: "Polygon", arbitrum: "Arbitrum", base: "Base",
      avalanche: "Avalanche", optimism: "Optimism", fantom: "Fantom",
      multichain: "Multi-chain", bitcoin: "Bitcoin", cronos: "Cronos",
    };
    return names[chain.toLowerCase()] || chain;
  };

  return (
    <div className="bg-base-200 rounded-lg p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h3 className="font-semibold text-lg">Security History</h3>
        <span className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${riskStyle.bg} ${riskStyle.text} ${riskStyle.border}`}>
          {allResolved ? (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              All Resolved
            </span>
          ) : incidents.length === 0 ? (
            "No Incidents"
          ) : (
            `${stats.riskLevel?.charAt(0).toUpperCase()}${stats.riskLevel?.slice(1)} Risk`
          )}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-base-100 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold">{stats.totalIncidents || 0}</div>
          <div className="text-xs text-base-content/60">Incidents</div>
        </div>
        <div className="bg-base-100 rounded-lg p-3 text-center">
          <div className={`text-2xl font-bold ${stats.totalFundsLost > 0 ? 'text-orange-400' : ''}`}>
            {formatUSD(stats.totalFundsLost)}
          </div>
          <div className="text-xs text-base-content/60">Funds Affected</div>
        </div>
        <div className="bg-base-100 rounded-lg p-3 text-center">
          <div className={`text-2xl font-bold ${(stats.bySeverity?.critical || 0) > 0 ? 'text-red-400' : ''}`}>
            {stats.bySeverity?.critical || 0}
          </div>
          <div className="text-xs text-base-content/60">Critical</div>
        </div>
        <div className="bg-base-100 rounded-lg p-3 text-center">
          <div className={`text-2xl font-bold ${stats.hasActiveIncidents ? 'text-amber-400' : 'text-emerald-400'}`}>
            {stats.hasActiveIncidents ? "Active" : "Clear"}
          </div>
          <div className="text-xs text-base-content/60">Status</div>
        </div>
      </div>

      {/* Incidents list */}
      {incidents.length === 0 ? (
        <div className="text-center py-8 bg-base-100 rounded-lg border border-emerald-500/20">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <p className="font-medium text-emerald-400">No Incidents on Record</p>
          <p className="text-sm text-base-content/50 mt-1">
            Clean security history
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.slice(0, 5).map((incident) => (
            <div
              key={incident.id}
              className="bg-base-100 rounded-lg p-4 border border-base-300/50 hover:border-base-300 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Severity indicator */}
                <div className={`w-1 self-stretch rounded-full ${
                  incident.severity === 'critical' ? 'bg-red-500' :
                  incident.severity === 'high' ? 'bg-orange-500' :
                  incident.severity === 'medium' ? 'bg-amber-500' : 'bg-slate-500'
                }`} />

                <div className="flex-1 min-w-0">
                  {/* Title row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{incident.title}</span>
                    <span className={`px-2 py-0.5 rounded text-xs border ${getSeverityStyle(incident.severity)}`}>
                      {incident.severity}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs bg-base-200 text-base-content/60">
                      {formatType(incident.type)}
                    </span>
                    {incident.chain && (
                      <span className="px-2 py-0.5 rounded text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {getChainLabel(incident.chain)}
                      </span>
                    )}
                  </div>

                  {/* Date - avec indication si estimée */}
                  <div className="text-sm text-base-content/50 mt-1 flex items-center gap-1">
                    {incident.dateIsEstimated ? (
                      <>
                        <span className="text-amber-400/70">Date inconnue</span>
                        <span className="text-base-content/30" title="La date exacte de cet incident n'a pas pu être déterminée">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                            <path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" clipRule="evenodd" />
                          </svg>
                        </span>
                      </>
                    ) : (
                      new Date(incident.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    )}
                  </div>

                  {/* Description */}
                  {incident.description && (
                    <p className="text-sm text-base-content/70 mt-2 line-clamp-2">
                      {incident.description}
                    </p>
                  )}

                  {/* Impact row */}
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                    {incident.fundsLost > 0 && (
                      <span className="text-orange-400">
                        {formatUSD(incident.fundsLost)} lost
                      </span>
                    )}
                    {incident.fundsRecovered > 0 && (
                      <span className="text-emerald-400">
                        {formatUSD(incident.fundsRecovered)} recovered
                      </span>
                    )}
                    <span className={incident.status === "resolved" ? "text-emerald-400" : "text-amber-400"}>
                      {incident.status === "resolved" ? "Resolved" : "Active"}
                    </span>
                    {incident.resolvedDate && incident.status === "resolved" && (
                      <span className="text-base-content/50 text-xs">
                        {new Date(incident.resolvedDate).toLocaleDateString("en-US", {
                          year: "numeric", month: "short", day: "numeric",
                        })}
                      </span>
                    )}
                  </div>

                  {/* Resolution */}
                  {incident.resolutionDetails && (
                    <div className="mt-3 text-xs text-base-content/60 bg-base-200 rounded px-3 py-2">
                      {incident.resolutionDetails}
                    </div>
                  )}

                  {/* Links: post-mortem & source */}
                  {(incident.postmortemUrl || incident.sourceUrl) && (
                    <div className="flex items-center gap-3 mt-2">
                      {incident.postmortemUrl && (
                        <a
                          href={incident.postmortemUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Post-mortem
                        </a>
                      )}
                      {incident.sourceUrl && (
                        <a
                          href={incident.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-base-content/50 hover:text-base-content/70"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
                          </svg>
                          Source
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {incidents.length > 5 && (
            <div className="text-center pt-2">
              <button className="btn btn-ghost btn-sm">
                View all {incidents.length} incidents
              </button>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-5 pt-4 border-t border-base-300/50 flex items-center justify-between text-xs text-base-content/40">
        <span>Sources: DeFiLlama, Rekt News, CertiK, SlowMist, PeckShield, Immunefi, De.Fi</span>
        <span>Auto-updated</span>
      </div>
    </div>
  );
}
