import { NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/libs/supabase";
import { requireAdmin } from "@/libs/admin-auth";

// GET /api/products/[slug]/countries - Get operating countries for a product
export async function GET(request, { params }) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const { slug } = params;

    const { data: product, error } = await supabaseAdmin
      .from("products")
      .select("id, name, slug, country_origin, countries_operating")
      .eq("slug", slug)
      .single();

    if (error || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        countryOrigin: product.country_origin,
        countriesOperating: product.countries_operating || [],
      },
    });
  } catch (error) {
    console.error("Error fetching product countries:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/products/[slug]/countries - Update operating countries for a product
export async function PUT(request, { params }) {
  try {
    // SECURITY: Check admin authentication using centralized admin auth
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const { slug } = params;
    const body = await request.json();
    const { countriesOperating, countryOrigin } = body;

    // Validate countries are valid ISO codes (2 letters)
    if (countriesOperating && Array.isArray(countriesOperating)) {
      const invalidCodes = countriesOperating.filter(
        (code) => typeof code !== "string" || code.length !== 2
      );
      if (invalidCodes.length > 0) {
        return NextResponse.json(
          { error: `Invalid country codes: ${invalidCodes.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Build update object
    const updateData = {};
    if (countriesOperating !== undefined) {
      updateData.countries_operating = countriesOperating;
    }
    if (countryOrigin !== undefined) {
      updateData.country_origin = countryOrigin;
    }

    const { data: product, error } = await supabaseAdmin
      .from("products")
      .update(updateData)
      .eq("slug", slug)
      .select("id, name, slug, country_origin, countries_operating")
      .single();

    if (error) {
      console.error("Error updating product countries:", error);
      return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        countryOrigin: product.country_origin,
        countriesOperating: product.countries_operating || [],
      },
    });
  } catch (error) {
    console.error("Error updating product countries:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
