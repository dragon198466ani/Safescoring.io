"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

/**
 * StakingPanel - Stake $SAFE tokens to unlock Premium features
 *
 * NEW VALUE PROPOSITION:
 * - Bronze (100+): PDF export, +1 setup
 * - Silver (500+): API access, alerts, +3 setups
 * - Gold (1000+): Score history, +5 setups
 * - Platinum (2500+): Full Explorer features (save 19€/month!)
 * - Diamond (5000+): Near-Professional features
 */

const TIERS = {
  bronze: {
    name: "Bronze",
    minStake: 100,
    color: "text-amber-600",
    bgColor: "bg-amber-600/10",
    borderColor: "border-amber-600/30",
    icon: "🥉",
    benefits: ["PDF export", "+1 setup slot", "+5 SafeBot msg/day"],
    monthlyValue: 5,
  },
  silver: {
    name: "Silver",
    minStake: 500,
    color: "text-slate-400",
    bgColor: "bg-slate-400/10",
    borderColor: "border-slate-400/30",
    icon: "🥈",
    benefits: ["100 API calls/day", "Score alerts", "+3 setup slots", "+15 SafeBot msg/day"],
    monthlyValue: 10,
  },
  gold: {
    name: "Gold",
    minStake: 1000,
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/10",
    borderColor: "border-yellow-400/30",
    icon: "🥇",
    benefits: ["Score history", "200 API calls/day", "+5 setup slots", "+30 SafeBot msg/day"],
    monthlyValue: 15,
  },
  platinum: {
    name: "Platinum",
    minStake: 2500,
    color: "text-cyan-300",
    bgColor: "bg-cyan-300/10",
    borderColor: "border-cyan-300/30",
    icon: "💎",
    benefits: ["= Explorer plan", "Unlimited comparisons", "300 API calls/day", "+50 SafeBot msg/day"],
    monthlyValue: 19,
    highlight: "= Explorer 19€/month",
  },
  diamond: {
    name: "Diamond",
    minStake: 5000,
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
    borderColor: "border-purple-400/30",
    icon: "💠",
    benefits: ["Near-Professional", "Priority support", "500 API calls/day", "+100 SafeBot msg/day"],
    monthlyValue: 35,
    highlight: "Best value!",
  },
};

const TIER_ORDER = ["bronze", "silver", "gold", "platinum", "diamond"];

