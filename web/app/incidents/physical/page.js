"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const INCIDENT_TYPES = {
  kidnapping: { label: "Kidnapping", color: "error", icon: "🚨" },
  home_invasion: { label: "Home Invasion", color: "warning", icon: "🏠" },
  robbery: { label: "Robbery", color: "warning", icon: "💰" },
  extortion: { label: "Extortion", color: "error", icon: "⚠️" },
  assault: { label: "Assault", color: "warning", icon: "⚔️" },
  murder: { label: "Murder", color: "error", icon: "☠️" },
  disappearance: { label: "Disappearance", color: "error", icon: "❓" },
  social_engineering: { label: "Social Engineering", color: "info", icon: "🎭" },
};

const COUNTRY_NAMES = {
  AE: "United Arab Emirates",
  HK: "Hong Kong",
  US: "United States",
  GB: "United Kingdom",
  TH: "Thailand",
  BR: "Brazil",
  RU: "Russia",
  CN: "China",
  // Add more as needed
};

export default function PhysicalIncidentsPage() {
  const [incidents, setIncidents] = useState([]);
  const [mapData, setMapData] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedType, setSelectedType] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [minSeverity, setMinSeverity] = useState(1);
  const [verifiedOnly, setVerifiedOnly] = useState(true);

  useEffect(() => {
    fetchIncidents();
  }, [selectedType, selectedCountry, selectedYear, minSeverity, verifiedOnly]);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedType) params.append("type", selectedType);
      if (selectedCountry) params.append("country", selectedCountry);
      if (selectedYear) params.append("year", selectedYear);
      if (minSeverity > 1) params.append("minSeverity", minSeverity);
      if (verifiedOnly) params.append("verified", "true");

      const response = await fetch(`/api/incidents/physical?${params}`);
      const data = await response.json();

      if (data.success) {
        setIncidents(data.data);
        setMapData(data.mapData);
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
                <li>Physical Incidents</li>
              </ul>
            </div>

            <h1 className="text-5xl font-bold mb-4">
              Physical Security Incidents
              <span className="block text-error mt-2">in Crypto</span>
            </h1>
            <p className="text-xl text-base-content/70 mb-8">
              Real-world attacks targeting crypto holders. Learn from these incidents to protect
              yourself.
            </p>

            {/* Quick Links */}
            <div className="flex gap-4 mb-8">
              <Link href="/incidents" className="btn btn-outline btn-sm">
                🔓 Crypto Security Incidents (Hacks & Exploits)
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
                  <div className="stat-desc">Confirmed cases</div>
                </div>

                <div className="stat">
                  <div className="stat-figure text-warning">💰</div>
                  <div className="stat-title">Total Stolen</div>
                  <div className="stat-value text-warning">
                    {formatCurrency(stats.total_stolen_usd)}
                  </div>
                  <div className="stat-desc">Known amounts only</div>
                </div>

                <div className="stat">
                  <div className="stat-figure text-info">📊</div>
                  <div className="stat-title">Avg Severity</div>
                  <div className="stat-value">{stats.avg_severity}/10</div>
                  <div className="stat-desc">Risk level</div>
                </div>

                <div className="stat">
                  <div className="stat-figure text-error">⚠️</div>
                  <div className="stat-title">OPSEC Failures</div>
                  <div className="stat-value text-error">
                    {Math.round(
                      (stats.victims_disclosed_holdings / Math.max(stats.total, 1)) * 100
                    )}
                    %
                  </div>
                  <div className="stat-desc">Public disclosure</div>
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
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
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

                  {/* Country */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Country</span>
                    </label>
                    <select
                      className="select select-bordered"
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                    >
                      <option value="">All Countries</option>
                      {stats &&
                        Object.keys(stats.by_country)
                          .sort()
                          .map((code) => (
                            <option key={code} value={code}>
                              {COUNTRY_NAMES[code] || code} ({stats.by_country[code]})
                            </option>
                          ))}
                    </select>
                  </div>

                  {/* Year */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Year</span>
                    </label>
                    <select
                      className="select select-bordered"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                    >
                      <option value="">All Years</option>
                      {stats &&
                        Object.keys(stats.by_year)
                          .sort()
                          .reverse()
                          .map((year) => (
                            <option key={year} value={year}>
                              {year} ({stats.by_year[year]})
                            </option>
                          ))}
                    </select>
                  </div>

                  {/* Severity */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Min Severity: {minSeverity}</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={minSeverity}
                      onChange={(e) => setMinSeverity(parseInt(e.target.value))}
                      className="range range-error"
                    />
                  </div>

                  {/* Verified */}
                  <div className="form-control">
                    <label className="label cursor-pointer">
                      <span className="label-text">Verified Only</span>
                      <input
                        type="checkbox"
                        className="toggle toggle-primary"
                        checked={verifiedOnly}
                        onChange={(e) => setVerifiedOnly(e.target.checked)}
                      />
                    </label>
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
                Showing verified incidents only. Data sourced from public reports.
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
                  const typeInfo = INCIDENT_TYPES[incident.incident_type] || {
                    label: incident.incident_type,
                    color: "neutral",
                    icon: "📍",
                  };

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
                                  <span>•</span>
                                  <span>
                                    {incident.location_city}, {COUNTRY_NAMES[incident.location_country] || incident.location_country}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <p className="text-base-content/80 mb-4">{incident.description}</p>

                            {/* Badges */}
                            <div className="flex flex-wrap gap-2 mb-4">
                              <span className={`badge badge-${typeInfo.color}`}>
                                {typeInfo.label}
                              </span>
                              <span className="badge badge-outline">
                                Severity: {incident.severity_score}/10
                              </span>
                              {incident.opsec_risk_level && (
                                <span className="badge badge-warning">
                                  OPSEC Risk: {incident.opsec_risk_level.toUpperCase()}
                                </span>
                              )}
                              {incident.amount_stolen_usd && (
                                <span className="badge badge-error">
                                  ${formatCurrency(incident.amount_stolen_usd)} stolen
                                </span>
                              )}
                              {incident.verified && (
                                <span className="badge badge-success">✓ Verified</span>
                              )}
                            </div>

                            {/* OPSEC Failures */}
                            {incident.opsec_failures && incident.opsec_failures.length > 0 && (
                              <div className="alert alert-warning mb-4">
                                <div>
                                  <h4 className="font-bold mb-2">❌ OPSEC Failures Identified:</h4>
                                  <ul className="list-disc list-inside space-y-1 text-sm">
                                    {incident.opsec_failures.map((failure, idx) => (
                                      <li key={idx}>{failure}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}

                            {/* Lessons Learned */}
                            {incident.lessons_learned && incident.lessons_learned.length > 0 && (
                              <div className="alert alert-info">
                                <div>
                                  <h4 className="font-bold mb-2">💡 Lessons Learned:</h4>
                                  <ul className="list-disc list-inside space-y-1 text-sm">
                                    {incident.lessons_learned.map((lesson, idx) => (
                                      <li key={idx}>{lesson}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="card-actions justify-end mt-4">
                          <Link
                            href={`/incidents/physical/${incident.slug}`}
                            className="btn btn-sm btn-primary"
                          >
                            Full Analysis →
                          </Link>
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
            <h2 className="text-3xl font-bold mb-4">Don't Become a Statistic</h2>
            <p className="text-xl text-base-content/70 mb-8">
              Learn how to protect yourself with our comprehensive OPSEC guide and personal security
              audit.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/security-guide" className="btn btn-primary btn-lg">
                📚 Read Security Guide
              </Link>
              <Link href="/opsec-audit" className="btn btn-outline btn-lg">
                🔍 Take OPSEC Audit
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
