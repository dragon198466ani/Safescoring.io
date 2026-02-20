// Approximate coordinates for country capitals (ISO 2-letter codes)
// Used for mapping incidents and products by country
export const COUNTRY_COORDINATES = {
  // North America
  US: { lat: 38.9072, lng: -77.0369, name: "United States" },
  CA: { lat: 45.4215, lng: -75.6972, name: "Canada" },
  MX: { lat: 19.4326, lng: -99.1332, name: "Mexico" },

  // Europe
  GB: { lat: 51.5074, lng: -0.1278, name: "United Kingdom" },
  FR: { lat: 48.8566, lng: 2.3522, name: "France" },
  DE: { lat: 52.5200, lng: 13.4050, name: "Germany" },
  IT: { lat: 41.9028, lng: 12.4964, name: "Italy" },
  ES: { lat: 40.4168, lng: -3.7038, name: "Spain" },
  NL: { lat: 52.3676, lng: 4.9041, name: "Netherlands" },
  BE: { lat: 50.8503, lng: 4.3517, name: "Belgium" },
  CH: { lat: 46.9481, lng: 7.4474, name: "Switzerland" },
  AT: { lat: 48.2082, lng: 16.3738, name: "Austria" },
  SE: { lat: 59.3293, lng: 18.0686, name: "Sweden" },
  NO: { lat: 59.9139, lng: 10.7522, name: "Norway" },
  DK: { lat: 55.6761, lng: 12.5683, name: "Denmark" },
  FI: { lat: 60.1699, lng: 24.9384, name: "Finland" },
  PL: { lat: 52.2297, lng: 21.0122, name: "Poland" },
  PT: { lat: 38.7223, lng: -9.1393, name: "Portugal" },
  IE: { lat: 53.3498, lng: -6.2603, name: "Ireland" },
  CZ: { lat: 50.0755, lng: 14.4378, name: "Czech Republic" },
  RO: { lat: 44.4268, lng: 26.1025, name: "Romania" },
  GR: { lat: 37.9838, lng: 23.7275, name: "Greece" },
  HU: { lat: 47.4979, lng: 19.0402, name: "Hungary" },
  BG: { lat: 42.6977, lng: 23.3219, name: "Bulgaria" },
  HR: { lat: 45.8150, lng: 15.9819, name: "Croatia" },
  SK: { lat: 48.1486, lng: 17.1077, name: "Slovakia" },
  SI: { lat: 46.0569, lng: 14.5058, name: "Slovenia" },
  LT: { lat: 54.6872, lng: 25.2797, name: "Lithuania" },
  LV: { lat: 56.9496, lng: 24.1052, name: "Latvia" },
  EE: { lat: 59.4370, lng: 24.7536, name: "Estonia" },

  // Asia
  CN: { lat: 39.9042, lng: 116.4074, name: "China" },
  JP: { lat: 35.6762, lng: 139.6503, name: "Japan" },
  KR: { lat: 37.5665, lng: 126.9780, name: "South Korea" },
  IN: { lat: 28.6139, lng: 77.2090, name: "India" },
  SG: { lat: 1.3521, lng: 103.8198, name: "Singapore" },
  HK: { lat: 22.3193, lng: 114.1694, name: "Hong Kong" },
  TW: { lat: 25.0330, lng: 121.5654, name: "Taiwan" },
  TH: { lat: 13.7563, lng: 100.5018, name: "Thailand" },
  MY: { lat: 3.1390, lng: 101.6869, name: "Malaysia" },
  ID: { lat: -6.2088, lng: 106.8456, name: "Indonesia" },
  PH: { lat: 14.5995, lng: 120.9842, name: "Philippines" },
  VN: { lat: 21.0285, lng: 105.8542, name: "Vietnam" },
  IL: { lat: 31.7683, lng: 35.2137, name: "Israel" },
  AE: { lat: 24.4539, lng: 54.3773, name: "United Arab Emirates" },
  SA: { lat: 24.7136, lng: 46.6753, name: "Saudi Arabia" },
  TR: { lat: 39.9334, lng: 32.8597, name: "Turkey" },
  RU: { lat: 55.7558, lng: 37.6173, name: "Russia" },
  KZ: { lat: 51.1694, lng: 71.4491, name: "Kazakhstan" },

  // Oceania
  AU: { lat: -35.2809, lng: 149.1300, name: "Australia" },
  NZ: { lat: -41.2865, lng: 174.7762, name: "New Zealand" },

  // South America
  BR: { lat: -15.8267, lng: -47.9218, name: "Brazil" },
  AR: { lat: -34.6037, lng: -58.3816, name: "Argentina" },
  CL: { lat: -33.4489, lng: -70.6693, name: "Chile" },
  CO: { lat: 4.7110, lng: -74.0721, name: "Colombia" },
  PE: { lat: -12.0464, lng: -77.0428, name: "Peru" },
  VE: { lat: 10.4806, lng: -66.9036, name: "Venezuela" },
  UY: { lat: -34.9011, lng: -56.1645, name: "Uruguay" },
  PY: { lat: -25.2637, lng: -57.5759, name: "Paraguay" },
  BO: { lat: -16.5000, lng: -68.1500, name: "Bolivia" },
  EC: { lat: -0.1807, lng: -78.4678, name: "Ecuador" },

  // Africa
  ZA: { lat: -25.7479, lng: 28.2293, name: "South Africa" },
  NG: { lat: 9.0765, lng: 7.3986, name: "Nigeria" },
  EG: { lat: 30.0444, lng: 31.2357, name: "Egypt" },
  KE: { lat: -1.2864, lng: 36.8172, name: "Kenya" },
  MA: { lat: 33.9716, lng: -6.8498, name: "Morocco" },
  GH: { lat: 5.6037, lng: -0.1870, name: "Ghana" },
  ET: { lat: 9.0320, lng: 38.7469, name: "Ethiopia" },
  TZ: { lat: -6.7924, lng: 39.2083, name: "Tanzania" },
  UG: { lat: 0.3476, lng: 32.5825, name: "Uganda" },
  DZ: { lat: 36.7538, lng: 3.0588, name: "Algeria" },
  TN: { lat: 36.8065, lng: 10.1815, name: "Tunisia" },

  // Middle East
  QA: { lat: 25.2854, lng: 51.5310, name: "Qatar" },
  KW: { lat: 29.3759, lng: 47.9774, name: "Kuwait" },
  BH: { lat: 26.0667, lng: 50.5577, name: "Bahrain" },
  OM: { lat: 23.5880, lng: 58.3829, name: "Oman" },
  JO: { lat: 31.9454, lng: 35.9284, name: "Jordan" },
  LB: { lat: 33.8938, lng: 35.5018, name: "Lebanon" },

  // Small Countries & Territories
  LU: { lat: 49.6116, lng: 6.1319, name: "Luxembourg" },
  SC: { lat: -4.6796, lng: 55.4920, name: "Seychelles" },
  KY: { lat: 19.3133, lng: -81.2546, name: "Cayman Islands" },
  BM: { lat: 32.3078, lng: -64.7505, name: "Bermuda" },
  GI: { lat: 36.1408, lng: -5.3536, name: "Gibraltar" },
  MT: { lat: 35.8989, lng: 14.5146, name: "Malta" },
  CY: { lat: 35.1264, lng: 33.4299, name: "Cyprus" },
  IS: { lat: 64.1466, lng: -21.9426, name: "Iceland" },
  LI: { lat: 47.1410, lng: 9.5209, name: "Liechtenstein" },
  MC: { lat: 43.7384, lng: 7.4246, name: "Monaco" },
  AD: { lat: 42.5063, lng: 1.5218, name: "Andorra" },
  SM: { lat: 43.9424, lng: 12.4578, name: "San Marino" },
  VA: { lat: 41.9029, lng: 12.4534, name: "Vatican City" },

  // Central America & Caribbean
  CR: { lat: 9.9281, lng: -84.0907, name: "Costa Rica" },
  PA: { lat: 8.9824, lng: -79.5199, name: "Panama" },
  GT: { lat: 14.6349, lng: -90.5069, name: "Guatemala" },
  SV: { lat: 13.6929, lng: -89.2182, name: "El Salvador" },
  HN: { lat: 14.0723, lng: -87.1921, name: "Honduras" },
  NI: { lat: 12.1150, lng: -86.2362, name: "Nicaragua" },
  JM: { lat: 18.0179, lng: -76.8099, name: "Jamaica" },
  TT: { lat: 10.6918, lng: -61.2225, name: "Trinidad and Tobago" },
  BS: { lat: 25.0443, lng: -77.3504, name: "Bahamas" },
  BB: { lat: 13.1939, lng: -59.5432, name: "Barbados" },

  // Additional territories
  VG: { lat: 18.4207, lng: -64.6399, name: "British Virgin Islands" },
  UA: { lat: 50.4501, lng: 30.5234, name: "Ukraine" },

  // Special codes
  XX: { lat: 0, lng: 0, name: "Inconnu" }, // Unknown/unspecified location (shown at 0,0)
  EU: { lat: 50.8503, lng: 4.3517, name: "Union Européenne" }, // Brussels as EU center
  GLOBAL: { lat: 0, lng: 0, name: "Global" }, // For truly global products
};

export function getCountryCoordinates(countryCode) {
  if (!countryCode) return null;
  return COUNTRY_COORDINATES[countryCode.toUpperCase()] || null;
}

export function getCountryName(countryCode) {
  if (!countryCode) return "Inconnu";
  const coords = COUNTRY_COORDINATES[countryCode.toUpperCase()];
  return coords ? coords.name : countryCode;
}
