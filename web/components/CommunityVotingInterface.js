'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

/**
 * Community Voting Interface
 * Allows users to vote AGREE/DISAGREE on AI evaluations
 * Integrates with migration 136 (evaluation_votes table)
 */
export default function CommunityVotingInterface({ product, slug, userStats, onVoteSubmitted }) {
  const [evaluationsToVote, setEvaluationsToVote] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'S' | 'A' | 'F' | 'E'
  const [showReward, setShowReward] = useState(false);
  const [lastReward, setLastReward] = useState(0);

  useEffect(() => {
    loadEvaluations();
  }, [slug, filter]);

  const loadEvaluations = async () => {
    try {
      setLoading(true);
      const pillarParam = filter !== 'all' ? `&pillar=${filter}` : '';
      const res = await fetch(`/api/products/${slug}/evaluations-to-vote?limit=50${pillarParam}`);

      if (res.ok) {
        const data = await res.json();
        setEvaluationsToVote(data);
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('Error loading evaluations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (agrees, justification = null, evidenceUrl = null) => {
    if (voting || !currentEval) return;

    try {
      setVoting(true);

      const res = await fetch('/api/community/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluation_id: currentEval.id,
          vote_agrees: agrees,
          justification: agrees ? null : justification,
          evidence_url: agrees ? null : evidenceUrl
        })
      });

      if (res.ok) {
        const result = await res.json();

        // Show reward animation
        if (result.tokens_earned > 0) {
          setLastReward(result.tokens_earned);
          setShowReward(true);
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.8 }
          });

          setTimeout(() => setShowReward(false), 3000);
        }

        // Move to next evaluation
        setCurrentIndex(prev => prev + 1);

        // Reload user stats
        if (onVoteSubmitted) {
          onVoteSubmitted();
        }
      } else {
        const error = await res.json();
        alert(error.error || 'Erreur lors du vote');
      }
    } catch (error) {
      console.error('Vote error:', error);
      alert('Erreur lors du vote');
    } finally {
      setVoting(false);
    }
  };

  const currentEval = evaluationsToVote[currentIndex];
  const progress = evaluationsToVote.length > 0
    ? ((currentIndex / evaluationsToVote.length) * 100).toFixed(0)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!currentEval) {
    return (
      <div className="card bg-base-200">
        <div className="card-body text-center py-20">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold mb-2">
            Toutes les évaluations votées!
          </h2>
          <p className="text-base-content/70 mb-6">
            Vous avez terminé toutes les évaluations disponibles pour ce produit.
          </p>
          <button
            onClick={() => window.location.href = '/products'}
            className="btn btn-primary"
          >
            Découvrir d'autres produits
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="card bg-base-200">
        <div className="card-body p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Progression: {currentIndex} / {evaluationsToVote.length}
            </span>
            <span className="text-sm text-base-content/60">{progress}%</span>
          </div>
          <progress
            className="progress progress-primary w-full"
            value={currentIndex}
            max={evaluationsToVote.length}
          ></progress>
        </div>
      </div>

      {/* Reward Animation */}
      <AnimatePresence>
        {showReward && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className="alert alert-success shadow-lg"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">💰</span>
              <div>
                <div className="font-bold text-lg">+{lastReward} $SAFE gagnés!</div>
                <div className="text-sm opacity-80">Merci pour votre contribution</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Pills */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: 'Tous', icon: '🔍' },
          { key: 'S', label: 'Security', icon: '🛡️' },
          { key: 'A', label: 'Adversity', icon: '⚡' },
          { key: 'F', label: 'Fidelity', icon: '🔐' },
          { key: 'E', label: 'Ecosystem', icon: '🌐' }
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-ghost'}`}
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {/* Current Evaluation Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentEval.id}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          className="card bg-base-100 shadow-2xl"
        >
          <div className="card-body">
            {/* Norm Info */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge badge-primary">{currentEval.pillar}</span>
                  <span className="font-mono text-sm text-primary">
                    {currentEval.norm_code}
                  </span>
                </div>
                <h3 className="text-xl font-bold">{currentEval.norm_title}</h3>
              </div>
            </div>

            {/* AI Evaluation */}
            <div className="bg-base-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-base-content/60">Évaluation IA</span>
                <span className={`badge badge-lg ${
                  currentEval.ai_result === 'YES' ? 'badge-success' :
                  currentEval.ai_result === 'NO' ? 'badge-error' : 'badge-warning'
                }`}>
                  {currentEval.ai_result}
                </span>
              </div>

              {currentEval.why_this_result && (
                <div className="text-sm">
                  <div className="font-medium mb-1">Justification:</div>
                  <p className="text-base-content/80">{currentEval.why_this_result}</p>
                </div>
              )}
            </div>

            {/* Voting Question */}
            <div className="text-center mb-6">
              <h4 className="text-2xl font-bold mb-2">
                Êtes-vous d'accord avec cette évaluation?
              </h4>
              <p className="text-base-content/60">
                Votre vote aide à améliorer la précision de SafeScoring
              </p>
            </div>

            {/* Voting Buttons */}
            <VotingButtons
              onAgree={() => handleVote(true)}
              onDisagree={() => handleVote(false)}
              disabled={voting}
            />

            {/* Stats */}
            {currentEval.vote_count > 0 && (
              <div className="mt-6 pt-6 border-t border-base-300">
                <div className="flex items-center justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-success">👍</span>
                    <span>{currentEval.agree_count} d'accord</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-error">👎</span>
                    <span>{currentEval.disagree_count} pas d'accord</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Token Reward Table */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h3 className="card-title text-sm">💰 Barème des récompenses</h3>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <tbody>
                <tr>
                  <td>Vote VRAI (d'accord avec IA)</td>
                  <td className="text-right font-bold text-success">+1 $SAFE</td>
                </tr>
                <tr>
                  <td>Vote FAUX soumis (en attente)</td>
                  <td className="text-right font-bold text-warning">+2 $SAFE</td>
                </tr>
                <tr>
                  <td>Vote FAUX validé (IA avait tort!)</td>
                  <td className="text-right font-bold text-error">+10 $SAFE</td>
                </tr>
                <tr>
                  <td>Bonus premier vote du jour</td>
                  <td className="text-right font-bold text-info">+2 $SAFE</td>
                </tr>
                <tr>
                  <td>Bonus streak 7 jours</td>
                  <td className="text-right font-bold text-primary">+15 $SAFE</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Voting Buttons Component
 */
function VotingButtons({ onAgree, onDisagree, disabled }) {
  const [showDisagreeForm, setShowDisagreeForm] = useState(false);
  const [justification, setJustification] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');

  const handleDisagree = () => {
    if (justification.length < 10) {
      alert('La justification doit contenir au moins 10 caractères');
      return;
    }
    onDisagree(justification, evidenceUrl);
    setShowDisagreeForm(false);
    setJustification('');
    setEvidenceUrl('');
  };

  if (showDisagreeForm) {
    return (
      <div className="space-y-4">
        <div className="alert alert-warning">
          <div className="text-sm">
            <div className="font-bold">⚠️ Contestation importante</div>
            <div>Veuillez justifier pourquoi l'IA a tort (minimum 10 caractères)</div>
          </div>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Justification *</span>
          </label>
          <textarea
            className="textarea textarea-bordered h-24"
            placeholder="Expliquez pourquoi cette évaluation est incorrecte..."
            value={justification}
            onChange={e => setJustification(e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Preuve / Source (optionnel)</span>
          </label>
          <input
            type="url"
            className="input input-bordered"
            placeholder="https://..."
            value={evidenceUrl}
            onChange={e => setEvidenceUrl(e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDisagree}
            disabled={disabled || justification.length < 10}
            className="btn btn-error flex-1"
          >
            Confirmer le désaccord
          </button>
          <button
            onClick={() => setShowDisagreeForm(false)}
            disabled={disabled}
            className="btn btn-ghost"
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <button
        onClick={onAgree}
        disabled={disabled}
        className="btn btn-success btn-lg gap-2"
      >
        <span className="text-2xl">👍</span>
        <div className="text-left">
          <div className="font-bold">VRAI</div>
          <div className="text-xs opacity-80">+1 $SAFE</div>
        </div>
      </button>

      <button
        onClick={() => setShowDisagreeForm(true)}
        disabled={disabled}
        className="btn btn-error btn-lg gap-2"
      >
        <span className="text-2xl">👎</span>
        <div className="text-left">
          <div className="font-bold">FAUX</div>
          <div className="text-xs opacity-80">+2 $SAFE (justification requise)</div>
        </div>
      </button>
    </div>
  );
}
