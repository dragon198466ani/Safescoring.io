/**
 * CommunityVoting - Système de vote communautaire
 *
 * Affiche les corrections en attente et permet de voter
 * RGPD compliant - Aucune donnée perso affichée
 */

"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export default function CommunityVoting({ productId, productName }) {
  const { data: session } = useSession();
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchCorrections();
  }, [productId]);

  const fetchCorrections = async () => {
    try {
      const res = await fetch(
        `/api/community/corrections?productId=${productId}&status=pending`
      );
      const data = await res.json();
      setCorrections(data.corrections || []);
    } catch (error) {
      console.error("Error fetching corrections:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (correctionId, vote) => {
    if (!session) {
      setMessage({ type: "error", text: "Connectez-vous pour voter" });
      return;
    }

    setVoting(correctionId);
    setMessage(null);

    try {
      const res = await fetch("/api/community/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correctionId,
          vote,
          deviceFingerprint: getDeviceFingerprint()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error });
        return;
      }

      // Mise à jour locale
      if (data.correction.validated) {
        setMessage({
          type: "success",
          text: "Correction validée ! Merci pour votre contribution."
        });
        // Retirer de la liste
        setCorrections(prev => prev.filter(c => c.id !== correctionId));
      } else {
        setMessage({
          type: "success",
          text: `Vote enregistré (poids: ${data.vote.weight.toFixed(1)})`
        });
        // Mettre à jour le score
        setCorrections(prev =>
          prev.map(c =>
            c.id === correctionId
              ? { ...c, vote_score: data.correction.score, votes_count: data.correction.votesCount }
              : c
          )
        );
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erreur lors du vote" });
    } finally {
      setVoting(null);
    }
  };

  // Fingerprint simple (non-invasif)
  const getDeviceFingerprint = () => {
    if (typeof window === "undefined") return null;
    const data = [
      navigator.userAgent,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset()
    ].join("|");
    return btoa(data).slice(0, 32);
  };

  if (loading) {
    return (
      <div className="animate-pulse p-4 bg-base-200 rounded-lg">
        <div className="h-4 bg-base-300 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-base-300 rounded w-3/4"></div>
      </div>
    );
  }

  if (corrections.length === 0) {
    return null; // Pas de corrections en attente
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <span className="text-lg">👥</span>
          Corrections en attente
        </h3>
        <span className="text-xs text-base-content/60">
          {corrections.length} correction{corrections.length > 1 ? "s" : ""}
        </span>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === "error"
              ? "bg-error/10 text-error"
              : "bg-success/10 text-success"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-3">
        {corrections.map((correction) => (
          <CorrectionCard
            key={correction.id}
            correction={correction}
            onVote={handleVote}
            voting={voting === correction.id}
            canVote={!!session}
          />
        ))}
      </div>

      {!session && (
        <p className="text-xs text-base-content/60 text-center">
          Connectez-vous pour voter et gagner des points
        </p>
      )}
    </div>
  );
}

function CorrectionCard({ correction, onVote, voting, canVote }) {
  const progressPercent = Math.min(100, (correction.vote_score / 3) * 100);

  return (
    <div className="p-4 bg-base-100 border border-base-300 rounded-lg">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          {correction.norm_code && (
            <span className="text-xs font-mono bg-base-200 px-1.5 py-0.5 rounded">
              {correction.norm_code}
            </span>
          )}
          <span className="ml-2 text-xs text-base-content/60">
            {correction.field_type}
          </span>
        </div>
        <span className="text-xs text-base-content/40">
          {new Date(correction.created_at).toLocaleDateString("fr-FR")}
        </span>
      </div>

      {/* Changement proposé */}
      <div className="flex items-center gap-2 mb-2 text-sm">
        <span className="line-through text-base-content/50">
          {correction.current_value || "—"}
        </span>
        <span className="text-base-content/40">→</span>
        <span className="font-medium text-primary">
          {correction.proposed_value}
        </span>
      </div>

      {/* Justification */}
      {correction.justification && (
        <p className="text-xs text-base-content/70 mb-3 line-clamp-2">
          {correction.justification}
        </p>
      )}

      {/* Preuves */}
      {correction.evidence_urls?.length > 0 && (
        <div className="flex gap-1 mb-3">
          {correction.evidence_urls.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Preuve {i + 1}
            </a>
          ))}
        </div>
      )}

      {/* Barre de progression */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span>Score: {correction.vote_score?.toFixed(1) || 0}</span>
          <span className="text-base-content/60">
            Validation à 3.0 ({correction.votes_count || 0} votes)
          </span>
        </div>
        <div className="h-1.5 bg-base-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              correction.vote_score >= 3 ? "bg-success" : "bg-primary"
            }`}
            style={{ width: `${Math.max(0, progressPercent)}%` }}
          />
        </div>
      </div>

      {/* Boutons de vote */}
      <div className="flex gap-2">
        <button
          onClick={() => onVote(correction.id, "agree")}
          disabled={voting || !canVote}
          className={`flex-1 btn btn-sm ${
            voting ? "loading" : ""
          } btn-success btn-outline`}
        >
          {!voting && "✓"} D'accord
        </button>
        <button
          onClick={() => onVote(correction.id, "disagree")}
          disabled={voting || !canVote}
          className={`flex-1 btn btn-sm ${
            voting ? "loading" : ""
          } btn-error btn-outline`}
        >
          {!voting && "✗"} Pas d'accord
        </button>
      </div>
    </div>
  );
}
