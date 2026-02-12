/**
 * Purchasing Power Parity (PPP) — Core Module
 *
 * 7 tiers from +40% surcharge (Switzerland) to -80% discount (India).
 * US price = baseline. Rich countries pay more, poor countries pay less.
 *
 * VPN detection: timezone→country cross-validation + proxycheck.io
 */

// ============================================================
// PPP TIER DEFINITIONS
// ============================================================

export const PPP_TIERS = [
  {
    tier: 2,
    label: "Premium",
    factor: 1.4,
    discount: -40, // negative = surcharge
    countries: new Set(["CH", "NO", "LU", "IS", "LI", "MC", "BM"]),
  },
  {
    tier: 1,
    label: "High",
    factor: 1.2,
    discount: -20,
    countries: new Set(["DK", "SE", "FI", "IE", "SG", "AU", "NZ", "QA", "AE", "KW", "BH"]),
  },
  {
    tier: 0,
    label: "Standard",
    factor: 1.0,
    discount: 0,
    countries: new Set(["US", "CA", "GB", "DE", "FR", "NL", "AT", "BE", "JP", "IL", "KR"]),
  },
  {
    tier: -1,
    label: "Adjusted",
    factor: 0.8,
    discount: 20,
    countries: new Set(["ES", "IT", "PT", "CZ", "PL", "GR", "EE", "LT", "LV", "SK", "SI", "HR", "HU", "CY", "MT", "TW", "HK", "SA"]),
  },
  {
    tier: -2,
    label: "Reduced",
    factor: 0.6,
    discount: 40,
    countries: new Set(["MX", "CL", "UY", "CR", "PA", "RO", "BG", "RS", "TR", "MY", "TH", "CN", "RU", "ZA", "AR", "BR"]),
  },
  {
    tier: -3,
    label: "Developing",
    factor: 0.4,
    discount: 60,
    countries: new Set(["CO", "PE", "PH", "VN", "ID", "EG", "MA", "TN", "JO", "UA", "GE", "KZ", "DO"]),
  },
  {
    tier: -4,
    label: "Emerging",
    factor: 0.2,
    discount: 80,
    countries: new Set(["IN", "BD", "PK", "NG", "KE", "GH", "ET", "TZ", "UG", "NP", "LK", "MM", "KH", "LA"]),
  },
];

// ============================================================
// COUNTRY → TIER LOOKUP
// ============================================================

// Build reverse lookup: country code → tier object
const COUNTRY_TO_TIER = {};
for (const tierDef of PPP_TIERS) {
  for (const country of tierDef.countries) {
    COUNTRY_TO_TIER[country] = tierDef;
  }
}

/**
 * Get PPP tier info for a country code.
 * @param {string} countryCode - ISO 3166-1 alpha-2 (e.g., "IN", "US")
 * @returns {{ tier: number, factor: number, discount: number, label: string, discountCode: string|null, surchargeVariants: object|null }}
 */
export function getCountryPPPTier(countryCode) {
  const code = (countryCode || "").toUpperCase();
  const tierDef = COUNTRY_TO_TIER[code] || PPP_TIERS[2]; // Default: Tier 0 (US base)

  // Discount codes for negative tiers (discount countries)
  let discountCode = null;
  if (tierDef.tier === -1) discountCode = process.env.PPP_DISCOUNT_TIER1 || null;
  if (tierDef.tier === -2) discountCode = process.env.PPP_DISCOUNT_TIER2 || null;
  if (tierDef.tier === -3) discountCode = process.env.PPP_DISCOUNT_TIER3 || null;
  if (tierDef.tier === -4) discountCode = process.env.PPP_DISCOUNT_TIER4 || null;

  // Surcharge variant IDs for positive tiers (rich countries)
  let surchargeVariants = null;
  if (tierDef.tier === 1) {
    surchargeVariants = {
      explorer: process.env.LS_EXPLORER_PLUS20_VARIANT || null,
      professional: process.env.LS_PRO_PLUS20_VARIANT || null,
      enterprise: process.env.LS_ENTERPRISE_PLUS20_VARIANT || null,
    };
  }
  if (tierDef.tier === 2) {
    surchargeVariants = {
      explorer: process.env.LS_EXPLORER_PLUS40_VARIANT || null,
      professional: process.env.LS_PRO_PLUS40_VARIANT || null,
      enterprise: process.env.LS_ENTERPRISE_PLUS40_VARIANT || null,
    };
  }

  return {
    tier: tierDef.tier,
    factor: tierDef.factor,
    discount: tierDef.discount,
    label: tierDef.label,
    discountCode,
    surchargeVariants,
  };
}

