"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

/**
 * VerificationTeaser - Compact card to encourage norm verification
 * Shows on product page to drive engagement and explain the points system
 */
export default function VerificationTeaser({ productName, productSlug, totalNorms }) {
  const { data: session } = useSession();
  const [userStats, setUserStats] = useState(null);

  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/corrections")
        .then(res => res.ok ? res.json() : null)
        .then(data => data && setUserStats(data.reputation))
        .catch(() => {});
    }
  }, [session?.user?.id]);

  const scrollToContribute = () => {
    const section = document.getElementById("contribute-section");
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="rounded-xl bg-gradient-to-r from-amber-500/10 via-base-200 to-purple-500/10 border border-amber-500/20 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Icon & Message */}
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-purple-500 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm">Help verify {productName}</h3>
            <p className="text-xs text-base-content/60">
              {totalNorms} norms to verify
              {userStats && (
                <span className="ml-2 text-amber-400">
                  Your points: {userStats.points_earned || userStats.corrections_approved * 50 || 0}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Points info */}
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 font-medium">
            +50 pts/verification
          </span>
        </div>

        {/* CTA */}
        {session ? (
          <button
            onClick={scrollToContribute}
            className="btn btn-sm btn-primary gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Verify Now
          </button>
        ) : (
          <Link href="/api/auth/signin" className="btn btn-sm btn-primary gap-1">
            Sign In to Verify
          </Link>
        )}
      </div>

      {/* Progress hint for logged-in users */}
      {session && userStats && (
        <div className="mt-3 pt-3 border-t border-base-content/10 flex items-center justify-between text-xs">
          <span className="text-base-content/50">
            Level: <span className="capitalize text-base-content/70">{userStats.reputation_level || "newcomer"}</span>
          </span>
          <Link href="/leaderboard" className="text-primary hover:underline">
            View Leaderboard
          </Link>
        </div>
      )}
    </div>
  );
}
