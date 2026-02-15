"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

/**
 * TokenTeaser - Teasing message for future $SAFE token
 * Creates anticipation and encourages contributions
 */
export default function TokenTeaser({ variant = "full" }) {
  const { data: session } = useSession();
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserStats() {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/corrections");
        if (res.ok) {
          const data = await res.json();
          setUserStats(data.reputation);
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development") console.error("Failed to fetch user stats:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchUserStats();
  }, [session?.user?.id]);

  // Calculate user's estimated airdrop
  const calculateAirdrop = () => {
    if (!userStats) return { points: 0, multiplier: 1, estimated: 0 };

    const basePoints = userStats.points_earned || userStats.corrections_approved * 50;
    const levelMultiplier = {
      newcomer: 1.0,
      contributor: 1.2,
      trusted: 1.5,
      expert: 2.0,
      oracle: 3.0,
    }[userStats.reputation_level] || 1.0;

    // Seniority multiplier based on account age
    const daysSinceJoined = userStats.created_at
      ? Math.floor((new Date() - new Date(userStats.created_at)) / (1000 * 60 * 60 * 24))
      : 0;
    const seniorityMultiplier = Math.min(2.0, 1 + (daysSinceJoined / 365));

    const estimated = Math.round(basePoints * levelMultiplier * seniorityMultiplier);

    return {
      points: basePoints,
      levelMultiplier,
      seniorityMultiplier: seniorityMultiplier.toFixed(2),
      estimated,
    };
  };

  const airdrop = calculateAirdrop();

  // Compact variant for sidebar or small spaces
  if (variant === "compact") {
    return (
      <div className="rounded-xl bg-gradient-to-r from-amber-500/20 to-purple-500/20 border border-amber-500/30 p-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">$SAFE</div>
          <div className="flex-1">
            <p className="text-sm font-medium">Token Coming Soon</p>
            <p className="text-xs text-base-content/60">
              {session ? `${airdrop.estimated} pts estimated` : "Earn points now"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Full variant with detailed information
  return (
    <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 via-base-200 to-purple-500/10 border border-amber-500/20 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-base-300/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-purple-500 flex items-center justify-center">
                <span className="text-xl font-black text-white">$</span>
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-base-200 animate-pulse"></div>
            </div>
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                $SAFE Token
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                  Coming Soon
                </span>
              </h3>
              <p className="text-sm text-base-content/60">
                Earn points now, get rewarded later
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* User stats or call to action */}
      <div className="p-6">
        {session ? (
          loading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-8 bg-base-300 rounded w-1/2"></div>
              <div className="h-4 bg-base-300 rounded w-3/4"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Points display */}
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-purple-400">
                  {airdrop.estimated.toLocaleString()}
                </span>
                <span className="text-base-content/60 mb-1">estimated points</span>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg bg-base-300/50">
                  <div className="text-lg font-bold">{airdrop.points}</div>
                  <div className="text-xs text-base-content/50">Base Points</div>
                </div>
                <div className="p-3 rounded-lg bg-base-300/50">
                  <div className="text-lg font-bold text-purple-400">x{airdrop.levelMultiplier}</div>
                  <div className="text-xs text-base-content/50">Level Bonus</div>
                </div>
                <div className="p-3 rounded-lg bg-base-300/50">
                  <div className="text-lg font-bold text-blue-400">x{airdrop.seniorityMultiplier}</div>
                  <div className="text-xs text-base-content/50">Seniority</div>
                </div>
              </div>

              {/* Level info */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-base-300/30">
                <div>
                  <span className="text-sm text-base-content/60">Your level: </span>
                  <span className="font-medium capitalize">{userStats?.reputation_level || "newcomer"}</span>
                </div>
                <div className="text-sm text-base-content/50">
                  {userStats?.corrections_approved || 0} corrections approved
                </div>
              </div>

              {/* CTA */}
              <Link
                href="/products"
                className="btn btn-primary btn-block gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Earn More Points
              </Link>
            </div>
          )
        ) : (
          <div className="space-y-4">
            <p className="text-base-content/70">
              Early contributors will receive <span className="text-amber-400 font-semibold">$SAFE tokens</span> based on their accumulated points.
            </p>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-400">+50</span>
                <span className="text-base-content/60">points per approved correction</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-purple-400">x3</span>
                <span className="text-base-content/60">multiplier for Oracle level</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-blue-400">x2</span>
                <span className="text-base-content/60">multiplier for 1-year seniority</span>
              </div>
            </div>

            <Link
              href="/api/auth/signin"
              className="btn btn-primary btn-block gap-2"
            >
              Sign In to Start Earning
            </Link>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="px-6 py-4 bg-base-300/30 border-t border-base-300/50">
        <div className="flex items-start gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-xs text-base-content/50">
            Points are tracked automatically. The earlier you contribute, the higher your seniority multiplier.
            Snapshot date will be announced before the token launch.
          </p>
        </div>
      </div>
    </div>
  );
}
