/**
 * Pricing Psychology System
 * Optimize conversions with psychological pricing strategies
 *
 * Strategies:
 * - Annual discount (save 2 months / 20% off)
 * - Geographic pricing (purchasing power parity)
 * - Decoy pricing (make target plan look better)
 * - Anchoring (show highest price first)
 * - Limited time offers
 * - Social proof (X users chose this plan)
 */

import config from "@/config";

// Geographic pricing multipliers (PPP-based)
export const GEOGRAPHIC_PRICING = {
  // Tier 1: Full price (100%)
  tier1: {
    multiplier: 1.0,
    countries: [
      "US", "GB", "DE", "FR", "CH", "NO", "SE", "DK", "AU", "NZ",
      "CA", "NL", "BE", "AT", "IE", "FI", "SG", "JP", "AE", "QA"
    ],
    label: "Standard pricing",
  },
  // Tier 2: 20% discount
  tier2: {
    multiplier: 0.8,
    countries: [
      "IT", "ES", "PT", "KR", "TW", "CZ", "PL", "HU", "SK", "SI",
      "HR", "EE", "LT", "LV", "CY", "MT", "GR", "IL", "SA", "KW"
    ],
    label: "Regional pricing",
  },
  // Tier 3: 40% discount
  tier3: {
    multiplier: 0.6,
    countries: [
      "BR", "MX", "AR", "CL", "CO", "PE", "RU", "TR", "ZA", "MY",
      "TH", "RO", "BG", "RS", "UA", "BY", "KZ", "CR", "PA", "UY"
    ],
    label: "Emerging market pricing",
  },
  // Tier 4: 50% discount
  tier4: {
    multiplier: 0.5,
    countries: [
      "IN", "ID", "PH", "VN", "EG", "NG", "KE", "GH", "PK", "BD",
      "LK", "NP", "MM", "KH", "LA", "EC", "BO", "PY", "HN", "GT"
    ],
    label: "Developing market pricing",
  },
  // Tier 5: 60% discount (lowest)
  tier5: {
    multiplier: 0.4,
    countries: [
      "AF", "ET", "SD", "TZ", "UG", "ZW", "MZ", "MG", "MW", "ZM",
      "BF", "ML", "NE", "TD", "SO", "YE", "SY", "HT", "SL", "LR"
    ],
    label: "Maximum discount",
  },
};

// Annual discount configuration
export const ANNUAL_DISCOUNT = {
  percent: 20,
  monthsFree: 2,
  label: "Save 2 months",
  ctaText: "Best Value",
};

// Plan display configuration (for anchoring effect)
export const PLAN_DISPLAY_ORDER = ["enterprise", "professional", "explorer", "free"];

// Social proof data (can be updated dynamically)
export const SOCIAL_PROOF = {
  explorer: {
    userCount: 1247,
    badge: "Popular",
    testimonial: "Perfect for tracking my crypto stack security.",
  },
  professional: {
    userCount: 543,
    badge: "Most Popular",
    testimonial: "The API access alone is worth it for my portfolio.",
  },
  enterprise: {
    userCount: 89,
    badge: "For Teams",
    testimonial: "We use it to audit all our fund's holdings.",
  },
};

/**
 * Get pricing tier for a country
 */
export function getGeographicPricingTier(countryCode) {
  const code = countryCode?.toUpperCase();

  for (const [tierName, tierConfig] of Object.entries(GEOGRAPHIC_PRICING)) {
    if (tierConfig.countries.includes(code)) {
      return {
        tier: tierName,
        multiplier: tierConfig.multiplier,
        label: tierConfig.label,
        discount: Math.round((1 - tierConfig.multiplier) * 100),
      };
    }
  }

  // Default to tier 1 (full price)
  return {
    tier: "tier1",
    multiplier: 1.0,
    label: "Standard pricing",
    discount: 0,
  };
}

/**
 * Calculate plan prices with all discounts applied
 */
