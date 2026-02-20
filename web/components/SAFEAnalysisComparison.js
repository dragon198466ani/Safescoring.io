'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApi } from '@/hooks/useApi';

/**
 * SAFE Analysis Comparison - UX for comparing AI vs Community results
 *
 * Features:
 * - Side-by-side AI vs Community scores
 * - Strategic analyses per pillar
 * - Community voting interface
 * - Evaluation-level comparison
 */
export default function SAFEAnalysisComparison({ product, slug }) {
  const [selectedPillar, setSelectedPillar] = useState('S');
  const [viewMode, setViewMode] = useState('overview'); // 'overview' | 'detailed' | 'community'

  const PILLARS = [
    { key: 'S', name: 'Security', icon: '🛡️', color: 'from-blue-500 to-blue-600' },
    { key: 'A', name: 'Adversity', icon: '⚡', color: 'from-orange-500 to-orange-600' },
    { key: 'F', name: 'Fidelity', icon: '🔐', color: 'from-green-500 to-green-600' },
    { key: 'E', name: 'Ecosystem', icon: '🌐', color: 'from-purple-500 to-purple-600' }
  ];

  // Use useApi for strategic analyses (5-minute cache)
  const { data: pillarAnalyses, isLoading: loadingAnalyses } = useApi(
    slug ? `/api/products/${slug}/strategic-analyses` : null,
    { ttl: 5 * 60 * 1000 }
  );

  // Use useApi for community stats (2-minute cache)
  const { data: communityStats, isLoading: loadingStats } = useApi(
    slug ? `/api/products/${slug}/community-stats` : null,
    { ttl: 2 * 60 * 1000 }
  );

  // Build evaluations URL based on selected pillar
  const evaluationsUrl = useMemo(() => {
    if (!slug) return null;
    return `/api/products/${slug}/evaluations?pillar=${selectedPillar}`;
  }, [slug, selectedPillar]);

  // Use useApi for evaluations (2-minute cache)
  const { data: evaluations, isLoading: loadingEvals } = useApi(evaluationsUrl, {
    ttl: 2 * 60 * 1000,
  });

  const loading = loadingAnalyses || loadingStats || loadingEvals;

  const handlePillarChange = (pillar) => {
    setSelectedPillar(pillar);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* View Mode Tabs */}
      <div className="flex gap-2 border-b border-base-300">
        {[
          { key: 'overview', label: 'Vue d\'ensemble', icon: '📊' },
          { key: 'detailed', label: 'Analyse détaillée', icon: '🔍' },
          { key: 'community', label: 'Consensus communauté', icon: '👥' }
        ].map(mode => (
          <button
            key={mode.key}
            onClick={() => setViewMode(mode.key)}
            className={`px-6 py-3 font-medium transition-all ${
              viewMode === mode.key
                ? 'border-b-2 border-primary text-primary'
                : 'text-base-content/60 hover:text-base-content'
            }`}
          >
            {mode.icon} {mode.label}
          </button>
        ))}
      </div>

      {/* Overview Mode */}
      {viewMode === 'overview' && (
        <div className="space-y-6">
          {/* Pillar Scores Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PILLARS.map(pillar => {
              const analysis = pillarAnalyses[pillar.key];
              const aiScore = analysis?.ai_score || 0;
              const communityScore = analysis?.community_adjusted_score || aiScore;
              const hasDifference = Math.abs(aiScore - communityScore) > 5;

              return (
                <motion.div
                  key={pillar.key}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handlePillarChange(pillar.key)}
                  className={`card bg-gradient-to-br ${pillar.color} text-white cursor-pointer ${
                    selectedPillar === pillar.key ? 'ring-4 ring-primary ring-offset-2' : ''
                  }`}
                >
                  <div className="card-body p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-3xl">{pillar.icon}</span>
                      {hasDifference && (
                        <span className="badge badge-warning badge-sm">
                          Corrigé
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold mb-2">{pillar.name}</h3>

                    {/* AI vs Community Scores */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm opacity-90">IA</span>
                        <span className="text-2xl font-bold">{aiScore}%</span>
                      </div>

                      {hasDifference && (
                        <div className="flex items-center justify-between border-t border-white/20 pt-2">
                          <span className="text-sm opacity-90">Communauté</span>
                          <span className="text-2xl font-bold">{communityScore}%</span>
                        </div>
                      )}
                    </div>

                    {/* Community participation */}
                    {analysis?.community_votes > 0 && (
                      <div className="mt-3 text-xs opacity-80">
                        {analysis.community_votes} vote{analysis.community_votes > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Selected Pillar Strategic Analysis */}
          <StrategicAnalysisCard
            pillar={PILLARS.find(p => p.key === selectedPillar)}
            analysis={pillarAnalyses[selectedPillar]}
          />
        </div>
      )}

      {/* Detailed Mode */}
      {viewMode === 'detailed' && (
        <DetailedEvaluationComparison
          evaluations={evaluations}
          pillar={PILLARS.find(p => p.key === selectedPillar)}
        />
      )}

      {/* Community Mode */}
      {viewMode === 'community' && (
        <CommunityConsensusView
          evaluations={evaluations}
          stats={communityStats}
          pillar={PILLARS.find(p => p.key === selectedPillar)}
        />
      )}
    </div>
  );
}

/**
 * Strategic Analysis Card - Shows AI analysis with community corrections
 */
function StrategicAnalysisCard({ pillar, analysis }) {
  if (!analysis) {
    return (
      <div className="card bg-base-200">
        <div className="card-body">
          <p className="text-base-content/60">Aucune analyse stratégique disponible</p>
        </div>
      </div>
    );
  }

  const hasCommunityCorrections = analysis.community_corrections > 0;

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="card-title text-2xl">
              {pillar.icon} Analyse {pillar.name}
            </h2>
            {hasCommunityCorrections && (
              <div className="badge badge-success gap-2 mt-2">
                ✓ Vérifié par la communauté ({analysis.community_corrections} corrections)
              </div>
            )}
          </div>

          <div className="text-right">
            <div className="text-4xl font-bold text-primary">
              {analysis.community_adjusted_score || analysis.ai_score}%
            </div>
            {hasCommunityCorrections && (
              <div className="text-sm text-base-content/60 line-through">
                IA: {analysis.ai_score}%
              </div>
            )}
          </div>
        </div>

        {/* Strategic Conclusion */}
        <div className="prose max-w-none mb-6">
          <p className="text-lg">{analysis.strategic_conclusion}</p>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Strengths */}
          {analysis.key_strengths?.length > 0 && (
            <div>
              <h3 className="font-bold text-success mb-3 flex items-center gap-2">
                ✓ Points forts
              </h3>
              <ul className="space-y-2">
                {analysis.key_strengths.map((strength, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-success">●</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses */}
          {analysis.key_weaknesses?.length > 0 && (
            <div>
              <h3 className="font-bold text-warning mb-3 flex items-center gap-2">
                ⚠ Points faibles
              </h3>
              <ul className="space-y-2">
                {analysis.key_weaknesses.map((weakness, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-warning">●</span>
                    <span>{weakness}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Critical Risks */}
        {analysis.critical_risks?.length > 0 && (
          <div className="mt-6 p-4 bg-error/10 rounded-lg">
            <h3 className="font-bold text-error mb-3 flex items-center gap-2">
              🚨 Risques critiques
            </h3>
            <ul className="space-y-2">
              {analysis.critical_risks.map((risk, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-error">●</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {analysis.recommendations?.length > 0 && (
          <div className="mt-6">
            <h3 className="font-bold text-info mb-3 flex items-center gap-2">
              💡 Recommandations
            </h3>
            <ul className="space-y-2">
              {analysis.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-info">●</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Evaluation Stats */}
        <div className="mt-6 pt-6 border-t border-base-300">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-success">
                {analysis.passed_norms_count}
              </div>
              <div className="text-xs text-base-content/60">Conformes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-error">
                {analysis.failed_norms_count}
              </div>
              <div className="text-xs text-base-content/60">Non-conformes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-warning">
                {analysis.tbd_norms_count}
              </div>
              <div className="text-xs text-base-content/60">À évaluer</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-info">
                {analysis.community_vote_count || 0}
              </div>
              <div className="text-xs text-base-content/60">Votes</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Detailed Evaluation Comparison - Evaluation-by-evaluation view
 */
function DetailedEvaluationComparison({ evaluations, pillar }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'disagreed' | 'corrected'

  const filteredEvals = evaluations.filter(e => {
    if (filter === 'disagreed') return e.community_disagrees > 0;
    if (filter === 'corrected') return e.community_validated_challenges > 0;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
        >
          Toutes ({evaluations.length})
        </button>
        <button
          onClick={() => setFilter('disagreed')}
          className={`btn btn-sm ${filter === 'disagreed' ? 'btn-warning' : 'btn-ghost'}`}
        >
          Contestées ({evaluations.filter(e => e.community_disagrees > 0).length})
        </button>
        <button
          onClick={() => setFilter('corrected')}
          className={`btn btn-sm ${filter === 'corrected' ? 'btn-success' : 'btn-ghost'}`}
        >
          Corrigées ({evaluations.filter(e => e.community_validated_challenges > 0).length})
        </button>
      </div>

      {/* Evaluations List */}
      <div className="space-y-3">
        {filteredEvals.map(evaluation => (
          <EvaluationComparisonCard key={evaluation.id} evaluation={evaluation} />
        ))}
      </div>
    </div>
  );
}

/**
 * Evaluation Comparison Card - Single evaluation with AI vs Community
 */
function EvaluationComparisonCard({ evaluation }) {
  const hasDisagreement = evaluation.community_disagrees > 0;
  const isCorrected = evaluation.community_validated_challenges > 0;
  const finalResult = isCorrected
    ? (evaluation.ai_result === 'YES' ? 'NO' : 'YES')
    : evaluation.ai_result;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card bg-base-100 shadow ${isCorrected ? 'ring-2 ring-success' : ''}`}
    >
      <div className="card-body p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Norm Info */}
          <div className="flex-1">
            <div className="font-mono text-sm text-primary mb-1">
              {evaluation.norm_code}
            </div>
            <div className="font-medium">{evaluation.norm_title}</div>
          </div>

          {/* AI Result */}
          <div className="text-center">
            <div className="text-xs text-base-content/60 mb-1">IA</div>
            <div className={`badge ${
              evaluation.ai_result === 'YES' ? 'badge-success' :
              evaluation.ai_result === 'NO' ? 'badge-error' : 'badge-warning'
            } ${isCorrected ? 'line-through opacity-50' : ''}`}>
              {evaluation.ai_result}
            </div>
          </div>

          {/* Community Result (if different) */}
          {isCorrected && (
            <div className="text-center">
              <div className="text-xs text-base-content/60 mb-1">Communauté</div>
              <div className={`badge ${
                finalResult === 'YES' ? 'badge-success' : 'badge-error'
              }`}>
                {finalResult} ✓
              </div>
            </div>
          )}

          {/* Community Stats */}
          <div className="text-center min-w-[80px]">
            <div className="text-xs text-base-content/60 mb-1">Votes</div>
            <div className="flex gap-2">
              <span className="badge badge-sm badge-success">
                {evaluation.community_agrees || 0}
              </span>
              <span className="badge badge-sm badge-error">
                {evaluation.community_disagrees || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Justification */}
        {evaluation.why_this_result && (
          <div className="mt-3 text-sm text-base-content/70 border-t border-base-300 pt-3">
            {evaluation.why_this_result}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Community Consensus View - Focus on community participation
 */
function CommunityConsensusView({ evaluations, stats, pillar }) {
  const totalVotes = evaluations.reduce((sum, e) =>
    sum + (e.community_agrees || 0) + (e.community_disagrees || 0), 0
  );

  const totalCorrections = evaluations.filter(e =>
    e.community_validated_challenges > 0
  ).length;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-title">Total votes</div>
          <div className="stat-value text-primary">{totalVotes}</div>
          <div className="stat-desc">Pour ce pilier</div>
        </div>

        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-title">Corrections validées</div>
          <div className="stat-value text-success">{totalCorrections}</div>
          <div className="stat-desc">IA avait tort</div>
        </div>

        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-title">Taux de précision IA</div>
          <div className="stat-value text-info">
            {evaluations.length > 0
              ? Math.round((1 - totalCorrections / evaluations.length) * 100)
              : 0}%
          </div>
          <div className="stat-desc">Validé par la communauté</div>
        </div>
      </div>

      {/* Most Contested Evaluations */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">Évaluations les plus contestées</h3>

          <div className="space-y-3 mt-4">
            {evaluations
              .filter(e => e.community_disagrees > 0)
              .sort((a, b) => b.community_disagrees - a.community_disagrees)
              .slice(0, 5)
              .map(e => (
                <div key={e.id} className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                  <div className="flex-1">
                    <div className="font-mono text-xs text-primary">{e.norm_code}</div>
                    <div className="text-sm">{e.norm_title?.substring(0, 60)}...</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-error">
                      {e.community_disagrees}
                    </div>
                    <div className="text-xs">contestations</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
