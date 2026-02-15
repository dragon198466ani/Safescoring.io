"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import UsageBanner from "@/components/UsageBanner";

/**
 * ProductViewGate
 * Enforces free tier view limits on product pages.
 *
 * - Unauthenticated users: see everything (incentive to sign up)
 * - Paid users: see everything, no tracking
 * - Free users: tracked via /api/user/track-view, paywall on limit
 */
export default function ProductViewGate({ productId, children }) {
  const { data: session, status } = useSession();
  const [viewState, setViewState] = useState(null); // null = loading
  const [error, setError] = useState(false);

  useEffect(() => {
    // Not logged in → show everything freely
    if (status === "unauthenticated") {
      setViewState({ allowed: true, guest: true });
      return;
    }

    // Still loading session
    if (status === "loading") return;

    // Authenticated → track the view
    trackView();
  }, [status, productId]);

  const trackView = async () => {
    try {
      const res = await fetch("/api/user/track-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      if (res.ok) {
        const data = await res.json();
        setViewState(data);
      } else {
        // API error → fail open (don't block users due to infra issues)
        if (process.env.NODE_ENV === "development") console.error("Track view API error:", res.status);
        setViewState({ allowed: true, fallback: true });
        setError(true);
      }
    } catch (err) {
      // Network error → fail open
      if (process.env.NODE_ENV === "development") console.error("Track view network error:", err);
      setViewState({ allowed: true, fallback: true });
      setError(true);
    }
  };

  // Loading state — show skeleton instead of blank
  if (!viewState) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-64 bg-base-200 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48 bg-base-200 rounded-xl" />
          <div className="h-48 bg-base-200 rounded-xl" />
        </div>
      </div>
    );
  }

  // Limit reached → paywall overlay
  if (!viewState.allowed && viewState.limitReached) {
    return (
      <div className="relative">
        {/* Blurred preview of first section */}
        <div className="blur-sm pointer-events-none select-none max-h-[400px] overflow-hidden opacity-60">
          {children}
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-base-100/80 to-base-100" />

        {/* Paywall card */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-base-100 border border-base-300 rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-8 h-8 text-primary"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Monthly Limit Reached</h3>
            <p className="text-base-content/60 mb-2">
              You&apos;ve reached your free tier limit of{" "}
              <span className="font-semibold text-base-content">
                {viewState.limit} product views
              </span>{" "}
              this month.
            </p>
            <p className="text-base-content/50 text-sm mb-6">
              Upgrade to unlock unlimited access to all product ratings, detailed reports, and more.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/#pricing" className="btn btn-primary btn-md w-full sm:w-auto">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                  />
                </svg>
                View Plans
              </Link>
              <Link href="/products" className="btn btn-ghost btn-md w-full sm:w-auto">
                Browse Products
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Allowed → show content + usage banner if near limit
  const showBanner =
    !viewState.guest &&
    !viewState.isPaid &&
    viewState.remaining !== undefined &&
    viewState.remaining >= 0 &&
    viewState.remaining <= 2;

  return (
    <>
      {showBanner && <UsageBanner />}
      {children}
    </>
  );
}
