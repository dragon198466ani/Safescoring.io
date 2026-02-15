"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "@/libs/i18n/LanguageProvider";

export default function UsageBanner() {
  const { t } = useTranslation();
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const res = await fetch("/api/user/usage");
      if (res.ok) {
        const data = await res.json();
        setUsage(data);
      }
    } catch (error) {
      console.error("Error fetching usage:", error);
    }
    setLoading(false);
  };

  // Don't show for paid users or while loading
  if (loading || dismissed || usage?.isPaid) return null;

  const { used = 0, limit = 5, remaining = 5 } = usage || {};
  const percentage = (used / limit) * 100;
  const isLow = remaining <= 2;
  const isEmpty = remaining === 0;

  return (
    <div
      className={`rounded-xl p-4 mb-6 ${
        isEmpty
          ? "bg-red-500/10 border border-red-500/30"
          : isLow
          ? "bg-amber-500/10 border border-amber-500/30"
          : "bg-base-200 border border-base-300"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div
            className={`p-2 rounded-lg ${
              isEmpty
                ? "bg-red-500/20 text-red-400"
                : isLow
                ? "bg-amber-500/20 text-amber-400"
                : "bg-primary/20 text-primary"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
              />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">
                {isEmpty ? (
                  t("usageBanner.limitReached")
                ) : (
                  t("usageBanner.productsViewed", { used, limit })
                )}
              </span>
              <span
                className={`text-sm ${
                  isEmpty
                    ? "text-red-400"
                    : isLow
                    ? "text-amber-400"
                    : "text-base-content/60"
                }`}
              >
                {t("usageBanner.remaining", { count: remaining })}
              </span>
            </div>
            <div className="w-full bg-base-300 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  isEmpty
                    ? "bg-red-500"
                    : isLow
                    ? "bg-amber-500"
                    : "bg-primary"
                }`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(isLow || isEmpty) && (
            <Link href="/#pricing" className="btn btn-primary btn-sm">
              {t("usageBanner.upgrade")}
            </Link>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="btn btn-ghost btn-sm btn-circle"
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
        </div>
      </div>
    </div>
  );
}
