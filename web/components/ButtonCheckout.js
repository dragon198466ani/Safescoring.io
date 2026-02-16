"use client";

import { useState } from "react";
import apiClient from "@/libs/api";
import { useTranslation } from "@/libs/i18n/LanguageProvider";

// This component is used to create Stripe Checkout Sessions
// It calls the /api/stripe/create-checkout route with the priceId, successUrl and cancelUrl
const ButtonCheckout = ({ priceId, mode = "subscription", className = "" }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

  const handlePayment = async () => {
    setIsLoading(true);

    try {
      const res = await apiClient.post("/stripe/create-checkout", {
        priceId,
        mode,
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
          {t("buttonCheckout.getStarted")}
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
