"use client";

import { useState } from "react";

/**
 * PPP Banner — Shows location-based pricing message.
 * Displays: flag + country name + discount percentage.
 * Includes "Not in [country]?" link to dismiss and show full price.
 */
export default function PPPBanner({ country, countryName, countryFlag, discount, onDismiss }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !country || discount === 0) return null;

  const isDiscount = discount > 0;
  const isSurcharge = discount < 0;

  const handleDismiss = () => {
    // Clear PPP cookies
    document.cookie = "ppp_country=; max-age=0; path=/";
    document.cookie = "ppp_tier=; max-age=0; path=/";
    document.cookie = "ppp_tz=; max-age=0; path=/";
    setDismissed(true);
    if (onDismiss) onDismiss();
  };

  return (
    <div className="alert alert-info shadow-lg mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-2">
      <div className="flex items-center gap-2 flex-1">
        <span className="text-2xl">{countryFlag || "🌍"}</span>
        <div>
          {isDiscount && (
            <p className="font-semibold">
              We noticed you&apos;re visiting from {countryName}!
              Enjoy <span className="text-success font-bold">{discount}% off</span> — adjusted for your local purchasing power.
            </p>
          )}
          {isSurcharge && (
            <p className="font-semibold">
              Pricing adjusted for {countryName}.
            </p>
          )}
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className="btn btn-ghost btn-sm opacity-70 hover:opacity-100 whitespace-nowrap"
      >
        Not in {countryName}?
      </button>
    </div>
  );
}
