"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const INCIDENT_TYPES = {
  hack: { label: "Hack", color: "error", icon: "🔓" },
  exploit: { label: "Exploit", color: "error", icon: "⚡" },
  vulnerability: { label: "Vulnerability", color: "warning", icon: "🐛" },
  rug_pull: { label: "Rug Pull", color: "error", icon: "🏃" },
  smart_contract_bug: { label: "Smart Contract Bug", color: "warning", icon: "📜" },
  frontend_attack: { label: "Frontend Attack", color: "warning", icon: "🎭" },
  phishing: { label: "Phishing", color: "warning", icon: "🎣" },
  insider_threat: { label: "Insider Threat", color: "error", icon: "🕵️" },
  oracle_manipulation: { label: "Oracle Manipulation", color: "warning", icon: "🔮" },
  bridge_attack: { label: "Bridge Attack", color: "error", icon: "🌉" },
  flash_loan_attack: { label: "Flash Loan Attack", color: "warning", icon: "⚡" },
  other: { label: "Other", color: "neutral", icon: "❓" },
};

const SEVERITY_COLORS = {
  critical: "error",
  high: "warning",
  medium: "info",
  low: "success",
  info: "neutral",
};

const STATUS_INFO = {
  investigating: { label: "Under Investigation", color: "warning", icon: "🔍" },
  confirmed: { label: "Confirmed", color: "error", icon: "✓" },
  active: { label: "Active Threat", color: "error", icon: "⚠️" },
  contained: { label: "Contained", color: "info", icon: "🛡️" },
  resolved: { label: "Resolved", color: "success", icon: "✓" },
  disputed: { label: "Disputed", color: "neutral", icon: "❓" },
};

