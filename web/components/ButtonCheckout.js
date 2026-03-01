"use client";

import { useState } from "react";
import apiClient from "@/libs/api";

// This component is used to create LemonSqueezy Checkout Sessions
// It calls the /api/lemonsqueezy/create-checkout route with the variantId
const ButtonCheckout = ({ priceId, variantId, mode = "subscription", className = "" }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async () => {
    setIsLoading(true);

    try {
      const res = await apiClient.post("/lemonsqueezy/create-checkout", {
        variantId: variantId || priceId,
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
