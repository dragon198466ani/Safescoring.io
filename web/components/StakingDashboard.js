"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { useApi } from "@/hooks/useApi";

/**
 * StakingDashboard - Stake $SAFE tokens for feature access
 *
 * Pure utility staking — NO APY, NO vote multipliers.
 * 1 person = 1 vote, always.
 */
export default function StakingDashboard() {
  const { data: session } = useSession();
  const [staking, setStaking] = useState(false);
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [showUnstakeModal, setShowUnstakeModal] = useState(false);

  // Fetch balance with useApi (1-minute cache, shared with ContributionsDashboard)
  const { data: balance, isLoading: loading, invalidate } = useApi(
    session?.user?.id ? "/api/user/points" : null,
    { ttl: 60 * 1000 }
  );

  const tiers = [
    {
      name: "Bronze",
      required: 100,
      color: "from-amber-700 to-amber-600",
      benefits: ["PDF export", "+1 setup", "+5 SafeBot msg/jour"],
    },
    {
      name: "Silver",
      required: 500,
      color: "from-gray-400 to-gray-300",
      benefits: ["100 API calls/jour", "Alertes scores", "+3 setups", "+15 SafeBot msg/jour"],
    },
    {
      name: "Gold",
      required: 1000,
      color: "from-yellow-500 to-amber-400",
      benefits: ["Historique scores", "200 API calls/jour", "+5 setups", "+30 SafeBot msg/jour"],
    },
    {
      name: "Platinum",
      required: 2500,
      color: "from-cyan-500 to-blue-500",
      benefits: ["= Explorer plan", "Comparaisons illimitées", "300 API calls/jour"],
    },
    {
      name: "Diamond",
      required: 5000,
      color: "from-purple-500 to-indigo-500",
      benefits: ["Near-Professional", "Support prioritaire", "500 API calls/jour", "+100 SafeBot msg/jour"],
    },
  ];

  const getCurrentTier = () => {
    const staked = balance?.staked_balance || 0;
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (staked >= tiers[i].required) {
        return tiers[i];
      }
    }
    return null;
  };

  const getNextTier = () => {
    const staked = balance?.staked_balance || 0;
    for (const tier of tiers) {
      if (staked < tier.required) {
        return tier;
      }
    }
    return null;
  };

  const handleStake = async () => {
    const amount = parseFloat(stakeAmount);
    if (!amount || amount <= 0) {
      toast.error("Montant invalide");
      return;
    }

    if (amount > (balance?.available_balance || 0)) {
      toast.error("Solde insuffisant");
      return;
    }

    setStaking(true);

    try {
      const res = await fetch("/api/staking/stake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`${amount} $SAFE stakés !`);
        setStakeAmount("");
        setShowStakeModal(false);
        invalidate(); // Refresh balance
      } else {
        toast.error(data.error || "Échec du staking");
      }
    } catch (error) {
      toast.error("Erreur lors du staking");
    } finally {
      setStaking(false);
    }
  };

  const handleUnstake = async () => {
    const amount = parseFloat(unstakeAmount);
    if (!amount || amount <= 0) {
      toast.error("Montant invalide");
      return;
    }

    if (amount > (balance?.staked_balance || 0)) {
      toast.error("Montant staké insuffisant");
      return;
    }

    setStaking(true);

    try {
      const res = await fetch("/api/staking/unstake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`${amount} $SAFE récupérés !`);
        setUnstakeAmount("");
        setShowUnstakeModal(false);
        invalidate(); // Refresh balance
      } else {
        toast.error(data.error || "Échec du unstaking");
      }
    } catch (error) {
      toast.error("Erreur lors du unstaking");
    } finally {
      setStaking(false);
    }
  };

  const currentTier = getCurrentTier();
  const nextTier = getNextTier();

  if (!session) {
    return (
      <div className="bg-base-200 rounded-xl p-8 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h3 className="text-xl font-bold mb-2">Staking $SAFE</h3>
        <p className="text-base-content/70 mb-4">
          Connecte-toi pour staker tes tokens et débloquer des avantages
        </p>
        <a href="/signin" className="btn btn-primary">
          Se connecter
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-base-200 rounded-xl p-8">
        <div className="flex items-center justify-center gap-2">
          <span className="loading loading-spinner"></span>
          <span>Chargement...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="bg-base-200 rounded-xl overflow-hidden">
        <div
          className={`bg-gradient-to-r ${
            currentTier?.color || "from-gray-600 to-gray-500"
          } p-6 text-white`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Ton statut actuel</p>
              <h2 className="text-3xl font-bold">
                {currentTier?.name || "Non-Staker"}
              </h2>
              {currentTier && (
                <p className="text-white/80">
                  {currentTier.benefits[0]}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">
                {balance?.staked_balance || 0}
              </div>
              <div className="text-white/80">$SAFE stakés</div>
            </div>
          </div>
        </div>

        {/* Balances */}
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="bg-base-100 rounded-lg p-4">
            <p className="text-sm text-base-content/60">Disponible</p>
            <p className="text-2xl font-bold text-green-500">
              {balance?.available_balance || 0}
            </p>
            <p className="text-xs text-base-content/50">$SAFE</p>
          </div>
          <div className="bg-base-100 rounded-lg p-4">
            <p className="text-sm text-base-content/60">Total gagné</p>
            <p className="text-2xl font-bold text-amber-500">
              {balance?.lifetime_earned || 0}
            </p>
            <p className="text-xs text-base-content/50">$SAFE</p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex gap-3">
          <button
            className="btn btn-primary flex-1"
            onClick={() => setShowStakeModal(true)}
            disabled={(balance?.available_balance || 0) === 0}
          >
            Staker
          </button>
          <button
            className="btn btn-outline flex-1"
            onClick={() => setShowUnstakeModal(true)}
            disabled={(balance?.staked_balance || 0) === 0}
          >
            Récupérer
          </button>
        </div>

        {/* Progress to next tier */}
        {nextTier && (
          <div className="p-6 pt-0">
            <div className="bg-base-100 rounded-lg p-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Prochain tier: {nextTier.name}</span>
                <span>
                  {balance?.staked_balance || 0} / {nextTier.required} $SAFE
                </span>
              </div>
              <progress
                className="progress progress-primary w-full"
                value={balance?.staked_balance || 0}
                max={nextTier.required}
              ></progress>
              <p className="text-xs text-base-content/60 mt-2">
                Stake encore {nextTier.required - (balance?.staked_balance || 0)} $SAFE
                pour atteindre {nextTier.name}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tier Benefits */}
      <div className="bg-base-200 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4">Avantages par Tier</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`bg-base-100 rounded-lg overflow-hidden ${
                currentTier?.name === tier.name
                  ? "ring-2 ring-primary"
                  : ""
              }`}
            >
              <div
                className={`bg-gradient-to-r ${tier.color} p-3 text-white text-center`}
              >
                <h4 className="font-bold">{tier.name}</h4>
                <p className="text-sm text-white/80">{tier.required}+ $SAFE</p>
              </div>
              <ul className="p-4 space-y-2">
                {tier.benefits.map((benefit, i) => (
                  <li key={i} className="text-sm flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Stake Modal */}
      {showStakeModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Staker des $SAFE</h3>
            <p className="text-base-content/70 mb-4">
              Les tokens stakés ne peuvent pas être dépensés mais te donnent des
              avantages selon ton tier.
            </p>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Montant à staker</span>
                <span className="label-text-alt">
                  Max: {balance?.available_balance || 0} $SAFE
                </span>
              </label>
              <input
                type="number"
                className="input input-bordered"
                placeholder="100"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                max={balance?.available_balance || 0}
              />
            </div>

            <div className="flex gap-2 mb-4">
              {[100, 500, 1000].map((amount) => (
                <button
                  key={amount}
                  className="btn btn-sm btn-outline"
                  onClick={() => setStakeAmount(amount.toString())}
                  disabled={amount > (balance?.available_balance || 0)}
                >
                  {amount}
                </button>
              ))}
              <button
                className="btn btn-sm btn-outline"
                onClick={() =>
                  setStakeAmount((balance?.available_balance || 0).toString())
                }
              >
                Max
              </button>
            </div>

            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setShowStakeModal(false)}
              >
                Annuler
              </button>
              <button
                className="btn btn-primary"
                onClick={handleStake}
                disabled={staking || !stakeAmount}
              >
                {staking ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  "Staker"
                )}
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => setShowStakeModal(false)}
          ></div>
        </div>
      )}

      {/* Unstake Modal */}
      {showUnstakeModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Récupérer des $SAFE</h3>
            <p className="text-base-content/70 mb-4">
              Attention: retirer des tokens peut te faire perdre ton tier actuel
              et ses avantages.
            </p>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Montant à récupérer</span>
                <span className="label-text-alt">
                  Staké: {balance?.staked_balance || 0} $SAFE
                </span>
              </label>
              <input
                type="number"
                className="input input-bordered"
                placeholder="100"
                value={unstakeAmount}
                onChange={(e) => setUnstakeAmount(e.target.value)}
                max={balance?.staked_balance || 0}
              />
            </div>

            {currentTier && unstakeAmount && (
              <div className="alert alert-warning mb-4">
                <span>
                  {(balance?.staked_balance || 0) - parseFloat(unstakeAmount || 0) <
                  currentTier.required
                    ? `Tu perdras ton statut ${currentTier.name}`
                    : "Tu garderas ton tier actuel"}
                </span>
              </div>
            )}

            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setShowUnstakeModal(false)}
              >
                Annuler
              </button>
              <button
                className="btn btn-warning"
                onClick={handleUnstake}
                disabled={staking || !unstakeAmount}
              >
                {staking ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  "Récupérer"
                )}
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => setShowUnstakeModal(false)}
          ></div>
        </div>
      )}
    </div>
  );
}
