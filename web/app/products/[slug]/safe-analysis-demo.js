'use client';

/**
 * DEMO: Complete Product Page with SAFE Analysis & Community Voting
 *
 * This demonstrates the full integration of:
 * - Strategic analyses per pillar
 * - AI vs Community comparison charts
 * - Community voting interface
 * - Real-time score updates
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import SAFEAnalysisComparison from '@/components/SAFEAnalysisComparison';
import CommunityVotingInterface from '@/components/CommunityVotingInterface';

export default function ProductSAFEAnalysisDemo({ product, slug }) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('analysis'); // 'analysis' | 'vote'
  const [userStats, setUserStats] = useState(null);

  useEffect(() => {
    if (session?.user) {
      loadUserStats();
    }
  }, [session]);

  const loadUserStats = async () => {
    try {
      const res = await fetch('/api/user/voting-stats');
      if (res.ok) {
        const data = await res.json();
        setUserStats(data);
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Product Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{product.name}</h1>
        <p className="text-base-content/70 text-lg">
          Analyse SAFE complète - IA & Communauté
        </p>
      </div>

      {/* User Stats Banner (if logged in) */}
      {session?.user && userStats && (
        <div className="alert alert-info mb-6">
          <div className="flex items-center gap-4">
            <div className="badge badge-primary badge-lg">
              {userStats.total_tokens} $SAFE
            </div>
            <div className="text-sm">
              <div className="font-bold">Vos contributions</div>
              <div className="opacity-80">
                {userStats.votes_submitted} votes • {userStats.challenges_won} challenges gagnés
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="tabs tabs-boxed mb-6 bg-base-200">
        <button
          onClick={() => setActiveTab('analysis')}
          className={`tab tab-lg ${activeTab === 'analysis' ? 'tab-active' : ''}`}
        >
          📊 Analyses Stratégiques
        </button>
        <button
          onClick={() => setActiveTab('vote')}
          className={`tab tab-lg ${activeTab === 'vote' ? 'tab-active'} gap-2`}
        >
          🗳️ Voter & Gagner des $SAFE
          {!session && <span className="badge badge-sm badge-warning">Connexion requise</span>}
        </button>
      </div>

      {/* Content */}
      {activeTab === 'analysis' && (
        <div>
          {/* SAFE Analysis Comparison Component */}
          <SAFEAnalysisComparison product={product} slug={slug} />

          {/* Call to Action */}
          <div className="card bg-gradient-to-br from-primary/10 to-secondary/10 mt-8">
            <div className="card-body text-center">
              <h3 className="card-title justify-center text-2xl">
                💎 Participez à l'amélioration de SafeScoring
              </h3>
              <p className="text-base-content/80 max-w-2xl mx-auto">
                Chaque vote compte! Validez ou contestez les évaluations IA et gagnez des tokens $SAFE.
                Vos contributions aident la communauté à identifier les produits vraiment sûrs.
              </p>
              <div className="card-actions justify-center mt-4">
                {session ? (
                  <button
                    onClick={() => setActiveTab('vote')}
                    className="btn btn-primary btn-lg gap-2"
                  >
                    Commencer à voter
                    <span className="badge badge-success">+1 $SAFE par vote</span>
                  </button>
                ) : (
                  <button
                    onClick={() => window.location.href = '/signin'}
                    className="btn btn-primary btn-lg"
                  >
                    Se connecter pour voter
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'vote' && (
        <div>
          {session ? (
            <CommunityVotingInterface
              product={product}
              slug={slug}
              userStats={userStats}
              onVoteSubmitted={loadUserStats}
            />
          ) : (
            <div className="card bg-base-200">
              <div className="card-body text-center py-20">
                <h2 className="text-3xl font-bold mb-4">
                  🔒 Connexion requise
                </h2>
                <p className="text-lg text-base-content/70 mb-6 max-w-md mx-auto">
                  Connectez-vous pour voter sur les évaluations et gagner des tokens $SAFE
                </p>
                <button
                  onClick={() => window.location.href = '/signin'}
                  className="btn btn-primary btn-lg"
                >
                  Se connecter
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-6 mt-8">
        <div className="card bg-base-200">
          <div className="card-body">
            <h3 className="card-title text-sm">🎯 Précision IA</h3>
            <p className="text-3xl font-bold text-success">95%+</p>
            <p className="text-xs text-base-content/60">
              Validé par la communauté SafeScoring
            </p>
          </div>
        </div>

        <div className="card bg-base-200">
          <div className="card-body">
            <h3 className="card-title text-sm">👥 Contributeurs actifs</h3>
            <p className="text-3xl font-bold text-primary">2,500+</p>
            <p className="text-xs text-base-content/60">
              Membres de la communauté vérifient les données
            </p>
          </div>
        </div>

        <div className="card bg-base-200">
          <div className="card-body">
            <h3 className="card-title text-sm">💰 Tokens distribués</h3>
            <p className="text-3xl font-bold text-warning">125K $SAFE</p>
            <p className="text-xs text-base-content/60">
              Récompenses pour contributions communautaires
            </p>
          </div>
        </div>
      </div>

      {/* Methodology Explanation */}
      <div className="card bg-base-100 shadow-xl mt-8">
        <div className="card-body">
          <h2 className="card-title">❓ Comment ça marche?</h2>

          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <div>
              <h3 className="font-bold text-primary mb-2">🤖 Analyse IA (Claude Opus)</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-success">✓</span>
                  <span>Évaluation de 2,159 normes de sécurité</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success">✓</span>
                  <span>Analyse des 4 piliers SAFE (S, A, F, E)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success">✓</span>
                  <span>Conclusions stratégiques détaillées</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-secondary mb-2">👥 Validation Communauté</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-success">✓</span>
                  <span>Vote VRAI/FAUX sur chaque évaluation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success">✓</span>
                  <span>Justifications obligatoires si FAUX</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success">✓</span>
                  <span>Récompenses en $SAFE pour contributions</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="alert alert-warning mt-6">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <div className="font-bold">Score final = IA + Corrections communauté</div>
                <div className="text-sm">
                  Quand la communauté valide une contestation, le score est automatiquement corrigé.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
