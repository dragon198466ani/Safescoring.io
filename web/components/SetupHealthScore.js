"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const gradeColors = {
  "A+": "text-green-400",
  A: "text-green-400",
  B: "text-amber-400",
  C: "text-orange-400",
  D: "text-red-400",
  F: "text-red-500",
  "N/A": "text-base-content/40",
};

const pillarConfig = {
  S: { name: "Security", color: "#22c55e" },
  A: { name: "Adversity", color: "#f59e0b" },
  F: { name: "Fidelity", color: "#3b82f6" },
  E: { name: "Efficiency", color: "#8b5cf6" },
};

export default function SetupHealthScore({ setupId, compact = false }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHealth() {
      if (!setupId) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/setups/${setupId}/health`);
        if (res.ok) {
          const data = await res.json();
          setHealth(data);
        }
      } catch (err) {
        console.error("Failed to fetch health score:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHealth();
  }, [setupId]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-base-200 border border-base-300 p-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-base-300 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-6 bg-base-300 rounded w-1/2" />
            <div className="h-4 bg-base-300 rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!health) return null;

  const scoreColor = health.health_score >= 70 ? "#22c55e" : health.health_score >= 50 ? "#f59e0b" : "#ef4444";
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (health.health_score / 100) * circumference;

  if (compact) {
    return (
      <div className="rounded-xl bg-base-200 border border-base-300 p-4">
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
              <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="4" className="text-base-300" />
              <circle cx="40" cy="40" r="36" fill="none" stroke={scoreColor} strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold" style={{ color: scoreColor }}>{health.health_score}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Health Score</p>
            <p className="text-xs text-base-content/50">
              Grade: <span className={`font-bold ${gradeColors[health.grade]}`}>{health.grade}</span>
              {health.trend !== 0 && (
                <span className={`ml-2 ${health.trend > 0 ? "text-green-400" : "text-red-400"}`}>
                  {health.trend > 0 ? "+" : ""}{health.trend}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-base-200 border border-base-300 overflow-hidden">
      <div className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Score circle */}
          <div className="flex flex-col items-center">
            <div className="relative w-28 h-28">
              <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="5" className="text-base-300" />
                <circle cx="40" cy="40" r="36" fill="none" stroke={scoreColor} strokeWidth="5" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black" style={{ color: scoreColor }}>{health.health_score}</span>
                <span className="text-xs text-base-content/50">/ 100</span>
              </div>
            </div>
            <span className={`text-lg font-bold mt-2 ${gradeColors[health.grade]}`}>
              Grade {health.grade}
            </span>
            {health.trend !== 0 && (
              <span className={`text-xs mt-1 ${health.trend > 0 ? "text-green-400" : "text-red-400"}`}>
                {health.trend > 0 ? "+" : ""}{health.trend} this week
              </span>
            )}
          </div>

          {/* Pillar bars */}
          <div className="flex-1 space-y-3">
            <h3 className="text-sm font-semibold mb-3">SAFE Pillars</h3>
            {Object.entries(pillarConfig).map(([code, conf]) => {
              const score = health.pillar_scores?.[code] || 0;
              const isWeakest = health.weakest_pillar?.code === code;
              return (
                <div key={code} className="flex items-center gap-3">
                  <span className="w-20 text-xs font-medium" style={{ color: conf.color }}>
                    {conf.name}
                  </span>
                  <div className="flex-1 h-3 bg-base-300 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${score}%`, backgroundColor: conf.color }}
                    />
                  </div>
                  <span className="text-sm font-mono w-8 text-right">{score}</span>
                  {isWeakest && (
                    <span className="text-xs text-red-400 font-medium">Low</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="text-center p-3 bg-base-300/30 rounded-lg">
            <div className="text-lg font-bold">{health.product_count}</div>
            <div className="text-xs text-base-content/50">Products</div>
          </div>
          <div className="text-center p-3 bg-base-300/30 rounded-lg">
            <div className={`text-lg font-bold ${health.incidents_count > 0 ? "text-red-400" : "text-green-400"}`}>
              {health.incidents_count}
            </div>
            <div className="text-xs text-base-content/50">Incidents (90d)</div>
          </div>
          <div className="text-center p-3 bg-base-300/30 rounded-lg">
            <div className={`text-lg font-bold ${health.trend > 0 ? "text-green-400" : health.trend < 0 ? "text-red-400" : ""}`}>
              {health.trend > 0 ? "+" : ""}{health.trend || 0}
            </div>
            <div className="text-xs text-base-content/50">Weekly Trend</div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {health.recommendations?.length > 0 && (
        <div className="px-6 pb-6">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-amber-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
            </svg>
            Recommendations
          </h4>
          <div className="space-y-2">
            {health.recommendations.map((rec, i) => (
              <div key={i} className="flex gap-2 p-3 bg-base-300/20 rounded-lg">
                <span className="text-primary font-bold text-sm">{i + 1}.</span>
                <p className="text-sm text-base-content/70">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="px-6 pb-6 text-center">
        <Link href="/products" className="btn btn-primary btn-sm gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Improve Your Score
        </Link>
      </div>
    </div>
  );
}
