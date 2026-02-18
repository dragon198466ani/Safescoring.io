"use client";

import Link from "next/link";
import { useApi } from "@/hooks/useApi";

/**
 * Usage limits indicator for dashboard header
 * Shows current usage vs plan limits for setups and API calls
 */
export default function UsageLimits() {
  // Use useApi hook with caching (2 minutes) and auto-retry
  const { data: usage, isLoading: loading } = useApi("/api/user/usage", {
    ttl: 2 * 60 * 1000, // Cache for 2 minutes
  });

  if (loading || !usage) return null;

  const { limits, current, plan } = usage;
  if (!limits) return null;

  // Calculate setup usage percentage
  const setupsUsed = current?.setups || 0;
  const setupsLimit = limits.maxSetups || 1;
  const setupsUnlimited = setupsLimit === -1;
  const setupsPercent = setupsUnlimited ? 0 : Math.min(100, (setupsUsed / setupsLimit) * 100);
  const setupsNearLimit = !setupsUnlimited && setupsPercent >= 80;

  // Calculate API usage percentage (if applicable)
  const apiEnabled = limits.apiAccess;
  const apiUsed = current?.apiMonthly || 0;
  const apiLimit = limits.apiMonthlyLimit || 0;
  const apiUnlimited = apiLimit === -1;
  const apiPercent = apiUnlimited || !apiEnabled ? 0 : Math.min(100, (apiUsed / apiLimit) * 100);
  const apiNearLimit = apiEnabled && !apiUnlimited && apiPercent >= 80;

  // Don't show if nothing to display
  if (!setupsNearLimit && !apiNearLimit && setupsPercent < 50) {
    return null;
  }

  return (
    <div className="hidden md:flex items-center gap-4 px-3 py-1.5 bg-base-200 rounded-lg">
      {/* Setups usage */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-base-content/60">Setups:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-16 h-1.5 bg-base-300 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                setupsNearLimit ? "bg-warning" : "bg-primary"
              }`}
              style={{ width: `${setupsPercent}%` }}
            />
          </div>
          <span className={`text-xs font-medium ${setupsNearLimit ? "text-warning" : ""}`}>
            {setupsUsed}/{setupsUnlimited ? "∞" : setupsLimit}
          </span>
        </div>
      </div>

      {/* API usage (only for plans with API access) */}
      {apiEnabled && (
        <>
          <div className="w-px h-4 bg-base-300" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-base-content/60">API:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1.5 bg-base-300 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    apiNearLimit ? "bg-warning" : "bg-success"
                  }`}
                  style={{ width: `${apiPercent}%` }}
                />
              </div>
              <span className={`text-xs font-medium ${apiNearLimit ? "text-warning" : ""}`}>
                {apiUsed.toLocaleString()}/{apiUnlimited ? "∞" : apiLimit.toLocaleString()}
              </span>
            </div>
          </div>
        </>
      )}

      {/* Upgrade hint if near limits */}
      {(setupsNearLimit || apiNearLimit) && plan !== "enterprise" && (
        <Link
          href="/#pricing"
          className="text-xs text-warning hover:text-warning-content hover:underline"
        >
          Upgrade
        </Link>
      )}
    </div>
  );
}
