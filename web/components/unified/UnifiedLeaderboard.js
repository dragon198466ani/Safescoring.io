'use client';

import { useState, useEffect, memo, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

/**
 * Unified Leaderboard Component
 * Replaces both Leaderboard.js and CommunityLeaderboard.js
 *
 * Supports:
 * - Products leaderboard (based on SAFE scores)
 * - Community leaderboard (based on $SAFE tokens earned from voting)
 * - Multiple display modes (full, compact, podium)
 * - Timeframe filtering (all time, month, week)
 * - Automatic user rank display
 *
 * @example Products Leaderboard
 * <UnifiedLeaderboard type="products" limit={10} />
 *
 * @example Community Leaderboard with timeframe
 * <UnifiedLeaderboard type="community" timeframe="week" limit={20} />
 *
 * @example Compact sidebar variant
 * <UnifiedLeaderboard type="community" variant="compact" limit={5} showTitle={false} />
 */
export default function UnifiedLeaderboard({
  type = 'products',        // 'products' | 'community'
  variant = 'full',         // 'full' | 'compact'
  timeframe = 'all',        // 'all' | 'month' | 'week'
  limit = 10,
  showTitle = true,
  showStats = true,
  showPodium = false,
  showTimeframeFilter = true
}) {
  const { data: session } = useSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);

  // Determine API endpoint based on type
  const endpoint = type === 'products'
    ? '/api/leaderboard'
    : '/api/community/leaderboard';

  // Fetch leaderboard data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(type === 'community' && { timeframe: selectedTimeframe })
      });

      const res = await fetch(`${endpoint}?${params}`);

      if (!res.ok) {
        throw new Error(`Failed to fetch ${type} leaderboard`);
      }

      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
      console.error(`${type} leaderboard error:`, err);
    } finally {
      setLoading(false);
    }
  }, [endpoint, limit, type, selectedTimeframe]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Loading state
  if (loading) {
    return <LoadingSkeleton variant={variant} />;
  }

  // Error state
  if (error || !data) {
    return <ErrorState error={error} onRetry={fetchData} />;
  }

  const { leaderboard, stats, userRank } = data;

  // Empty state
  if (!leaderboard || leaderboard.length === 0) {
    return <EmptyState type={type} />;
  }

  return (
    <div className="rounded-2xl bg-base-200 border border-base-300 overflow-hidden">
      {/* Header */}
      {showTitle && (
        <Header
          type={type}
          stats={stats}
          showStats={showStats}
          showTimeframeFilter={showTimeframeFilter}
          selectedTimeframe={selectedTimeframe}
          onTimeframeChange={setSelectedTimeframe}
          variant={variant}
        />
      )}

      {/* User rank banner */}
      {userRank && session && (
        <UserRankBanner userRank={userRank} stats={stats} type={type} />
      )}

      {/* Podium (top 3) - optional */}
      {showPodium && leaderboard.length >= 3 && !variant.includes('compact') && (
        <Podium entries={leaderboard.slice(0, 3)} type={type} />
      )}

      {/* Leaderboard table */}
      <LeaderboardTable
        entries={showPodium ? leaderboard.slice(3) : leaderboard}
        type={type}
        variant={variant}
        userRank={userRank}
      />

      {/* Footer stats */}
      {!variant.includes('compact') && stats && showStats && (
        <FooterStats stats={stats} type={type} />
      )}

      {/* CTA for unauthenticated users */}
      {!session && !variant.includes('compact') && type === 'community' && (
        <CTASection />
      )}

      {/* Link to full page from compact view */}
      {variant === 'compact' && (
        <CompactFooter type={type} />
      )}
    </div>
  );
}

/**
 * Header component with title and filters
 */