/**
 * Calculate PPP-adjusted prices for all plans.
 * @param {number} tier - PPP tier (-4 to +2)
 * @param {number} factor - PPP factor (0.2 to 1.4)
 * @returns {{ explorer: number, professional: number, enterprise: number }}
 */
export function getPPPPrices(factor) {
  return {
    explorer: Math.round(19 * factor * 100) / 100,
    professional: Math.round(49 * factor * 100) / 100,
    enterprise: Math.round(299 * factor * 100) / 100,
  };
}

// ============================================================
// TIMEZONE → COUNTRY MAPPING (for VPN detection)
// ============================================================

/**
 * Maps major IANA timezones to expected ISO country codes.
 * Used to cross-validate IP country vs browser timezone.
 * Not exhaustive — covers ~95% of users.
 */
export const TIMEZONE_COUNTRY_MAP = {
  // Americas
  "America/New_York": ["US"],
  "America/Chicago": ["US"],
  "America/Denver": ["US"],
  "America/Los_Angeles": ["US"],
  "America/Anchorage": ["US"],
  "America/Phoenix": ["US"],
  "America/Detroit": ["US"],
  "America/Indiana/Indianapolis": ["US"],
  "America/Boise": ["US"],
  "Pacific/Honolulu": ["US"],
  "America/Toronto": ["CA"],
  "America/Vancouver": ["CA"],
  "America/Edmonton": ["CA"],
  "America/Winnipeg": ["CA"],
  "America/Halifax": ["CA"],
  "America/St_Johns": ["CA"],
  "America/Mexico_City": ["MX"],
  "America/Cancun": ["MX"],
  "America/Tijuana": ["MX"],
  "America/Sao_Paulo": ["BR"],
  "America/Fortaleza": ["BR"],
  "America/Manaus": ["BR"],
  "America/Bogota": ["CO"],
  "America/Lima": ["PE"],
  "America/Santiago": ["CL"],
  "America/Buenos_Aires": ["AR"],
  "America/Argentina/Buenos_Aires": ["AR"],
  "America/Montevideo": ["UY"],
  "America/Caracas": ["VE"],
  "America/Guayaquil": ["EC"],
  "America/La_Paz": ["BO"],
  "America/Asuncion": ["PY"],
  "America/Panama": ["PA"],
  "America/Costa_Rica": ["CR"],
  "America/Santo_Domingo": ["DO"],
  "America/Guatemala": ["GT"],

  // Europe
  "Europe/London": ["GB", "IE"],
  "Europe/Paris": ["FR"],
  "Europe/Berlin": ["DE", "AT"],
  "Europe/Amsterdam": ["NL"],
  "Europe/Brussels": ["BE"],
  "Europe/Madrid": ["ES"],
  "Europe/Rome": ["IT"],
  "Europe/Lisbon": ["PT"],
  "Europe/Zurich": ["CH", "LI"],
  "Europe/Stockholm": ["SE"],
  "Europe/Oslo": ["NO"],
  "Europe/Copenhagen": ["DK"],
  "Europe/Helsinki": ["FI", "EE"],
  "Europe/Warsaw": ["PL"],
  "Europe/Prague": ["CZ", "SK"],
  "Europe/Budapest": ["HU"],
  "Europe/Bucharest": ["RO"],
  "Europe/Sofia": ["BG"],
  "Europe/Athens": ["GR", "CY"],
  "Europe/Belgrade": ["RS", "HR", "SI"],
  "Europe/Zagreb": ["HR"],
  "Europe/Ljubljana": ["SI"],
  "Europe/Vilnius": ["LT"],
  "Europe/Riga": ["LV"],
  "Europe/Tallinn": ["EE"],
  "Europe/Dublin": ["IE"],
  "Europe/Luxembourg": ["LU"],
  "Europe/Monaco": ["MC"],
  "Europe/Kiev": ["UA"],
  "Europe/Kyiv": ["UA"],
  "Europe/Moscow": ["RU"],
  "Europe/Istanbul": ["TR"],
  "Atlantic/Reykjavik": ["IS"],

  // Asia
  "Asia/Tokyo": ["JP"],
  "Asia/Seoul": ["KR"],
  "Asia/Shanghai": ["CN"],
  "Asia/Hong_Kong": ["HK"],
  "Asia/Taipei": ["TW"],
  "Asia/Singapore": ["SG"],
  "Asia/Kuala_Lumpur": ["MY"],
  "Asia/Bangkok": ["TH"],
  "Asia/Ho_Chi_Minh": ["VN"],
  "Asia/Jakarta": ["ID"],
  "Asia/Manila": ["PH"],
  "Asia/Kolkata": ["IN"],
  "Asia/Calcutta": ["IN"],
  "Asia/Colombo": ["LK"],
  "Asia/Dhaka": ["BD"],
  "Asia/Karachi": ["PK"],
  "Asia/Kathmandu": ["NP"],
  "Asia/Yangon": ["MM"],
  "Asia/Phnom_Penh": ["KH"],
  "Asia/Vientiane": ["LA"],
  "Asia/Dubai": ["AE"],
  "Asia/Riyadh": ["SA"],
  "Asia/Qatar": ["QA"],
  "Asia/Bahrain": ["BH"],
  "Asia/Kuwait": ["KW"],
  "Asia/Jerusalem": ["IL"],
  "Asia/Amman": ["JO"],
  "Asia/Tbilisi": ["GE"],
  "Asia/Almaty": ["KZ"],

  // Africa
  "Africa/Cairo": ["EG"],
  "Africa/Casablanca": ["MA"],
  "Africa/Tunis": ["TN"],
  "Africa/Lagos": ["NG", "GH"],
  "Africa/Nairobi": ["KE", "TZ", "UG", "ET"],
  "Africa/Johannesburg": ["ZA"],
  "Africa/Accra": ["GH"],
  "Africa/Addis_Ababa": ["ET"],
  "Africa/Dar_es_Salaam": ["TZ"],
  "Africa/Kampala": ["UG"],

  // Oceania
  "Australia/Sydney": ["AU"],
  "Australia/Melbourne": ["AU"],
  "Australia/Brisbane": ["AU"],
  "Australia/Perth": ["AU"],
  "Australia/Adelaide": ["AU"],
  "Australia/Hobart": ["AU"],
  "Pacific/Auckland": ["NZ"],
  "Pacific/Fiji": ["FJ"],
};