export default function CryptoIncidentsPage() {
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedType, setSelectedType] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isLive, setIsLive] = useState(true);

  // Real-time refresh every 30 seconds
  useEffect(() => {
    fetchIncidents();

    // Auto-refresh for real-time updates
    const interval = setInterval(() => {
      if (isLive) {
        fetchIncidents();
        setLastUpdate(new Date());
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [selectedType, selectedSeverity, selectedStatus, isLive]);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedType) params.append("type", selectedType);
      if (selectedSeverity) params.append("severity", selectedSeverity);
      if (selectedStatus) params.append("status", selectedStatus);

      const response = await fetch(`/api/incidents?${params}`);
      const data = await response.json();

      if (data.incidents) {
        setIncidents(data.incidents);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching incidents:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return "Unknown";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  };

  const formatNumber = (num) => {
    if (!num) return "Unknown";
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(num);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <main className="min-h-screen bg-base-100">
      {/* Hero */}
      <section className="bg-gradient-to-br from-error/10 via-base-100 to-warning/10 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="breadcrumbs text-sm mb-4">
              <ul>
                <li>
                  <Link href="/">Home</Link>
                </li>
                <li>
                  <Link href="/security-guide">Security Guide</Link>
                </li>
                <li>Crypto Security Incidents</li>
              </ul>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <h1 className="text-5xl font-bold">
                Crypto Security Incidents
                <span className="block text-error mt-2">Database</span>
              </h1>
              {/* LIVE Indicator */}
              <button
                onClick={() => setIsLive(!isLive)}
                className={`badge badge-lg gap-2 cursor-pointer ${isLive ? 'badge-error animate-pulse' : 'badge-ghost'}`}
              >
                <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-white' : 'bg-base-content/50'}`}></span>
                {isLive ? 'LIVE' : 'PAUSED'}
              </button>
            </div>
            <p className="text-xl text-base-content/70 mb-4">
              Comprehensive tracking of hacks, exploits, and security breaches in the cryptocurrency
              ecosystem. Learn from these incidents to make informed security decisions.
            </p>
            <p className="text-sm text-base-content/50 mb-8">
              Last updated: {lastUpdate.toLocaleTimeString()} • Auto-refreshes every 30 seconds
            </p>

            {/* Quick Links */}
            <div className="flex gap-4 mb-8">
              <Link href="/incidents/physical" className="btn btn-outline btn-sm">
                🚨 Physical Security Incidents
              </Link>
              <Link href="/incidents/map" className="btn btn-outline btn-sm btn-primary">
                🗺️ View World Map
              </Link>
            </div>

            {/* Stats */}
            {stats && (
              <div className="stats stats-vertical sm:stats-horizontal shadow-xl bg-base-200 w-full">
                <div className="stat">
                  <div className="stat-figure text-error">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      className="inline-block w-8 h-8 stroke-current"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      ></path>
                    </svg>
                  </div>
                  <div className="stat-title">Total Incidents</div>
                  <div className="stat-value text-error">{stats.total}</div>
                  <div className="stat-desc">Tracked incidents</div>
                </div>

                <div className="stat">
                  <div className="stat-figure text-warning">💰</div>
                  <div className="stat-title">Total Funds Lost</div>
                  <div className="stat-value text-warning">
                    {formatCurrency(stats.totalFundsLost)}
                  </div>
                  <div className="stat-desc">Confirmed losses</div>
                </div>

                <div className="stat">
                  <div className="stat-figure text-error">🔴</div>
                  <div className="stat-title">Critical Incidents</div>
                  <div className="stat-value">{stats.bySeverity?.critical || 0}</div>
                  <div className="stat-desc">
                    {stats.bySeverity?.high || 0} high severity
                  </div>
                </div>

                <div className="stat">
                  <div className="stat-figure text-info">⚡</div>
                  <div className="stat-title">Active Threats</div>
                  <div className="stat-value text-info">{stats.activeIncidents || 0}</div>
                  <div className="stat-desc">Under investigation</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="py-8 bg-base-200">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Filters</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Type */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Incident Type</span>
                    </label>
                    <select
                      className="select select-bordered"
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                    >
                      <option value="">All Types</option>
                      {Object.entries(INCIDENT_TYPES).map(([key, { label }]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Severity */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Severity</span>
                    </label>
                    <select
                      className="select select-bordered"
                      value={selectedSeverity}
                      onChange={(e) => setSelectedSeverity(e.target.value)}
                    >
                      <option value="">All Severities</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                      <option value="info">Info</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Status</span>
                    </label>
                    <select
                      className="select select-bordered"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                      <option value="">All Statuses</option>
                      {Object.entries(STATUS_INFO).map(([key, { label }]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Incidents List */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold">
                {loading ? "Loading..." : `${incidents.length} Incidents`}
              </h2>
              <div className="text-sm text-base-content/60">
                Showing published incidents only. Data sourced from multiple verified sources.
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : incidents.length === 0 ? (
              <div className="alert">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  className="stroke-info shrink-0 w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <span>No incidents found matching your filters.</span>
              </div>
            ) : (
              <div className="space-y-6">
                {incidents.map((incident) => {
                  const typeInfo = INCIDENT_TYPES[incident.type] || INCIDENT_TYPES.other;
                  const statusInfo = STATUS_INFO[incident.status] || STATUS_INFO.investigating;
                  const severityColor = SEVERITY_COLORS[incident.severity] || "neutral";

                  return (
                    <div key={incident.id} className="card bg-base-200 shadow-xl">
                      <div className="card-body">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-3xl">{typeInfo.icon}</span>
                              <div>
                                <h3 className="card-title text-2xl">{incident.title}</h3>
                                <div className="flex items-center gap-2 text-sm text-base-content/60">
                                  <span>{formatDate(incident.date)}</span>
                                  {incident.incidentId && (
                                    <>
                                      <span>•</span>
                                      <span className="font-mono text-xs">
                                        {incident.incidentId}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <p className="text-base-content/80 mb-4">{incident.description}</p>

                            {/* Badges */}
                            <div className="flex flex-wrap gap-2 mb-4">
                              <span className={`badge badge-${typeInfo.color}`}>
                                {typeInfo.label}
                              </span>
                              <span className={`badge badge-${severityColor}`}>
                                {incident.severity.toUpperCase()} Severity
                              </span>
                              <span className={`badge badge-${statusInfo.color}`}>
                                {statusInfo.icon} {statusInfo.label}
                              </span>
                              {incident.fundsLost && (
                                <span className="badge badge-error">
                                  {formatCurrency(incident.fundsLost)} lost
                                </span>
                              )}
                              {incident.usersAffected && (
                                <span className="badge badge-warning">
                                  {formatNumber(incident.usersAffected)} users affected
                                </span>
                              )}
                              {incident.responseQuality && (
                                <span
                                  className={`badge ${
                                    incident.responseQuality === "excellent"
                                      ? "badge-success"
                                      : incident.responseQuality === "good"
                                      ? "badge-info"
                                      : incident.responseQuality === "poor"
                                      ? "badge-warning"
                                      : "badge-error"
                                  }`}
                                >
                                  Response: {incident.responseQuality}
                                </span>
                              )}
                            </div>

                            {/* Affected Products */}
                            {incident.affectedProducts && incident.affectedProducts.length > 0 && (
                              <div className="alert alert-warning mb-4">
                                <div className="w-full">
                                  <h4 className="font-bold mb-2">⚠️ Affected Products:</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {incident.affectedProducts.map((product) => (
                                      <Link
                                        key={product.id}
                                        href={product.slug ? `/products/${product.slug}` : "#"}
                                        className={`badge badge-lg ${
                                          product.slug ? "badge-error hover:badge-outline" : "badge-outline"
                                        } transition-all`}
                                      >
                                        {product.name}
                                      </Link>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Sources */}
                            {incident.sources && incident.sources.length > 0 && (
                              <div className="flex flex-wrap gap-2 items-center">
                                <span className="text-sm text-base-content/60">Sources:</span>
                                {incident.sources.slice(0, 3).map((source, idx) => (
                                  <a
                                    key={idx}
                                    href={source}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="link link-primary text-sm"
                                  >
                                    {new URL(source).hostname.replace("www.", "")}
                                  </a>
                                ))}
                                {incident.sources.length > 3 && (
                                  <span className="text-sm text-base-content/60">
                                    +{incident.sources.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-br from-primary/10 to-secondary/10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Choose Secure Products</h2>
            <p className="text-xl text-base-content/70 mb-8">
              Use our SAFE Score methodology to evaluate products and avoid becoming a statistic.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/methodology" className="btn btn-primary btn-lg">
                Learn About SAFE Score
              </Link>
              <Link href="/" className="btn btn-outline btn-lg">
                Browse Secure Products
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
