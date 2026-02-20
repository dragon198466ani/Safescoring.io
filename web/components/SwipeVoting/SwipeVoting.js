"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import SwipeCardStack from "./SwipeCardStack";
import ProofModal from "./ProofModal";

/**
 * SwipeVoting - Interface Tinder ULTRA-SIMPLE pour voter sur les évaluations IA
 *
 * MODE AVEUGLE (Fouloscopie):
 * - L'utilisateur vote SANS voir l'évaluation IA
 * - Évite le biais d'ancrage (suivre aveuglément l'IA)
 * - Révèle le résultat IA après le vote
 *
 * @param {string} productSlug - Filtrer par produit (optionnel)
 * @param {string} pillar - Filtrer par pilier S/A/F/E (optionnel)
 * @param {number} maxItems - Nombre max d'évaluations à charger (défaut: 10)
 * @param {function} onComplete - Callback quand toutes les cartes sont votées
 * @param {function} onVoteSubmitted - Callback après chaque vote
 */
export default function SwipeVoting({
  productSlug = null,
  pillar = null,
  maxItems = 10,
  onComplete = null,
  onVoteSubmitted = null,
}) {
  const { data: session, status } = useSession();
  const stackRef = useRef(null);

  // State
  const [evaluations, setEvaluations] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Instant vote - no modal needed
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mode aveugle (Fouloscopie) - cacher l'IA avant le vote
  const [blindMode, setBlindMode] = useState(true);

  // Révélation après vote
  const [showReveal, setShowReveal] = useState(false);
  const [revealData, setRevealData] = useState(null); // { evaluation, userVote, aiResult, match }

  // Optional proof modal (after vote)
  const [showProofModal, setShowProofModal] = useState(false);
  const [lastVotedEvaluation, setLastVotedEvaluation] = useState(null);

  // Reward animation
  const [tokenReward, setTokenReward] = useState(null);

  // User stats
  const [userStats, setUserStats] = useState(null);
  const [dailyQuota, setDailyQuota] = useState(null);

  // Fetch evaluations
  const fetchEvaluations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: maxItems.toString(),
        filter: "not_voted",
      });

      if (productSlug) params.append("productSlug", productSlug);
      if (pillar) params.append("pillar", pillar);

      const res = await fetch(`/api/community/evaluation-vote?${params}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors du chargement");
      }

      setEvaluations(data.evaluations || []);
      setUserStats(data.userStats);
      setDailyQuota(data.dailyQuota);
    } catch (err) {
      console.error("[SwipeVoting] Fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [maxItems, productSlug, pillar]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchEvaluations();
    }
  }, [status, fetchEvaluations]);

  // Handle swipe - INSTANT vote, avec révélation en mode aveugle
  const handleSwipe = useCallback(
    async (direction) => {
      const evaluation = evaluations[currentIndex];
      if (!evaluation || isSubmitting) return;

      const isAgree = direction === "right"; // OUI = right, NON = left

      setIsSubmitting(true);
      try {
        const res = await fetch("/api/community/evaluation-vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            evaluationId: evaluation.id,
            voteAgrees: isAgree,
          }),
        });

        const result = await res.json();

        if (!res.ok) {
          throw new Error(result.error || "Erreur lors du vote");
        }

        // Show token reward
        showTokenReward(result.tokensEarned || 1);

        setUserStats(result.userStats);
        setDailyQuota(result.dailyQuota);

        // Store for optional proof
        setLastVotedEvaluation({ ...evaluation, voteAgrees: isAgree });

        // En mode aveugle: montrer la révélation avant de passer à la carte suivante
        if (blindMode) {
          const userVotedYes = isAgree;
          const aiSaidYes = evaluation.ai_result === "YES";
          const match = (userVotedYes && aiSaidYes) || (!userVotedYes && !aiSaidYes);

          setRevealData({
            evaluation,
            userVote: isAgree ? "OUI" : "NON",
            aiResult: evaluation.ai_result,
            aiJustification: evaluation.ai_justification,
            match,
            communityDecision: result.communityDecision,
            validationResult: result.validationResult,
          });
          setShowReveal(true);

          // La carte avancera quand l'utilisateur ferme le reveal
        } else {
          // Mode normal: avancer directement
          setTimeout(() => {
            setCurrentIndex((prev) => prev + 1);
          }, 300);
        }

        onVoteSubmitted?.({
          evaluationId: evaluation.id,
          voteAgrees: isAgree,
          tokensEarned: result.tokensEarned,
        });
      } catch (err) {
        console.error("[SwipeVoting] Vote error:", err);
        setError(err.message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [evaluations, currentIndex, isSubmitting, onVoteSubmitted, blindMode]
  );

  // Fermer le reveal et passer à la carte suivante
  const closeReveal = useCallback(() => {
    setShowReveal(false);
    setRevealData(null);
    setCurrentIndex((prev) => prev + 1);
  }, []);

  // Submit optional proof for bonus tokens
  const submitProof = async ({ evidenceUrl, evidenceType }) => {
    if (!lastVotedEvaluation) return;

    try {
      const res = await fetch("/api/community/evaluation-vote/proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evaluationId: lastVotedEvaluation.id,
          evidenceUrl,
          evidenceType,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Erreur");
      }

      showTokenReward(result.bonusTokens || 2);
      setUserStats(result.userStats);
      setShowProofModal(false);
      setLastVotedEvaluation(null);
    } catch (err) {
      console.error("[SwipeVoting] Proof error:", err);
    }
  };

  // Token reward animation
  const showTokenReward = (amount) => {
    setTokenReward(amount);
    setTimeout(() => setTokenReward(null), 1200);
  };

  // Quick action buttons
  const handleQuickVrai = () => {
    if (!isSubmitting && currentIndex < evaluations.length) {
      handleSwipe("right");
    }
  };

  const handleQuickFaux = () => {
    if (!isSubmitting && currentIndex < evaluations.length) {
      handleSwipe("left");
    }
  };

  // Check if complete
  useEffect(() => {
    if (currentIndex >= evaluations.length && evaluations.length > 0 && !loading) {
      onComplete?.();
    }
  }, [currentIndex, evaluations.length, loading, onComplete]);

  // Not authenticated
  if (status === "unauthenticated") {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔐</div>
        <h3 className="text-xl font-semibold mb-2">Connexion requise</h3>
        <p className="text-base-content/60 mb-4">Connectez-vous pour voter sur les évaluations IA</p>
        <a href="/signin" className="btn btn-primary">
          Se connecter
        </a>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
        <p className="text-base-content/60">Chargement des évaluations...</p>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">😕</div>
        <h3 className="text-xl font-semibold mb-2">Oops!</h3>
        <p className="text-base-content/60 mb-4">{error}</p>
        <button onClick={fetchEvaluations} className="btn btn-primary">
          Réessayer
        </button>
      </div>
    );
  }

  // No evaluations or quota exceeded
  if (evaluations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-xl font-semibold mb-2">Tout est voté !</h3>
        <p className="text-base-content/60 mb-4">
          Revenez plus tard pour de nouvelles évaluations à voter.
        </p>
        {userStats && (
          <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2">
            <span className="text-primary font-bold">{userStats.total_earned || 0} $SAFE</span>
            <span className="text-base-content/60">gagnés</span>
          </div>
        )}
      </div>
    );
  }

  // All cards voted
  if (currentIndex >= evaluations.length) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🏆</div>
        <h3 className="text-xl font-semibold mb-2">Session terminée !</h3>
        <p className="text-base-content/60 mb-4">
          Vous avez voté sur {evaluations.length} évaluation{evaluations.length > 1 ? "s" : ""}
        </p>
        {userStats && (
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2">
              <span className="text-primary font-bold">{userStats.total_earned || 0} $SAFE</span>
              <span className="text-base-content/60">total gagnés</span>
            </div>
            {userStats.daily_streak > 1 && (
              <div className="flex items-center justify-center gap-1 text-amber-400">
                <span>🔥</span>
                <span className="font-medium">{userStats.daily_streak} jours de suite</span>
              </div>
            )}
          </div>
        )}
        <button onClick={fetchEvaluations} className="btn btn-primary mt-6">
          Continuer à voter
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto px-4">
      {/* Header with stats */}
      <div className="w-full flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {userStats && (
            <span className="text-sm font-medium text-primary">{userStats.total_earned || 0} $SAFE</span>
          )}
          {userStats?.daily_streak > 1 && (
            <span className="text-amber-400 text-sm">🔥 {userStats.daily_streak}j</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Blind mode toggle */}
          <button
            onClick={() => setBlindMode(!blindMode)}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${
              blindMode
                ? "bg-primary/20 text-primary"
                : "bg-base-300 text-base-content/60"
            }`}
            title={blindMode ? "Mode aveugle actif" : "Mode visible"}
          >
            {blindMode ? "🙈" : "👁️"}
            <span className="hidden sm:inline">{blindMode ? "Aveugle" : "Visible"}</span>
          </button>
          {dailyQuota && (
            <span className="text-xs text-base-content/50">
              {dailyQuota.remaining}/{dailyQuota.max}
            </span>
          )}
        </div>
      </div>

      {/* Progress indicator */}
      <div className="w-full mb-4">
        <div className="flex items-center justify-between text-xs text-base-content/60 mb-1">
          <span>Progression</span>
          <span>
            {currentIndex + 1}/{evaluations.length}
          </span>
        </div>
        <div className="w-full h-1.5 bg-base-300 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / evaluations.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Card stack */}
      <SwipeCardStack
        ref={stackRef}
        evaluations={evaluations}
        currentIndex={currentIndex}
        onSwipe={handleSwipe}
        disabled={isSubmitting}
        blindMode={blindMode}
      />

      {/* Quick action buttons */}
      <div className="flex items-center justify-center gap-8 py-6">
        {/* NON button */}
        <button
          onClick={handleQuickFaux}
          disabled={isSubmitting}
          className="w-16 h-16 rounded-full border-2 border-red-500 text-red-500
                     flex items-center justify-center
                     hover:bg-red-500/10 active:scale-95
                     transition-all duration-150
                     disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Vote NON"
          title="Non, ce produit ne respecte pas cette norme"
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* OUI button */}
        <button
          onClick={handleQuickVrai}
          disabled={isSubmitting}
          className="w-16 h-16 rounded-full border-2 border-green-500 text-green-500
                     flex items-center justify-center
                     hover:bg-green-500/10 active:scale-95
                     transition-all duration-150
                     disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Vote OUI"
          title="Oui, ce produit respecte cette norme"
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>

      {/* Instructions */}
      <p className="text-xs text-base-content/40 text-center">
        Donnez votre avis: ce produit respecte-t-il cette norme?
      </p>

      {/* Optional proof button (after vote) */}
      {lastVotedEvaluation && !showProofModal && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
          <button
            onClick={() => setShowProofModal(true)}
            className="btn btn-sm btn-outline btn-primary gap-2 shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Ajouter une source (+2 $SAFE)
          </button>
        </div>
      )}

      {/* Proof modal */}
      <ProofModal
        isOpen={showProofModal}
        onClose={() => {
          setShowProofModal(false);
          setLastVotedEvaluation(null);
        }}
        onSubmit={submitProof}
        evaluation={lastVotedEvaluation}
      />

      {/* Reveal modal (blind mode) - shows AI result after vote */}
      {showReveal && revealData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-base-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scale-in">
            {/* Header with match indicator */}
            <div className="text-center mb-6">
              {revealData.match ? (
                <>
                  <div className="text-5xl mb-3">🎯</div>
                  <h3 className="text-xl font-bold text-green-400">Vous êtes aligné avec l'IA !</h3>
                  <p className="text-sm text-base-content/60 mt-1">Votre intuition est bonne</p>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-3">🤔</div>
                  <h3 className="text-xl font-bold text-amber-400">Avis divergent</h3>
                  <p className="text-sm text-base-content/60 mt-1">Votre vote contribue au consensus</p>
                </>
              )}
            </div>

            {/* Comparison */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* User vote */}
              <div className={`p-4 rounded-xl text-center ${
                revealData.userVote === "OUI"
                  ? "bg-green-500/20 border border-green-500/30"
                  : "bg-red-500/20 border border-red-500/30"
              }`}>
                <p className="text-xs text-base-content/50 uppercase mb-1">Votre vote</p>
                <p className={`text-2xl font-bold ${
                  revealData.userVote === "OUI" ? "text-green-400" : "text-red-400"
                }`}>
                  {revealData.userVote}
                </p>
              </div>

              {/* AI result */}
              <div className={`p-4 rounded-xl text-center ${
                revealData.aiResult === "YES"
                  ? "bg-green-500/20 border border-green-500/30"
                  : revealData.aiResult === "NO"
                    ? "bg-red-500/20 border border-red-500/30"
                    : "bg-amber-500/20 border border-amber-500/30"
              }`}>
                <p className="text-xs text-base-content/50 uppercase mb-1">L'IA dit</p>
                <p className={`text-2xl font-bold ${
                  revealData.aiResult === "YES"
                    ? "text-green-400"
                    : revealData.aiResult === "NO"
                      ? "text-red-400"
                      : "text-amber-400"
                }`}>
                  {revealData.aiResult === "YES" ? "OUI" : revealData.aiResult === "NO" ? "NON" : "PARTIEL"}
                </p>
              </div>
            </div>

            {/* AI justification preview */}
            {revealData.aiJustification && (
              <div className="bg-base-300/50 rounded-lg p-3 mb-6">
                <p className="text-xs text-base-content/50 uppercase mb-1">Justification IA</p>
                <p className="text-sm text-base-content/70 line-clamp-3">{revealData.aiJustification}</p>
              </div>
            )}

            {/* Community status if decided */}
            {revealData.communityDecision && (
              <div className="text-center mb-4">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                  revealData.validationResult === "confirmed"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-amber-500/20 text-amber-400"
                }`}>
                  {revealData.validationResult === "confirmed" ? "✓ IA confirmée" : "⚠ IA contestée"}
                </span>
              </div>
            )}

            {/* Continue button */}
            <button
              onClick={closeReveal}
              className="w-full btn btn-primary"
            >
              Continuer
            </button>
          </div>
        </div>
      )}

      {/* Token reward animation */}
      {tokenReward !== null && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="animate-token-float text-3xl font-bold text-primary drop-shadow-lg">
            +{tokenReward} $SAFE
          </div>
        </div>
      )}
    </div>
  );
}
