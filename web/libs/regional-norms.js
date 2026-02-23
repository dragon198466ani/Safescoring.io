/**
 * Regional Norms Configuration
 *
 * Maps geographic regions to their applicable regulatory frameworks.
 * Used by the scoring engine to weight norms based on user's jurisdiction.
 *
 * Phase 4.4: International expansion
 */

export const REGIONAL_FRAMEWORKS = {
  // European Union
  eu: {
    name: "European Union",
    code: "EU",
    flag: "🇪🇺",
    frameworks: [
      { id: "mica", name: "MiCA (Markets in Crypto-Assets)", year: 2024, mandatory: true },
      { id: "gdpr", name: "GDPR (General Data Protection)", year: 2018, mandatory: true },
      { id: "dora", name: "DORA (Digital Operational Resilience)", year: 2025, mandatory: true },
      { id: "amld6", name: "6th Anti-Money Laundering Directive", year: 2024, mandatory: true },
    ],
    additionalNorms: ["kyc_strict", "data_residency_eu", "right_to_deletion"],
    scoringModifiers: {
      F: 1.2, // Fidelity weighted higher (regulatory compliance matters more)
    },
  },

  // United States
  us: {
    name: "United States",
    code: "US",
    flag: "🇺🇸",
    frameworks: [
      { id: "sec_howey", name: "SEC Howey Test", mandatory: true },
      { id: "bsa", name: "Bank Secrecy Act", mandatory: true },
      { id: "ofac", name: "OFAC Sanctions Compliance", mandatory: true },
      { id: "state_mtl", name: "State Money Transmitter Licenses", mandatory: false },
    ],
    additionalNorms: ["kyc_strict", "sanctions_screening", "tax_reporting_1099"],
    scoringModifiers: {
      F: 1.15,
    },
  },

  // United Kingdom
  uk: {
    name: "United Kingdom",
    code: "UK",
    flag: "🇬🇧",
    frameworks: [
      { id: "fca", name: "FCA Crypto Registration", year: 2023, mandatory: true },
      { id: "uk_gdpr", name: "UK GDPR", mandatory: true },
      { id: "mlr", name: "Money Laundering Regulations", mandatory: true },
    ],
    additionalNorms: ["kyc_strict", "financial_promotions"],
    scoringModifiers: {},
  },

  // Singapore
  sg: {
    name: "Singapore",
    code: "SG",
    flag: "🇸🇬",
    frameworks: [
      { id: "psa", name: "Payment Services Act", year: 2020, mandatory: true },
      { id: "pdpa", name: "Personal Data Protection Act", mandatory: true },
    ],
    additionalNorms: ["kyc_standard", "travel_rule"],
    scoringModifiers: {},
  },

  // Japan
  jp: {
    name: "Japan",
    code: "JP",
    flag: "🇯🇵",
    frameworks: [
      { id: "jfsa", name: "JFSA Registration", mandatory: true },
      { id: "appi", name: "Act on Protection of Personal Information", mandatory: true },
      { id: "fiel", name: "Financial Instruments and Exchange Law", mandatory: true },
    ],
    additionalNorms: ["kyc_strict", "cold_storage_mandate", "segregation_of_funds"],
    scoringModifiers: {
      S: 1.1, // Security weighted higher (cold storage mandate)
    },
  },

  // Switzerland
  ch: {
    name: "Switzerland",
    code: "CH",
    flag: "🇨🇭",
    frameworks: [
      { id: "finma", name: "FINMA Guidelines", mandatory: true },
      { id: "fadp", name: "Federal Act on Data Protection", mandatory: true },
      { id: "amla", name: "Anti-Money Laundering Act", mandatory: true },
    ],
    additionalNorms: ["kyc_standard", "self_regulatory_org"],
    scoringModifiers: {},
  },

  // Brazil
  br: {
    name: "Brazil",
    code: "BR",
    flag: "🇧🇷",
    frameworks: [
      { id: "crypto_framework", name: "Brazilian Crypto Framework (Law 14.478)", year: 2023, mandatory: true },
      { id: "lgpd", name: "LGPD (General Data Protection)", mandatory: true },
      { id: "bacen", name: "Central Bank Regulations", mandatory: true },
    ],
    additionalNorms: ["kyc_standard", "tax_reporting_br"],
    scoringModifiers: {},
  },

  // UAE / Dubai
  ae: {
    name: "United Arab Emirates",
    code: "AE",
    flag: "🇦🇪",
    frameworks: [
      { id: "vara", name: "VARA (Virtual Assets Regulatory Authority)", year: 2023, mandatory: true },
      { id: "difc", name: "DIFC Digital Assets Regime", mandatory: false },
      { id: "adgm", name: "ADGM FSRA Framework", mandatory: false },
    ],
    additionalNorms: ["kyc_standard", "travel_rule"],
    scoringModifiers: {},
  },

  // Global (default)
  global: {
    name: "Global",
    code: "GLOBAL",
    flag: "🌍",
    frameworks: [
      { id: "fatf", name: "FATF Recommendations", mandatory: false },
      { id: "iso27001", name: "ISO 27001", mandatory: false },
      { id: "soc2", name: "SOC 2 Type II", mandatory: false },
    ],
    additionalNorms: ["kyc_basic"],
    scoringModifiers: {},
  },
};

/**
 * Get regional framework by country code
 */
export function getRegionalFramework(countryCode) {
  const code = countryCode?.toLowerCase();
  // Map country codes to regions
  const countryToRegion = {
    // EU countries
    de: "eu", fr: "eu", it: "eu", es: "eu", nl: "eu", be: "eu",
    at: "eu", pt: "eu", ie: "eu", fi: "eu", gr: "eu", lu: "eu",
    ee: "eu", lv: "eu", lt: "eu", sk: "eu", si: "eu", cy: "eu",
    mt: "eu", hr: "eu", bg: "eu", ro: "eu", cz: "eu", dk: "eu",
    se: "eu", pl: "eu", hu: "eu",
    // Direct mappings
    us: "us", gb: "uk", uk: "uk", sg: "sg", jp: "jp",
    ch: "ch", br: "br", ae: "ae",
  };

  const region = countryToRegion[code] || "global";
  return REGIONAL_FRAMEWORKS[region] || REGIONAL_FRAMEWORKS.global;
}

/**
 * Get all supported regions
 */
export function getSupportedRegions() {
  return Object.entries(REGIONAL_FRAMEWORKS).map(([key, config]) => ({
    key,
    name: config.name,
    code: config.code,
    flag: config.flag,
    frameworkCount: config.frameworks.length,
  }));
}

/**
 * Apply regional scoring modifiers to a base score
 */
export function applyRegionalModifiers(baseScores, countryCode) {
  const region = getRegionalFramework(countryCode);
  const modifiers = region.scoringModifiers || {};

  const modified = { ...baseScores };
  for (const [pillar, multiplier] of Object.entries(modifiers)) {
    if (modified[pillar] != null) {
      modified[pillar] = Math.min(100, modified[pillar] * multiplier);
    }
  }

  return modified;
}
