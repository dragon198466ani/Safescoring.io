"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * UpgradePrompt Component
 * Shown when user hits a feature limit
 */
export default function UpgradePrompt({
  isOpen,
  onClose,
  triggerType,
  upgradeInfo,
  currentUsage,
  limit,
  plan,
}) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  if (!isOpen || dismissed) return null;

  const info = upgradeInfo || {
    title: "Upgrade Required",
    message: "Unlock this feature with a premium plan",
    cta: "View Plans",
    suggestedPlan: "explorer",
  };

  // Plan features for comparison
  const planFeatures = {
    explorer: {
      name: "Explorer",
      price: 19,
      highlights: [
        "5 security setups",
        "Unlimited comparisons",
        "PDF exports",
        "Score alerts",
      ],
    },
    professional: {
      name: "Professional",
      price: 39,
      highlights: [
        "20 security setups",
        "API access (1K calls/day)",
        "1 year score history",
        "Priority support",
      ],
    },
    enterprise: {
      name: "Enterprise",
      price: 499,
      highlights: [
        "Unlimited everything",
        "Priority support (<4h) + Slack",
        "Custom evaluations (5/mo)",
        "SSO integration (on request)",
      ],
    },
  };

  const suggestedPlanInfo = planFeatures[info.suggestedPlan] || planFeatures.explorer;

  const handleDismiss = () => {
    setDismissed(true);
    onClose?.();
  };

  const handleRemindLater = () => {
    // Store in localStorage to not show again for 24 hours
    localStorage.setItem(
      `upgrade_remind_later_${triggerType}`,
      Date.now().toString()
    );
    handleDismiss();
  };

  const handleUpgrade = () => {
    router.push(`/pricing?highlight=${info.suggestedPlan}&from=${triggerType}`);
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        {/* Header with icon */}
        <div className="flex items-start gap-4 mb-4">
          <div className="bg-primary/10 rounded-full p-3">
            <svg
              className="w-6 h-6 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-lg">{info.title}</h3>
            <p className="text-base-content/70 text-sm">{info.message}</p>
          </div>
        </div>

        {/* Usage indicator */}
        {currentUsage !== undefined && limit !== undefined && limit > 0 && (
          <div className="bg-base-200 rounded-lg p-3 mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Usage this period</span>
              <span className="font-medium">
                {currentUsage} / {limit}
              </span>
            </div>
            <div className="w-full bg-base-300 rounded-full h-2">
              <div
                className="bg-warning h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, (currentUsage / limit) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Suggested plan */}
        <div className="border border-primary rounded-lg p-4 mb-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="badge badge-primary badge-sm mb-1">Recommended</span>
              <h4 className="font-bold">{suggestedPlanInfo.name}</h4>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold">${suggestedPlanInfo.price}</span>
              <span className="text-base-content/60 text-sm">/mo</span>
            </div>
          </div>
          <ul className="space-y-2">
            {suggestedPlanInfo.highlights.map((feature, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <svg
                  className="w-4 h-4 text-success flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Current plan indicator */}
        {plan && plan !== "free" && (
          <p className="text-sm text-base-content/60 mb-4">
            Current plan: <span className="font-medium capitalize">{plan}</span>
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button className="btn btn-ghost flex-1" onClick={handleRemindLater}>
            Remind Later
          </button>
          <button className="btn btn-primary flex-1" onClick={handleUpgrade}>
            {info.cta}
          </button>
        </div>

        {/* Alternative link */}
        <div className="text-center mt-4">
          <Link
            href="/pricing"
            className="text-sm text-primary hover:underline"
            onClick={handleDismiss}
          >
            Compare all plans
          </Link>
        </div>
      </div>
      <div className="modal-backdrop bg-black/50" onClick={handleDismiss} />
    </div>
  );
}

/**
 * UpgradeBanner Component
 * Inline banner for feature limits
 */
export function UpgradeBanner({ feature, currentUsage, limit, suggestedPlan = "explorer" }) {
  const router = useRouter();

  if (!limit || limit < 0) return null;

  const percentUsed = (currentUsage / limit) * 100;

  // Don't show if under 70%
  if (percentUsed < 70) return null;

  const isAtLimit = currentUsage >= limit;

  return (
    <div
      className={`rounded-lg p-4 mb-4 ${
        isAtLimit
          ? "bg-error/10 border border-error"
          : "bg-warning/10 border border-warning"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`rounded-full p-2 ${
              isAtLimit ? "bg-error/20" : "bg-warning/20"
            }`}
          >
            {isAtLimit ? (
              <svg
                className="w-5 h-5 text-error"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-warning"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </div>
          <div>
            <p className="font-medium">
              {isAtLimit
                ? `You've reached your ${feature} limit`
                : `You've used ${Math.round(percentUsed)}% of your ${feature}`}
            </p>
            <p className="text-sm text-base-content/60">
              {currentUsage} of {limit} used this period
            </p>
          </div>
        </div>
        <button
          className={`btn btn-sm ${isAtLimit ? "btn-error" : "btn-warning"}`}
          onClick={() =>
            router.push(`/pricing?highlight=${suggestedPlan}&from=${feature}_limit`)
          }
        >
          Upgrade
        </button>
      </div>
    </div>
  );
}

/**
 * LockedFeature Component
 * Overlay for locked features
 */
export function LockedFeature({
  children,
  isLocked,
  feature,
  requiredPlan = "explorer",
}) {
  const router = useRouter();

  if (!isLocked) return children;

  return (
    <div className="relative">
      <div className="pointer-events-none opacity-50 blur-sm">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-base-100/80 backdrop-blur-sm rounded-lg">
        <div className="text-center p-4">
          <div className="bg-base-200 rounded-full p-3 w-fit mx-auto mb-3">
            <svg
              className="w-6 h-6 text-base-content/60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <p className="font-medium mb-1">
            {feature || "This feature"} is locked
          </p>
          <p className="text-sm text-base-content/60 mb-3">
            Upgrade to {requiredPlan} to unlock
          </p>
          <button
            className="btn btn-primary btn-sm"
            onClick={() =>
              router.push(`/pricing?highlight=${requiredPlan}&from=${feature}_locked`)
            }
          >
            Upgrade Now
          </button>
        </div>
      </div>
    </div>
  );
}