export function calculatePlanPrices(plan, options = {}) {
  const { countryCode, isAnnual = false, discountCode = null } = options;

  const basePrice = plan.price || 0;
  const baseYearlyPrice = plan.yearlyPrice || (basePrice * 12 * 0.8);

  let finalMonthlyPrice = basePrice;
  let finalYearlyPrice = baseYearlyPrice;
  let appliedDiscounts = [];

  // Apply geographic pricing
  if (countryCode) {
    const geoTier = getGeographicPricingTier(countryCode);
    if (geoTier.multiplier < 1) {
      finalMonthlyPrice = Math.round(finalMonthlyPrice * geoTier.multiplier);
      finalYearlyPrice = Math.round(finalYearlyPrice * geoTier.multiplier);
      appliedDiscounts.push({
        type: "geographic",
        percent: geoTier.discount,
        label: geoTier.label,
      });
    }
  }

  // Apply discount code
  if (discountCode) {
    const codeDiscount = getDiscountCodeValue(discountCode);
    if (codeDiscount > 0) {
      finalMonthlyPrice = Math.round(finalMonthlyPrice * (1 - codeDiscount / 100));
      finalYearlyPrice = Math.round(finalYearlyPrice * (1 - codeDiscount / 100));
      appliedDiscounts.push({
        type: "discount_code",
        percent: codeDiscount,
        code: discountCode,
      });
    }
  }

  // Calculate effective monthly price for annual
  const effectiveMonthlyPrice = isAnnual ? finalYearlyPrice / 12 : finalMonthlyPrice;

  // Calculate savings
  const annualSavings = isAnnual ? (finalMonthlyPrice * 12) - finalYearlyPrice : 0;
  const annualSavingsPercent = isAnnual ? ANNUAL_DISCOUNT.percent : 0;

  return {
    monthlyPrice: finalMonthlyPrice,
    yearlyPrice: finalYearlyPrice,
    effectiveMonthlyPrice: Math.round(effectiveMonthlyPrice * 100) / 100,
    isAnnual,
    annualSavings,
    annualSavingsPercent,
    appliedDiscounts,
    originalMonthlyPrice: basePrice,
    originalYearlyPrice: baseYearlyPrice,
    totalDiscount: appliedDiscounts.reduce((sum, d) => sum + d.percent, 0),
  };
}

/**
 * Get discount code value
 */
export function getDiscountCodeValue(code) {
  const codes = {
    // Standard discount codes
    "WELCOME10": 10,
    "WELCOME20": 20,
    "SAVE30": 30,
    // Retention codes
    "STAY50": 50,
    "STAY30": 30,
    // Win-back codes
    "COMEBACK30": 30,
    "COMEBACK40": 40,
    "FINALCHANCE50": 50,
    // Upsell codes
    "POWER10": 10,
    "POWER25": 25,
    "SERIOUS20": 20,
    "TRIAL20": 20,
    "LASTCHANCE25": 25,
    "FINAL30": 30,
    "LOYAL15": 15,
    "REGULAR10": 10,
    // Dunning codes
    "WELCOME30": 30,
    // Trial codes
    "FREEMONTH": 100, // First month free
  };

  return codes[code?.toUpperCase()] || 0;
}

/**
 * Get all plans with optimized display (anchoring effect)
 */
export function getPlansForDisplay(options = {}) {
  const { countryCode, highlightPlan = "professional", showAnnual = true } = options;

  const plans = config.lemonsqueezy?.plans || [];

  return plans.map(plan => {
    const pricing = calculatePlanPrices(plan, { countryCode });
    const socialProof = SOCIAL_PROOF[plan.planCode];

    return {
      ...plan,
      pricing,
      isHighlighted: plan.planCode === highlightPlan,
      socialProof,
      annualOption: showAnnual && plan.price > 0 ? {
        price: pricing.yearlyPrice,
        effectiveMonthly: pricing.yearlyPrice / 12,
        savings: pricing.monthlyPrice * 12 - pricing.yearlyPrice,
        savingsPercent: ANNUAL_DISCOUNT.percent,
        label: ANNUAL_DISCOUNT.label,
      } : null,
    };
  });
}

/**
 * Create limited time offer
 */
export function createLimitedTimeOffer(plan, discountPercent, expiresInHours = 24) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  const discountedPrice = Math.round(plan.price * (1 - discountPercent / 100));

  return {
    plan: plan.planCode,
    originalPrice: plan.price,
    discountedPrice,
    discountPercent,
    savings: plan.price - discountedPrice,
    expiresAt: expiresAt.toISOString(),
    urgencyMessage: `Offer expires in ${expiresInHours} hours`,
    code: `FLASH${discountPercent}`,
  };
}

/**
 * Get price anchoring display
 * Shows original price crossed out with discounted price
 */
export function getAnchoredPriceDisplay(originalPrice, discountedPrice, currency = "$") {
  if (originalPrice === discountedPrice) {
    return {
      showAnchor: false,
      displayPrice: `${currency}${discountedPrice}`,
    };
  }

  return {
    showAnchor: true,
    originalPrice: `${currency}${originalPrice}`,
    discountedPrice: `${currency}${discountedPrice}`,
    savings: `${currency}${originalPrice - discountedPrice}`,
    savingsPercent: Math.round(((originalPrice - discountedPrice) / originalPrice) * 100),
  };
}

