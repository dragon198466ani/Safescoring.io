'use client';

import { useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';

/**
 * SAFE Comparison Charts - Visual comparison of AI vs Community scores
 */
export default function SAFEComparisonCharts({ pillarAnalyses, compactMode = false }) {
  // Prepare data for radar chart
  const radarData = useMemo(() => {
    const pillars = ['S', 'A', 'F', 'E'];
    const pillarNames = {
      S: 'Security',
      A: 'Adversity',
      F: 'Fidelity',
      E: 'Ecosystem'
    };

    return pillars.map(pillar => {
      const analysis = pillarAnalyses[pillar];
      return {
        pillar: pillarNames[pillar],
        'Score IA': analysis?.ai_score || 0,
        'Score Communauté': analysis?.community_adjusted_score || analysis?.ai_score || 0,
        fullMark: 100
      };
    });
  }, [pillarAnalyses]);

  // Prepare data for bar chart (corrections)
  const correctionsData = useMemo(() => {
    const pillars = ['S', 'A', 'F', 'E'];
    const pillarNames = {
      S: 'Security',
      A: 'Adversity',
      F: 'Fidelity',
      E: 'Ecosystem'
    };

    return pillars.map(pillar => {
      const analysis = pillarAnalyses[pillar];
      const corrections = analysis?.community_corrections || 0;
      const totalEvals = (analysis?.passed_norms_count || 0) +
                         (analysis?.failed_norms_count || 0) +
                         (analysis?.tbd_norms_count || 0);

      return {
        pillar: pillarNames[pillar],
        corrections,
        correctionRate: totalEvals > 0 ? Math.round((corrections / totalEvals) * 100) : 0,
        totalEvals
      };
    });
  }, [pillarAnalyses]);

  // Prepare data for accuracy chart
  const accuracyData = useMemo(() => {
    const pillars = ['S', 'A', 'F', 'E'];
    const pillarNames = {
      S: 'Security',
      A: 'Adversity',
      F: 'Fidelity',
      E: 'Ecosystem'
    };

    return pillars.map(pillar => {
      const analysis = pillarAnalyses[pillar];
      const corrections = analysis?.community_corrections || 0;
      const totalEvals = (analysis?.passed_norms_count || 0) + (analysis?.failed_norms_count || 0);
      const accuracy = totalEvals > 0 ? Math.round(((totalEvals - corrections) / totalEvals) * 100) : 100;

      return {
        pillar: pillarNames[pillar],
        'Précision IA': accuracy,
        'Corrections': 100 - accuracy
      };
    });
  }, [pillarAnalyses]);

  if (compactMode) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-sm">Scores SAFE - IA vs Communauté</h3>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="pillar" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                <Radar
                  name="Score IA"
                  dataKey="Score IA"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Radar
                  name="Score Communauté"
                  dataKey="Score Communauté"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Accuracy Bar Chart */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-sm">Précision IA par pilier</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={accuracyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="pillar" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Bar dataKey="Précision IA" stackId="a" fill="#10B981" />
                <Bar dataKey="Corrections" stackId="a" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Radar Chart - AI vs Community */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">
            📊 Comparaison IA vs Communauté
            <div className="badge badge-info badge-sm ml-2">Radar SAFE</div>
          </h2>

          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis
                dataKey="pillar"
                tick={{ fill: '#9CA3AF', fontSize: 14, fontWeight: 500 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: '#9CA3AF' }}
              />
              <Radar
                name="Score IA"
                dataKey="Score IA"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.3}
                strokeWidth={3}
              />
              <Radar
                name="Score Communauté (corrigé)"
                dataKey="Score Communauté"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.3}
                strokeWidth={3}
              />
              <Legend />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px'
                }}
              />
            </RadarChart>
          </ResponsiveContainer>

          <div className="text-sm text-base-content/60 text-center mt-4">
            Le score vert représente le score final après validation communautaire
          </div>
        </div>
      </div>

      {/* Community Corrections Bar Chart */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">
            🔍 Corrections communautaires par pilier
            <div className="badge badge-warning badge-sm ml-2">IA avait tort</div>
          </h2>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={correctionsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="pillar"
                tick={{ fill: '#9CA3AF' }}
              />
              <YAxis tick={{ fill: '#9CA3AF' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '8px'
                }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-base-300 p-3 rounded-lg shadow-lg">
                        <p className="font-bold">{data.pillar}</p>
                        <p className="text-sm text-warning">
                          {data.corrections} correction{data.corrections > 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-base-content/60">
                          {data.correctionRate}% des évaluations
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="corrections" fill="#F59E0B">
                {correctionsData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.corrections > 10 ? '#EF4444' : entry.corrections > 5 ? '#F59E0B' : '#10B981'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="text-sm text-base-content/60 text-center mt-4">
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 bg-success rounded"></span> Excellent (≤5 corrections)
              <span className="w-3 h-3 bg-warning rounded ml-4"></span> Moyen (6-10)
              <span className="w-3 h-3 bg-error rounded ml-4"></span> Faible (>10)
            </span>
          </div>
        </div>
      </div>

      {/* Stacked Accuracy Chart */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">
            ✓ Taux de précision IA
            <div className="badge badge-success badge-sm ml-2">Validé par la communauté</div>
          </h2>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={accuracyData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="pillar"
                tick={{ fill: '#9CA3AF' }}
              />
              <YAxis domain={[0, 100]} tick={{ fill: '#9CA3AF' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="Précision IA" stackId="a" fill="#10B981" />
              <Bar dataKey="Corrections" stackId="a" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>

          <div className="text-sm text-base-content/60 text-center mt-4">
            Pourcentage d'évaluations IA correctes (vert) vs incorrectes (rouge)
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(pillarAnalyses).map(([pillar, data]) => {
          const pillarNames = { S: 'Security', A: 'Adversity', F: 'Fidelity', E: 'Ecosystem' };
          const pillarIcons = { S: '🛡️', A: '⚡', F: '🔐', E: '🌐' };
          const totalEvals = (data?.passed_norms_count || 0) + (data?.failed_norms_count || 0);
          const corrections = data?.community_corrections || 0;
          const accuracy = totalEvals > 0 ? Math.round(((totalEvals - corrections) / totalEvals) * 100) : 100;

          return (
            <div key={pillar} className="stat bg-base-200 rounded-lg">
              <div className="stat-figure text-3xl">{pillarIcons[pillar]}</div>
              <div className="stat-title text-xs">{pillarNames[pillar]}</div>
              <div className="stat-value text-2xl">
                {accuracy}%
              </div>
              <div className="stat-desc">
                {corrections} correction{corrections > 1 ? 's' : ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
