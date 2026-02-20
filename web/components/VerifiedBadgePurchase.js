"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

/**
 * VerifiedBadgePurchase Component
 *
 * Displays a CTA for purchasing verified badges on product pages.
 * Features:
 * - Monthly/Yearly toggle
 * - Price display with savings
 * - Checkout redirect via LemonSqueezy
 * - Mobile responsive
 */

const PRICING = {
  monthly: { price: 19, period: "month" },
  yearly: { price: 190, period: "year", savings: 38 }, // 19*12 - 190 = 38
};

export default function VerifiedBadgePurchase({ productSlug, productName, hasActiveBadge = false }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const currentPricing = PRICING[billingCycle];

  const handlePurchase = async () => {
    if (!session?.user) {
      router.push(`/signin?callbackUrl=/products/${productSlug}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/verified-badge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productSlug,
          billingCycle,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout");
      }

      // Redirect to LemonSqueezy checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Already has active badge - show status
  if (hasActiveBadge) {
    return (
      <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-green-400 text-sm sm:text-base">Verified Badge Active</h3>
            <p className="text-xs sm:text-sm text-base-content/60">
              This product displays an authentic SafeScoring badge
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 border border-primary/20 rounded-xl p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base sm:text-lg">Get Verified Badge</h3>
          <p className="text-xs sm:text-sm text-base-content/60 mt-0.5">
            Prove your product's authenticity with an official SafeScoring badge
          </p>
        </div>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        {[
          "Dynamic SVG badge (can't be faked)",
          "Click-to-verify authenticity",
          "Real-time score updates",
          "Embed on your website",
        ].map((benefit, i) => (
          <div key={i} className="flex items-center gap-2 text-xs sm:text-sm">
            <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-base-content/80">{benefit}</span>
          </div>
        ))}
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-2 mb-4 p-1 bg-base-200/50 rounded-lg">
        <button
          onClick={() => setBillingCycle("monthly")}
          className={`flex-1 py-2 px-3 rounded-md text-xs sm:text-sm font-medium transition-all ${
            billingCycle === "monthly"
              ? "bg-primary text-primary-content shadow-sm"
              : "text-base-content/60 hover:text-base-content"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingCycle("yearly")}
          className={`flex-1 py-2 px-3 rounded-md text-xs sm:text-sm font-medium transition-all relative ${
            billingCycle === "yearly"
              ? "bg-primary text-primary-content shadow-sm"
              : "text-base-content/60 hover:text-base-content"
          }`}
        >
          Yearly
          <span className="absolute -top-2 -right-1 sm:-right-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
            -17%
          </span>
        </button>
      </div>

      {/* Price Display */}
      <div className="text-center mb-4">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-2xl sm:text-3xl font-bold">${currentPricing.price}</span>
          <span className="text-base-content/60 text-sm">/{currentPricing.period}</span>
        </div>
        {billingCycle === "yearly" && (
          <p className="text-green-500 text-xs sm:text-sm mt-1">
            Save ${PRICING.yearly.savings}/year
          </p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-error/10 border border-error/20 text-error text-xs sm:text-sm p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* CTA Button */}
      <button
        onClick={handlePurchase}
        disabled={loading}
        className="btn btn-primary w-full gap-2 text-sm sm:text-base"
      >
        {loading ? (
          <>
            <span className="loading loading-spinner loading-sm"></span>
            Processing...
          </>
        ) : (
          <>
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Get Verified Badge
          </>
        )}
      </button>

      {/* Trust indicators */}
      <div className="flex items-center justify-center gap-4 mt-4 text-[10px] sm:text-xs text-base-content/50">
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          Secure payment
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          Cancel anytime
        </span>
      </div>
    </div>
  );
}

/**
 * Compact version for inline use
 */
export function VerifiedBadgeTeaser({ productSlug, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-full transition-all text-xs sm:text-sm"
    >
      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      <span className="font-medium">Get Verified</span>
      <span className="text-primary">$19/mo</span>
    </button>
  );
}
