import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

export const dynamic = "force-dynamic";

// POST /api/stack/compliance - Check if a crypto stack is legal in a country
export async function POST(request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { productIds, countryCode } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: "productIds array is required" },
        { status: 400 }
      );
    }

    if (!countryCode || countryCode.length !== 2) {
      return NextResponse.json(
        { error: "Valid 2-letter country code is required" },
        { status: 400 }
      );
    }

    // Get country profile
    const { data: countryProfile, error: countryError } = await supabase
      .from("country_crypto_profiles")
      .select("*")
      .eq("country_code", countryCode.toUpperCase())
      .single();

    if (countryError) {
      return NextResponse.json(
        {
          error: "Country not found",
          countryCode,
          suggestion: "We don't have regulatory data for this country yet",
        },
        { status: 404 }
      );
    }

    // Get products details
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, slug, name, type_id, specs")
      .in("id", productIds);

    if (productsError || !products) {
      return NextResponse.json(
        { error: "Failed to fetch products" },
        { status: 500 }
      );
    }

    // Get compliance data for each product in this country
    const { data: complianceData, error: complianceError } = await supabase
      .from("product_country_compliance")
      .select("*")
      .in("product_id", productIds)
      .eq("country_code", countryCode.toUpperCase());

    // Get active legislation for this country
    const { data: legislation, error: legislationError } = await supabase
      .from("crypto_legislation")
      .select("*")
      .eq("country_code", countryCode.toUpperCase())
      .in("status", ["in_effect", "passed"]);

    // Build compliance report for each product
    const productReports = products.map((product) => {
      const compliance = complianceData?.find(
        (c) => c.product_id === product.id
      );

      // If no specific compliance data, infer from country profile
      let status = compliance?.status || "unknown";
      let regulatoryRisk = compliance?.regulatory_risk || "medium";
      let restrictions = [];
      let warnings = [];
      let requirements = [];

      if (!compliance) {
        // Infer from country stance
        if (countryProfile.crypto_stance === "very_hostile") {
          status = "banned";
          regulatoryRisk = "critical";
          warnings.push(
            `${countryProfile.country_name} has a very hostile stance toward crypto`
          );
        } else if (countryProfile.crypto_stance === "hostile") {
          status = "unavailable";
          regulatoryRisk = "very_high";
          warnings.push(
            `${countryProfile.country_name} has restrictive crypto policies`
          );
        } else if (!countryProfile.trading_allowed) {
          status = "banned";
          regulatoryRisk = "critical";
          warnings.push("Crypto trading is banned in this country");
        }
      }

      // Check KYC requirements
      if (compliance?.kyc_required) {
        requirements.push(
          `KYC required${
            compliance.kyc_threshold_usd
              ? ` above $${compliance.kyc_threshold_usd.toLocaleString()}`
              : ""
          }`
        );
      }

      // Check withdrawal limits
      if (compliance?.withdrawal_limit_daily_usd) {
        restrictions.push(
          `Daily withdrawal limit: $${compliance.withdrawal_limit_daily_usd.toLocaleString()}`
        );
      }

      if (compliance?.withdrawal_limit_monthly_usd) {
        restrictions.push(
          `Monthly withdrawal limit: $${compliance.withdrawal_limit_monthly_usd.toLocaleString()}`
        );
      }

      // Disabled features
      if (compliance?.features_disabled && compliance.features_disabled.length > 0) {
        restrictions.push(
          `Disabled features: ${compliance.features_disabled.join(", ")}`
        );
      }

      // Tax implications
      if (countryProfile.crypto_taxed) {
        requirements.push(
          `Capital gains tax: ${countryProfile.capital_gains_tax_rate}%`
        );
      }

      if (countryProfile.tax_reporting_required) {
        requirements.push("Tax reporting required");
      }

      return {
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        status,
        legalStatus:
          status === "available" || status === "available_restricted"
            ? "legal"
            : status === "banned"
            ? "illegal"
            : status === "available_vpn"
            ? "geo_blocked"
            : "unclear",
        regulatoryRisk,
        restrictions,
        warnings,
        requirements,
        complianceNotes: compliance?.compliance_notes,
        lastVerified: compliance?.last_verified_date,
      };
    });

    // Overall stack analysis
    const stackAnalysis = {
      overallStatus: "compliant", // compliant, restricted, illegal, risky
      overallRisk: "low", // low, medium, high, critical
      canUseStack: true,
      blockers: [],
      warnings: [],
      recommendations: [],
    };

    // Check for blockers (any banned products)
    const bannedProducts = productReports.filter(
      (p) => p.legalStatus === "illegal"
    );
    if (bannedProducts.length > 0) {
      stackAnalysis.overallStatus = "illegal";
      stackAnalysis.overallRisk = "critical";
      stackAnalysis.canUseStack = false;
      stackAnalysis.blockers.push(
        `${bannedProducts.length} product(s) are banned in ${countryProfile.country_name}`
      );
      bannedProducts.forEach((p) => {
        stackAnalysis.blockers.push(`❌ ${p.productName} is banned`);
      });
    }

    // Check for high-risk products
    const highRiskProducts = productReports.filter((p) =>
      ["high", "very_high", "critical"].includes(p.regulatoryRisk)
    );
    if (highRiskProducts.length > 0 && stackAnalysis.overallStatus !== "illegal") {
      stackAnalysis.overallStatus = "risky";
      stackAnalysis.overallRisk = "high";
      highRiskProducts.forEach((p) => {
        stackAnalysis.warnings.push(
          `⚠️ ${p.productName} has ${p.regulatoryRisk} regulatory risk`
        );
      });
    }

    // Check for restrictions
    const restrictedProducts = productReports.filter(
      (p) => p.restrictions && p.restrictions.length > 0
    );
    if (restrictedProducts.length > 0) {
      if (stackAnalysis.overallStatus === "compliant") {
        stackAnalysis.overallStatus = "restricted";
      }
      stackAnalysis.warnings.push(
        `${restrictedProducts.length} product(s) have usage restrictions`
      );
    }

    // Generate recommendations
    if (stackAnalysis.overallStatus === "illegal") {
      stackAnalysis.recommendations.push(
        "This stack cannot be used legally in your country"
      );
      stackAnalysis.recommendations.push(
        "Consider using products from countries with better crypto regulations"
      );
    } else if (stackAnalysis.overallStatus === "risky") {
      stackAnalysis.recommendations.push(
        "Review regulatory risks carefully before proceeding"
      );
      stackAnalysis.recommendations.push("Consult with a local crypto tax advisor");
    } else if (stackAnalysis.overallStatus === "restricted") {
      stackAnalysis.recommendations.push(
        "Your stack is legal but has some restrictions"
      );
      stackAnalysis.recommendations.push("Review withdrawal limits and KYC requirements");
    } else {
      stackAnalysis.recommendations.push(
        "Your stack appears to be fully compliant!"
      );
      stackAnalysis.recommendations.push("Always stay updated on changing regulations");
    }

    // Tax implications
    const taxInfo = {
      isTaxable: countryProfile.crypto_taxed,
      capitalGainsTaxRate: countryProfile.capital_gains_tax_rate,
      reportingRequired: countryProfile.tax_reporting_required,
      taxNotes: [],
    };

    if (countryProfile.crypto_taxed) {
      taxInfo.taxNotes.push(
        `Capital gains are taxed at ${countryProfile.capital_gains_tax_rate}%`
      );
    }
    if (countryProfile.tax_reporting_required) {
      taxInfo.taxNotes.push("You must report crypto transactions to tax authorities");
    }

    // Relevant legislation
    const relevantLaws = legislation
      ?.filter((law) => {
        // Filter laws that affect any of the products in the stack
        if (!law.affects_products) return false;
        // TODO: More sophisticated filtering based on product types
        return true;
      })
      .map((law) => ({
        id: law.legislation_id,
        title: law.short_title || law.title,
        category: law.category,
        severity: law.severity,
        status: law.status,
        effectiveDate: law.effective_date,
        description: law.description,
      }))
      .slice(0, 5); // Limit to 5 most relevant

    return NextResponse.json({
      success: true,
      country: {
        code: countryProfile.country_code,
        name: countryProfile.country_name,
        cryptoStance: countryProfile.crypto_stance,
        overallScore: countryProfile.overall_score,
        regulatoryClarityScore: countryProfile.regulatory_clarity_score,
        regulatoryBody: countryProfile.regulatory_body,
      },
      stackAnalysis,
      productReports,
      taxInfo,
      relevantLaws,
      disclaimer:
        "This compliance check is for informational purposes only and does not constitute legal advice. Always consult with a qualified legal professional before making financial decisions.",
    });
  } catch (error) {
    console.error("Error checking stack compliance:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/stack/compliance?country=US - Get country crypto profile
export async function GET(request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const countryCode = searchParams.get("country");

    if (!countryCode) {
      // Return all countries
      const { data: countries, error } = await supabase
        .from("country_crypto_profiles")
        .select("*")
        .order("overall_score", { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: "Failed to fetch countries" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        countries: countries.map((c) => ({
          code: c.country_code,
          name: c.country_name,
          stance: c.crypto_stance,
          overallScore: c.overall_score,
          tradingAllowed: c.trading_allowed,
          miningAllowed: c.mining_allowed,
        })),
      });
    }

    // Return specific country
    const { data: country, error } = await supabase
      .from("country_crypto_profiles")
      .select("*")
      .eq("country_code", countryCode.toUpperCase())
      .single();

    if (error || !country) {
      return NextResponse.json(
        { error: "Country not found" },
        { status: 404 }
      );
    }

    // Get legislation count
    const { count: legislationCount } = await supabase
      .from("crypto_legislation")
      .select("*", { count: "exact", head: true })
      .eq("country_code", countryCode.toUpperCase())
      .in("status", ["in_effect", "passed"]);

    return NextResponse.json({
      success: true,
      country: {
        ...country,
        activeLegislationCount: legislationCount || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching country data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
