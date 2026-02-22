"use client";

import { useState, useEffect } from "react";

const PILLAR_COLORS = { S: "#22c55e", A: "#f59e0b", F: "#3b82f6", E: "#8b5cf6" };
const PILLAR_NAMES = { S: "Security", A: "Adversity", F: "Fidelity", E: "Efficiency" };

export default function CommunityComparison({ setupId, combinedScore, pillarScores }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchComparison() {
      try {
        const res = await fetch(`/api/setups/${setupId}/compare`);
        if (res.ok) setData(await res.json());
      } catch (err) {
        console.error("Failed to fetch comparison:", err);
      } finally {
        setLoading(false);
      }
    }
    if (setupId) fetchComparison();
  }, [setupId]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-base-200 rounded-xl" />
        <div className="h-48 bg-base-200 rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-base-content/60">
        <p>Community data not available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rank card */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-base-200 border border-primary/30 p-6 text-center">
        <div className="text-5xl font-black text-primary mb-2">Top {100 - data.percentile}%</div>
        <p className="text-base-content/60">
          Your setup ranks <span className="font-bold text-white">#{data.rank}</span> out of{" "}
          <span className="font-bold text-white">{data.totalSetups}</span> setups
        </p>
        <div className="flex justify-center gap-6 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{data.userScore}</div>
            <div className="text-xs text-base-content/50">Your Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-base-content/60">{data.communityAverage}</div>
            <div className="text-xs text-base-content/50">Community Avg</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              data.userScore > data.communityAverage ? "text-green-400" : "text-red-400"
            }`}>
              {data.userScore > data.communityAverage ? "+" : ""}
              {data.userScore - data.communityAverage}
            </div>
            <div className="text-xs text-base-content/50">Difference</div>
          </div>
        </div>
      </div>

      {/* Pillar comparison */}
      <div className="rounded-2xl bg-base-200 border border-base-300 p-6">
        <h3 className="font-semibold mb-4">Pillar Comparison</h3>
        <div className="space-y-4">
          {["S", "A", "F", "E"].map((key) => {
            const comp = data.pillarComparison?.[key] || { user: 0, community: 0, diff: 0 };
            const maxVal = Math.max(comp.user, comp.community, 100);

            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold" style={{ color: PILLAR_COLORS[key] }}>{key}</span>
                    <span className="text-base-content/50">{PILLAR_NAMES[key]}</span>
                  </div>
                  <span className={`text-xs font-bold ${
                    comp.diff > 0 ? "text-green-400" : comp.diff < 0 ? "text-red-400" : "text-base-content/50"
                  }`}>
                    {comp.diff > 0 ? "+" : ""}{comp.diff}
                  </span>
                </div>

                {/* Dual bar */}
                <div className="space-y-1">
                  {/* User bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs w-12 text-right text-base-content/50">You</span>
                    <div className="flex-1 h-3 bg-base-300 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(comp.user / maxVal) * 100}%`, backgroundColor: PILLAR_COLORS[key] }}
                      />
                    </div>
                    <span className="text-xs w-8 font-bold">{comp.user}</span>
                  </div>
                  {/* Community bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs w-12 text-right text-base-content/50">Avg</span>
                    <div className="flex-1 h-3 bg-base-300 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full opacity-50"
                        style={{ width: `${(comp.community / maxVal) * 100}%`, backgroundColor: PILLAR_COLORS[key] }}
                      />
                    </div>
                    <span className="text-xs w-8 text-base-content/50">{comp.community}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4">
          <h4 className="text-sm font-semibold text-green-400 mb-2">💪 Your Strengths</h4>
          {data.strengths?.length > 0 ? (
            <ul className="space-y-1">
              {data.strengths.map((key) => (
                <li key={key} className="text-sm flex items-center gap-1.5">
                  <span style={{ color: PILLAR_COLORS[key] }}>●</span>
                  {PILLAR_NAMES[key]} ({key})
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-base-content/40">Even with community average</p>
          )}
        </div>

        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
          <h4 className="text-sm font-semibold text-red-400 mb-2">🎯 Areas to Improve</h4>
          {data.weaknesses?.length > 0 ? (
            <ul className="space-y-1">
              {data.weaknesses.map((key) => (
                <li key={key} className="text-sm flex items-center gap-1.5">
                  <span style={{ color: PILLAR_COLORS[key] }}>●</span>
                  {PILLAR_NAMES[key]} ({key})
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-base-content/40">No major weaknesses found!</p>
          )}
        </div>
      </div>

      {/* Similar setups */}
      {data.similarSetups > 0 && (
        <div className="rounded-xl bg-base-200 border border-base-300 p-4 text-center">
          <p className="text-sm text-base-content/60">
            <span className="font-bold text-primary">{data.similarSetups}</span> other users have similar setups to yours
          </p>
        </div>
      )}
    </div>
  );
}
