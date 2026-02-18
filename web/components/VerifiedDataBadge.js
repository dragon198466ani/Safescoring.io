/**
 * VerifiedDataBadge - Données vérifiées IA-proof
 *
 * Affiche les métriques que l'IA ne peut pas copier :
 * - Nombre de corrections validées par la communauté
 * - Ancienneté du produit dans la base
 * - Preuves blockchain (hash SHA256 horodatés)
 *
 * RGPD: Aucune donnée personnelle affichée
 */

"use client";

import { useState, useMemo } from "react";
import { useApi } from "@/hooks/useApi";

export default function VerifiedDataBadge({ productId, productSlug, createdAt }) {
  const [expanded, setExpanded] = useState(false);

  // Use useApi for corrections (5-minute cache)
  const { data: correctionsData, isLoading: loadingCorrections } = useApi(
    productId ? `/api/community/corrections?productId=${productId}&status=all` : null,
    { ttl: 5 * 60 * 1000 }
  );

  // Use useApi for proofs (5-minute cache)
  const { data: proofsData, isLoading: loadingProofs } = useApi(
    productSlug ? `/api/products/${productSlug}/proof` : null,
    { ttl: 5 * 60 * 1000 }
  );

  const loading = loadingCorrections || loadingProofs;

  // Compute stats from API responses
  const stats = useMemo(() => {
    if (loading) return null;

    const daysSinceCreated = createdAt
      ? Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      corrections: {
        total: correctionsData?.count || correctionsData?.corrections?.length || 0,
        validated: correctionsData?.corrections?.filter(c => c.status === "validated").length || 0
      },
      proofs: proofsData?.summary || null,
      daysSinceCreated
    };
  }, [correctionsData, proofsData, createdAt, loading]);

  if (loading) {
    return (
      <div className="animate-pulse h-10 w-48 bg-base-200 rounded-lg"></div>
    );
  }

  // Ne rien afficher si pas de données
  const hasData = stats?.daysSinceCreated > 0 ||
    stats?.corrections?.validated > 0 ||
    stats?.proofs?.totalProofs > 0;

  if (!hasData) {
    return null;
  }

  return (
    <div className="inline-block">
      {/* Badge compact */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-600 dark:text-green-400 hover:bg-green-500/20 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span>Données vérifiées</span>
        <svg
          className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Panel détaillé */}
      {expanded && (
        <div className="mt-2 p-4 bg-base-200 border border-base-300 rounded-lg max-w-sm">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <span>🛡️</span>
            Preuves IA-proof
          </h4>

          <div className="space-y-3">
            {/* Ancienneté */}
            {stats.daysSinceCreated > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-base-content/70">Suivi depuis</span>
                <span className="font-medium">
                  {stats.daysSinceCreated} jours
                </span>
              </div>
            )}

            {/* Corrections communautaires */}
            {stats.corrections.validated > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-base-content/70">Corrections validées</span>
                <span className="font-medium text-green-600">
                  {stats.corrections.validated}
                </span>
              </div>
            )}

            {/* Preuves blockchain */}
            {stats.proofs?.totalProofs > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-base-content/70">Preuves horodatées</span>
                <span className="font-medium text-primary">
                  {stats.proofs.totalProofs}
                </span>
              </div>
            )}

            {/* Première évaluation */}
            {stats.proofs?.firstProofDate && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-base-content/70">1ère évaluation</span>
                <span className="font-medium">
                  {new Date(stats.proofs.firstProofDate).toLocaleDateString("fr-FR")}
                </span>
              </div>
            )}

            {/* Lien blockchain */}
            {stats.proofs?.latestBlockchainUrl && (
              <a
                href={stats.proofs.latestBlockchainUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Vérifier sur Polygon
              </a>
            )}
          </div>

          {/* Explication */}
          <p className="mt-3 pt-3 border-t border-base-300 text-[10px] text-base-content/50">
            Ces données sont impossibles à reproduire par l'IA car elles
            nécessitent du temps réel, des contributions humaines vérifiées,
            et des preuves cryptographiques horodatées.
          </p>
        </div>
      )}
    </div>
  );
}
