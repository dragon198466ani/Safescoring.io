"use client";

import { useState, useEffect } from "react";

/**
 * StakingLeaderboard - Top stakers with their vote power boost
 */
export default function StakingLeaderboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch("/api/staking/leaderboard");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const getTierBadge = (tier) => {
    switch (tier) {
      case 3: return { label: "MAX", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" };
      case 2: return { label: "T2", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" };
      case 1: return { label: "T1", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
      default: return { label: "—", color: "bg-base-300 text-base-content/40" };
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-14 bg-base-300 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (!data?.leaderboard?.length) {
    return (
      <div className="text-center p-8 bg-base-200 rounded-xl">
        <p className="text-4xl mb-2">🏆</p>
        <p className="text-base-content/60">Aucun staker pour le moment</p>
        <p className="text-sm text-base-content/40">Soyez le premier !</p>
      </div>
    );
  }

  const { leaderboard, currentUserRank, stats } = data;

  return (
    <div className="space-y-6">
      {/* Global stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 bg-base-200 rounded-xl text-center">
          <div className="text-2xl font-bold text-primary">
            {stats.totalStakedGlobal?.toLocaleString()}
          </div>
          <div className="text-xs text-base-content/60">$SAFE stakés</div>
        </div>
        <div className="p-4 bg-base-200 rounded-xl text-center">
          <div className="text-2xl font-bold">{stats.totalStakers}</div>
          <div className="text-xs text-base-content/60">Stakers</div>
        </div>
        <div className="p-4 bg-base-200 rounded-xl text-center">
          <div className="text-2xl font-bold">{stats.averageStake?.toLocaleString()}</div>
          <div className="text-xs text-base-content/60">Moyenne</div>
        </div>
      </div>

      {/* Current user rank if not in top 20 */}
      {currentUserRank && !leaderboard.some(l => l.isCurrentUser) && (
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold">#{currentUserRank.rank}</span>
              <span className="font-medium">Vous</span>
            </div>
            <div className="text-right">
              <div className="font-bold">{currentUserRank.totalStaked?.toLocaleString()} $SAFE</div>
              <div className="text-xs text-base-content/60">
                +{getTierBadge(currentUserRank.tier).label === "MAX" ? "1.0" : currentUserRank.tier === 2 ? "0.5" : "0.2"}x vote
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="space-y-2">
        {leaderboard.map((entry) => {
          const tier = getTierBadge(entry.tier);
          return (
            <div
              key={entry.rank}
              className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                entry.isCurrentUser
                  ? "bg-primary/10 border border-primary/30"
                  : "bg-base-200 hover:bg-base-300"
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Rank */}
                <div className="w-10 text-center font-bold text-lg">
                  {getRankIcon(entry.rank)}
                </div>

                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-bold">
                  {entry.avatar ? (
                    <img src={entry.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    entry.pseudonym?.charAt(0)?.toUpperCase() || "?"
                  )}
                </div>

                {/* Name */}
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {entry.pseudonym}
                    {entry.isCurrentUser && (
                      <span className="text-xs px-1.5 py-0.5 bg-primary/20 text-primary rounded">Vous</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Tier badge */}
                <span className={`px-2 py-0.5 text-xs rounded border ${tier.color}`}>
                  {tier.label}
                </span>

                {/* Amount */}
                <div className="text-right min-w-[80px]">
                  <div className="font-bold">{entry.totalStaked?.toLocaleString()}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="text-center text-xs text-base-content/50">
        Top 20 stakers • Mis à jour en temps réel
      </div>
    </div>
  );
}
