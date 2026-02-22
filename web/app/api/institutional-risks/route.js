import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const RISK_COLORS = {
  very_low: "#22c55e",
  low: "#84cc16",
  medium: "#eab308",
  high: "#f97316",
  very_high: "#ef4444",
  critical: "#991b1b",
};

export async function GET(request) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const countryCode = searchParams.get("country");
    const includeIncidents = searchParams.get("incidents") !== "false";

    let risksQuery = supabase
      .from("country_institutional_risks")
      .select("*")
      .order("institutional_trust_score", { ascending: true });

    if (countryCode) {
      risksQuery = risksQuery.eq("country_code", countryCode.toUpperCase());
    }

    const { data: risks, error: risksError } = await risksQuery;

    let incidents = [];
    if (includeIncidents && !risksError) {
      let incidentsQuery = supabase
        .from("institutional_incidents")
        .select("*")
        .eq("verified", true)
        .order("incident_date", { ascending: false });

      if (countryCode) {
        incidentsQuery = incidentsQuery.eq("country_code", countryCode.toUpperCase());
      }

      const { data: incidentsData } = await incidentsQuery;
      incidents = incidentsData || [];
    }

    const countries = (risks || getFallbackRisks()).map(risk => ({
      code: risk.country_code,
      name: risk.country_name,
      institutionalTrustScore: risk.institutional_trust_score,
      overallRiskLevel: risk.overall_risk_level,
      riskColor: RISK_COLORS[risk.overall_risk_level] || "#6b7280",
      mandatoryCryptoDeclaration: risk.mandatory_crypto_declaration,
      declarationIncludesAmounts: risk.declaration_includes_amounts,
      declarationIncludesAddresses: risk.declaration_includes_addresses,
      taxAuthorityBreachHistory: risk.tax_authority_breach_history,
      knownInsiderThreats: risk.known_insider_threats,
      incidentsLast5Years: risk.incidents_last_5_years,
      declarationRiskAssessment: risk.declaration_risk_assessment,
      recommendedPrecautions: risk.recommended_precautions,
      alternativeStrategies: risk.alternative_strategies,
    }));

    return NextResponse.json({
      success: true,
      countries,
      incidents,
      riskColors: RISK_COLORS,
    });
  } catch (error) {
    console.error("Institutional risks API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function getFallbackRisks() {
  return [
    { country_code: "FR", country_name: "France", institutional_trust_score: 35, overall_risk_level: "high", mandatory_crypto_declaration: true, declaration_includes_amounts: true, tax_authority_breach_history: true },
    { country_code: "BR", country_name: "Brazil", institutional_trust_score: 20, overall_risk_level: "critical", mandatory_crypto_declaration: true, declaration_includes_amounts: true, tax_authority_breach_history: true },
    { country_code: "AE", country_name: "UAE", institutional_trust_score: 90, overall_risk_level: "very_low", mandatory_crypto_declaration: false, declaration_includes_amounts: false, tax_authority_breach_history: false },
    { country_code: "CH", country_name: "Switzerland", institutional_trust_score: 85, overall_risk_level: "low", mandatory_crypto_declaration: true, declaration_includes_amounts: true, tax_authority_breach_history: false },
  ];
}
