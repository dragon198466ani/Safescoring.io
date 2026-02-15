import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";

/**
 * GET /api/compatibility?products=1,2,3
 * Returns compatibility matrix for given product IDs
 */
export async function GET(request) {
  try {
    // Rate limiting
    const protection = await quickProtect(request, "public");
    if (protection.blocked) {
      return protection.response;
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const productIdsParam = searchParams.get("products");

    if (!productIdsParam) {
      return NextResponse.json({ error: "products parameter required" }, { status: 400 });
    }

    const productIds = productIdsParam.split(",").map(id => parseInt(id)).filter(id => !isNaN(id));

    if (productIds.length < 2) {
      return NextResponse.json({
        error: "At least 2 products required for compatibility check",
        compatibility: []
      }, { status: 400 });
    }

    if (productIds.length > 10) {
      return NextResponse.json({
        error: "Maximum 10 products allowed",
        compatibility: []
      }, { status: 400 });
    }

    // Fetch all compatibility records for these products
    const { data: compatibilities, error } = await supabaseAdmin
      .from("product_compatibility")
      .select(`
        id,
        product_a_id,
        product_b_id,
        type_compatible,
        ai_compatible,
        ai_confidence,
        ai_confidence_factors,
        ai_method,
        ai_steps,
        ai_limitations,
        ai_justification,
        analyzed_at,
        analyzed_by
      `)
      .or(`product_a_id.in.(${productIds.join(",")}),product_b_id.in.(${productIds.join(",")})`);

    if (error) {
      console.error("Error fetching compatibility:", error);
      return NextResponse.json({ error: "Failed to fetch compatibility" }, { status: 500 });
    }

    // Filter to only pairs where BOTH products are in the list
    const relevantCompatibilities = (compatibilities || []).filter(c =>
      productIds.includes(c.product_a_id) && productIds.includes(c.product_b_id)
    );

    // Fetch product names for context
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("id, name, slug")
      .in("id", productIds);

    const productMap = {};
    (products || []).forEach(p => { productMap[p.id] = p; });

    // Enrich compatibility data with product names
    const enrichedCompatibilities = relevantCompatibilities.map(c => ({
      ...c,
      product_a_name: productMap[c.product_a_id]?.name || "Unknown",
      product_a_slug: productMap[c.product_a_id]?.slug || "",
      product_b_name: productMap[c.product_b_id]?.name || "Unknown",
      product_b_slug: productMap[c.product_b_id]?.slug || "",
      // Nuanced compatibility level based on confidence
      level: c.ai_confidence >= 0.85 ? "native"
        : c.ai_confidence >= 0.70 ? "compatible"
        : c.ai_confidence >= 0.50 ? "partial"
        : c.ai_confidence >= 0.30 ? "difficult"
        : c.ai_confidence !== null ? "not_recommended"
        : "unknown",
    }));

    // Calculate summary stats by nuanced level
    const totalPairs = (productIds.length * (productIds.length - 1)) / 2;
    const analyzedPairs = enrichedCompatibilities.length;
    const avgConfidence = enrichedCompatibilities.length > 0
      ? enrichedCompatibilities.reduce((sum, c) => sum + (c.ai_confidence || 0), 0) / enrichedCompatibilities.length
      : 0;

    // Count by level
    const levelCounts = {
      native: enrichedCompatibilities.filter(c => c.level === "native").length,
      compatible: enrichedCompatibilities.filter(c => c.level === "compatible").length,
      partial: enrichedCompatibilities.filter(c => c.level === "partial").length,
      difficult: enrichedCompatibilities.filter(c => c.level === "difficult").length,
      not_recommended: enrichedCompatibilities.filter(c => c.level === "not_recommended").length,
    };

    // Find warnings (difficult or not_recommended pairs)
    const warnings = enrichedCompatibilities
      .filter(c => c.level === "difficult" || c.level === "not_recommended")
      .map(c => ({
        products: [c.product_a_name, c.product_b_name],
        level: c.level,
        reason: c.ai_justification || c.ai_limitations || "Integration may be challenging",
        confidence: c.ai_confidence,
      }));

    return NextResponse.json({
      compatibility: enrichedCompatibilities,
      summary: {
        totalPairs,
        analyzedPairs,
        missingPairs: totalPairs - analyzedPairs,
        levelCounts,
        avgConfidence: Math.round(avgConfidence * 100),
        overallStatus: levelCounts.not_recommended > 0
          ? "warning"
          : analyzedPairs < totalPairs
            ? "incomplete"
            : avgConfidence >= 0.7
              ? "excellent"
              : "good",
      },
      warnings,
      products: products || [],
    });
  } catch (error) {
    console.error("Compatibility API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
