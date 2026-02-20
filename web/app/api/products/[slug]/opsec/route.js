import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

export const revalidate = 3600; // Cache for 1 hour

/**
 * GET /api/products/[slug]/opsec
 * Returns OPSEC score and features for a product
 */
export async function GET(request, { params }) {
  try {
    const { slug } = await params;

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Get product ID
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, slug")
      .eq("slug", slug)
      .maybeSingle();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Get OPSEC score from view (if migration 009 has been run)
    const { data: opsecScore } = await supabase
      .from("v_product_opsec_scores")
      .select("*")
      .eq("product_id", product.id)
      .maybeSingle();

    if (!opsecScore) {
      // Fallback: calculate manually if view doesn't exist yet
      return NextResponse.json({
        productId: product.id,
        productName: product.name,
        score: null,
        features: {
          has_duress_pin: false,
          has_hidden_wallet: false,
          has_panic_mode: false,
          duress_count: 0,
          hidden_wallet_count: 0,
          panic_count: 0,
          stealth_count: 0,
        },
        message: "OPSEC evaluation not yet available",
      });
    }

    // Get detailed OPSEC features
    const { data: features } = await supabase.rpc(
      "get_product_opsec_features",
      { p_product_slug: slug }
    );

    // Organize features by category
    const featuresByCategory = {
      "Duress Protection": [],
      "Hidden Wallets": [],
      "Panic Mode": [],
      "Physical Stealth": [],
      "Operational Security": [],
      "Social Recovery": [],
    };

    if (features) {
      features.forEach((f) => {
        if (featuresByCategory[f.category]) {
          featuresByCategory[f.category].push({
            code: f.feature_code,
            title: f.feature_title,
            available: f.feature_available,
            critical: f.is_critical,
          });
        }
      });
    }

    // Check if product has been involved in physical incidents
    const { data: incidentImpact } = await supabase
      .from("physical_incident_product_impact")
      .select(`
        id,
        product_role,
        opsec_score_impact,
        physical_incidents!inner(
          title,
          slug,
          date,
          incident_type
        )
      `)
      .eq("product_id", product.id)
      .limit(5);

    return NextResponse.json({
      productId: product.id,
      productName: product.name,
      score: Math.round(opsecScore.opsec_score_weighted || 0),
      features: {
        has_duress_pin: opsecScore.has_duress_pin || false,
        has_hidden_wallet: opsecScore.has_hidden_wallet || false,
        has_panic_mode: opsecScore.has_panic_mode || false,
        duress_count: opsecScore.duress_features || 0,
        hidden_wallet_count: opsecScore.hidden_wallet_features || 0,
        panic_count: opsecScore.panic_features || 0,
        stealth_count: opsecScore.stealth_features || 0,
      },
      featureDetails: featuresByCategory,
      stats: {
        total_norms: opsecScore.opsec_norms_total || 0,
        passed_norms: opsecScore.opsec_norms_passed || 0,
        pass_rate:
          opsecScore.opsec_norms_total > 0
            ? Math.round(
                (opsecScore.opsec_norms_passed / opsecScore.opsec_norms_total) *
                  100
              )
            : 0,
      },
      incidents: incidentImpact
        ? incidentImpact.map((i) => ({
            title: i.physical_incidents.title,
            slug: i.physical_incidents.slug,
            date: i.physical_incidents.date,
            type: i.physical_incidents.incident_type,
            role: i.product_role,
            impact: i.opsec_score_impact,
          }))
        : [],
    });
  } catch (error) {
    console.error("Error fetching OPSEC data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