// ============================================================
// VPN DETECTION HELPERS
// ============================================================

/**
 * Validate if browser timezone matches the IP-detected country.
 * @param {string} ipCountry - Country code from IP (e.g., "US")
 * @param {string} browserTimezone - IANA timezone from browser (e.g., "America/New_York")
 * @returns {{ match: boolean, expectedCountries: string[] }}
 */
export function validateTimezoneMatch(ipCountry, browserTimezone) {
  if (!ipCountry || !browserTimezone) {
    return { match: true, expectedCountries: [] }; // Can't validate → allow
  }

  const expectedCountries = TIMEZONE_COUNTRY_MAP[browserTimezone];

  // If timezone not in our map, we can't validate → allow (benefit of doubt)
  if (!expectedCountries) {
    return { match: true, expectedCountries: [] };
  }

  const match = expectedCountries.includes(ipCountry.toUpperCase());
  return { match, expectedCountries };
}

/**
 * Check if browser languages suggest the user is from the IP country.
 * Soft signal only — travelers may not change browser language.
 * @param {string} ipCountry - Country code from IP
 * @param {string[]} browserLanguages - navigator.languages array
 * @returns {boolean} true if any language matches
 */
export function validateLanguageMatch(ipCountry, browserLanguages = []) {
  if (!ipCountry || !browserLanguages.length) return true; // Can't validate → allow

  const country = ipCountry.toUpperCase();

  // Country → expected language prefixes
  const COUNTRY_LANGUAGES = {
    US: ["en"], CA: ["en", "fr"], GB: ["en"], AU: ["en"], NZ: ["en"],
    DE: ["de"], AT: ["de"], CH: ["de", "fr", "it"],
    FR: ["fr"], BE: ["fr", "nl", "de"], LU: ["fr", "de", "lb"],
    NL: ["nl"], ES: ["es"], IT: ["it"], PT: ["pt"],
    BR: ["pt"], MX: ["es"], AR: ["es"], CO: ["es"], CL: ["es"],
    PE: ["es"], UY: ["es"], CR: ["es"], PA: ["es"], DO: ["es"],
    JP: ["ja"], KR: ["ko"], CN: ["zh"], TW: ["zh"],
    HK: ["zh", "en"], SG: ["en", "zh", "ms"],
    IN: ["en", "hi", "bn", "ta", "te", "mr"],
    PK: ["en", "ur"], BD: ["bn", "en"],
    PH: ["en", "tl", "fil"], VN: ["vi"], TH: ["th"],
    ID: ["id"], MY: ["ms", "en"], KH: ["km"], LA: ["lo"], MM: ["my"],
    RU: ["ru"], UA: ["uk", "ru"], PL: ["pl"], CZ: ["cs"],
    SK: ["sk"], HU: ["hu"], RO: ["ro"], BG: ["bg"],
    HR: ["hr"], RS: ["sr"], SI: ["sl"], GR: ["el"],
    TR: ["tr"], IL: ["he", "en", "ar"],
    AE: ["ar", "en"], SA: ["ar"], QA: ["ar", "en"],
    KW: ["ar"], BH: ["ar"], JO: ["ar"],
    EG: ["ar"], MA: ["ar", "fr"], TN: ["ar", "fr"],
    NG: ["en"], KE: ["en", "sw"], GH: ["en"],
    ET: ["am", "en"], TZ: ["sw", "en"], UG: ["en", "sw"],
    ZA: ["en", "af", "zu"], GE: ["ka"], KZ: ["kk", "ru"],
    NP: ["ne", "en"], LK: ["si", "ta", "en"],
    SE: ["sv"], NO: ["no", "nb", "nn"], DK: ["da"], FI: ["fi", "sv"],
    EE: ["et"], LT: ["lt"], LV: ["lv"],
    IS: ["is"], IE: ["en", "ga"],
    CY: ["el", "tr"], MT: ["mt", "en"],
  };

  const expectedLangs = COUNTRY_LANGUAGES[country];
  if (!expectedLangs) return true; // Unknown country → allow

  // Check if any browser language matches expected prefixes
  return browserLanguages.some((lang) => {
    const prefix = lang.split("-")[0].toLowerCase();
    return expectedLangs.includes(prefix);
  });
}

