"use client";

import { useState, useEffect, memo } from "react";
import Link from "next/link";

const getScoreColor = (score) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
};

/**
 * Leaderboard - Top rated products by SafeScore
 * Displays product rankings only — no personal data
 */
function Leaderboard({ limit = 10, showTitle = true }) {
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

  const { leaderboard, stats } = data;

  return (
    <div className="rounded-2xl bg-base-200 border border-base-300 overflow-hidden">
      {showTitle && (
        <div className="p-6 border-b border-base-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-green-400"
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
                <h2 className="text-lg font-semibold">Top Rated Products</h2>
                <p className="text-sm text-base-content/60">
                  {stats?.totalProducts || 0} products evaluated
                </p>
              </div>
            </div>
            <Link
              href="/leaderboard"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead className="bg-base-300/50">
            <tr>
              <th className="font-medium text-base-content/70 w-12">#</th>
              <th className="font-medium text-base-content/70">Product</th>
              <th className="font-medium text-base-content/70 text-center">S</th>
              <th className="font-medium text-base-content/70 text-center">A</th>
              <th className="font-medium text-base-content/70 text-center">F</th>
              <th className="font-medium text-base-content/70 text-center">E</th>
              <th className="font-medium text-base-content/70 text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry) => (
              <tr key={entry.slug} className="hover:bg-base-300/30">
                <td>
                  <span className="text-base-content/50">{entry.rank}</span>
                </td>
                <td>
                  <Link
                    href={`/products/${entry.slug}`}
                    className="font-medium hover:text-primary"
                  >
                    {entry.name}
                  </Link>
                </td>
                <td className="text-center text-sm" style={{ color: '#00d4aa' }}>{entry.scores.s}</td>
                <td className="text-center text-sm" style={{ color: '#8b5cf6' }}>{entry.scores.a}</td>
                <td className="text-center text-sm" style={{ color: '#f59e0b' }}>{entry.scores.f}</td>
                <td className="text-center text-sm" style={{ color: '#06b6d4' }}>{entry.scores.e}</td>
                <td className="text-right">
                  <span className={`font-bold ${getScoreColor(entry.score)}`}>
                    {entry.score}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-base-300/30 border-t border-base-300">
        <p className="text-xs text-base-content/50 text-center">
          Scores are algorithmic assessments of products, not financial advice.
          Always do your own research.
        </p>
      </div>
    </div>
  );
}

export default memo(Leaderboard);
