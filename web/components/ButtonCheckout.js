"use client";

import { useState } from "react";
import apiClient from "@/libs/api";

/**
 * ButtonCheckout — Creates Lemon Squeezy checkout session.
 *
 * Props:
 * - priceId: Lemon Squeezy variant ID (default plan variant)
 * - pppVariantId: Override variant for PPP surcharge tiers (+20%/+40%)
 * - discountCode: PPP discount code for cheaper countries
 * - mode: "subscription" or "payment"
 * - className: optional CSS classes
 */
const ButtonCheckout = ({
  priceId,
  pppVariantId,
  discountCode,
  mode = "subscription",
  className = "",
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async () => {
    setIsLoading(true);

    try {
      // Use surcharge variant if available (rich countries pay more)
      // Otherwise use default variant + discount code (cheaper countries)
      const variantId = pppVariantId || priceId;

      const res = await apiClient.post("/lemonsqueezy/create-checkout", {
        variantId,
        discountCode: discountCode || undefined,
        successUrl: `${window.location.origin}/dashboard`,
        cancelUrl: window.location.href,
      });

      window.location.href = res.url;
    } catch (e) {
      console.error(e);
    }

    setIsLoading(false);
  };

  return (
    <button
      className={`btn ${className || "btn-primary btn-block"}`}
      onClick={() => handlePayment()}
      disabled={isLoading}
    >
      {isLoading ? (
        <span className="loading loading-spinner loading-xs"></span>
      ) : (
        <>
          Get Started
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
            />
          </svg>
        </>
      )}
    </button>
  );
};

export default ButtonCheckout;