// ============================================================
// COUNTRY NAME DISPLAY
// ============================================================

const COUNTRY_NAMES = {
  US: "United States", CA: "Canada", GB: "United Kingdom",
  DE: "Germany", FR: "France", NL: "Netherlands", AT: "Austria",
  BE: "Belgium", JP: "Japan", IL: "Israel", KR: "South Korea",
  CH: "Switzerland", NO: "Norway", LU: "Luxembourg", IS: "Iceland",
  LI: "Liechtenstein", MC: "Monaco", BM: "Bermuda",
  DK: "Denmark", SE: "Sweden", FI: "Finland", IE: "Ireland",
  SG: "Singapore", AU: "Australia", NZ: "New Zealand",
  QA: "Qatar", AE: "UAE", KW: "Kuwait", BH: "Bahrain",
  ES: "Spain", IT: "Italy", PT: "Portugal", CZ: "Czech Republic",
  PL: "Poland", GR: "Greece", EE: "Estonia", LT: "Lithuania",
  LV: "Latvia", SK: "Slovakia", SI: "Slovenia", HR: "Croatia",
  HU: "Hungary", CY: "Cyprus", MT: "Malta", TW: "Taiwan",
  HK: "Hong Kong", SA: "Saudi Arabia",
  MX: "Mexico", CL: "Chile", UY: "Uruguay", CR: "Costa Rica",
  PA: "Panama", RO: "Romania", BG: "Bulgaria", RS: "Serbia",
  TR: "Turkey", MY: "Malaysia", TH: "Thailand", CN: "China",
  RU: "Russia", ZA: "South Africa", AR: "Argentina", BR: "Brazil",
  CO: "Colombia", PE: "Peru", PH: "Philippines", VN: "Vietnam",
  ID: "Indonesia", EG: "Egypt", MA: "Morocco", TN: "Tunisia",
  JO: "Jordan", UA: "Ukraine", GE: "Georgia", KZ: "Kazakhstan",
  DO: "Dominican Republic",
  IN: "India", BD: "Bangladesh", PK: "Pakistan", NG: "Nigeria",
  KE: "Kenya", GH: "Ghana", ET: "Ethiopia", TZ: "Tanzania",
  UG: "Uganda", NP: "Nepal", LK: "Sri Lanka", MM: "Myanmar",
  KH: "Cambodia", LA: "Laos",
};

/**
 * Get display name for a country code.
 * @param {string} countryCode
 * @returns {string}
 */
export function getCountryName(countryCode) {
  return COUNTRY_NAMES[(countryCode || "").toUpperCase()] || countryCode || "Unknown";
}

/**
 * Get flag emoji for a country code.
 * @param {string} countryCode - ISO 3166-1 alpha-2
 * @returns {string} Flag emoji
 */
export function getCountryFlag(countryCode) {
  const code = (countryCode || "").toUpperCase();
  if (code.length !== 2) return "🌍";
  const offset = 127397;
  return String.fromCodePoint(...[...code].map((c) => c.charCodeAt(0) + offset));
}
