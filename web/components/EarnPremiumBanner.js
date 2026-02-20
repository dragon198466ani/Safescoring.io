"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useApi } from "@/hooks/useApi";

/**
 * EarnPremiumBanner - Earn premium access for free with $SAFE tokens
 *
 * Autonomous token model: tokens earned by contributing, spent for access.
 * 50% of spent tokens are burned permanently.
 */
export default function EarnPremiumBanner({ variant = "full" }) {
  const { data: session } = useSession();

  // Use useApi for points with 1-minute cache
  const { data: pointsData } = useApi(
    session?.user ? "/api/user/points" : null,
    { ttl: 60 * 1000 }
  );

  const balance = pointsData?.points?.balance || 0;
  const explorerMonthlyCost = 250;
  const progress = Math.min((balance / explorerMonthlyCost) * 100, 100);

  if (variant === "compact") {
    return (
      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🪙</span>
            <div>
              <p className="font-semibold text-sm">Gagne l'accès gratuitement</p>
              <p className="text-xs text-base-content/60">
                Vote sur les produits et gagne des $SAFE
              </p>
            </div>
          </div>
          <Link href="/dashboard/rewards" className="btn btn-sm btn-warning">
            En savoir plus
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-yellow-500/10 border-2 border-amber-500/30 rounded-2xl p-6 sm:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl">🪙</span>
            <h3 className="text-xl sm:text-2xl font-bold">
              Accès gratuit avec $SAFE
            </h3>
          </div>
          <p className="text-base-content/70">
            Contribue à la communauté en votant sur les évaluations et débloque l'accès Explorer ou Pro.
          </p>
        </div>
        <span className="px-3 py-1 text-xs font-bold bg-amber-500 text-amber-950 rounded-full whitespace-nowrap">
          100% GRATUIT
        </span>
      </div>

      {/* How it works */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-base-100/50 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">✓</div>
          <h4 className="font-semibold mb-1">1. Vote</h4>
          <p className="text-xs text-base-content/60">
            Confirme ou conteste les évaluations IA sur les produits
          </p>
        </div>
        <div className="bg-base-100/50 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">🪙</div>
          <h4 className="font-semibold mb-1">2. Gagne</h4>
          <p className="text-xs text-base-content/60">
            +1 $SAFE par vote, +2 si consensus, +5 challenge validé
          </p>
        </div>
        <div className="bg-base-100/50 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">⭐</div>
          <h4 className="font-semibold mb-1">3. Dépense</h4>
          <p className="text-xs text-base-content/60">
            Achète un pass Explorer ou Pro pour débloquer les fonctionnalités
          </p>
        </div>
      </div>

      {/* Pass prices - Explorer */}
      <div className="bg-base-100/30 rounded-xl p-4 mb-4">
        <h4 className="font-semibold mb-3 text-sm">Pass Explorer (5 setups, PDF, alertes)</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
          <div className="p-2 bg-base-200/50 rounded-lg">
            <p className="font-bold text-amber-500">15 $SAFE</p>
            <p className="text-xs text-base-content/60">1 jour</p>
          </div>
          <div className="p-2 bg-base-200/50 rounded-lg">
            <p className="font-bold text-amber-500">80 $SAFE</p>
            <p className="text-xs text-base-content/60">1 semaine <span className="text-success">-24%</span></p>
          </div>
          <div className="p-2 bg-base-200/50 rounded-lg border border-amber-500/30">
            <p className="font-bold text-amber-500">250 $SAFE</p>
            <p className="text-xs text-base-content/60">1 mois <span className="text-success">-44%</span></p>
          </div>
          <div className="p-2 bg-base-200/50 rounded-lg">
            <p className="font-bold text-amber-500">2,000 $SAFE</p>
            <p className="text-xs text-base-content/60">1 an <span className="text-success">-63%</span></p>
          </div>
        </div>
      </div>

      {/* Pass prices - Pro */}
      <div className="bg-base-100/30 rounded-xl p-4 mb-6">
        <h4 className="font-semibold mb-3 text-sm">Pass Pro (20 setups, API, historique)</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
          <div className="p-2 bg-base-200/50 rounded-lg">
            <p className="font-bold text-purple-400">40 $SAFE</p>
            <p className="text-xs text-base-content/60">1 jour</p>
          </div>
          <div className="p-2 bg-base-200/50 rounded-lg">
            <p className="font-bold text-purple-400">200 $SAFE</p>
            <p className="text-xs text-base-content/60">1 semaine <span className="text-success">-29%</span></p>
          </div>
          <div className="p-2 bg-base-200/50 rounded-lg border border-purple-400/30">
            <p className="font-bold text-purple-400">600 $SAFE</p>
            <p className="text-xs text-base-content/60">1 mois <span className="text-success">-50%</span></p>
          </div>
          <div className="p-2 bg-base-200/50 rounded-lg">
            <p className="font-bold text-purple-400">5,000 $SAFE</p>
            <p className="text-xs text-base-content/60">1 an <span className="text-success">-31%</span></p>
          </div>
        </div>
      </div>

      {/* User progress (if logged in) */}
      {session?.user && pointsData && (
        <div className="bg-base-100/50 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Ton solde</span>
            <span className="text-xl font-bold text-amber-500">{balance} $SAFE</span>
          </div>
          <div className="flex items-center gap-3">
            <progress
              className="progress progress-warning flex-1"
              value={progress}
              max="100"
            />
            <span className="text-sm text-base-content/60">
              {balance}/{explorerMonthlyCost} pour Explorer 1 mois
            </span>
          </div>
          {balance >= explorerMonthlyCost && (
            <div className="mt-3 p-2 bg-success/20 rounded-lg text-center">
              <p className="text-success font-medium text-sm">
                Tu as assez pour un pass Explorer !
              </p>
              <Link href="/dashboard/rewards#shop" className="btn btn-success btn-sm mt-2">
                Acheter un pass
              </Link>
            </div>
          )}
        </div>
      )}

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/products"
          className="btn btn-warning flex-1"
        >
          Commencer à gagner des $SAFE
        </Link>
        <Link
          href="/dashboard/rewards"
          className="btn btn-ghost btn-outline flex-1"
        >
          Voir les passes disponibles
        </Link>
      </div>

      {/* Trust note */}
      <p className="text-xs text-center text-base-content/50 mt-4">
        50% des $SAFE dépensés sont brûlés définitivement. Plus l'usage augmente, plus le token prend de la valeur.
      </p>
    </div>
  );
}