export default function StakingPanel({ onStakeChange }) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [stakeData, setStakeData] = useState(null);
  const [stakeAmount, setStakeAmount] = useState(100);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState(null);
  const [showTierInfo, setShowTierInfo] = useState(false);

  useEffect(() => {
    if (session) {
      fetchStakeData();
    } else {
      setLoading(false);
    }
  }, [session]);

  const fetchStakeData = async () => {
    try {
      const res = await fetch("/api/staking");
      const data = await res.json();
      setStakeData(data);
    } catch (err) {
      console.error("Error fetching stake data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStake = async () => {
    if (!session) return;
    setProcessing(true);
    setMessage(null);

    try {
      const res = await fetch("/api/staking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stake", amount: stakeAmount }),
      });
      const data = await res.json();

      if (data.success) {
        const newTier = getTierForAmount(data.total_staked);
        setMessage({
          type: "success",
          text: newTier
            ? `${stakeAmount} $SAFE staked! You're now ${newTier.icon} ${newTier.name}`
            : `${stakeAmount} $SAFE staked!`,
        });
        fetchStakeData();
        onStakeChange?.(data);
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Erreur lors du staking" });
    } finally {
      setProcessing(false);
    }
  };

  const handleUnstake = async (stakeId) => {
    setProcessing(true);
    setMessage(null);

    try {
      const res = await fetch("/api/staking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unstake", stakeId }),
      });
      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: "Unstaking initiated. Available in 7 days." });
        fetchStakeData();
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Erreur lors du unstaking" });
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    setProcessing(true);
    try {
      const res = await fetch("/api/staking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "withdraw" }),
      });
      const data = await res.json();

      if (data.success && data.withdrawn_amount > 0) {
        setMessage({ type: "success", text: `${data.withdrawn_amount} $SAFE withdrawn!` });
        fetchStakeData();
      }
    } catch (err) {
      setMessage({ type: "error", text: "Erreur" });
    } finally {
      setProcessing(false);
    }
  };

  const getTierForAmount = (amount) => {
    if (!amount) return null;
    for (let i = TIER_ORDER.length - 1; i >= 0; i--) {
      const tierKey = TIER_ORDER[i];
      if (amount >= TIERS[tierKey].minStake) {
        return { key: tierKey, ...TIERS[tierKey] };
      }
    }
    return null;
  };

  const getNextTier = (amount) => {
    for (const tierKey of TIER_ORDER) {
      if (TIERS[tierKey].minStake > (amount || 0)) {
        return { key: tierKey, ...TIERS[tierKey] };
      }
    }
    return null;
  };

  const getProgress = (amount) => {
    const current = getTierForAmount(amount);
    const next = getNextTier(amount);
    if (!next) return 100;

    const currentMin = current?.minStake || 0;
    const nextMin = next.minStake;
    return Math.min(100, ((amount - currentMin) / (nextMin - currentMin)) * 100);
  };

  if (!session) {
    return (
      <div className="p-6 bg-base-200 rounded-xl text-center">
        <p className="text-base-content/60">Connectez-vous pour staker</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6 bg-base-200 rounded-xl animate-pulse h-64"></div>;
  }

  const { balance, totalStaked, stakes } = stakeData || {};
  const currentTier = getTierForAmount(totalStaked);
  const nextTier = getNextTier(totalStaked);
  const progress = getProgress(totalStaked);
  const activeStakes = stakes?.filter((s) => s.status === "active") || [];
  const unstakingStakes = stakes?.filter((s) => s.status === "unstaking") || [];

  return (
    <div className="space-y-4">
      {/* Current Status Card */}
      <div
        className={`p-5 rounded-xl border ${
          currentTier ? `${currentTier.bgColor} ${currentTier.borderColor}` : "bg-base-200 border-base-300"
        }`}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              {currentTier ? (
                <>
                  <span className="text-2xl">{currentTier.icon}</span>
                  <span className={currentTier.color}>{currentTier.name} Staker</span>
                </>
              ) : (
                <>
                  <span>🔒</span>
                  <span>Start Staking</span>
                </>
              )}
            </h3>
            {currentTier?.highlight && (
              <span className="text-xs px-2 py-0.5 bg-success/20 text-success rounded-full">
                {currentTier.highlight}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowTierInfo(!showTierInfo)}
            className="btn btn-ghost btn-xs"
          >
            {showTierInfo ? "Hide" : "View"} tiers
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 text-center mb-4">
          <div className="p-3 bg-base-300/50 rounded-lg">
            <div className="text-xl font-bold">{balance?.toLocaleString() || 0}</div>
            <div className="text-xs text-base-content/60">Available</div>
          </div>
          <div className="p-3 bg-base-300/50 rounded-lg">
            <div className={`text-xl font-bold ${currentTier?.color || ""}`}>
              {totalStaked?.toLocaleString() || 0}
            </div>
            <div className="text-xs text-base-content/60">Staked</div>
          </div>
          <div className="p-3 bg-base-300/50 rounded-lg">
            <div className="text-xl font-bold text-success">
              {currentTier ? `${currentTier.monthlyValue}€` : "0€"}
            </div>
            <div className="text-xs text-base-content/60">/month value</div>
          </div>
        </div>

        {/* Progress to Next Tier */}
        {nextTier && (
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-base-content/60">
                {totalStaked || 0} / {nextTier.minStake} for {nextTier.icon} {nextTier.name}
              </span>
              <span className={nextTier.color}>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-base-300 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  currentTier ? `bg-gradient-to-r from-${currentTier.color.replace('text-', '')} to-${nextTier.color.replace('text-', '')}` : "bg-primary"
                }`}
                style={{ width: `${progress}%`, background: currentTier?.color ? undefined : undefined }}
              />
            </div>
            <p className="text-xs text-base-content/50 mt-1">
              {nextTier.minStake - (totalStaked || 0)} more to unlock: {nextTier.benefits[0]}
            </p>
          </div>
        )}

        {/* Current Benefits */}
        {currentTier && (
          <div className="mt-4 pt-4 border-t border-base-content/10">
            <p className="text-xs font-semibold mb-2 text-base-content/70">Your unlocked benefits:</p>
            <div className="flex flex-wrap gap-1">
              {currentTier.benefits.map((benefit, i) => (
                <span
                  key={i}
                  className={`text-xs px-2 py-1 rounded-full ${currentTier.bgColor} ${currentTier.color}`}
                >
                  {benefit}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tier Info Dropdown */}
      {showTierInfo && (
        <div className="p-4 bg-base-200 rounded-xl space-y-2">
          <h4 className="font-semibold mb-3">Staking Tiers & Benefits</h4>
          {TIER_ORDER.map((tierKey) => {
            const tier = TIERS[tierKey];
            const isCurrentTier = currentTier?.key === tierKey;
            const isUnlocked = (totalStaked || 0) >= tier.minStake;

            return (
              <div
                key={tierKey}
                className={`p-3 rounded-lg border ${
                  isCurrentTier
                    ? `${tier.bgColor} ${tier.borderColor}`
                    : isUnlocked
                    ? "bg-base-300/30 border-base-content/10"
                    : "bg-base-300/10 border-base-content/5 opacity-60"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{tier.icon}</span>
                    <span className={`font-medium ${isCurrentTier ? tier.color : ""}`}>
                      {tier.name}
                    </span>
                    <span className="text-xs text-base-content/50">
                      {tier.minStake.toLocaleString()}+ $SAFE
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-success">{tier.monthlyValue}€/mo value</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {tier.benefits.map((b, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 bg-base-300 rounded">
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Message */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === "error" ? "bg-error/10 text-error" : "bg-success/10 text-success"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Stake Form */}
      <div className="p-4 bg-base-200 rounded-xl">
        <p className="text-sm font-medium mb-3">Stake $SAFE to unlock features</p>
        <div className="flex gap-2 mb-3">
          {[100, 500, 1000, 2500].map((amt) => (
            <button
              key={amt}
              onClick={() => setStakeAmount(amt)}
              disabled={balance < amt}
              className={`flex-1 btn btn-xs ${
                stakeAmount === amt ? "btn-primary" : "btn-ghost"
              }`}
            >
              {amt >= 1000 ? `${amt / 1000}k` : amt}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            min={100}
            max={balance || 0}
            value={stakeAmount}
            onChange={(e) =>
              setStakeAmount(Math.max(100, parseInt(e.target.value) || 100))
            }
            className="input input-bordered input-sm flex-1"
          />
          <button
            onClick={handleStake}
            disabled={processing || balance < stakeAmount || stakeAmount < 100}
            className={`btn btn-primary btn-sm ${processing ? "loading" : ""}`}
          >
            Stake
          </button>
        </div>
        {balance < 100 && (
          <p className="text-xs text-warning mt-2">
            Earn $SAFE by verifying product norms to start staking
          </p>
        )}
      </div>

      {/* Active Stakes */}
      {activeStakes.length > 0 && (
        <div className="p-4 bg-base-200 rounded-xl">
          <p className="text-sm font-medium mb-2">Your Stakes</p>
          <div className="space-y-2">
            {activeStakes.map((stake) => (
              <div
                key={stake.id}
                className="flex justify-between items-center p-2 bg-base-300/50 rounded-lg"
              >
                <span className="font-medium">{stake.amount.toLocaleString()} $SAFE</span>
                <button
                  onClick={() => handleUnstake(stake.id)}
                  disabled={processing}
                  className="btn btn-xs btn-ghost text-warning"
                >
                  Unstake
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unstaking Queue */}
      {unstakingStakes.length > 0 && (
        <div className="p-4 bg-warning/10 rounded-xl">
          <p className="text-sm font-medium mb-2">Unstaking (7-day cooldown)</p>
          {unstakingStakes.map((stake) => {
            const unlockDate = new Date(stake.unlock_at);
            const canWithdraw = unlockDate <= new Date();
            const daysLeft = Math.ceil((unlockDate - new Date()) / 86400000);

            return (
              <div key={stake.id} className="flex justify-between items-center p-2">
                <span>{stake.amount.toLocaleString()} $SAFE</span>
                {canWithdraw ? (
                  <button onClick={handleWithdraw} className="btn btn-xs btn-success">
                    Withdraw
                  </button>
                ) : (
                  <span className="text-xs text-base-content/60">{daysLeft} days left</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
