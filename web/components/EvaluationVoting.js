"use client";

/**
 * EvaluationVoting - Vote AGREE/DISAGREE sur les évaluations IA
 *
 * FOULOSCOPIE-BASED SYSTEM:
 * - Blind voting: Users don't see results until they vote (prevents herding)
 * - Weighted votes: Expertise and trust affect vote weight
 * - Stratified consensus: Expert/regular/newcomer votes tracked separately
 *
 * Système de gamification avec tokens $SAFE:
 * - Vote qui correspond au consensus: +1 $SAFE
 * - Vote challenger validé: +10 $SAFE
 * - Streak de votes corrects: bonus multiplicateur
 * - Sources documentées: +2 $SAFE
 *
 * RGPD: Utilise hash anonyme pour identification
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";

// Generate simple device fingerprint for fraud detection
function getDeviceFingerprint() {
  if (typeof window === "undefined") return null;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.textBaseline = "top";
  ctx.font = "14px Arial";
  ctx.fillText("fingerprint", 2, 2);
  const data = canvas.toDataURL();
  // Simple hash
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// Couleurs des piliers SAFE
const PILLAR_COLORS = {
  S: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30" },
  A: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" },
  F: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30" },
  E: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
};

// Token rewards configuration (displayed to user)
const REWARDS = {
  vote_agree: 1,
  vote_disagree: 2,
  vote_disagree_validated: 10,
  source_provided: 2,
  streak_bonus_3: 3,
  streak_bonus_7: 7,
  streak_bonus_30: 30,
};

export default function EvaluationVoting({
  productSlug = null,
  pillar = null,
  compact = false,
  maxItems = 10,
  onVoteSubmitted = null,
}) {
  const { data: session } = useSession();
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(null);
  const [expandedEval, setExpandedEval] = useState(null);
  const [userRewards, setUserRewards] = useState(null);
  const [message, setMessage] = useState(null);
  const [pagination, setPagination] = useState({ offset: 0, limit: maxItems, hasMore: false });

  // Anti-fraud: Track when evaluations were first viewed
  const viewedAtRef = useRef(new Map());
  const deviceFingerprintRef = useRef(null);

  // Generate device fingerprint on mount
  useEffect(() => {
    deviceFingerprintRef.current = getDeviceFingerprint();
  }, []);

  // Track when evaluations are viewed
  useEffect(() => {
    const now = Date.now();
    evaluations.forEach(eval_ => {
      if (!viewedAtRef.current.has(eval_.evaluation_id)) {
        viewedAtRef.current.set(eval_.evaluation_id, now);
      }
    });
  }, [evaluations]);

  // Calculate reading time for an evaluation
  const getReadingTimeMs = (evaluationId) => {
    const viewedAt = viewedAtRef.current.get(evaluationId);
    if (!viewedAt) return 0;
    return Date.now() - viewedAt;
  };

  // Fetch evaluations to vote on
  const fetchEvaluations = useCallback(async (offset = 0) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: offset.toString(),
        excludeVoted: "true",
      });

      if (productSlug) params.append("product", productSlug);
      if (pillar) params.append("pillar", pillar);

      const res = await fetch(`/api/community/evaluations?${params}`);
      const data = await res.json();

      if (res.ok) {
        setEvaluations(data.evaluations || []);
        setPagination(prev => ({
          ...prev,
          offset,
          hasMore: data.pagination?.hasMore || false,
        }));
      }
    } catch (error) {
      console.error("Error fetching evaluations:", error);
    } finally {
      setLoading(false);
    }
  }, [productSlug, pillar, pagination.limit]);

  // Fetch user rewards
  const fetchUserRewards = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/community/rewards");
      if (res.ok) {
        const data = await res.json();
        setUserRewards(data.rewards);
      }
    } catch {}
  }, [session]);

  useEffect(() => {
    fetchEvaluations(0);
  }, [fetchEvaluations]);

  useEffect(() => {
    fetchUserRewards();
  }, [fetchUserRewards]);

  // Submit AGREE vote
  const handleAgree = async (evaluationId) => {
    if (!session) {
      setMessage({ type: "error", text: "Connectez-vous pour voter et gagner des $SAFE" });
      return;
    }

    setVoting(evaluationId);
    setMessage(null);

    try {
      const res = await fetch("/api/community/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evaluationId,
          voteAgrees: true,
          readingTimeMs: getReadingTimeMs(evaluationId),
          deviceFingerprint: deviceFingerprintRef.current,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error });
        return;
      }

      // Show reward animation
      const reward = data.tokensEarned || 0;
      setMessage({
        type: "success",
        text: `+${reward} $SAFE`,
      });

      // Remove voted evaluation from list
      setEvaluations(prev => prev.filter(e => e.evaluation_id !== evaluationId));

      // Update user rewards
      if (userRewards) {
        setUserRewards(prev => ({
          ...prev,
          total_earned: (prev?.total_earned || 0) + reward,
          votes_submitted: (prev?.votes_submitted || 0) + 1,
        }));
      }

      if (onVoteSubmitted) {
        onVoteSubmitted({ evaluationId, voteAgrees: true, tokensEarned: reward });
      }

      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Erreur lors du vote" });
    } finally {
      setVoting(null);
    }
  };

  // Submit DISAGREE vote with challenge
  const handleDisagree = async (evaluationId, justification, evidenceUrl, evidenceType) => {
    if (!session) {
      setMessage({ type: "error", text: "Connectez-vous pour voter" });
      return;
    }

    if (!justification || justification.length < 10) {
      setMessage({ type: "error", text: "La justification doit faire au moins 10 caractères" });
      return;
    }

    setVoting(evaluationId);
    setMessage(null);

    try {
      const res = await fetch("/api/community/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evaluationId,
          voteAgrees: false,
          justification,
          evidenceUrl: evidenceUrl || undefined,
          evidenceType: evidenceType || "other",
          readingTimeMs: getReadingTimeMs(evaluationId),
          deviceFingerprint: deviceFingerprintRef.current,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error });
        return;
      }

      const reward = data.tokensEarned || 0;
      setMessage({
        type: "success",
        text: data.message || `Challenge soumis ! +${reward} $SAFE`,
      });

      // Remove voted evaluation from list
      setEvaluations(prev => prev.filter(e => e.evaluation_id !== evaluationId));

      // Update user rewards
      if (userRewards) {
        setUserRewards(prev => ({
          ...prev,
          total_earned: (prev?.total_earned || 0) + reward,
          votes_submitted: (prev?.votes_submitted || 0) + 1,
        }));
      }

      if (onVoteSubmitted) {
        onVoteSubmitted({ evaluationId, voteAgrees: false, tokensEarned: reward });
      }

      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      setMessage({ type: "error", text: "Erreur lors du vote" });
    } finally {
      setVoting(null);
    }
  };

  if (loading && evaluations.length === 0) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-base-200 rounded-lg" />
        ))}
      </div>
    );
  }

  if (evaluations.length === 0 && !loading) {
    return (
      <div className="text-center py-8 text-base-content/60">
        <div className="text-4xl mb-2">✅</div>
        <p>Toutes les évaluations ont été votées !</p>
        <p className="text-sm mt-1">Revenez plus tard pour de nouvelles évaluations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with user stats */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <span className="text-lg">🗳️</span>
            Voter sur les évaluations IA
          </h3>
          <p className="text-xs text-base-content/60">
            Confirmez ou contestez les scores IA et gagnez des $SAFE
          </p>
        </div>

        {userRewards && (
          <div className="flex items-center gap-3 bg-base-200 rounded-lg px-3 py-2">
            <div className="text-right">
              <div className="text-xs text-base-content/60">Total gagné</div>
              <div className="font-bold text-primary">{userRewards.total_earned || 0} $SAFE</div>
            </div>
            {userRewards.daily_streak > 0 && (
              <div className="text-right border-l border-base-300 pl-3">
                <div className="text-xs text-base-content/60">Streak</div>
                <div className="font-bold text-orange-400">🔥 {userRewards.daily_streak}</div>
              </div>
            )}
            <div className="text-right border-l border-base-300 pl-3">
              <div className="text-xs text-base-content/60">Votes</div>
              <div className="font-medium">{userRewards.votes_submitted || 0}</div>
            </div>
          </div>
        )}
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
            message.type === "error"
              ? "bg-error/10 text-error"
              : "bg-success/10 text-success"
          }`}
        >
          {message.type === "success" && <span className="text-lg">🎉</span>}
          {message.text}
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-xs opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Evaluations list */}
      <div className="space-y-3">
        {evaluations.map((evaluation) => (
          <EvaluationCard
            key={evaluation.evaluation_id}
            evaluation={evaluation}
            onAgree={() => handleAgree(evaluation.evaluation_id)}
            onDisagree={(justification, evidenceUrl, evidenceType) =>
              handleDisagree(evaluation.evaluation_id, justification, evidenceUrl, evidenceType)
            }
            voting={voting === evaluation.evaluation_id}
            expanded={expandedEval === evaluation.evaluation_id}
            onToggleExpand={() =>
              setExpandedEval(expandedEval === evaluation.evaluation_id ? null : evaluation.evaluation_id)
            }
            canVote={!!session}
            compact={compact}
          />
        ))}
      </div>

      {/* Pagination */}
      {(pagination.hasMore || pagination.offset > 0) && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => fetchEvaluations(Math.max(0, pagination.offset - pagination.limit))}
            disabled={pagination.offset === 0 || loading}
            className="btn btn-sm btn-ghost"
          >
            ← Précédent
          </button>
          <button
            onClick={() => fetchEvaluations(pagination.offset + pagination.limit)}
            disabled={!pagination.hasMore || loading}
            className="btn btn-sm btn-primary"
          >
            Suivant →
          </button>
        </div>
      )}

      {/* Login prompt */}
      {!session && (
        <div className="text-center py-4 bg-base-200 rounded-lg">
          <p className="text-sm text-base-content/70 mb-2">
            Connectez-vous pour voter et gagner des tokens $SAFE
          </p>
          <a href="/signin" className="btn btn-primary btn-sm">
            Se connecter
          </a>
        </div>
      )}

      {/* Rewards info */}
      {!compact && (
        <div className="space-y-3 mt-4">
          {/* Fouloscopie info */}
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/20">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <span>🧠</span> Intelligence collective (Fouloscopie)
            </h4>
            <ul className="text-xs space-y-1 text-base-content/70">
              <li className="flex items-center gap-2">
                <span className="text-blue-400">●</span>
                Vote aveugle: vous ne voyez pas les resultats avant de voter
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">●</span>
                Vote pondere: votre expertise augmente le poids de votre vote
              </li>
              <li className="flex items-center gap-2">
                <span className="text-purple-400">●</span>
                Diversite: le consensus exige des votes de differents profils
              </li>
            </ul>
          </div>

          {/* Rewards */}
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <span>💰</span> Recompenses $SAFE
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-base-content/70">Vote Agree</span>
                <span className="font-medium text-green-400">+{REWARDS.vote_agree}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/70">Challenge soumis</span>
                <span className="font-medium text-amber-400">+{REWARDS.vote_disagree}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/70">Challenge valide</span>
                <span className="font-medium text-orange-400">+{REWARDS.vote_disagree_validated}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/70">Streak 7 jours</span>
                <span className="font-medium text-purple-400">+{REWARDS.streak_bonus_7}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Single evaluation card
function EvaluationCard({
  evaluation,
  onAgree,
  onDisagree,
  voting,
  expanded,
  onToggleExpand,
  canVote,
  compact,
}) {
  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [justification, setJustification] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceType, setEvidenceType] = useState("other");

  const pillar = evaluation.pillar || "S";
  const colors = PILLAR_COLORS[pillar] || PILLAR_COLORS.S;

  // Blind voting: only show results if allowed
  const canSeeResults = evaluation.can_see_results !== false;

  // Calculate community confidence (only if visible)
  const totalVotes = canSeeResults ? (evaluation.agree_count || 0) + (evaluation.disagree_count || 0) : 0;
  const agreePercent = totalVotes > 0 ? ((evaluation.agree_count || 0) / totalVotes) * 100 : 50;
  const consensus = agreePercent > 70 ? "confirmed" : agreePercent < 30 ? "challenged" : "pending";
  const votesNeeded = evaluation.votes_needed || 3;

  // Result color helper
  const getResultColor = (result) => {
    if (result === "YES") return "text-green-400";
    if (result === "NO") return "text-red-400";
    if (result === "PARTIAL") return "text-yellow-400";
    return "text-base-content/60";
  };

  const handleSubmitChallenge = () => {
    onDisagree(justification, evidenceUrl, evidenceType);
    setShowChallengeForm(false);
    setJustification("");
    setEvidenceUrl("");
  };

  return (
    <div
      className={`p-4 rounded-lg border transition-all ${colors.border} ${colors.bg} ${
        expanded ? "ring-2 ring-primary/30" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Pillar badge */}
          <span
            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${colors.bg} ${colors.text}`}
          >
            {pillar}
          </span>

          {/* Product and Norm */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium truncate">{evaluation.product_name}</span>
              <span className="text-xs font-mono bg-base-300/50 px-1.5 py-0.5 rounded flex-shrink-0">
                {evaluation.norm_code}
              </span>
            </div>
            <p className={`text-xs text-base-content/60 ${compact ? "line-clamp-1" : "line-clamp-2"}`}>
              {evaluation.norm_title}
            </p>
          </div>
        </div>

        {/* AI Result */}
        <div className="text-right flex-shrink-0 ml-2">
          <div className="text-xs text-base-content/50">IA dit:</div>
          <div className={`text-lg font-bold ${getResultColor(evaluation.ai_result)}`}>
            {evaluation.ai_result}
          </div>
        </div>
      </div>

      {/* Community votes visualization - FOULOSCOPIE: Blind voting mode */}
      {!canSeeResults ? (
        <div className="mb-3 p-3 bg-base-300/30 rounded-lg">
          <div className="flex items-center justify-center gap-2 text-sm text-base-content/60">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
            <span>Vote aveugle actif</span>
          </div>
          <p className="text-xs text-center text-base-content/40 mt-1">
            Votez d'abord pour voir les resultats (evite l'effet mouton)
          </p>
          {votesNeeded > 0 && (
            <div className="text-xs text-center text-primary mt-2">
              {votesNeeded} vote{votesNeeded > 1 ? "s" : ""} encore necessaire{votesNeeded > 1 ? "s" : ""}
            </div>
          )}
        </div>
      ) : totalVotes > 0 ? (
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-green-400">👍 Agree ({evaluation.agree_count || 0})</span>
            <span className="text-base-content/40">{totalVotes} votes</span>
            <span className="text-red-400">👎 Challenge ({evaluation.disagree_count || 0})</span>
          </div>
          <div className="h-2 bg-base-300 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${agreePercent}%` }}
            />
            <div
              className="h-full bg-red-500 transition-all"
              style={{ width: `${100 - agreePercent}%` }}
            />
          </div>
          <div className="flex justify-center mt-1">
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                consensus === "confirmed"
                  ? "bg-green-500/20 text-green-400"
                  : consensus === "challenged"
                  ? "bg-red-500/20 text-red-400"
                  : "bg-base-300 text-base-content/60"
              }`}
            >
              {consensus === "confirmed"
                ? "✓ Confirme"
                : consensus === "challenged"
                ? "⚠ Conteste"
                : "En attente"}
            </span>
          </div>
        </div>
      ) : null}

      {/* Challenge form */}
      {showChallengeForm && (
        <div className="mt-3 pt-3 border-t border-base-300/50 space-y-3">
          <div>
            <label className="block text-xs font-medium text-base-content/70 mb-1">
              Pourquoi n'êtes-vous pas d'accord ? <span className="text-error">*</span>
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Expliquez pourquoi cette évaluation est incorrecte (min 10 caractères)..."
              className="textarea textarea-bordered textarea-sm w-full"
              rows={3}
              maxLength={2000}
            />
            <div className="text-xs text-base-content/40 text-right">
              {justification.length}/2000
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-base-content/70 mb-1">
                URL de preuve (optionnel, +2 $SAFE)
              </label>
              <input
                type="url"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://..."
                className="input input-bordered input-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-base-content/70 mb-1">
                Type de source
              </label>
              <select
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value)}
                className="select select-bordered select-sm w-full"
              >
                <option value="official_doc">Documentation officielle</option>
                <option value="github">GitHub/Code source</option>
                <option value="whitepaper">Whitepaper</option>
                <option value="article">Article/Blog</option>
                <option value="other">Autre</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setShowChallengeForm(false)}
              className="btn btn-sm btn-ghost"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmitChallenge}
              disabled={voting || justification.length < 10}
              className={`btn btn-sm btn-error ${voting ? "loading" : ""}`}
            >
              {voting ? "Envoi..." : "Soumettre le challenge (+2 $SAFE)"}
            </button>
          </div>
        </div>
      )}

      {/* Vote buttons */}
      {canVote && !showChallengeForm && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-base-300/50">
          <button
            onClick={() => setShowChallengeForm(true)}
            disabled={voting}
            className="flex-1 btn btn-sm btn-outline btn-error"
          >
            👎 Challenge
          </button>
          <button
            onClick={onAgree}
            disabled={voting}
            className={`flex-1 btn btn-sm btn-success ${voting ? "loading" : ""}`}
          >
            {voting ? "" : "👍"} Agree
          </button>
        </div>
      )}

      {/* Not logged in */}
      {!canVote && (
        <div className="text-center text-sm text-base-content/60 mt-3 pt-3 border-t border-base-300/50">
          <a href="/signin" className="text-primary hover:underline">Connectez-vous</a> pour voter
        </div>
      )}

      {/* Expand/collapse for details */}
      {!compact && (
        <button
          onClick={onToggleExpand}
          className="w-full mt-2 text-xs text-base-content/50 hover:text-base-content transition-colors"
        >
          {expanded ? "▲ Moins de détails" : "▼ Plus de détails"}
        </button>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-base-300/50 text-xs space-y-2">
          {evaluation.norm_title && (
            <div>
              <span className="text-base-content/50">Norme:</span>{" "}
              <span>{evaluation.norm_title}</span>
            </div>
          )}
          {evaluation.total_votes > 0 && (
            <div>
              <span className="text-base-content/50">Votes:</span>{" "}
              <span className="font-bold">{evaluation.total_votes}</span>
            </div>
          )}
          <div>
            <span className="text-base-content/50">ID évaluation:</span>{" "}
            <span className="font-mono">{evaluation.evaluation_id}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Export compact version for use in sidebars
export function EvaluationVotingCompact(props) {
  return <EvaluationVoting {...props} compact maxItems={3} />;
}