function Header({
  type,
  stats,
  showStats,
  showTimeframeFilter,
  selectedTimeframe,
  onTimeframeChange,
  variant
}) {
  const config = getLeaderboardConfig(type);

  return (
    <div className="p-6 border-b border-base-300">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.iconBg}`}>
            <span className="text-2xl">{config.icon}</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              {config.title}
              {type === 'community' && (
                <span className="text-amber-400 text-sm font-normal">$SAFE</span>
              )}
            </h2>
            {showStats && stats && (
              <p className="text-sm text-base-content/60">
                {stats.totalVoters?.toLocaleString() || stats.totalProducts?.toLocaleString() || 0} {type === 'community' ? 'voters' : 'products'} •{' '}
                {stats.totalVotes?.toLocaleString() || stats.totalEvaluations?.toLocaleString() || 0} {type === 'community' ? 'votes' : 'evaluations'}
              </p>
            )}
          </div>
        </div>

        {/* Timeframe filter (community only) */}
        {!variant.includes('compact') && type === 'community' && showTimeframeFilter && (
          <div className="flex gap-1 bg-base-300 rounded-lg p-1">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'month', label: 'Month' },
              { id: 'week', label: 'Week' }
            ].map((tf) => (
              <button
                key={tf.id}
                onClick={() => onTimeframeChange(tf.id)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  selectedTimeframe === tf.id
                    ? 'bg-primary text-primary-content'
                    : 'text-base-content/60 hover:text-base-content'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * User rank banner (when user is logged in and ranked)
 */
function UserRankBanner({ userRank, stats, type }) {
  return (
    <div className="px-6 py-3 bg-primary/10 border-b border-base-300 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="text-2xl font-bold text-primary">#{userRank.rank}</div>
        <div>
          <div className="text-sm font-medium">Your Rank</div>
          <div className="text-xs text-base-content/60">
            Top {((userRank.rank / (stats?.totalVoters || stats?.totalProducts || 1)) * 100).toFixed(1)}%
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono font-bold text-amber-400">
          {(userRank.tokens || userRank.score || 0).toLocaleString()}
        </div>
        <div className="text-xs text-base-content/60">
          {type === 'community' ? '$SAFE earned' : 'SAFE Score'}
        </div>
      </div>
    </div>
  );
}

/**
 * Podium display for top 3
 */
function Podium({ entries, type }) {
  if (entries.length < 3) return null;

  return (
    <div className="p-6 bg-gradient-to-br from-amber-500/5 to-purple-500/5 border-b border-base-300">
      <div className="flex items-end justify-center gap-8">
        {/* 2nd place */}
        <PodiumEntry entry={entries[1]} rank={2} type={type} />

        {/* 1st place */}
        <PodiumEntry entry={entries[0]} rank={1} type={type} />

        {/* 3rd place */}
        <PodiumEntry entry={entries[2]} rank={3} type={type} />
      </div>
    </div>
  );
}

function PodiumEntry({ entry, rank, type }) {
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const heights = { 1: 'h-32', 2: 'h-24', 3: 'h-20' };
  const bgColors = {
    1: 'bg-amber-500/20 text-amber-400',
    2: 'bg-gray-400/20 text-gray-400',
    3: 'bg-orange-600/20 text-orange-500'
  };

  const name = entry.displayName || entry.name || entry.product_name || 'Anonymous';
  const value = type === 'community'
    ? entry.tokensEarned || entry.total_tokens || 0
    : entry.score || entry.note_finale || 0;

  return (
    <div className="flex flex-col items-center">
      {/* Avatar */}
      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold mb-2 ${bgColors[rank]}`}>
        {name.charAt(0).toUpperCase()}
      </div>

      {/* Podium */}
      <div className={`${heights[rank]} w-24 rounded-t-xl bg-base-300 flex flex-col items-center justify-center p-3`}>
        <div className="text-3xl mb-1">{medals[rank]}</div>
        <div className="text-xs text-base-content/60 mb-1 truncate w-full text-center">
          {name.length > 10 ? name.substring(0, 8) + '...' : name}
        </div>
        <div className="font-bold text-lg text-success">
          {type === 'community' ? value.toLocaleString() : value.toFixed(1)}
        </div>
        <div className="text-xs text-base-content/60">
          {type === 'community' ? '$SAFE' : 'Score'}
        </div>
      </div>
    </div>
  );
}

/**
 * Main leaderboard table
 */
