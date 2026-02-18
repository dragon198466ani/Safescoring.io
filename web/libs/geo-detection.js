/**
 * Geographic Detection for Tax Compliance
 * Determines EU vs non-EU and B2B vs B2C status
 */

// EU countries list (27 member states + UK for VAT purposes)
const EU_COUNTRIES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE"
];

/**
 * Check if a country is in the EU
 */
export function isEUCountry(countryCode) {
  return EU_COUNTRIES.includes(countryCode?.toUpperCase());
}

/**
 * Detect user's country using multiple methods
 * 1. Browser locale
 * 2. Timezone analysis
 * 3. Cloudflare header (if available)
 */
export function detectUserCountry(request) {
  // Server-side: Check Cloudflare header (most accurate)
  if (request?.headers) {
    const cfCountry = request.headers.get("CF-IPCountry");
    if (cfCountry && cfCountry !== "XX") {
      return cfCountry.toUpperCase();
    }
  }

  // Client-side: Use browser locale as fallback
  if (typeof window !== "undefined") {
    const locale = navigator.language || navigator.userLanguage;
    const countryCode = locale.split("-")[1];
    if (countryCode) {
      return countryCode.toUpperCase();
    }
  }

  return null;
}

/**
 * Client-side country detection hook
 */
export function useCountryDetection() {
  if (typeof window === "undefined") return null;

  // Try to get from browser locale
  const locale = navigator.language || navigator.userLanguage;
  const countryCode = locale.split("-")[1];

  return countryCode?.toUpperCase() || null;
}

/**
 * Validate EU VAT number format (basic validation)
 * Full validation should be done server-side via VIES API
 */
export function isValidVATFormat(vatNumber, countryCode) {
  if (!vatNumber || !countryCode) return false;

  const cleaned = vatNumber.replace(/\s/g, "").toUpperCase();

  // Basic format validation (length and prefix)
  const vatPatterns = {
    AT: /^ATU\d{8}$/,
    BE: /^BE[01]\d{9}$/,
    BG: /^BG\d{9,10}$/,
    CY: /^CY\d{8}[A-Z]$/,
    CZ: /^CZ\d{8,10}$/,
    DE: /^DE\d{9}$/,
    DK: /^DK\d{8}$/,
    EE: /^EE\d{9}$/,
    EL: /^EL\d{9}$/, // Greece
    ES: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/,
    FI: /^FI\d{8}$/,
    FR: /^FR[A-Z0-9]{2}\d{9}$/,
    GB: /^GB(\d{9}|\d{12}|GD\d{3}|HA\d{3})$/,
    HR: /^HR\d{11}$/,
    HU: /^HU\d{8}$/,
    IE: /^IE\d[A-Z0-9]\d{5}[A-Z]$/,
    IT: /^IT\d{11}$/,
    LT: /^LT(\d{9}|\d{12})$/,
    LU: /^LU\d{8}$/,
    LV: /^LV\d{11}$/,
    MT: /^MT\d{8}$/,
    NL: /^NL\d{9}B\d{2}$/,
    PL: /^PL\d{10}$/,
    PT: /^PT\d{9}$/,
    RO: /^RO\d{2,10}$/,
    SE: /^SE\d{12}$/,
    SI: /^SI\d{8}$/,
    SK: /^SK\d{10}$/,
  };

  const pattern = vatPatterns[countryCode];
  return pattern ? pattern.test(cleaned) : false;
}

/**
 * Determine payment provider based on location and business type
 */
export function determinePaymentProvider({ countryCode, isBusinessCustomer, hasValidVAT }) {
  const isEU = isEUCountry(countryCode);

  // EU B2C (particulier) → Lemon Squeezy (gère TVA)
  if (isEU && !isBusinessCustomer) {
    return {
      provider: "lemonsqueezy",
      reason: "EU B2C - VAT handling required",
      vatApplicable: true,
    };
  }

  // EU B2B with valid VAT → MoonPay (reverse charge)
  if (isEU && isBusinessCustomer && hasValidVAT) {
    return {
      provider: "moonpay",
      reason: "EU B2B - Reverse charge mechanism",
      vatApplicable: false,
    };
  }

  // Non-EU → MoonPay (no EU VAT)
  if (!isEU) {
    return {
      provider: "moonpay",
      reason: "Non-EU - No EU VAT applicable",
      vatApplicable: false,
    };
  }

  // Fallback: EU B2B without valid VAT → Lemon Squeezy
  return {
    provider: "lemonsqueezy",
    reason: "EU B2B without valid VAT - Standard VAT applies",
    vatApplicable: true,
  };
}

/**
 * Get VAT rate by country
 */
export function getVATRate(countryCode) {
  const vatRates = {
    AT: 20, BE: 21, BG: 20, HR: 25, CY: 19, CZ: 21, DK: 25,
    EE: 22, FI: 24, FR: 20, DE: 19, GR: 24, HU: 27, IE: 23,
    IT: 22, LV: 21, LT: 21, LU: 17, MT: 18, NL: 21, PL: 23,
    PT: 23, RO: 19, SK: 20, SI: 22, ES: 21, SE: 25,
  };

  return vatRates[countryCode?.toUpperCase()] || 0;
}

/**
 * Calculate price with VAT
 */
export function calculatePriceWithVAT(price, countryCode) {
  const vatRate = getVATRate(countryCode);
  const vatAmount = (price * vatRate) / 100;

  return {
    netPrice: price,
    vatRate,
    vatAmount: Math.round(vatAmount * 100) / 100,
    totalPrice: Math.round((price + vatAmount) * 100) / 100,
  };
}
