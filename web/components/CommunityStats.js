"use client";

import { useState, useEffect, memo, useCallback, useMemo } from "react";
import Image from "next/image";

/**
 * CommunityStats - Product Links & Data
 *
 * Displays relevant data based on product type:
 * - Official channels first (Website, Discord, Twitter, etc.)
 * - Technical data (GitHub, DefiLlama for DeFi)
 * - Community reviews (Trustpilot, Reddit)
 */
function CommunityStats({ productName, productSlug }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/community-stats/${productSlug}`);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Failed to fetch community stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [productSlug]);

  const formatNumber = useCallback((num) => {
    if (!num) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }, []);

  const getChangeColor = useCallback((change) => {
    if (!change) return "text-base-content/50";
    const num = parseFloat(change);
    if (num > 0) return "text-green-400";
    if (num < 0) return "text-red-400";
    return "text-base-content/50";
  }, []);

  // Generate search URLs - memoized
  const trustpilotUrl = useMemo(() =>
    `https://www.trustpilot.com/search?query=${encodeURIComponent(productName)}`,
    [productName]
  );
  const redditUrl = useMemo(() =>
    `https://www.reddit.com/search/?q=${encodeURIComponent(productName)}&type=link&sort=new`,
    [productName]
  );

  // Check if we have any official links
  const hasOfficialLinks = stats?.links?.website || stats?.links?.discord ||
    stats?.links?.twitter || stats?.links?.telegram || stats?.links?.docs;

  // Check if we have technical data
  const hasTechnicalData = stats?.github || stats?.defillama;

  return (
    <div className="rounded-xl bg-base-200 border border-base-300 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-xl">🔗</span>
          Links & Resources
        </h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <span className="loading loading-spinner loading-md text-primary"></span>
        </div>
      ) : (
        <div className="space-y-4">

          {/* 1. OFFICIAL CHANNELS - Always first */}
          <div>
            <div className="text-xs text-base-content/50 mb-3 flex items-center gap-2">
              <span>Official Channels</span>
              {stats?.verified && (
                <span className="badge badge-xs badge-success gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Verified
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Website */}
              {stats?.links?.website && (
                <a
                  href={stats.links.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm gap-2 bg-base-300 hover:bg-primary hover:text-primary-content border-0"
                >
                  🌐 Website
                </a>
              )}

              {/* Discord */}
              {stats?.links?.discord && (
                <a
                  href={stats.links.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm gap-2 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white border-0"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  Discord
                </a>
              )}

              {/* Twitter/X */}
              {stats?.links?.twitter && (
                <a
                  href={stats.links.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm gap-2 bg-sky-500/20 text-sky-400 hover:bg-sky-500 hover:text-white border-0"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  Twitter
                </a>
              )}

              {/* Telegram */}
              {stats?.links?.telegram && (
                <a
                  href={stats.links.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm gap-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white border-0"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                  Telegram
                </a>
              )}

              {/* Documentation */}
              {stats?.links?.docs && (
                <a
                  href={stats.links.docs}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm gap-2 bg-base-300 hover:bg-primary hover:text-primary-content border-0"
                >
                  📚 Docs
                </a>
              )}

              {/* GitHub link (if no detailed stats) */}
              {stats?.links?.github && !stats?.github && (
                <a
                  href={stats.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm gap-2 bg-base-300 hover:bg-primary hover:text-primary-content border-0"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub
                </a>
              )}

              {/* No official links message */}
              {!hasOfficialLinks && (
                <span className="text-sm text-base-content/40 italic">
                  No official links available yet
                </span>
              )}
            </div>
          </div>

          {/* 2. TECHNICAL DATA - GitHub & DefiLlama */}
          {hasTechnicalData && (
            <div className="pt-4 border-t border-base-300">
              <div className="text-xs text-base-content/50 mb-3">Technical Data</div>
              <div className="space-y-3">

                {/* GitHub Stats */}
                {stats?.github && (
                  <div className="p-3 bg-base-300/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        <div className="flex items-center gap-3 text-sm">
                          <span>⭐ {formatNumber(stats.github.stars)}</span>
                          <span>🔀 {formatNumber(stats.github.forks)}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          stats.github.activityLevel === "very active" ? "bg-green-500/20 text-green-400" :
                          stats.github.activityLevel === "active" ? "bg-green-500/10 text-green-500" :
                          stats.github.activityLevel === "moderate" ? "bg-yellow-500/10 text-yellow-500" :
                          "bg-base-300 text-base-content/50"
                        }`}>
                          {stats.github.activityLevel}
                        </span>
                      </div>
                      <a
                        href={stats.github.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        View →
                      </a>
                    </div>
                  </div>
                )}

                {/* DefiLlama Stats */}
                {stats?.defillama && (
                  <div className="p-3 bg-base-300/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {stats.defillama.logo && (
                          <Image
                            src={stats.defillama.logo}
                            alt=""
                            width={20}
                            height={20}
                            className="w-5 h-5 rounded-full"
                            onError={(e) => e.target.style.display = 'none'}
                            unoptimized
                          />
                        )}
                        <span className="text-sm font-medium">DeFi Protocol</span>
                      </div>
                      <a
                        href={stats.defillama.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        DefiLlama →
                      </a>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-xs text-base-content/50">TVL</div>
                        <div className="text-lg font-bold text-primary">{stats.defillama.tvl}</div>
                      </div>
                      {stats.defillama.change7d && (
                        <div>
                          <div className="text-xs text-base-content/50">7d</div>
                          <div className={`text-lg font-bold ${getChangeColor(stats.defillama.change7d)}`}>
                            {parseFloat(stats.defillama.change7d) > 0 ? "+" : ""}{stats.defillama.change7d}%
                          </div>
                        </div>
                      )}
                      {stats.defillama.chains?.length > 0 && (
                        <div className="flex flex-wrap gap-1 ml-auto">
                          {stats.defillama.chains.slice(0, 3).map((chain, i) => (
                            <span key={i} className="px-2 py-0.5 text-xs bg-base-300 rounded-full">
                              {chain}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. COMMUNITY & REVIEWS - External search links */}
          <div className="pt-4 border-t border-base-300">
            <div className="text-xs text-base-content/50 mb-3">Community & Reviews</div>
            <div className="flex flex-wrap gap-2">
              {/* Trustpilot */}
              <a
                href={trustpilotUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm gap-2 bg-green-500/20 text-green-500 hover:bg-green-500 hover:text-white border-0"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                </svg>
                Trustpilot
              </a>

              {/* Reddit */}
              <a
                href={redditUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm gap-2 bg-orange-500/20 text-orange-500 hover:bg-orange-500 hover:text-white border-0"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701z"/>
                </svg>
                Reddit
              </a>
            </div>
          </div>

          {/* Attribution & Affiliate CTA */}
          <div className="text-xs text-center pt-2 space-y-1">
            <div className="text-base-content/40">
              Links to third-party sites • Not affiliated
            </div>
            {!stats?.verified && (
              <a
                href={`/claim?product=${productSlug}`}
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Are you the creator? Claim this product
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Memoize component to prevent unnecessary re-renders
export default memo(CommunityStats);
