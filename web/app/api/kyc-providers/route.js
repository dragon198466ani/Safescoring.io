/**
 * KYC Providers API
 * GET /api/kyc-providers
 *
 * Returns KYC providers and product-to-provider mappings.
 * Used by the KYC Exposure feature in user setups.
 */

import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

// Cache for 1 hour (KYC provider data doesn't change often)
export const revalidate = 3600;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const productIds = searchParams.get("product_ids");

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      success: false,
      error: "Database not configured",
    }, { status: 503 });
  }

  try {
    // Fetch all KYC providers
    const { data: providers, error: providersError } = await supabase
      .from("kyc_providers")
      .select("*")
      .order("name");

    if (providersError) {
      console.error("Error fetching KYC providers:", providersError);
      return NextResponse.json({
        success: false,
        error: "Failed to fetch KYC providers",
      }, { status: 500 });
    }

    // Fetch product-to-provider mappings
    let mappingsQuery = supabase
      .from("product_kyc_mapping")
      .select(`
        id,
        product_id,
        kyc_provider_id,
        kyc_required,
        kyc_level,
        notes,
        provider:kyc_providers(*)
      `);

    // Filter by product IDs if provided
    if (productIds) {
      const ids = productIds.split(",").map(Number).filter(Boolean);
      if (ids.length > 0) {
        mappingsQuery = mappingsQuery.in("product_id", ids);
      }
    }

    const { data: mappings, error: mappingsError } = await mappingsQuery;

    if (mappingsError) {
      console.error("Error fetching KYC mappings:", mappingsError);
      return NextResponse.json({
        success: false,
        error: "Failed to fetch KYC mappings",
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      providers: providers || [],
      mappings: mappings || [],
    }, {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("KYC Providers API error:", error);
    return NextResponse.json({
      success: false,
      error: "Internal server error",
    }, { status: 500 });
  }
}
