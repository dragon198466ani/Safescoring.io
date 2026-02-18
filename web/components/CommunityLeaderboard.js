"use client";

import { useState, useEffect, memo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

/**
 * CommunityLeaderboard - Top community voters and challengers
 * Displays rankings based on $SAFE token earnings from voting
 */
function CommunityLeaderboard({
  limit = 10,
  showTitle = true,
  timeframe = "all", // all, month, week
  compact = false,
}) {
  const { data: session } = useSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          limit: limit.toString(),
          timeframe: selectedTimeframe,
        });

        const res = await fetch(`/api/community/leaderboard?${params}`);
        if (!res.ok) throw new Error("Failed to fetch leaderboard");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, [limit, selectedTimeframe]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-base-200 border border-base-300 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-base-300 rounded w-1/3"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-8 h-8 bg-base-300 rounded-full"></div>
              <div className="flex-1 h-4 bg-base-300 rounded"></div>
              <div className="w-16 h-4 bg-base-300 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl bg-base-200 border border-base-300 p-6 text-center text-base-content/60">
        <p>Unable to load leaderboard</p>
        <button
          onClick={() => window.location.reload()}
          className="btn btn-sm btn-ghost mt-2"
        >
          Try again
        </button>
      </div>
    );
  }

  const { leaderboard, stats, userRank } = data;

  return (
    <div className="rounded-2xl bg-base-200 border border-base-300 overflow-hidden">
      {showTitle && (
        <div className="p-6 border-b border-base-300">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-amber-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  Community Champions
                  <span className="text-amber-400 text-sm font-normal">$SAFE</span>
                </h2>
                <p className="text-sm text-base-content/60">
                  {stats?.totalVoters?.toLocaleString() || 0} voters • {stats?.totalVotes?.toLocaleString() || 0} votes
                </p>
              </div>
            </div>

            {/* Timeframe selector */}
            {!compact && (
              <div className="flex gap-1 bg-base-300 rounded-lg p-1">
                {[
                  { id: "all", label: "All Time" },
                  { id: "month", label: "Month" },
                  { id: "week", label: "Week" },
                ].map((tf) => (
                  <button
                    key={tf.id}
                    onClick={() => setSelectedTimeframe(tf.id)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      selectedTimeframe === tf.id
                        ? "bg-primary text-primary-content"
                        : "text-base-content/60 hover:text-base-content"
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Current user rank (if logged in and ranked) */}
      {userRank && session && (
        <div className="px-6 py-3 bg-primary/10 border-b border-base-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold text-primary">#{userRank.rank}</div>
            <div>
              <div className="text-sm font-medium">Your Rank</div>
              <div className="text-xs text-base-content/60">
                Top {((userRank.rank / (stats?.totalVoters || 1)) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono font-bold text-amber-400">{userRank.tokens?.toLocaleString() || 0}</div>
            <div className="text-xs text-base-content/60">$SAFE earned</div>
          </div>
        </div>
      )}

      {/* Leaderboard table */}
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead className="bg-base-300/50">
            <tr>
              <th className="font-medium text-base-content/70 w-12">#</th>
              <th className="font-medium text-base-content/70">Voter</th>
              {!compact && (
                <th className="font-medium text-base-content/70 text-center">Stats</th>
              )}
              <th className="font-medium text-base-content/70 text-right">
                <span className="text-amber-400">$SAFE</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {leaderboard?.map((entry, index) => (
              <tr
                key={entry.rank}
                className={`hover:bg-base-300/30 transition-colors ${
                  userRank?.rank === entry.rank ? "bg-primary/5" : ""
                }`}
              >
                <td>
                  {entry.rank <= 3 ? (
                    <span className="text-xl">
                      {entry.rank === 1 && "🥇"}
                      {entry.rank === 2 && "🥈"}
                      {entry.rank === 3 && "🥉"}
                    </span>
                  ) : (
                    <span className="text-base-content/50 font-mono">{entry.rank}</span>
                  )}
                </td>
                <td>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      entry.rank === 1 ? "bg-amber-500/20 text-amber-400" :
                      entry.rank === 2 ? "bg-gray-400/20 text-gray-400" :
                      entry.rank === 3 ? "bg-orange-600/20 text-orange-500" :
                      "bg-primary/20 text-primary"
                    }`}>
                      {entry.displayName?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <span className="font-medium">{entry.displayName || "Anonymous"}</span>
                      {entry.streak > 0 && (
                        <span className="ml-2 text-xs text-orange-400">🔥 {entry.streak}</span>
                      )}
                      {!compact && entry.challengesWon > 0 && (
                        <div className="text-xs text-base-content/50">
                          {entry.challengesWon} challenges won
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                {!compact && (
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-4 text-xs">
                      <div className="text-center">
                        <div className="font-bold text-green-400">{entry.votesSubmitted || 0}</div>
                        <div className="text-base-content/50">votes</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-purple-400">{entry.challengesWon || 0}</div>
                        <div className="text-base-content/50">wins</div>
                      </div>
                    </div>
                  </td>
                )}
                <td className="text-right">
                  <div className="font-mono font-bold text-amber-400">
                    {entry.tokensEarned?.toLocaleString() || 0}
                  </div>
                  {entry.rank === 1 && (
                    <div className="text-xs text-amber-400/60">Leader</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {(!leaderboard || leaderboard.length === 0) && (
        <div className="p-8 text-center text-base-content/60">
          <div className="text-4xl mb-2">🗳️</div>
          <p className="font-medium">No votes yet</p>
          <p className="text-sm mt-1">Be the first to vote and earn $SAFE tokens!</p>
        </div>
      )}

      {/* Stats footer */}
      {!compact && stats && (
        <div className="p-4 bg-gradient-to-r from-amber-500/10 to-purple-500/10 border-t border-base-300">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-primary">{stats.totalVotes?.toLocaleString() || 0}</div>
              <div className="text-xs text-base-content/60">Total Votes</div>
            </div>
            <div>
              <div className="text-lg font-bold text-amber-400">{stats.totalTokensAwarded?.toLocaleString() || 0}</div>
              <div className="text-xs text-base-content/60">$SAFE Distributed</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-400">{stats.challengesValidated?.toLocaleString() || 0}</div>
              <div className="text-xs text-base-content/60">Challenges Won</div>
            </div>
          </div>
        </div>
      )}

      {/* CTA for non-authenticated users */}
      {!session && !compact && (
        <div className="p-4 border-t border-base-300 text-center">
          <p className="text-sm text-base-content/70 mb-2">
            Join the community and start earning $SAFE tokens!
          </p>
          <a href="/signin" className="btn btn-primary btn-sm">
            Sign in to vote
          </a>
        </div>
      )}

      {/* Link to full page */}
      {compact && (
        <div className="p-4 border-t border-base-300 text-center">
          <Link href="/community" className="text-sm text-primary hover:underline">
            View full leaderboard →
          </Link>
        </div>
      )}
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export default memo(CommunityLeaderboard);

// Compact export for sidebars
export function CommunityLeaderboardCompact(props) {
  return <CommunityLeaderboard {...props} compact limit={5} showTitle={false} />;
}
