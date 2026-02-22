import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Country coordinates for map display
const COUNTRY_COORDINATES = {
  // Very Friendly
  SV: { lat: 13.7942, lng: -88.8965, name: "El Salvador" },
  SG: { lat: 1.3521, lng: 103.8198, name: "Singapore" },
  CH: { lat: 46.8182, lng: 8.2275, name: "Switzerland" },
  AE: { lat: 23.4241, lng: 53.8478, name: "UAE" },
  PT: { lat: 39.3999, lng: -8.2245, name: "Portugal" },

  // Friendly
  DE: { lat: 51.1657, lng: 10.4515, name: "Germany" },
  FR: { lat: 46.2276, lng: 2.2137, name: "France" },
  GB: { lat: 55.3781, lng: -3.436, name: "United Kingdom" },
  JP: { lat: 36.2048, lng: 138.2529, name: "Japan" },
  CA: { lat: 56.1304, lng: -106.3468, name: "Canada" },
  AU: { lat: -25.2744, lng: 133.7751, name: "Australia" },

  // Neutral / Restrictive
  US: { lat: 37.0902, lng: -95.7129, name: "United States" },
  IN: { lat: 20.5937, lng: 78.9629, name: "India" },
  KR: { lat: 35.9078, lng: 127.7669, name: "South Korea" },
  BR: { lat: -14.235, lng: -51.9253, name: "Brazil" },
  RU: { lat: 61.524, lng: 105.3188, name: "Russia" },

  // Hostile
  CN: { lat: 35.8617, lng: 104.1954, name: "China" },
  BD: { lat: 23.685, lng: 90.3563, name: "Bangladesh" },
  EG: { lat: 26.8206, lng: 30.8025, name: "Egypt" },
  MA: { lat: 31.7917, lng: -7.0926, name: "Morocco" },
  DZ: { lat: 28.0339, lng: 1.6596, name: "Algeria" },

  // Additional countries
  ES: { lat: 40.4637, lng: -3.7492, name: "Spain" },
  IT: { lat: 41.8719, lng: 12.5674, name: "Italy" },
  NL: { lat: 52.1326, lng: 5.2913, name: "Netherlands" },
  BE: { lat: 50.5039, lng: 4.4699, name: "Belgium" },
  AT: { lat: 47.5162, lng: 14.5501, name: "Austria" },
  SE: { lat: 60.1282, lng: 18.6435, name: "Sweden" },
  NO: { lat: 60.472, lng: 8.4689, name: "Norway" },
  FI: { lat: 61.9241, lng: 25.7482, name: "Finland" },
  DK: { lat: 56.2639, lng: 9.5018, name: "Denmark" },
  PL: { lat: 51.9194, lng: 19.1451, name: "Poland" },
  IE: { lat: 53.1424, lng: -7.6921, name: "Ireland" },
  LU: { lat: 49.8153, lng: 6.1296, name: "Luxembourg" },
  MT: { lat: 35.9375, lng: 14.3754, name: "Malta" },
  CY: { lat: 35.1264, lng: 33.4299, name: "Cyprus" },
  HK: { lat: 22.3193, lng: 114.1694, name: "Hong Kong" },
  TW: { lat: 23.6978, lng: 120.9605, name: "Taiwan" },
  MY: { lat: 4.2105, lng: 101.9758, name: "Malaysia" },
  TH: { lat: 15.87, lng: 100.9925, name: "Thailand" },
  VN: { lat: 14.0583, lng: 108.2772, name: "Vietnam" },
  PH: { lat: 12.8797, lng: 121.774, name: "Philippines" },
  ID: { lat: -0.7893, lng: 113.9213, name: "Indonesia" },
  NZ: { lat: -40.9006, lng: 174.886, name: "New Zealand" },
  ZA: { lat: -30.5595, lng: 22.9375, name: "South Africa" },
  NG: { lat: 9.082, lng: 8.6753, name: "Nigeria" },
  KE: { lat: -0.0236, lng: 37.9062, name: "Kenya" },
  MX: { lat: 23.6345, lng: -102.5528, name: "Mexico" },
  AR: { lat: -38.4161, lng: -63.6167, name: "Argentina" },
  CL: { lat: -35.6751, lng: -71.543, name: "Chile" },
  CO: { lat: 4.5709, lng: -74.2973, name: "Colombia" },
  PE: { lat: -9.19, lng: -75.0152, name: "Peru" },
  TR: { lat: 38.9637, lng: 35.2433, name: "Turkey" },
  SA: { lat: 23.8859, lng: 45.0792, name: "Saudi Arabia" },
  IL: { lat: 31.0461, lng: 34.8516, name: "Israel" },
  QA: { lat: 25.3548, lng: 51.1839, name: "Qatar" },
  BH: { lat: 26.0667, lng: 50.5577, name: "Bahrain" },
  KW: { lat: 29.3117, lng: 47.4818, name: "Kuwait" },
  PA: { lat: 8.538, lng: -80.7821, name: "Panama" },
};

// Stance colors for visualization
const STANCE_COLORS = {
  very_friendly: "#22c55e",  // Green
  friendly: "#84cc16",       // Lime
  neutral: "#eab308",        // Yellow
  restrictive: "#f97316",    // Orange
  hostile: "#ef4444",        // Red
  very_hostile: "#991b1b",   // Dark red
  unregulated: "#6b7280",    // Gray
};

