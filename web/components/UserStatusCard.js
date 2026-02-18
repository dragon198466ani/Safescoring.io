"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

/**
 * UserStatusCard - Shows combined subscription + token status
 *
 * Displays:
 * - Current subscription plan and what it includes
 * - Token balance and staking status
 * - Effective tier (combination of both)
 * - Vote multiplier breakdown
 */
export default function UserStatusCard({ compact = false }) {
  const { data: session } = useSession();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      fetchStatus();
    } else {
      setLoading(false);
    }
  }, [session]);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/user/full-status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (error) {
      console.error("Error fetching status:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!session?.user) {
    return null;
  }

  if (loading) {
    return (
      <div className="animate-pulse bg-base-200 rounded-xl p-4">
        <div className="h-4 bg-base-300 rounded w-1/2 mb-2"></div>
        <div className="h-8 bg-base-300 rounded w-3/4"></div>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const { subscription, tokens, effective, capabilities } = status;

  // Tier colors
  const tierColors = {
    none: "text-base-content/50",
    bronze: "text-amber-600",
    silver: "text-slate-400",
    gold: "text-yellow-500",
    platinum: "text-purple-400",
  };

  const tierBgColors = {
    none: "bg-base-200",
    bronze: "bg-amber-500/10 border-amber-500/30",
    silver: "bg-slate-400/10 border-slate-400/30",
    gold: "bg-yellow-500/10 border-yellow-500/30",
    platinum: "bg-purple-500/10 border-purple-500/30",
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${tierBgColors[effective.tier]}`}>
        <TierBadge tier={effective.tier} />
        <div className="text-sm">
          <span className="opacity-70">Vote: </span>
          <span className="font-bold">x{effective.voteMultiplier.toFixed(1)}</span>
        </div>
        <div className="text-sm">
          <span className="opacity-70">Tokens: </span>
          <span className="font-bold">{tokens.available}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-base-100 rounded-2xl border border-base-300 overflow-hidden">
      {/* Header with effective tier */}
      <div className={`p-4 border-b ${tierBgColors[effective.tier]}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-70">Ton Statut</p>
            <div className="flex items-center gap-2 mt-1">
              <TierBadge tier={effective.tier} size="lg" />
              <span className={`text-xl font-bold capitalize ${tierColors[effective.tier]}`}>
                {effective.tier === "none" ? "Free" : effective.tier}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-70">Poids de Vote</p>
            <p className="text-2xl font-bold">x{effective.voteMultiplier.toFixed(1)}</p>
          </div>
        </div>
      </div>

      {/* Two columns: Subscription & Tokens */}
      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-base-300">
        {/* Subscription column */}
        <div className="p-4">
          <h3 className="text-sm font-semibold opacity-70 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Abonnement
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="opacity-70">Plan</span>
              <span className="font-medium capitalize">{subscription.plan}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-70">Tier inclus</span>
              <span className={`font-medium capitalize ${tierColors[subscription.includedTokenTier]}`}>
                {subscription.includedTokenTier === "none" ? "-" : subscription.includedTokenTier}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-70">Vote de base</span>
              <span className="font-medium">x{subscription.baseVoteMultiplier}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-70">Tokens/mois</span>
              <span className="font-medium text-success">+{subscription.monthlyTokenReward}</span>
            </div>
          </div>

          {subscription.plan === "free" && (
            <a
              href="/pricing"
              className="btn btn-primary btn-sm w-full mt-4"
            >
              Upgrade
            </a>
          )}
        </div>

        {/* Tokens column */}
        <div className="p-4">
          <h3 className="text-sm font-semibold opacity-70 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Tokens $SAFE
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="opacity-70">Disponibles</span>
              <span className="font-bold text-lg">{tokens.available}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-70">Stakés</span>
              <span className="font-medium">{tokens.staked}</span>
            </div>
            {tokens.stakingTier && (
              <div className="flex justify-between">
                <span className="opacity-70">Tier staking</span>
                <span className={`font-medium capitalize ${tierColors[tokens.stakingTier]}`}>
                  {tokens.stakingTier}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm opacity-60">
              <span>Total gagné</span>
              <span>{tokens.lifetimeEarned}</span>
            </div>
          </div>

          <button className="btn btn-outline btn-sm w-full mt-4">
            Acheter des tokens
          </button>
        </div>
      </div>

      {/* Vote multiplier breakdown */}
      <div className="p-4 bg-base-200/50 border-t border-base-300">
        <h3 className="text-sm font-semibold mb-2">Comment ton vote est calculé</h3>
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <span className="badge badge-outline">
            Abo: x{subscription.baseVoteMultiplier}
          </span>
          {tokens.stakingTier && (
            <>
              <span className="opacity-50">×</span>
              <span className="badge badge-outline">
                Stake: +{((getStakeBonus(tokens.stakingTier) - 1) * 100).toFixed(0)}%
              </span>
            </>
          )}
          <span className="opacity-50">=</span>
          <span className="badge badge-primary font-bold">
            x{effective.voteMultiplier.toFixed(1)}
          </span>
        </div>
        <p className="text-xs opacity-60 mt-2">
          + Boost temporaire possible avec des tokens (x1.5 ou x2)
        </p>
      </div>

      {/* Capabilities */}
      <div className="p-4 border-t border-base-300">
        <h3 className="text-sm font-semibold mb-3">Tes avantages</h3>
        <div className="grid grid-cols-2 gap-2">
          <CapabilityItem
            label="Accès Beta"
            enabled={capabilities.betaAccess}
          />
          <CapabilityItem
            label="Channel Privé"
            enabled={capabilities.privateChannel}
          />
          <CapabilityItem
            label="Support Prioritaire"
            enabled={capabilities.prioritySupport}
          />
          <CapabilityItem
            label="Calls Fondateurs"
            enabled={capabilities.founderCalls}
          />
        </div>
      </div>
    </div>
  );
}

function TierBadge({ tier, size = "md" }) {
  const icons = {
    none: "○",
    bronze: "🥉",
    silver: "🥈",
    gold: "🥇",
    platinum: "💎",
  };

  const sizes = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
  };

  return <span className={sizes[size]}>{icons[tier] || icons.none}</span>;
}

function CapabilityItem({ label, enabled }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${enabled ? "" : "opacity-40"}`}>
      {enabled ? (
        <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      <span>{label}</span>
    </div>
  );
}

function getStakeBonus(tier) {
  const bonuses = {
    platinum: 1.5,
    gold: 1.3,
    silver: 1.2,
    bronze: 1.1,
  };
  return bonuses[tier] || 1.0;
}
