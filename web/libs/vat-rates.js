/**
 * EU VAT Rates and Calculation Logic
 *
 * For SafeScoring LLC (USA) with OSS registration
 *
 * Rules:
 * - B2C EU: Customer's country VAT rate
 * - B2B EU (valid VAT): Reverse charge, 0%
 * - B2C/B2B non-EU: No VAT (export exempt)
 *
 * Updated: January 2026
 */

// EU Member States (27 countries)
export const EU_MEMBER_STATES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
];

// VAT Rates 2025-2026 for digital services
export const VAT_RATES = {
  // EU Member States
  AT: { rate: 0.200, name: 'Austria' },
  BE: { rate: 0.210, name: 'Belgium' },
  BG: { rate: 0.200, name: 'Bulgaria' },
  HR: { rate: 0.250, name: 'Croatia' },
  CY: { rate: 0.190, name: 'Cyprus' },
  CZ: { rate: 0.210, name: 'Czech Republic' },
  DK: { rate: 0.250, name: 'Denmark' },
  EE: { rate: 0.240, name: 'Estonia' },
  FI: { rate: 0.255, name: 'Finland' },
  FR: { rate: 0.200, name: 'France' },
  DE: { rate: 0.190, name: 'Germany' },
  GR: { rate: 0.240, name: 'Greece' },
  HU: { rate: 0.270, name: 'Hungary' },
  IE: { rate: 0.230, name: 'Ireland' },
  IT: { rate: 0.220, name: 'Italy' },
  LV: { rate: 0.210, name: 'Latvia' },
  LT: { rate: 0.210, name: 'Lithuania' },
  LU: { rate: 0.170, name: 'Luxembourg' },
  MT: { rate: 0.180, name: 'Malta' },
  NL: { rate: 0.210, name: 'Netherlands' },
  PL: { rate: 0.230, name: 'Poland' },
  PT: { rate: 0.230, name: 'Portugal' },
  RO: { rate: 0.190, name: 'Romania' },
  SK: { rate: 0.230, name: 'Slovakia' },
  SI: { rate: 0.220, name: 'Slovenia' },
  ES: { rate: 0.210, name: 'Spain' },
  SE: { rate: 0.250, name: 'Sweden' },
};

// VAT number format patterns by country
export const VAT_PATTERNS = {
  AT: /^ATU\d{8}$/,
  BE: /^BE0?\d{9,10}$/,
  BG: /^BG\d{9,10}$/,
  HR: /^HR\d{11}$/,
  CY: /^CY\d{8}[A-Z]$/,
  CZ: /^CZ\d{8,10}$/,
  DK: /^DK\d{8}$/,
  EE: /^EE\d{9}$/,
  FI: /^FI\d{8}$/,
  FR: /^FR[A-Z0-9]{2}\d{9}$/,
  DE: /^DE\d{9}$/,
  GR: /^(GR|EL)\d{9}$/,
  HU: /^HU\d{8}$/,
  IE: /^IE\d{7}[A-Z]{1,2}$|^IE\d[A-Z]\d{5}[A-Z]$/,
  IT: /^IT\d{11}$/,
  LV: /^LV\d{11}$/,
  LT: /^LT(\d{9}|\d{12})$/,
  LU: /^LU\d{8}$/,
  MT: /^MT\d{8}$/,
  NL: /^NL\d{9}B\d{2}$/,
  PL: /^PL\d{10}$/,
  PT: /^PT\d{9}$/,
  RO: /^RO\d{2,10}$/,
  SK: /^SK\d{10}$/,
  SI: /^SI\d{8}$/,
  ES: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/,
  SE: /^SE\d{12}$/,
};

/**
 * Check if a country is in the EU
 */
export function isEUCountry(countryCode) {
  return EU_MEMBER_STATES.includes(countryCode?.toUpperCase());
}

/**
 * Get VAT rate for a country
 * Returns 0 for non-EU countries
 */
export function getVATRate(countryCode) {
  const code = countryCode?.toUpperCase();
  return VAT_RATES[code]?.rate || 0;
}

/**
 * Get country name from code
 */
export function getCountryName(countryCode) {
  const code = countryCode?.toUpperCase();
  return VAT_RATES[code]?.name || countryCode;
}

/**
 * Format VAT number with country prefix
 */
export function formatVATNumber(vatNumber, countryCode) {
  if (!vatNumber) return null;

  const cleaned = vatNumber.replace(/\s/g, '').toUpperCase();
  const code = countryCode?.toUpperCase();

  if (!cleaned.startsWith(code)) {
    return `${code}${cleaned}`;
  }

  return cleaned;
}

/**
 * Validate VAT number format (before VIES check)
 */
export function validateVATNumberFormat(vatNumber, countryCode) {
  const code = countryCode?.toUpperCase();
  const pattern = VAT_PATTERNS[code];

  if (!pattern) {
    return { valid: false, error: 'Unknown country code' };
  }

  const formatted = formatVATNumber(vatNumber, code);

  if (!pattern.test(formatted)) {
    return {
      valid: false,
      error: `Invalid ${code} VAT number format`,
      formatted
    };
  }

  return { valid: true, formatted };
}

