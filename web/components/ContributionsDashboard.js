"use client";

import { useSession } from "next-auth/react";
import { useApi } from "@/hooks/useApi";

/**
 * ContributionsDashboard - Affiche les points $SAFE et contributions
 * À intégrer dans /dashboard
 */
export default function ContributionsDashboard() {
  const { data: session } = useSession();

  // Use useApi for points with 1-minute cache (shared with EarnPremiumBanner)
  const { data, isLoading: loading } = useApi(
    session?.user ? "/api/user/points" : null,
    { ttl: 60 * 1000 }
  );

  if (!session) {
    return (
      <div className="card bg-base-200 p-6">
        <p className="text-center text-base-content/70">
          <a href="/signin" className="link link-primary">Connecte-toi</a> pour voir tes contributions
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card bg-base-200 p-6 animate-pulse">
        <div className="h-8 bg-base-300 rounded w-1/3 mb-4"></div>
        <div className="h-20 bg-base-300 rounded"></div>
      </div>
    );
  }

  const { points, rank, transactions, verifications } = data || {};
  const balance = points?.balance || 0;
  const totalEarned = points?.total_earned || 0;
  const level = points?.level || 1;
  const verificationsCount = points?.verifications_count || 0;

  // Calcul niveau suivant
  const levelThresholds = [0, 100, 500, 2000, 10000];
  const nextLevel = Math.min(level + 1, 4);
  const pointsForNext = levelThresholds[nextLevel] - totalEarned;
  const progress = ((totalEarned - levelThresholds[level - 1]) / (levelThresholds[level] - levelThresholds[level - 1])) * 100;

  return (
    <div className="space-y-6">
      {/* Header avec balance */}
      <div className="card bg-gradient-to-br from-primary/20 to-secondary/20 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-base-content/60 mb-1">Tes tokens</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">{balance.toLocaleString()}</span>
              <span className="text-xl text-primary font-semibold">$SAFE</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-base-content/60">Rang</p>
            <p className="text-2xl font-bold">#{rank || "—"}</p>
          </div>
        </div>

        {/* Niveau et progression */}
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span>Niveau {level} {["", "🌱", "⭐", "🔥", "💎"][level]}</span>
            {level < 4 && <span>{pointsForNext} pts pour niveau {nextLevel}</span>}
          </div>
          <progress
            className="progress progress-primary w-full"
            value={Math.min(progress, 100)}
            max="100"
          />
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card bg-base-200 p-4 text-center">
          <p className="text-2xl font-bold">{verificationsCount}</p>
          <p className="text-xs text-base-content/60">Vérifications</p>
        </div>
        <div className="card bg-base-200 p-4 text-center">
          <p className="text-2xl font-bold">{totalEarned.toLocaleString()}</p>
          <p className="text-xs text-base-content/60">Total gagné</p>
        </div>
        <div className="card bg-base-200 p-4 text-center">
          <p className="text-2xl font-bold">{points?.streak_days || 0}j</p>
          <p className="text-xs text-base-content/60">Streak</p>
        </div>
      </div>

      {/* Comment gagner */}
      <div className="card bg-base-200 p-4">
        <h3 className="font-semibold mb-3">🎯 Comment gagner des $SAFE</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Vérifier une norme</span>
            <span className="text-primary font-medium">+10 pts</span>
          </div>
          <div className="flex justify-between">
            <span>Avec preuve (lien)</span>
            <span className="text-primary font-medium">+15 pts</span>
          </div>
          <div className="flex justify-between">
            <span>Consensus atteint</span>
            <span className="text-primary font-medium">+20 pts bonus</span>
          </div>
          <div className="flex justify-between">
            <span>Streak 7 jours</span>
            <span className="text-primary font-medium">x2 bonus</span>
          </div>
        </div>
      </div>

      {/* Historique récent */}
      {transactions?.length > 0 && (
        <div className="card bg-base-200 p-4">
          <h3 className="font-semibold mb-3">📜 Historique récent</h3>
          <div className="space-y-2">
            {transactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="flex justify-between items-center text-sm">
                <div>
                  <span className="capitalize">{tx.tx_type.replace("_", " ")}</span>
                  {tx.description && (
                    <span className="text-base-content/50 ml-2">• {tx.description}</span>
                  )}
                </div>
                <span className={tx.amount > 0 ? "text-success font-medium" : "text-error"}>
                  {tx.amount > 0 ? "+" : ""}{tx.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vérifications récentes */}
      {verifications?.length > 0 && (
        <div className="card bg-base-200 p-4">
          <h3 className="font-semibold mb-3">✓ Tes vérifications</h3>
          <div className="space-y-2">
            {verifications.map((v) => (
              <div key={v.id} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className={v.agrees ? "text-success" : "text-warning"}>
                    {v.agrees ? "✓" : "✗"}
                  </span>
                  <span>{v.product?.name}</span>
                </div>
                <span className="text-success">+{v.points_earned}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="card bg-primary/10 border border-primary/30 p-4 text-center">
        <p className="text-sm mb-2">
          🚀 Plus tu vérifies, plus tu gagnes de $SAFE
        </p>
        <a href="/products" className="btn btn-primary btn-sm">
          Vérifier des produits
        </a>
      </div>
    </div>
  );
}
