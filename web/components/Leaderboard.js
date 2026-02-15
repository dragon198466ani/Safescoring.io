"use client";

import { useState, useEffect, memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "@/libs/i18n/LanguageProvider";

const levelColors = {
  newcomer: "text-gray-400",
  contributor: "text-blue-400",
  trusted: "text-green-400",
  expert: "text-purple-400",
  oracle: "text-amber-400",
};

const levelBadges = {
  newcomer: "",
  contributor: "",
  trusted: "",
  expert: "",
  oracle: "",
};

/**
 * Leaderboard - Top contributors for future token airdrop
 * Creates FOMO and engagement anticipation
 */
function Leaderboard({ limit = 10, showTitle = true }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch(`/api/leaderboard?limit=${limit}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, [limit]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-base-200 border border-base-300 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-base-300 rounded w-1/3"></div>
          {[...Array(5)].map((_, i) => (
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

  if (error || !data) {
    return null;
  }

  const { leaderboard, global, airdropInfo: _airdropInfo } = data;

  return (
    <div className="rounded-2xl bg-base-200 border border-base-300 overflow-hidden">
      {showTitle && (
        <div className="p-6 border-b border-base-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-amber-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold">{t("leaderboardComponent.topContributors")}</h2>
                <p className="text-sm text-base-content/60">
                  {t("leaderboardComponent.contributorsEarning", { count: global.totalContributors })}
                </p>
              </div>
            </div>
            <Link
              href="/leaderboard"
              className="text-sm text-primary hover:underline"
            >
              {t("leaderboardComponent.viewAll")}
            </Link>
          </div>
        </div>
      )}

      {/* Leaderboard table */}
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead className="bg-base-300/50">
            <tr>
              <th className="font-medium text-base-content/70 w-12">{t("leaderboardComponent.rank")}</th>
              <th className="font-medium text-base-content/70">{t("leaderboardComponent.contributor")}</th>
              <th className="font-medium text-base-content/70 text-center">{t("leaderboardComponent.level")}</th>
              <th className="font-medium text-base-content/70 text-right">{t("leaderboardComponent.points")}</th>
              <th className="font-medium text-base-content/70 text-right">
                <span className="text-amber-400">{t("leaderboardComponent.estAirdrop")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry) => (
              <tr key={entry.userId} className="hover:bg-base-300/30">
                <td>
                  {entry.rank <= 3 ? (
                    <span className="text-lg">
                      {entry.rank === 1 && ""}
                      {entry.rank === 2 && ""}
                      {entry.rank === 3 && ""}
                    </span>
                  ) : (
                    <span className="text-base-content/50">{entry.rank}</span>
                  )}
                </td>
                <td>
                  <div className="flex items-center gap-3">
                    {entry.avatar ? (
                      <Image
                        src={entry.avatar}
                        alt={entry.name}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full"
                        unoptimized
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                        {entry.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">{entry.name}</span>
                      <div className="text-xs text-base-content/50">
                        {entry.stats.correctionsApproved} {t("leaderboardComponent.corrections")}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="text-center">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${levelColors[entry.reputation.level]} bg-base-300`}
                  >
                    {levelBadges[entry.reputation.level]} {entry.reputation.level}
                  </span>
                </td>
                <td className="text-right">
                  <span className="font-mono">{entry.airdrop.basePoints.toLocaleString()}</span>
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className="font-mono font-bold text-amber-400">
                      {entry.airdrop.estimatedPoints.toLocaleString()}
                    </span>
                    <span className="text-xs text-base-content/50">{t("leaderboardComponent.pts")}</span>
                  </div>
                  <div className="text-xs text-base-content/40">
                    x{entry.airdrop.levelMultiplier} x{entry.seniority.multiplier}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Airdrop info footer */}
      <div className="p-4 bg-gradient-to-r from-amber-500/10 to-purple-500/10 border-t border-base-300">
        <div className="flex items-center gap-2 text-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-base-content/70">
            {t("leaderboardComponent.airdropNote")}
          </span>
        </div>
      </div>
    </div>
  );
}

// Memoize to prevent re-renders when parent updates
export default memo(Leaderboard);
