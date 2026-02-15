"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "@/libs/i18n/LanguageProvider";

// Currency conversion rates
const EUR_TO_USD_RATE = 1.10;
const USD_TO_EUR_RATE = 0.91;

// Bitcoin fee conversion constants (fallback for products without fees_breakdown)
const FALLBACK_BTC_PRICE_USD = 90000;
const AVG_TX_SIZE_VBYTES = 140;

// European locale detection
const EUROPEAN_LOCALES = [
  'fr', 'de', 'es', 'it', 'pt', 'nl', 'be', 'at', 'ch', 'lu', 'ie', 'fi',
  'gr', 'sk', 'si', 'ee', 'lv', 'lt', 'mt', 'cy', 'bg', 'ro', 'hr', 'cz',
  'pl', 'hu', 'dk', 'se', 'no', 'is'
];

// ─── Icon selection by unit (dynamic, not hardcoded per product type) ───

const FeeIconPercent = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
);

const FeeIconCurrency = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
  </svg>
);

const FeeIconBitcoin = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
    <path d="M11.5 2v2.05A7.002 7.002 0 0 0 5 11a7.002 7.002 0 0 0 6.5 6.95V20h1v-2.05A7.002 7.002 0 0 0 19 11a7.002 7.002 0 0 0-6.5-6.95V2h-1zM12 6a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm-.5 2v1.5H10v1h1.5V12H10v1h1.5v1.5h1V13H14v-1h-1.5v-1.5H14v-1h-1.5V8h-1z" />
  </svg>
);

const FeeIconCalendar = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
);

const FeeIconGeneric = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
  </svg>
);

/**
 * Select the appropriate icon based on the fee unit string.
 * Data-driven: matches unit patterns, not product types.
 */
function getFeeIcon(unit) {
  if (!unit) return <FeeIconGeneric />;
  const u = unit.toLowerCase();
  if (u.includes('sat/vb') || u.includes('btc')) return <FeeIconBitcoin />;
  if (u.includes('/mois') || u.includes('/month') || u.includes('/an') || u.includes('/year')) return <FeeIconCalendar />;
  if (u.includes('eur') || u.includes('usd') || u.includes('$')) return <FeeIconCurrency />;
  if (u.includes('%')) return <FeeIconPercent />;
  // Native tokens (ADA, SOL, ATOM, etc.)
  if (/^[A-Z]{2,6}$/i.test(u)) return <FeeIconCurrency />;
  return <FeeIconGeneric />;
}

/**
 * Format a fee value for display.
 */
function formatFeeValue(fee, t) {
  if (fee.type === "variable") return t("pricingDisplay.variable");
  if (fee.value == null) return fee.label || t("pricingDisplay.variable");

  const val = fee.value;
  const max = fee.value_max;
  const unit = fee.unit || "";

  if (fee.type === "range" && max != null) {
    return `${val}${unit.startsWith('%') ? '' : ' '}–${max} ${unit}`;
  }
  return `${val} ${unit}`;
}

// ─── Fallback: sat/vB text enhancement (for products without fees_breakdown) ───

const satVbToUsd = (satPerVb) => (satPerVb * AVG_TX_SIZE_VBYTES * FALLBACK_BTC_PRICE_USD) / 100_000_000;

const enhanceBtcFeeDetails = (details) => {
  if (!details || details.includes('$') || details.includes('€')) return details;
  const satVbPattern = /(\d+)(?:-(\d+))?\s*sat\/vB/gi;
  const match = satVbPattern.exec(details);
  if (match) {
    const minSat = parseInt(match[1], 10);
    const maxSat = match[2] ? parseInt(match[2], 10) : minSat;
    const minUsd = satVbToUsd(minSat);
    const maxUsd = satVbToUsd(maxSat);
    const minEur = minUsd * USD_TO_EUR_RATE;
    const maxEur = maxUsd * USD_TO_EUR_RATE;
    const conv = `~$${minUsd.toFixed(2)}-$${maxUsd.toFixed(2)} | ~€${minEur.toFixed(2)}-€${maxEur.toFixed(2)}`;
    return details.replace(satVbPattern, `${match[0]} (${conv})`);
  }
  return details;
};

// ─── Main Component ───

