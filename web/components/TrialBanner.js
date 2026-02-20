"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";

/**
 * Trial countdown banner for dashboard
 * Shows remaining days in trial period with upgrade CTA
 */
export default function TrialBanner() {
  const [dismissed, setDismissed] = useState(false);

  // Check if banner was dismissed in this session (on client only)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const wasDismissed = sessionStorage.getItem("trial_banner_dismissed");
      if (wasDismissed) {
        setDismissed(true);
      }
    }
  }, []);

  // Use useApi for usage data with 2-minute cache (shared with UsageLimits)
  const { data, isLoading: loading } = useApi("/api/user/usage", {
    ttl: 2 * 60 * 1000,
  });

  // Compute trial info from usage data
  const trialInfo = useMemo(() => {
    if (!data?.isTrialing || !data?.trialEndsAt) return null;
    const daysRemaining = Math.ceil(
      (new Date(data.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24)
    );
    return {
      daysRemaining,
      planName: data.planType || "Trial",
      endsAt: data.trialEndsAt,
    };
  }, [data]);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("trial_banner_dismissed", "true");
  };

  if (loading || dismissed || !trialInfo) return null;

  const { daysRemaining, planName } = trialInfo;
  const isUrgent = daysRemaining <= 3;
  const isExpired = daysRemaining <= 0;

  return (
    <div
      className={`relative px-4 py-3 ${
        isExpired
          ? "bg-error/20 border-error/50"
          : isUrgent
          ? "bg-warning/20 border-warning/50"
          : "bg-primary/10 border-primary/30"
      } border-b`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isExpired
                ? "bg-error/20"
                : isUrgent
                ? "bg-warning/20"
                : "bg-primary/20"
            }`}
          >
            {isExpired ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4 text-error"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className={`w-4 h-4 ${isUrgent ? "text-warning" : "text-primary"}`}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </div>

          {/* Message */}
          <div>
            <span
              className={`text-sm font-medium ${
                isExpired
                  ? "text-error"
                  : isUrgent
                  ? "text-warning"
                  : "text-base-content"
              }`}
            >
              {isExpired ? (
                <>Your {planName} trial has expired</>
              ) : (
                <>
                  <span className="font-bold">{daysRemaining} day{daysRemaining !== 1 ? "s" : ""}</span>
                  {" "}remaining in your {planName} trial
                </>
              )}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/#pricing"
            className={`btn btn-sm ${
              isExpired || isUrgent ? "btn-warning" : "btn-primary"
            }`}
          >
            {isExpired ? "Choose a Plan" : "Upgrade Now"}
          </Link>
          {!isExpired && (
            <button
              onClick={handleDismiss}
              className="btn btn-ghost btn-sm btn-circle"
              aria-label="Dismiss banner"
            >
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
