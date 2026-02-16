"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import config from "@/config";

const plans = config.lemonsqueezy?.plans || [];

const planBadgeColors = {
  free: "badge-ghost",
  explorer: "badge-info",
  professional: "badge-primary",
  enterprise: "badge-secondary",
};

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchUsage();
    }
  }, [session]);

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

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  const user = session?.user;
  const planType = user?.planType || "free";
  const currentPlan = plans.find(
    (p) => p.name.toLowerCase() === planType.toLowerCase()
  ) || plans[0];
  const isPaid = user?.hasAccess || false;

  // Usage data
  const viewsUsed = usage?.used || 0;
  const viewsLimit = currentPlan?.limits?.monthlyProductViews || 5;
  const viewsUnlimited = viewsLimit === -1;
  const setupsUsed = usage?.setupsUsed || 0;
  const setupsLimit = currentPlan?.limits?.maxSetups || 1;
  const setupsUnlimited = setupsLimit === -1;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Account Settings</h1>

      <div className="grid gap-6">
        {/* Profile Section */}
        <div className="rounded-xl bg-base-200 border border-base-300 p-6">
          <h2 className="text-lg font-semibold mb-4">Profile</h2>
          <div className="flex items-center gap-4">
            {user?.image ? (
              <img
                src={user.image}
                alt={user.name || "Avatar"}
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
                {(user?.name || user?.email || "?")[0].toUpperCase()}
              </div>
            )}
            <div>
              <div className="font-semibold text-lg">
                {user?.name || "Anonymous"}
              </div>
              <div className="text-sm text-base-content/60">{user?.email}</div>
            </div>
          </div>
        </div>

        {/* Current Plan + Subscription */}
        <div className="rounded-xl bg-base-200 border border-base-300 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Current Plan</h2>
            <span
              className={`badge ${planBadgeColors[planType.toLowerCase()] || "badge-ghost"}`}
            >
              {currentPlan?.name || "Free"}
            </span>
          </div>

          {/* Plan details */}
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl font-bold">
              ${currentPlan?.price || 0}
            </span>
            {currentPlan?.price > 0 && (
              <span className="text-base-content/60">/month</span>
            )}
            {currentPlan?.priceAnchor && (
              <span className="text-sm text-base-content/40 line-through">
                ${currentPlan.priceAnchor}/mo
              </span>
            )}
          </div>

          {/* Features list */}
          <ul className="space-y-2 mb-6">
            {currentPlan?.features?.map((feature, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={`w-4 h-4 ${feature.highlight ? "text-primary" : "text-green-400"}`}
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className={feature.highlight ? "font-medium" : ""}>
                  {feature.name}
                </span>
              </li>
            ))}
          </ul>

          {/* Usage Stats */}
          <div className="border-t border-base-300 pt-4 space-y-4">
            <h3 className="text-sm font-semibold text-base-content/70 uppercase tracking-wider">
              Usage This Month
            </h3>

            {/* Product Views */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Product Views</span>
                <span className="text-base-content/60">
                  {viewsUnlimited
                    ? `${viewsUsed} (unlimited)`
                    : `${viewsUsed} / ${viewsLimit}`}
                </span>
              </div>
              {!viewsUnlimited && (
                <div className="w-full bg-base-300 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      viewsUsed >= viewsLimit
                        ? "bg-red-500"
                        : viewsUsed >= viewsLimit * 0.8
                          ? "bg-amber-500"
                          : "bg-primary"
                    }`}
                    style={{
                      width: `${Math.min((viewsUsed / viewsLimit) * 100, 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Setups */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Setups</span>
                <span className="text-base-content/60">
                  {setupsUnlimited
                    ? `${setupsUsed} (unlimited)`
                    : `${setupsUsed} / ${setupsLimit}`}
                </span>
              </div>
              {!setupsUnlimited && (
                <div className="w-full bg-base-300 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      setupsUsed >= setupsLimit
                        ? "bg-red-500"
                        : setupsUsed >= setupsLimit * 0.8
                          ? "bg-amber-500"
                          : "bg-primary"
                    }`}
                    style={{
                      width: `${Math.min((setupsUsed / setupsLimit) * 100, 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex gap-3">
            {isPaid ? (
              <a
                href="https://app.lemonsqueezy.com/my-orders"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm"
              >
                Manage Subscription
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
                    d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                  />
                </svg>
              </a>
            ) : (
              <Link href="/#pricing" className="btn btn-primary btn-sm">
                Upgrade Plan
              </Link>
            )}
          </div>
        </div>

        {/* Your Data (GDPR) */}
        <div className="rounded-xl bg-base-200 border border-base-300 p-6">
          <h2 className="text-lg font-semibold mb-2">Your Data</h2>
          <p className="text-sm text-base-content/60 mb-4">
            Download a copy of all your personal data (GDPR Article 20 — Right to Data Portability).
          </p>
          <a
            href="/api/user/export"
            download
            className="btn btn-outline btn-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export My Data (JSON)
          </a>
        </div>

        {/* Danger Zone */}
        <div className="rounded-xl bg-base-200 border border-red-500/20 p-6">
          <h2 className="text-lg font-semibold mb-2 text-red-400">
            Danger Zone
          </h2>
          <p className="text-sm text-base-content/60 mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button
            onClick={async () => {
              if (!confirm("Are you sure you want to permanently delete your account? All your data (setups, favorites, views, corrections) will be permanently erased. This cannot be undone.")) return;
              if (!confirm("This is your last chance. Type-confirm: Are you REALLY sure?")) return;
              try {
                const res = await fetch("/api/user/account", {
                  method: "DELETE",
                  headers: { "x-confirm-delete": "true" },
                });
                if (res.ok) {
                  alert("Your account has been deleted. You will now be signed out.");
                  window.location.href = "/";
                } else {
                  const data = await res.json();
                  alert(data.error || "Failed to delete account. Please contact support@safescoring.io");
                }
              } catch {
                alert("An error occurred. Please contact support@safescoring.io");
              }
            }}
            className="btn btn-outline btn-error btn-sm"
          >
            Delete My Account
          </button>
        </div>
      </div>
    </div>
  );
}
