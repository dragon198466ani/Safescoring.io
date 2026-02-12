"use client";

import { useState } from "react";
import Link from "next/link";
import SetupScoreChart from "@/components/SetupScoreChart";
import SetupHealthScore from "@/components/SetupHealthScore";
import CommunityComparison from "@/components/CommunityComparison";

const PILLAR_COLORS = { S: "#22c55e", A: "#f59e0b", F: "#3b82f6", E: "#8b5cf6" };
const PILLAR_NAMES = { S: "Security", A: "Adversity", F: "Fidelity", E: "Efficiency" };

const getScoreColor = (score) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
};

const getGrade = (score) => {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  return "F";
};

export default function SetupDetailClient({ setup, products, combinedScore, pillarScores }) {
  const [tab, setTab] = useState("overview");
  const [incidents, setIncidents] = useState(null);
  const [loadingIncidents, setLoadingIncidents] = useState(false);

  const fetchIncidents = async () => {
    if (incidents !== null) return;
    setLoadingIncidents(true);
    try {
      const res = await fetch(`/api/setups/${setup.id}/incidents`);
      if (res.ok) setIncidents(await res.json());
    } catch (err) {
      console.error("Failed to fetch incidents:", err);
    } finally {
      setLoadingIncidents(false);
    }
  };

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "history", label: "History" },
    { key: "incidents", label: "Incidents", onClick: fetchIncidents },
    { key: "community", label: "Community" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Score circle */}
          <div className="relative w-20 h-20">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-base-300" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                strokeWidth="6" strokeLinecap="round"
                stroke={combinedScore >= 80 ? "#22c55e" : combinedScore >= 60 ? "#f59e0b" : "#ef4444"}
                strokeDasharray={`${(combinedScore / 100) * 264} 264`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-xl font-black ${getScoreColor(combinedScore)}`}>{combinedScore}</span>
              <span className="text-xs text-base-content/40">{getGrade(combinedScore)}</span>
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold">{setup.name}</h1>
            <p className="text-sm text-base-content/60">
              {products.length} product{products.length !== 1 ? "s" : ""} &bull; Created{" "}
              {new Date(setup.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Link href="/dashboard/setups" className="btn btn-ghost btn-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back
          </Link>
          <Link href="/dashboard/setups" className="btn btn-primary btn-sm">
            Edit Setup
          </Link>
        </div>
      </div>

      {/* SAFE Pillar Bars */}
      <div className="rounded-2xl bg-base-200 border border-base-300 p-6">
        <h3 className="font-semibold mb-4">SAFE Pillar Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(pillarScores).map(([key, score]) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: PILLAR_COLORS[key] }}>{key}</span>
                <span className="text-sm text-base-content/60">{PILLAR_NAMES[key]}</span>
              </div>
              <div className="w-full h-3 bg-base-300 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${score}%`, backgroundColor: PILLAR_COLORS[key] }}
                />
              </div>
              <p className="text-xs text-right font-bold" style={{ color: PILLAR_COLORS[key] }}>{score}/100</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-bordered">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`tab tab-lg ${tab === t.key ? "tab-active" : ""}`}
            onClick={() => {
              setTab(t.key);
              t.onClick?.();
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Health Score */}
          <SetupHealthScore setupId={setup.id} />

          {/* Products Table */}
          <div className="rounded-2xl bg-base-200 border border-base-300 overflow-hidden">
            <div className="p-6 border-b border-base-300">
              <h3 className="font-semibold">Products in Setup</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead className="bg-base-300/50">
                  <tr>
                    <th>Product</th>
                    <th>Type</th>
                    <th>Role</th>
                    <th>SAFE</th>
                    <th>S</th>
                    <th>A</th>
                    <th>F</th>
                    <th>E</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-base-300/30">
                      <td>
                        <Link href={`/products/${p.slug}`} className="font-medium hover:text-primary">
                          {p.name}
                        </Link>
                      </td>
                      <td className="text-base-content/60 text-sm">{p.product_types?.name || "-"}</td>
                      <td>
                        <span className={`badge badge-sm ${p.role === "wallet" ? "badge-primary" : "badge-ghost"}`}>
                          {p.role} {p.role === "wallet" ? "(2x)" : "(1x)"}
                        </span>
                      </td>
                      <td className={`font-bold ${getScoreColor(p.score)}`}>{p.score}</td>
                      <td style={{ color: PILLAR_COLORS.S }}>{p.score_s}</td>
                      <td style={{ color: PILLAR_COLORS.A }}>{p.score_a}</td>
                      <td style={{ color: PILLAR_COLORS.F }}>{p.score_f}</td>
                      <td style={{ color: PILLAR_COLORS.E }}>{p.score_e}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "history" && (
        <SetupScoreChart setupId={setup.id} />
      )}

      {tab === "incidents" && (
        <div className="space-y-4">
          {loadingIncidents ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-base-200 rounded-xl" />
              ))}
            </div>
          ) : incidents?.incidents?.length > 0 ? (
            <>
              {/* Severity summary */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Critical", count: incidents.severity_summary?.critical || 0, color: "text-red-400 bg-red-500/10" },
                  { label: "High", count: incidents.severity_summary?.high || 0, color: "text-orange-400 bg-orange-500/10" },
                  { label: "Medium", count: incidents.severity_summary?.medium || 0, color: "text-amber-400 bg-amber-500/10" },
                  { label: "Low", count: incidents.severity_summary?.low || 0, color: "text-blue-400 bg-blue-500/10" },
                ].map((s) => (
                  <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
                    <div className="text-2xl font-bold">{s.count}</div>
                    <div className="text-xs">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Incidents list */}
              {incidents.incidents.map((inc) => (
                <div key={inc.id} className="rounded-xl bg-base-200 border border-base-300 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-semibold">{inc.title}</h4>
                      <p className="text-sm text-base-content/60 mt-1 line-clamp-2">{inc.description}</p>
                    </div>
                    <span className={`badge badge-sm shrink-0 ${
                      inc.severity === "critical" ? "badge-error" :
                      inc.severity === "high" ? "badge-warning" :
                      inc.severity === "medium" ? "badge-info" : "badge-ghost"
                    }`}>
                      {inc.severity}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-3 text-xs text-base-content/50">
                    <span>{new Date(inc.created_at).toLocaleDateString()}</span>
                    {inc.funds_lost > 0 && <span className="text-red-400">${(inc.funds_lost / 1e6).toFixed(1)}M lost</span>}
                    <span>{inc.affected_products_in_setup} product(s) affected</span>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="text-center py-12">
              <span className="text-4xl">🛡️</span>
              <p className="text-base-content/60 mt-2">No incidents affecting your setup products</p>
              <p className="text-sm text-base-content/40">Your setup is clear of known security incidents</p>
            </div>
          )}
        </div>
      )}

      {tab === "community" && (
        <CommunityComparison setupId={setup.id} combinedScore={combinedScore} pillarScores={pillarScores} />
      )}
    </div>
  );
}