/**
 * Get recommended plan based on usage
 */
export function getRecommendedPlan(usage) {
  const { setupCount = 0, comparisonCount = 0, needsApi = false, teamSize = 1 } = usage;

  // Enterprise: team or needs white-label
  if (teamSize > 1 || needsApi && comparisonCount > 100) {
    return "enterprise";
  }

  // Professional: heavy user or needs API
  if (needsApi || setupCount > 5 || comparisonCount > 50) {
    return "professional";
  }

  // Explorer: moderate usage
  if (setupCount > 1 || comparisonCount > 10) {
    return "explorer";
  }

  // Free: light usage
  return "free";
}

/**
 * Generate pricing comparison table data
 */
export function getPricingComparisonData(countryCode = null) {
  const plans = getPlansForDisplay({ countryCode });

  // Features for comparison
  const features = [
    { key: "monthlyProductViews", label: "Product Score Views", type: "limit" },
    { key: "maxSetups", label: "Security Setups", type: "limit" },
    { key: "maxProductsPerSetup", label: "Products per Setup", type: "limit" },
    { key: "comparisons", label: "Comparisons", type: "limit" },
    { key: "exportPDF", label: "PDF Export", type: "boolean" },
    { key: "alerts", label: "Score Alerts", type: "boolean" },
    { key: "apiAccess", label: "API Access", type: "boolean" },
    { key: "historyDays", label: "Score History", type: "duration" },
    { key: "support", label: "Support", type: "text" },
    { key: "whiteLabel", label: "White Label", type: "boolean" },
  ];

  const supportLevels = {
    free: "Community",
    explorer: "Email (48h)",
    professional: "Email (24h)",
    enterprise: "Priority + Slack",
  };

  return {
    features,
    plans: plans.map(plan => ({
      ...plan,
      featureValues: {
        monthlyProductViews: plan.limits?.monthlyProductViews === -1 ? "Unlimited" : plan.limits?.monthlyProductViews,
        maxSetups: plan.limits?.maxSetups === -1 ? "Unlimited" : plan.limits?.maxSetups,
        maxProductsPerSetup: plan.limits?.maxProductsPerSetup === -1 ? "Unlimited" : plan.limits?.maxProductsPerSetup,
        comparisons: plan.planCode === "free" ? "1/day" : plan.planCode === "explorer" ? "10/day" : "Unlimited",
        exportPDF: plan.limits?.exportPDF || false,
        alerts: plan.limits?.alerts || false,
        apiAccess: plan.limits?.apiAccess || false,
        historyDays: plan.planCode === "free" ? "7 days" : plan.planCode === "explorer" ? "90 days" : plan.planCode === "professional" ? "1 year" : "Unlimited",
        support: supportLevels[plan.planCode] || "Community",
        whiteLabel: plan.limits?.whiteLabel || false,
      },
    })),
  };
}

/**
 * A/B test pricing display
 */
export function getABTestVariant(userId) {
  // Simple hash-based A/B test
  const hash = userId?.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0;
  const variant = hash % 3;

  const variants = {
    0: {
      name: "control",
      showAnnualFirst: false,
      highlightPlan: "professional",
      showSocialProof: true,
    },
    1: {
      name: "annual_first",
      showAnnualFirst: true,
      highlightPlan: "professional",
      showSocialProof: true,
    },
    2: {
      name: "explorer_highlight",
      showAnnualFirst: false,
      highlightPlan: "explorer",
      showSocialProof: true,
    },
  };

  return variants[variant];
}

/**
 * Track pricing page view for analytics
 */
export function trackPricingView(options) {
  const { userId, countryCode, variant, referrer } = options;

  // This would send to your analytics
  return {
    event: "pricing_page_view",
    properties: {
      userId,
      countryCode,
      variant: variant?.name,
      referrer,
      timestamp: new Date().toISOString(),
    },
  };
}

export default {
  getGeographicPricingTier,
  calculatePlanPrices,
  getDiscountCodeValue,
  getPlansForDisplay,
  createLimitedTimeOffer,
  getAnchoredPriceDisplay,
  getRecommendedPlan,
  getPricingComparisonData,
  getABTestVariant,
  trackPricingView,
  GEOGRAPHIC_PRICING,
  ANNUAL_DISCOUNT,
  SOCIAL_PROOF,
};