function LeaderboardTable({ entries, type, variant, userRank }) {
  const { data: session } = useSession();
  const compact = variant === 'compact';

  return (
    <div className="overflow-x-auto">
      <table className="table w-full">
        <thead className="bg-base-300/50">
          <tr>
            <th className="font-medium text-base-content/70 w-12">#</th>
            <th className="font-medium text-base-content/70">
              {type === 'community' ? 'Voter' : 'Product'}
            </th>
            {!compact && type === 'community' && (
              <th className="font-medium text-base-content/70 text-center">Stats</th>
            )}
            <th className="font-medium text-base-content/70 text-right">
              {type === 'community' ? (
                <span className="text-amber-400">$SAFE</span>
              ) : (
                'Score'
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => {
            const rank = entry.rank || (index + 1);
            const isCurrentUser = session && (
              (type === 'community' && userRank?.rank === rank) ||
              (type === 'products' && entry.slug === session.user?.favoriteProduct)
            );

            return (
              <LeaderboardRow
                key={entry.id || entry.slug || rank}
                entry={entry}
                rank={rank}
                type={type}
                compact={compact}
                isHighlighted={isCurrentUser}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Single leaderboard row
 */
function LeaderboardRow({ entry, rank, type, compact, isHighlighted }) {
  const name = entry.displayName || entry.name || entry.product_name || 'Unknown';
  const value = type === 'community'
    ? entry.tokensEarned || entry.total_tokens || 0
    : entry.score || entry.note_finale || 0;

  const formattedValue = type === 'community'
    ? value.toLocaleString()
    : value.toFixed(1);

  const medalEmoji = rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : null;

  const bgColors = {
    1: 'bg-amber-500/20 text-amber-400',
    2: 'bg-gray-400/20 text-gray-400',
    3: 'bg-orange-600/20 text-orange-500'
  };

  const avatarBg = rank <= 3 ? bgColors[rank] : 'bg-primary/20 text-primary';

  return (
    <tr
      className={`hover:bg-base-300/30 transition-colors ${
        isHighlighted ? 'bg-primary/5' : ''
      }`}
    >
      {/* Rank */}
      <td>
        {medalEmoji ? (
          <span className="text-xl">{medalEmoji}</span>
        ) : (
          <span className="text-base-content/50 font-mono">{rank}</span>
        )}
      </td>

      {/* Name/Avatar */}
      <td>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${avatarBg}`}>
            {name.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <span className="font-medium">{name}</span>
            {type === 'community' && entry.streak > 0 && (
              <span className="ml-2 text-xs text-orange-400">
                🔥 {entry.streak}
              </span>
            )}
            {!compact && type === 'community' && entry.challengesWon > 0 && (
              <div className="text-xs text-base-content/50">
                {entry.challengesWon} challenges won
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Stats (community only, full mode) */}
      {!compact && type === 'community' && (
        <td className="text-center">
          <div className="flex items-center justify-center gap-4 text-xs">
            <div className="text-center">
              <div className="font-bold text-green-400">
                {entry.votesSubmitted || 0}
              </div>
              <div className="text-base-content/50">votes</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-purple-400">
                {entry.challengesWon || 0}
              </div>
              <div className="text-base-content/50">wins</div>
            </div>
          </div>
        </td>
      )}

      {/* Value */}
      <td className="text-right">
        <div className={`font-mono font-bold ${type === 'community' ? 'text-amber-400' : 'text-success'}`}>
          {formattedValue}
        </div>
        {rank === 1 && (
          <div className={`text-xs ${type === 'community' ? 'text-amber-400/60' : 'text-success/60'}`}>
            Leader
          </div>
        )}
      </td>
    </tr>
  );
}

/**
 * Footer with aggregated stats
 */
function FooterStats({ stats, type }) {
  if (type === 'products') {
    return (
      <div className="p-4 bg-gradient-to-r from-success/10 to-primary/10 border-t border-base-300">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-success">
              {stats.totalProducts?.toLocaleString() || 0}
            </div>
            <div className="text-xs text-base-content/60">Products Scored</div>
          </div>
          <div>
            <div className="text-lg font-bold text-primary">
              {stats.totalEvaluations?.toLocaleString() || 0}
            </div>
            <div className="text-xs text-base-content/60">Evaluations</div>
          </div>
          <div>
            <div className="text-lg font-bold text-warning">
              {stats.averageScore?.toFixed(1) || 0}
            </div>
            <div className="text-xs text-base-content/60">Avg Score</div>
          </div>
        </div>
      </div>
    );
  }

  // Community stats
  return (
    <div className="p-4 bg-gradient-to-r from-amber-500/10 to-purple-500/10 border-t border-base-300">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-lg font-bold text-primary">
            {stats.totalVotes?.toLocaleString() || 0}
          </div>
          <div className="text-xs text-base-content/60">Total Votes</div>
        </div>
        <div>
          <div className="text-lg font-bold text-amber-400">
            {stats.totalTokensAwarded?.toLocaleString() || 0}
          </div>
          <div className="text-xs text-base-content/60">$SAFE Distributed</div>
        </div>
        <div>
          <div className="text-lg font-bold text-green-400">
            {stats.challengesValidated?.toLocaleString() || 0}
          </div>
          <div className="text-xs text-base-content/60">Challenges Won</div>
        </div>
      </div>
    </div>
  );
}

/**
 * CTA section for non-authenticated users
 */
function CTASection() {
  return (
    <div className="p-4 border-t border-base-300 text-center">
      <p className="text-sm text-base-content/70 mb-2">
        Join the community and start earning $SAFE tokens!
      </p>
      <Link href="/signin" className="btn btn-primary btn-sm">
        Sign in to vote
      </Link>
    </div>
  );
}

/**
 * Compact view footer with link to full page
 */
function CompactFooter({ type }) {
  const linkUrl = type === 'community' ? '/community' : '/leaderboard';

  return (
    <div className="p-4 border-t border-base-300 text-center">
      <Link href={linkUrl} className="text-sm text-primary hover:underline">
        View full leaderboard →
      </Link>
    </div>
  );
}

/**
 * Loading skeleton
 */
function LoadingSkeleton({ variant }) {
  const rows = variant === 'compact' ? 5 : 10;

  return (
    <div className="rounded-2xl bg-base-200 border border-base-300 p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-base-300 rounded w-1/3"></div>
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="w-8 h-8 bg-base-300 rounded-full"></div>
            <div className="flex-1 h-4 bg-base-300 rounded"></div>
            <div className="w-16 h-4 bg-base-300 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Error state
 */
function ErrorState({ error, onRetry }) {
  return (
    <div className="rounded-2xl bg-base-200 border border-base-300 p-6 text-center text-base-content/60">
      <div className="text-error mb-2">⚠️ Error</div>
      <p className="mb-3">{error || 'Unable to load leaderboard'}</p>
      <button
        onClick={onRetry}
        className="btn btn-sm btn-ghost"
      >
        Try again
      </button>
    </div>
  );
}

/**
 * Empty state
 */
function EmptyState({ type }) {
  return (
    <div className="rounded-2xl bg-base-200 border border-base-300 p-8 text-center text-base-content/60">
      <div className="text-4xl mb-2">
        {type === 'community' ? '🗳️' : '📊'}
      </div>
      <p className="font-medium">
        {type === 'community'
          ? 'No votes yet'
          : 'No products scored yet'}
      </p>
      <p className="text-sm mt-1">
        {type === 'community'
          ? 'Be the first to vote and earn $SAFE tokens!'
          : 'Check back soon for updated rankings'}
      </p>
    </div>
  );
}

/**
 * Configuration for different leaderboard types
 */
function getLeaderboardConfig(type) {
  if (type === 'community') {
    return {
      title: 'Community Champions',
      icon: '🏆',
      iconBg: 'bg-gradient-to-br from-amber-500/20 to-orange-500/20'
    };
  }

  return {
    title: 'Product Rankings',
    icon: '📊',
    iconBg: 'bg-gradient-to-br from-success/20 to-primary/20'
  };
}

// Memoize component to prevent unnecessary re-renders
export default memo(UnifiedLeaderboard);

/**
 * Convenience exports for specific use cases
 */

// Products leaderboard
export function ProductsLeaderboard(props) {
  return <UnifiedLeaderboard {...props} type="products" />;
}

// Community leaderboard
export function CommunityLeaderboard(props) {
  return <UnifiedLeaderboard {...props} type="community" />;
}

// Compact sidebar version (any type)
export function LeaderboardCompact(props) {
  return (
    <UnifiedLeaderboard
      {...props}
      variant="compact"
      limit={5}
      showTitle={false}
      showStats={false}
      showPodium={false}
    />
  );
}

// Podium-style leaderboard
export function LeaderboardPodium(props) {
  return (
    <UnifiedLeaderboard
      {...props}
      showPodium={true}
      limit={10}
    />
  );
}