export default function PricingDisplay({ priceEur, details, feesBreakdown }) {
  const { t } = useTranslation();
  const [currency, setCurrency] = useState('EUR');
  const [locale, setLocale] = useState('fr-FR');
  const [displayPrice, setDisplayPrice] = useState(priceEur);

  useEffect(() => {
    const userLocale = navigator.language || navigator.userLanguage || 'en-US';
    const countryCode = userLocale.split('-')[0].toLowerCase();
    setLocale(userLocale);

    const isEuropean = EUROPEAN_LOCALES.includes(countryCode) ||
                       ['fr', 'de', 'es', 'it'].some(l => userLocale.toLowerCase().includes(l));

    if (isEuropean) {
      setCurrency('EUR');
      setDisplayPrice(priceEur);
    } else {
      setCurrency('USD');
      setDisplayPrice(priceEur ? Math.round(priceEur * EUR_TO_USD_RATE * 100) / 100 : null);
    }
  }, [priceEur]);

  const formatPriceFn = (price, curr) => {
    if (!price) return null;
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: curr,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(price);
    } catch {
      const symbol = curr === 'EUR' ? '€' : '$';
      return `${price.toLocaleString()} ${symbol}`;
    }
  };

  const enhancedDetails = useMemo(() => enhanceBtcFeeDetails(details), [details]);

  // Nothing to display at all
  if (!priceEur && !details && !feesBreakdown) return null;

  const fb = feesBreakdown;
  const hasStructuredFees = fb && (fb.fees?.length > 0 || fb.product_cost);

  // ─── Structured fee display (when fees_breakdown exists) ───
  if (hasStructuredFees) {
    return (
      <div className="mb-6 rounded-lg bg-base-200/50 border border-base-content/5 max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-base-content/50">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
          </svg>
          <span className="text-xs font-medium text-base-content/50 uppercase tracking-wider">
            {t("pricingDisplay.feesCosts")}
          </span>
        </div>

        {/* Product cost (one-time purchase) */}
        {fb.product_cost && fb.product_cost.amount > 0 && (
          <div className="px-3 py-2 flex items-center justify-between border-b border-base-content/5">
            <div className="flex items-center gap-2 text-sm">
              <FeeIconCurrency />
              <span className="text-base-content/70">
                {fb.product_cost.is_one_time ? t("pricingDisplay.oneTimePurchase") : fb.product_cost.label || t("pricingDisplay.price")}
              </span>
            </div>
            <div className="text-sm font-semibold text-base-content/80">
              {formatPriceFn(
                currency === 'EUR' ? fb.product_cost.amount : fb.product_cost.amount * EUR_TO_USD_RATE,
                currency
              )}
            </div>
          </div>
        )}

        {/* Fee lines */}
        {fb.fees && fb.fees.length > 0 && (
          <div className="divide-y divide-base-content/5">
            {fb.fees.map((fee, idx) => (
              <div key={fee.id || idx} className="px-3 py-2 flex items-start gap-2">
                <div className="text-base-content/40 mt-0.5">
                  {getFeeIcon(fee.unit)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-base-content/70 truncate">
                      {fee.label}
                    </span>
                    <span className="text-xs font-semibold text-base-content/80 whitespace-nowrap tabular-nums">
                      {formatFeeValue(fee, t)}
                    </span>
                  </div>
                  {/* Context + Discount */}
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {fee.context && (
                      <span className="text-[10px] text-base-content/40">
                        {fee.context}
                      </span>
                    )}
                    {fee.discount && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 font-medium">
                        {fee.discount.label} {fee.discount.condition && `(${fee.discount.condition})`}
                      </span>
                    )}
                    {/* sat/vB conversion */}
                    {fee.conversion && (
                      <span className="text-[10px] text-base-content/40" title={`BTC @ $${fee.conversion.btc_price_usd?.toLocaleString()}`}>
                        ({currency === 'EUR'
                          ? `~€${fee.conversion.min_eur}-€${fee.conversion.max_eur}`
                          : `~$${fee.conversion.min_usd}-$${fee.conversion.max_usd}`
                        })
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No fees at all — free product */}
        {(!fb.fees || fb.fees.length === 0) && !fb.product_cost && (
          <div className="px-3 py-2 text-xs text-green-600 font-medium">
            {t("pricingDisplay.freeToUse")}
          </div>
        )}
      </div>
    );
  }

  // ─── Fallback: plain text display (backward compatible) ───
  return (
    <div className="mb-6 p-3 rounded-lg bg-base-200/50 border border-base-content/5 max-w-md">
      <div className="flex items-center gap-2 mb-1">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-base-content/50">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
        </svg>
        <span className="text-xs font-medium text-base-content/50 uppercase tracking-wider">
          {t("pricingDisplay.priceAndFees")}
        </span>
      </div>
      {priceEur > 0 && (
        <div className="text-base-content/80 text-sm">
          <span className="font-semibold">{formatPriceFn(displayPrice, currency)}</span>
          {currency === 'USD' && priceEur && (
            <span className="text-xs text-base-content/40 ml-2">
              (~{formatPriceFn(priceEur, 'EUR')})
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

/**
 * Get a compact fee summary for ProductCard badges.
 * Returns array of { text, color } objects (max 2).
 */
export function getCompactFeeSummary(feesBreakdown, t) {
  if (!feesBreakdown?.fees?.length) return null;

  const variableLabel = t ? t("pricingDisplay.variable") : "Variable";
  const feeLabel = t ? t("pricingDisplay.fee") : "Fee";

  return feesBreakdown.fees.slice(0, 2).map((fee) => {
    let text;
    if (fee.type === "variable") {
      text = fee.label || variableLabel;
    } else if (fee.value != null) {
      const val = fee.value;
      const max = fee.value_max;
      const unit = fee.unit || "";
      const label = fee.label || "";

      if (fee.type === "range" && max != null) {
        text = `${val}-${max}${unit.startsWith('%') ? '%' : ` ${unit}`}`;
      } else {
        text = `${val}${unit.startsWith('%') ? '%' : ` ${unit}`}`;
      }
      // Append short label if it fits
      if (label && label.length <= 12) {
        text += ` ${label.toLowerCase()}`;
      }
    } else {
      text = fee.label || feeLabel;
    }

    return { text: text.trim() };
  });
}
