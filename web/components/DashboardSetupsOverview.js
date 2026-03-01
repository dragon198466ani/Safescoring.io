"use client";

/**
 * DashboardSetupsOverview — Real-time overview of user's setups on the dashboard
 *
 * INCEPTION: Dashboard = combination of setups.
 * Each setup = combination of product scores.
 * When product scores change → setup scores recalculate → dashboard updates.
 *
 * Subscribes to:
 * - user_setups changes (new setup, renamed, deleted)
 * - safe_scoring_results updates (product score changes → setup score recalc)
 */

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useProductScoreSubscription } from "@/hooks/useSupabaseSubscription";
import { useScoringSetup } from "@/libs/ScoringSetupProvider";

const getScoreColor = (score) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
};

const getScoreBg = (score) => {
  if (score >= 80) return "from-green-500/10 border-green-500/20";
  if (score >= 60) return "from-amber-500/10 border-amber-500/20";
  return "from-red-500/10 border-red-500/20";
};

export default function DashboardSetupsOverview() {
  const { data: session, status } = useSession();
  const { computeSAFE, isCustom } = useScoringSetup();
  const [setups, setSetups] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSetups = useCallback(async () => {
    try {
      const res = await fetch("/api/setups");
      if (!res.ok) return;
      const data = await res.json();
      setSetups(data.setups || []);
    } catch {
      // Silently fail
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchSetups();
    else if (status === "unauthenticated") setLoading(false);
  }, [status, fetchSetups]);

  // INCEPTION: Subscribe to product score changes → refetch setups
  // When any product score changes, the combined setup scores may change
  const { isConnected } = useProductScoreSubscription({
    onUpdate: fetchSetups,
    enabled: setups.length > 0,
  });

  if (status === "unauthenticated" || (!loading && setups.length === 0)) {
    return null; // Don't show empty section
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-base-200 border border-base-300 p-6">
        <div className="h-6 bg-base-300 rounded w-1/4 mb-4 animate-pulse" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-base-300 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-base-200 border border-base-300 overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-base-300">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Your Security Setups</h2>
          {isConnected && (
            <span className="relative flex h-2 w-2" title="Real-time sync active">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
          )}
        </div>
        <Link href="/dashboard/setups" className="text-sm text-primary hover:underline">
          Manage setups
        </Link>
      </div>

      <div className="p-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {setups.map((setup) => {
          const combined = setup.combinedScore;
          const rawScore = combined?.note_finale;
          const score = isCustom && combined
            ? (computeSAFE({
                s: combined.score_s,
                a: combined.score_a,
                f: combined.score_f,
                e: combined.score_e,
              }) ?? rawScore)
            : rawScore;

          return (
            <Link
              key={setup.id}
              href={`/dashboard/setups/${setup.id}`}
              className={`block p-4 rounded-xl bg-gradient-to-br ${
                score ? getScoreBg(score) : "from-base-300/50 border-base-300"
              } border hover:scale-[1.02] transition-all`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm truncate pr-2">{setup.name}</h3>
                {score != null && (
                  <span className={`text-xl font-bold ${getScoreColor(score)}`}>
                    {Math.round(score)}
                  </span>
                )}
              </div>

              {/* SAFE pillars mini-bar */}
              {combined && (
                <div className="flex gap-1.5 mb-2">
                  {[
                    { key: "score_s", color: "#22c55e" },
                    { key: "score_a", color: "#f59e0b" },
                    { key: "score_f", color: "#3b82f6" },
                    { key: "score_e", color: "#8b5cf6" },
                  ].map(({ key, color }) => (
                    <div key={key} className="flex-1 h-1.5 rounded-full bg-base-300 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${combined[key] || 0}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-base-content/50">
                <span>{setup.products_count || 0} products</span>
                <span>
                  {setup.updated_at
                    ? new Date(setup.updated_at).toLocaleDateString()
                    : ""}
                </span>
              </div>
            </Link>
          );
        })}

        {/* New setup card */}
        <Link
          href="/dashboard/setups"
          className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-base-content/20 hover:border-base-content/40 transition-colors min-h-[100px]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6 text-base-content/40 mb-1"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span className="text-xs text-base-content/50">New Setup</span>
        </Link>
      </div>
    </div>
  );
}
