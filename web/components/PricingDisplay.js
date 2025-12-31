"use client";

import { useState, useEffect } from "react";

// Currency conversion rates
const EUR_TO_USD_RATE = 1.10;
const USD_TO_EUR_RATE = 0.91;

// Bitcoin fee conversion constants (fallback only - primary source is Supabase)
// Run: python -m src.automation.price_updater --update-btc-fees --force
// to update all products with real-time BTC price
const FALLBACK_BTC_PRICE_USD = 90000;
const AVG_TX_SIZE_VBYTES = 140;

// European country codes for locale detection
const EUROPEAN_LOCALES = [
  'fr', 'de', 'es', 'it', 'pt', 'nl', 'be', 'at', 'ch', 'lu', 'ie', 'fi',
  'gr', 'sk', 'si', 'ee', 'lv', 'lt', 'mt', 'cy', 'bg', 'ro', 'hr', 'cz',
  'pl', 'hu', 'dk', 'se', 'no', 'is'
];

/**
 * FALLBACK: Convert sat/vB to USD for a typical transaction
 * Note: Primary conversion should come from Supabase via price_updater.py
 */
const satVbToUsd = (satPerVb) => {
  const totalSats = satPerVb * AVG_TX_SIZE_VBYTES;
  return (totalSats * FALLBACK_BTC_PRICE_USD) / 100_000_000;
};

/**
 * FALLBACK: Format Bitcoin fee range with USD/EUR conversion
 * Note: Primary conversion should come from Supabase via price_updater.py
 */
const formatBtcFeeRange = (minSatVb, maxSatVb) => {
  const minUsd = satVbToUsd(minSatVb);
  const maxUsd = satVbToUsd(maxSatVb);
  const minEur = minUsd * USD_TO_EUR_RATE;
  const maxEur = maxUsd * USD_TO_EUR_RATE;
  return `~$${minUsd.toFixed(2)}-$${maxUsd.toFixed(2)} | ~€${minEur.toFixed(2)}-€${maxEur.toFixed(2)}`;
};

/**
 * FALLBACK: Add USD/EUR conversion to sat/vB fees if not already present
 * This is a safety net for products not yet updated via price_updater.py
 */
const enhanceBtcFeeDetails = (details) => {
  if (!details) return details;

  // Skip if already has conversion ($ or €)
  if (details.includes('$') || details.includes('€')) {
    return details;
  }

  // Pattern: "X-Y sat/vB" or "X sat/vB"
  const satVbPattern = /(\d+)(?:-(\d+))?\s*sat\/vB/gi;
  const match = satVbPattern.exec(details);

  if (match) {
    const minSat = parseInt(match[1], 10);
    const maxSat = match[2] ? parseInt(match[2], 10) : minSat;
    const conversion = formatBtcFeeRange(minSat, maxSat);
    return details.replace(satVbPattern, `${match[0]} (${conversion})`);
  }

  return details;
};

export default function PricingDisplay({ priceEur, details }) {
  const [currency, setCurrency] = useState('EUR');
  const [locale, setLocale] = useState('fr-FR');
  const [displayPrice, setDisplayPrice] = useState(priceEur);
  const [enhancedDetails, setEnhancedDetails] = useState(details);

  useEffect(() => {
    // Detect user's locale from browser
    const userLocale = navigator.language || navigator.userLanguage || 'en-US';
    const countryCode = userLocale.split('-')[0].toLowerCase();

    setLocale(userLocale);

    // Check if user is in a European region
    const isEuropean = EUROPEAN_LOCALES.includes(countryCode) ||
                       userLocale.toLowerCase().includes('fr') ||
                       userLocale.toLowerCase().includes('de') ||
                       userLocale.toLowerCase().includes('es') ||
                       userLocale.toLowerCase().includes('it');

    if (isEuropean) {
      setCurrency('EUR');
      setDisplayPrice(priceEur);
    } else {
      setCurrency('USD');
      // Convert EUR to USD
      setDisplayPrice(Math.round(priceEur * EUR_TO_USD_RATE * 100) / 100);
    }
  }, [priceEur]);

  // Enhance fee details with sat/vB conversion
  useEffect(() => {
    setEnhancedDetails(enhanceBtcFeeDetails(details));
  }, [details]);

  const formatPrice = (price, curr) => {
    if (!price) return null;

    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: curr,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(price);
    } catch {
      // Fallback formatting
      const symbol = curr === 'EUR' ? '€' : '$';
      return `${price.toLocaleString()} ${symbol}`;
    }
  };

  if (!priceEur && !details) return null;

  return (
    <div className="mb-6 p-3 rounded-lg bg-base-200/50 border border-base-content/5 max-w-md">
      <div className="flex items-center gap-2 mb-1">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-base-content/50">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
        </svg>
        <span className="text-xs font-medium text-base-content/50 uppercase tracking-wider">
          Price & Fees
        </span>
      </div>
      {priceEur && (
        <div className="text-base-content/80 text-sm">
          <span className="font-semibold">{formatPrice(displayPrice, currency)}</span>
          {currency === 'USD' && (
            <span className="text-xs text-base-content/40 ml-2">
              (~{formatPrice(priceEur, 'EUR')})
            </span>
          )}
        </div>
      )}
      {enhancedDetails && (
        <p className="text-xs text-base-content/60 mt-1">{enhancedDetails}</p>
      )}
    </div>
  );
}
