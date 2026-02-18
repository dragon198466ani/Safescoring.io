"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useApi } from "@/hooks/useApi";

/**
 * RewardsDashboard - User's $SAFE token rewards and claim interface
 * Shows balance, voting history, streaks, and wallet connection
 */
export default function RewardsDashboard({ compact = false }) {
  const { data: session } = useSession();

  // Wallet linking state
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [linkingWallet, setLinkingWallet] = useState(false);
  const [walletError, setWalletError] = useState(null);

  // Local state for optimistic updates after wallet link
  const [localWalletAddress, setLocalWalletAddress] = useState(null);

  // Build API URL based on compact mode
  const apiUrl = useMemo(() => {
    if (!session) return null;
    const params = compact ? "" : "?transactions=true";
    return `/api/community/rewards${params}`;
  }, [session, compact]);

  // Fetch rewards data with useApi (2-minute cache)
  const { data: rewardsData, isLoading: loading, error, invalidate } = useApi(apiUrl, {
    ttl: 2 * 60 * 1000,
  });

  // Extract rewards and transactions from API response
  const rewards = useMemo(() => {
    if (!rewardsData) return null;
    // Apply local wallet address override if set
    if (localWalletAddress) {
      return { ...rewardsData.rewards, wallet_address: localWalletAddress };
    }
    return rewardsData.rewards;
  }, [rewardsData, localWalletAddress]);

  const transactions = useMemo(() => rewardsData?.transactions || [], [rewardsData]);

  // Link wallet address
  const handleLinkWallet = async () => {
    if (!walletAddress) {
      setWalletError("Please enter a wallet address");
      return;
    }

    // Basic Ethereum address validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      setWalletError("Invalid Ethereum address format");
      return;
    }

    setLinkingWallet(true);
    setWalletError(null);

    try {
      const res = await fetch("/api/community/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });

      const data = await res.json();

      if (!res.ok) {
        setWalletError(data.error);
        return;
      }

      // Update local state and invalidate cache
      setLocalWalletAddress(walletAddress);
      setShowWalletModal(false);
      setWalletAddress("");
      invalidate();
    } catch (err) {
      setWalletError("Failed to link wallet");
    } finally {
      setLinkingWallet(false);
    }
  };

  if (!session) {
    return (
      <div className="rounded-2xl bg-base-200 border border-base-300 p-6 text-center">
        <div className="text-4xl mb-3">💰</div>
        <h3 className="text-lg font-semibold mb-2">Earn $SAFE Tokens</h3>
        <p className="text-sm text-base-content/60 mb-4">
          Vote on AI evaluations to earn tokens and climb the leaderboard!
        </p>
        <a href="/signin" className="btn btn-primary">
          Sign in to start earning
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-base-200 border border-base-300 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-base-300 rounded w-1/2"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-base-300 rounded-lg"></div>
            ))}
          </div>
          <div className="h-32 bg-base-300 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-base-200 border border-base-300 p-6 text-center">
        <p className="text-error mb-2">{error.message || "Failed to load rewards"}</p>
        <button onClick={() => invalidate()} className="btn btn-sm btn-ghost">
          Try again
        </button>
      </div>
    );
  }

  const totalBalance = rewards?.total_earned || 0;
  const pendingBalance = rewards?.total_pending || 0;
  const claimedBalance = rewards?.total_claimed || 0;

  return (
    <div className="space-y-6">
      {/* Main balance card */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-purple-500/20 border border-amber-500/30 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-sm text-base-content/60 mb-1">Your $SAFE Balance</h2>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-amber-400">
                {totalBalance.toLocaleString()}
              </span>
              <span className="text-lg text-amber-400/60">$SAFE</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-base-100/50 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-green-400">{rewards?.votes_submitted || 0}</div>
            <div className="text-xs text-base-content/60">Votes</div>
          </div>
          <div className="bg-base-100/50 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-purple-400">{rewards?.challenges_won || 0}</div>
            <div className="text-xs text-base-content/60">Challenges Won</div>
          </div>
          <div className="bg-base-100/50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="text-xl font-bold text-orange-400">{rewards?.daily_streak || 0}</span>
              {rewards?.daily_streak > 0 && <span className="text-lg">🔥</span>}
            </div>
            <div className="text-xs text-base-content/60">Day Streak</div>
          </div>
        </div>

        {/* Wallet status */}
        <div className="mt-4 pt-4 border-t border-base-300/50">
          {rewards?.wallet_address ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-base-content/70">Wallet linked</span>
              </div>
              <span className="font-mono text-xs text-base-content/50">
                {rewards.wallet_address.slice(0, 6)}...{rewards.wallet_address.slice(-4)}
              </span>
            </div>
          ) : (
            <button
              onClick={() => setShowWalletModal(true)}
              className="btn btn-sm btn-outline btn-warning w-full"
            >
              🔗 Link wallet for future claims
            </button>
          )}
        </div>
      </div>

      {/* Pending & Claimed breakdown */}
      {!compact && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-base-200 border border-base-300 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-base-content/60">Pending</span>
            </div>
            <div className="text-2xl font-bold">{pendingBalance.toLocaleString()}</div>
            <div className="text-xs text-base-content/50">Awaiting validation</div>
          </div>
          <div className="rounded-xl bg-base-200 border border-base-300 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-base-content/60">Claimable</span>
            </div>
            <div className="text-2xl font-bold">{(totalBalance - pendingBalance - claimedBalance).toLocaleString()}</div>
            <div className="text-xs text-base-content/50">Ready to claim</div>
          </div>
        </div>
      )}

      {/* How to earn more */}
      {!compact && (
        <div className="rounded-xl bg-base-200 border border-base-300 p-4">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <span>📈</span> How to earn more $SAFE
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-base-300/50">
              <span className="text-base-content/70">Vote on an evaluation</span>
              <span className="font-medium text-green-400">+1 $SAFE</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-base-300/50">
              <span className="text-base-content/70">Submit a challenge</span>
              <span className="font-medium text-amber-400">+2 $SAFE</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-base-300/50">
              <span className="text-base-content/70">Challenge gets validated</span>
              <span className="font-medium text-orange-400">+10 $SAFE</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-base-300/50">
              <span className="text-base-content/70">Provide evidence URL</span>
              <span className="font-medium text-blue-400">+2 $SAFE</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-base-content/70">7-day voting streak</span>
              <span className="font-medium text-purple-400">+7 $SAFE bonus</span>
            </div>
          </div>
        </div>
      )}

      {/* Recent transactions */}
      {!compact && transactions.length > 0 && (
        <div className="rounded-xl bg-base-200 border border-base-300 overflow-hidden">
          <div className="p-4 border-b border-base-300">
            <h3 className="font-medium">Recent Activity</h3>
          </div>
          <div className="divide-y divide-base-300">
            {transactions.slice(0, 10).map((tx, index) => (
              <div key={tx.id || index} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    tx.tokens_amount > 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                  }`}>
                    {tx.tokens_amount > 0 ? "+" : "-"}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{getActionLabel(tx.action_type)}</div>
                    <div className="text-xs text-base-content/50">
                      {new Date(tx.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
                <div className={`font-mono font-bold ${
                  tx.tokens_amount > 0 ? "text-green-400" : "text-red-400"
                }`}>
                  {tx.tokens_amount > 0 ? "+" : ""}{tx.tokens_amount}
                </div>
              </div>
            ))}
          </div>
          {transactions.length > 10 && (
            <div className="p-4 text-center border-t border-base-300">
              <button className="text-sm text-primary hover:underline">
                View all activity
              </button>
            </div>
          )}
        </div>
      )}

      {/* Wallet linking modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-base-100 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Link Your Wallet</h3>
              <button
                onClick={() => {
                  setShowWalletModal(false);
                  setWalletError(null);
                }}
                className="btn btn-sm btn-circle btn-ghost"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-base-content/70 mb-4">
              Enter your Ethereum wallet address to receive $SAFE tokens when claims are available.
            </p>

            {walletError && (
              <div className="bg-error/10 text-error text-sm rounded-lg p-3 mb-4">
                {walletError}
              </div>
            )}

            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="0x..."
              className="input input-bordered w-full mb-4 font-mono"
              disabled={linkingWallet}
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowWalletModal(false);
                  setWalletError(null);
                }}
                className="btn btn-ghost flex-1"
                disabled={linkingWallet}
              >
                Cancel
              </button>
              <button
                onClick={handleLinkWallet}
                className={`btn btn-primary flex-1 ${linkingWallet ? "loading" : ""}`}
                disabled={linkingWallet || !walletAddress}
              >
                {linkingWallet ? "Linking..." : "Link Wallet"}
              </button>
            </div>

            <p className="text-xs text-base-content/50 mt-4 text-center">
              Your wallet address is stored securely and will only be used for $SAFE token distribution.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to get human-readable action labels
function getActionLabel(actionType) {
  const labels = {
    vote_agree: "Agreed with evaluation",
    vote_disagree: "Challenged evaluation",
    challenge_validated: "Challenge validated!",
    challenge_rejected: "Challenge rejected",
    daily_first_vote: "Daily first vote bonus",
    streak_3_days: "3-day streak bonus",
    streak_7_days: "7-day streak bonus",
    streak_30_days: "30-day streak bonus",
    referral_bonus: "Referral bonus",
    evidence_bonus: "Evidence provided bonus",
  };
  return labels[actionType] || actionType;
}

// Compact version for sidebars
export function RewardsDashboardCompact(props) {
  return <RewardsDashboard {...props} compact />;
}
