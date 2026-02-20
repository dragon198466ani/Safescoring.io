"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

/**
 * CryptoRenewalBanner - Shows renewal reminder for crypto subscriptions
 * Displays when subscription is expiring within 14 days
 */
export default function CryptoRenewalBanner({ className = "" }) {
  const [renewalInfo, setRenewalInfo] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkRenewal() {
      try {
        const response = await fetch("/api/crypto/renewal");
        if (response.ok) {
          const data = await response.json();
          if (data.needsRenewal) {
            setRenewalInfo(data);
          }
        }
      } catch (error) {
        console.error("Error checking renewal:", error);
      } finally {
        setIsLoading(false);
      }
    }

    // Check if previously dismissed
    const dismissedUntil = localStorage.getItem("cryptoRenewalDismissed");
    if (dismissedUntil && new Date(dismissedUntil) > new Date()) {
      setDismissed(true);
      setIsLoading(false);
      return;
    }

    checkRenewal();
  }, []);

  const handleDismiss = () => {
    // Dismiss for 24 hours
    const dismissUntil = new Date();
    dismissUntil.setHours(dismissUntil.getHours() + 24);
    localStorage.setItem("cryptoRenewalDismissed", dismissUntil.toISOString());
    setDismissed(true);
  };

  if (isLoading || dismissed || !renewalInfo) {
    return null;
  }

  const { daysLeft, plan } = renewalInfo;
  const isUrgent = daysLeft <= 3;

  return (
    <div
      className={`alert ${isUrgent ? "alert-warning" : "alert-info"} ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        className="stroke-current shrink-0 w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>

      <div className="flex-1">
        <h3 className="font-bold">
          {isUrgent ? "Subscription expiring soon!" : "Renewal reminder"}
        </h3>
        <p className="text-sm">
          Your <span className="font-semibold capitalize">{plan}</span> subscription
          expires in <span className="font-bold">{daysLeft} day{daysLeft !== 1 ? "s" : ""}</span>.
          {" "}Crypto payments don't auto-renew.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleDismiss}
          className="btn btn-ghost btn-sm"
        >
          Later
        </button>
        <Link
          href={`/checkout/crypto?plan=${plan}`}
          className={`btn btn-sm ${isUrgent ? "btn-warning" : "btn-primary"}`}
        >
          Renew Now
        </Link>
      </div>
    </div>
  );
}

/**
 * Compact version for dashboard sidebar
 */
export function CryptoRenewalCompact({ daysLeft, plan }) {
  if (!daysLeft || daysLeft > 14) return null;

  const isUrgent = daysLeft <= 3;

  return (
    <Link
      href={`/checkout/crypto?plan=${plan}`}
      className={`block p-3 rounded-lg border transition-colors ${
        isUrgent
          ? "bg-warning/10 border-warning/30 hover:bg-warning/20"
          : "bg-info/10 border-info/30 hover:bg-info/20"
      }`}
    >
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isUrgent ? "bg-warning animate-pulse" : "bg-info"}`} />
        <span className="text-sm font-medium">
          {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
        </span>
      </div>
      <p className="text-xs text-base-content/60 mt-1">
        Click to renew with crypto
      </p>
    </Link>
  );
}