export async function GET(request) {
  try {
    const supabase = getSupabase();
    // Fetch country crypto profiles and legislation stats in parallel
    const [profilesResult, statsResult] = await Promise.all([
      supabase
        .from("country_crypto_profiles")
        .select("*")
        .order("overall_score", { ascending: false }),
      supabase
        .from("mv_country_legislation_stats")
        .select("*")
    ]);

    const { data: profiles, error } = profilesResult;
    const legislationStats = statsResult.data || [];

    // Create lookup map for legislation stats
    const statsMap = {};
    legislationStats.forEach(s => {
      statsMap[s.country_code] = s;
    });

    if (error) {
      console.error("Error fetching legislation:", error);
      // Return fallback data if database fails
      return NextResponse.json({
        success: true,
        countries: getFallbackData(),
        stats: {
          totalCountries: 17,
          veryFriendly: 5,
          friendly: 6,
          neutral: 2,
          restrictive: 3,
          hostile: 2,
          veryHostile: 5,
        },
        stanceColors: STANCE_COLORS,
      });
    }

    // Map profiles to map-friendly format
    const countries = (profiles || []).map((profile) => {
      const coords = COUNTRY_COORDINATES[profile.country_code] || {
        lat: 0,
        lng: 0,
        name: profile.country_name,
      };

      // Get legislation stats from materialized view
      const legStats = statsMap[profile.country_code] || {};

      return {
        code: profile.country_code,
        name: profile.country_name,
        lat: coords.lat,
        lng: coords.lng,
        stance: profile.crypto_stance,
        color: STANCE_COLORS[profile.crypto_stance] || "#6b7280",
        overallScore: profile.overall_score,
        regulatoryClarity: profile.regulatory_clarity_score,
        complianceDifficulty: profile.compliance_difficulty_score,
        innovationScore: profile.innovation_score,
        cryptoLegal: profile.crypto_legal,
        tradingAllowed: profile.trading_allowed,
        miningAllowed: profile.mining_allowed,
        defiAllowed: profile.defi_allowed,
        cryptoTaxed: profile.crypto_taxed,
        capitalGainsTaxRate: profile.capital_gains_tax_rate,
        regulatoryBody: profile.regulatory_body,
        cbdcStatus: profile.cbdc_status,
        cbdcName: profile.cbdc_name,
        totalLegislation: legStats.total_legislation_count || 0,
        activeLegislation: legStats.active_legislation_count || 0,
        lastMajorLegislation: legStats.last_major_legislation_date,
      };
    });

    // Add any missing countries from coordinates
    Object.entries(COUNTRY_COORDINATES).forEach(([code, coords]) => {
      if (!countries.find((c) => c.code === code)) {
        countries.push({
          code,
          name: coords.name,
          lat: coords.lat,
          lng: coords.lng,
          stance: "unregulated",
          color: STANCE_COLORS.unregulated,
          overallScore: 50,
          cryptoLegal: true,
          tradingAllowed: true,
        });
      }
    });

    // Calculate stats
    const stats = {
      totalCountries: countries.length,
      veryFriendly: countries.filter((c) => c.stance === "very_friendly").length,
      friendly: countries.filter((c) => c.stance === "friendly").length,
      neutral: countries.filter((c) => c.stance === "neutral").length,
      restrictive: countries.filter((c) => c.stance === "restrictive").length,
      hostile: countries.filter((c) => c.stance === "hostile").length,
      veryHostile: countries.filter((c) => c.stance === "very_hostile").length,
      unregulated: countries.filter((c) => c.stance === "unregulated").length,
    };

    return NextResponse.json({
      success: true,
      countries,
      stats,
      stanceColors: STANCE_COLORS,
    });
  } catch (error) {
    console.error("Legislation map API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch legislation data",
        countries: getFallbackData(),
        stanceColors: STANCE_COLORS,
      },
      { status: 500 }
    );
  }
}

// Fallback data when database is unavailable
function getFallbackData() {
  const fallbackProfiles = [
    { code: "SV", stance: "very_friendly", score: 92 },
    { code: "SG", stance: "very_friendly", score: 88 },
    { code: "CH", stance: "very_friendly", score: 90 },
    { code: "AE", stance: "very_friendly", score: 85 },
    { code: "PT", stance: "very_friendly", score: 83 },
    { code: "DE", stance: "friendly", score: 78 },
    { code: "FR", stance: "friendly", score: 72 },
    { code: "GB", stance: "friendly", score: 70 },
    { code: "JP", stance: "friendly", score: 75 },
    { code: "CA", stance: "friendly", score: 73 },
    { code: "AU", stance: "friendly", score: 74 },
    { code: "US", stance: "restrictive", score: 65 },
    { code: "IN", stance: "restrictive", score: 55 },
    { code: "KR", stance: "neutral", score: 68 },
    { code: "BR", stance: "neutral", score: 65 },
    { code: "RU", stance: "restrictive", score: 48 },
    { code: "CN", stance: "very_hostile", score: 15 },
    { code: "BD", stance: "very_hostile", score: 10 },
    { code: "EG", stance: "hostile", score: 20 },
    { code: "MA", stance: "hostile", score: 25 },
    { code: "DZ", stance: "very_hostile", score: 12 },
  ];

  return fallbackProfiles.map((p) => {
    const coords = COUNTRY_COORDINATES[p.code];
    return {
      code: p.code,
      name: coords?.name || p.code,
      lat: coords?.lat || 0,
      lng: coords?.lng || 0,
      stance: p.stance,
      color: STANCE_COLORS[p.stance],
      overallScore: p.score,
      cryptoLegal: !["very_hostile"].includes(p.stance),
      tradingAllowed: !["very_hostile", "hostile"].includes(p.stance),
    };
  });
}