/**
 * Determine VAT treatment for a transaction
 *
 * @param {Object} params
 * @param {string} params.customerCountry - ISO 2-letter country code
 * @param {boolean} params.isB2B - Whether customer is a business
 * @param {boolean} params.vatNumberValid - Whether VAT number was validated via VIES
 * @returns {Object} VAT treatment details
 */
export function determineVATTreatment({ customerCountry, isB2B, vatNumberValid }) {
  const code = customerCountry?.toUpperCase();
  const isEU = isEUCountry(code);

  if (!isEU) {
    // Non-EU: Export exempt (no VAT)
    return {
      treatment: 'export_exempt',
      rate: 0,
      ratePercent: '0',
      description: 'Outside EU - No VAT applicable',
      invoiceNote: null,
      collectVAT: false,
    };
  }

  if (isB2B && vatNumberValid) {
    // B2B EU with valid VAT: Reverse charge
    return {
      treatment: 'reverse_charge',
      rate: 0,
      ratePercent: '0',
      description: 'EU B2B - Reverse charge mechanism',
      invoiceNote: 'VAT reverse charge applies. The recipient is liable for VAT under Article 196 of Council Directive 2006/112/EC.',
      collectVAT: false,
    };
  }

  // B2C EU or B2B without valid VAT: Customer's country rate
  const rate = getVATRate(code);
  const countryName = getCountryName(code);

  return {
    treatment: 'standard',
    rate,
    ratePercent: (rate * 100).toFixed(1),
    description: `EU ${isB2B ? 'B2B (no valid VAT)' : 'B2C'} - ${(rate * 100).toFixed(1)}% VAT (${countryName})`,
    invoiceNote: null,
    collectVAT: true,
  };
}

/**
 * Calculate VAT amounts from gross (TTC) amount
 * Assumes price shown includes VAT
 *
 * @param {number} grossAmount - Total amount including VAT (TTC)
 * @param {number} vatRate - VAT rate as decimal (e.g., 0.20 for 20%)
 * @returns {Object} Calculated amounts
 */
export function calculateVATFromGross(grossAmount, vatRate) {
  const gross = Math.round(grossAmount * 100) / 100;

  if (!vatRate || vatRate === 0) {
    return {
      gross,
      net: gross,
      vat: 0,
      rate: 0,
      ratePercent: '0',
    };
  }

  const net = Math.round((gross / (1 + vatRate)) * 100) / 100;
  const vat = Math.round((gross - net) * 100) / 100;

  return {
    gross,
    net,
    vat,
    rate: vatRate,
    ratePercent: (vatRate * 100).toFixed(1),
  };
}

/**
 * Calculate VAT amounts from net (HT) amount
 * Adds VAT on top of net price
 *
 * @param {number} netAmount - Amount before VAT (HT)
 * @param {number} vatRate - VAT rate as decimal (e.g., 0.20 for 20%)
 * @returns {Object} Calculated amounts
 */
export function calculateVATFromNet(netAmount, vatRate) {
  const net = Math.round(netAmount * 100) / 100;

  if (!vatRate || vatRate === 0) {
    return {
      gross: net,
      net,
      vat: 0,
      rate: 0,
      ratePercent: '0',
    };
  }

  const vat = Math.round((net * vatRate) * 100) / 100;
  const gross = Math.round((net + vat) * 100) / 100;

  return {
    gross,
    net,
    vat,
    rate: vatRate,
    ratePercent: (vatRate * 100).toFixed(1),
  };
}

/**
 * Get all EU countries with their VAT rates
 * Useful for dropdowns and displays
 */
export function getEUCountriesWithRates() {
  return EU_MEMBER_STATES.map(code => ({
    code,
    name: VAT_RATES[code].name,
    rate: VAT_RATES[code].rate,
    ratePercent: (VAT_RATES[code].rate * 100).toFixed(1),
  })).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Common non-EU countries list for dropdown
 */
export const COMMON_NON_EU_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'NO', name: 'Norway' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'JP', name: 'Japan' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'BR', name: 'Brazil' },
  { code: 'IN', name: 'India' },
  { code: 'CN', name: 'China' },
  { code: 'KR', name: 'South Korea' },
  { code: 'MX', name: 'Mexico' },
  { code: 'IL', name: 'Israel' },
];

/**
 * Get all countries for dropdown (EU first, then others)
 */
export function getAllCountriesForDropdown() {
  const euCountries = getEUCountriesWithRates().map(c => ({
    ...c,
    isEU: true,
    group: 'European Union',
  }));

  const nonEU = COMMON_NON_EU_COUNTRIES.map(c => ({
    ...c,
    rate: 0,
    ratePercent: '0',
    isEU: false,
    group: 'Other Countries',
  }));

  return [...euCountries, ...nonEU];
}
