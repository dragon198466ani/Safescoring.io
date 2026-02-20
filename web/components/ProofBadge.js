/**
 * ProofBadge - Badge de preuve d'antériorité
 *
 * Affiche sur la fiche produit:
 * ✓ Score certifié le 15 jan 2025
 * [Vérifier sur blockchain]
 */

"use client";

import { useState } from "react";

export default function ProofBadge({ productSlug, proofData }) {
  const [showDetails, setShowDetails] = useState(false);

  if (!proofData?.summary?.latestProofDate) {
    return null;
  }

  const { summary, proofs } = proofData;
  const latestProof = proofs?.[0];

  const formattedDate = new Date(summary.latestProofDate).toLocaleDateString(
    "fr-FR",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );

  return (
    <div className="inline-flex flex-col">
      {/* Badge principal */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md text-xs text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
        <span>Certifié {formattedDate}</span>
        <svg
          className={`w-3 h-3 transition-transform ${showDetails ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Détails */}
      {showDetails && (
        <div className="mt-2 p-3 bg-base-200 dark:bg-base-800 rounded-lg text-xs space-y-2 max-w-sm">
          <div className="font-medium text-base-content">
            Preuve d'antériorité
          </div>

          <div className="space-y-1 text-base-content/70">
            <div className="flex justify-between">
              <span>Première évaluation:</span>
              <span className="font-mono">
                {new Date(summary.firstProofDate).toLocaleDateString("fr-FR")}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total de preuves:</span>
              <span className="font-mono">{summary.totalProofs}</span>
            </div>
            {summary.blockchainProofsCount > 0 && (
              <div className="flex justify-between">
                <span>Sur blockchain:</span>
                <span className="font-mono text-green-600">
                  {summary.blockchainProofsCount}
                </span>
              </div>
            )}
          </div>

          {/* Hash */}
          {latestProof && (
            <div className="pt-2 border-t border-base-300">
              <div className="text-base-content/50 mb-1">Dernier hash:</div>
              <code className="block p-1.5 bg-base-300 dark:bg-base-700 rounded text-[10px] font-mono break-all">
                {latestProof.hash}
              </code>
            </div>
          )}

          {/* Lien blockchain */}
          {summary.latestBlockchainUrl && (
            <a
              href={summary.latestBlockchainUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Vérifier sur Polygon
            </a>
          )}

          {/* Explication */}
          <div className="pt-2 text-[10px] text-base-content/50 italic">
            Ce hash cryptographique prouve que SafeScoring a évalué ce produit
            à cette date. Impossible à falsifier rétroactivement.
          </div>
        </div>
      )}
    </div>
  );
}
