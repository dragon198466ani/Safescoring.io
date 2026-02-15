import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

/**
 * POST /api/corrections
 * Submit a user correction (closed-loop data system)
 *
 * This creates UNIQUE data that improves over time:
 * - User feedback improves our evaluations
 * - Creates engagement moat
 * - Builds user reputation system
 */
export async function POST(request) {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required to submit corrections" },
        { status: 401 }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const {
      productId,
      productSlug,
      normId,
      fieldCorrected,
      originalValue,
      suggestedValue,
      correctionReason,
      evidenceUrls,
      evidenceDescription,
    } = body;

    // Validation
    if (!productId && !productSlug) {
      return NextResponse.json(
        { error: "Product ID or slug is required" },
        { status: 400 }
      );
    }

    if (!fieldCorrected || !suggestedValue) {
      return NextResponse.json(
        { error: "Field to correct and suggested value are required" },
        { status: 400 }
      );
    }

    // Valid field types
    const validFields = [
      "evaluation",      // Correction on norm evaluation (YES/NO/N/A)
      "product_info",    // Correction on product information
      "incident",        // Correction on incident data
      "methodology",     // Suggestion for methodology improvement
      "other"            // Other corrections
    ];

    if (!validFields.includes(fieldCorrected)) {
      return NextResponse.json(
        { error: `Invalid field type. Must be one of: ${validFields.join(", ")}` },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Get product ID if only slug provided
    let resolvedProductId = productId;
    if (!productId && productSlug) {
      const { data: product, error } = await supabase
        .from("products")
        .select("id")
        .eq("slug", productSlug)
        .single();

      if (error || !product) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }
      resolvedProductId = product.id;
    }

    // Check for duplicate correction (same user, same product, same field, pending)
    const { data: existingCorrection } = await supabase
      .from("user_corrections")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("product_id", resolvedProductId)
      .eq("field_corrected", fieldCorrected)
      .eq("status", "pending")
      .single();

    if (existingCorrection) {
      return NextResponse.json(
        { error: "You already have a pending correction for this field" },
        { status: 409 }
      );
    }

    // Create correction (no personal reputation/scoring data stored)
    const correctionData = {
      product_id: resolvedProductId,
      norm_id: normId || null,
      user_id: session.user.id,
      field_corrected: fieldCorrected,
      original_value: originalValue || null,
      suggested_value: suggestedValue,
      correction_reason: correctionReason || null,
      evidence_urls: evidenceUrls || [],
      evidence_description: evidenceDescription || null,
      status: "pending",
    };

    const { data: correction, error: insertError } = await supabase
      .from("user_corrections")
      .insert(correctionData)
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting correction:", insertError);
      return NextResponse.json(
        { error: "Failed to submit correction" },
        { status: 500 }
      );
    }

    // Check for consensus (3+ users suggesting same correction)
    const consensusResult = await checkAndApplyConsensus({
      productId: resolvedProductId,
      normId: normId || null,
      fieldCorrected,
      suggestedValue
    });

    if (consensusResult.applied) {
      return NextResponse.json({
        success: true,
        consensusReached: true,
        correction: {
          id: correction.id,
          status: "approved",
          created_at: correction.created_at,
        },
        message: "Consensus reached! Your correction has been automatically approved and applied.",
      });
    }

    return NextResponse.json({
      success: true,
      correction: {
        id: correction.id,
        status: correction.status,
        created_at: correction.created_at,
      },
      votesNeeded: 3 - consensusResult.count,
      message: `Thank you! Your correction has been submitted. ${3 - consensusResult.count} more vote(s) needed for auto-approval.`,
    });

  } catch (error) {
    console.error("Correction submission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Check if consensus is reached and auto-approve corrections
 * Consensus = 3+ users suggesting the same correction
 */
async function checkAndApplyConsensus({ productId, normId, fieldCorrected, suggestedValue }) {
  const CONSENSUS_THRESHOLD = 3;

  try {
    // Find similar pending corrections (same product + field + suggested value)
    let query = supabase
      .from("user_corrections")
      .select("id, user_id, product_id, norm_id, field_corrected, suggested_value, correction_reason")
      .eq("product_id", productId)
      .eq("field_corrected", fieldCorrected)
      .eq("suggested_value", suggestedValue)
      .eq("status", "pending");

    if (normId) {
      query = query.eq("norm_id", normId);
    } else {
      query = query.is("norm_id", null);
    }

    const { data: similarCorrections, error } = await query;

    if (error || !similarCorrections) {
      console.error("Error checking consensus:", error);
      return { applied: false, count: 0 };
    }

    if (similarCorrections.length < CONSENSUS_THRESHOLD) {
      return { applied: false, count: similarCorrections.length };
    }

    // CONSENSUS REACHED - Auto-approve all similar corrections
    const correctionIds = similarCorrections.map(c => c.id);
    const userIds = [...new Set(similarCorrections.map(c => c.user_id).filter(Boolean))];

    // 1. Update status of all corrections to approved
    const { error: updateError } = await supabase
      .from("user_corrections")
      .update({
        status: "approved",
        reviewed_by: null, // system
        reviewed_at: new Date().toISOString(),
        review_notes: `Auto-approved by consensus (${similarCorrections.length} votes)`,
        was_applied: true
      })
      .in("id", correctionIds);

    if (updateError) {
      console.error("Error updating corrections:", updateError);
      return { applied: false, count: similarCorrections.length };
    }

    // 2. Apply the correction
    await applyUserCorrection(similarCorrections[0]);

    console.log(`Consensus reached! Auto-approved ${similarCorrections.length} corrections for product ${productId}`);
    return { applied: true, count: similarCorrections.length };

  } catch (error) {
    console.error("Consensus check error:", error);
    return { applied: false, count: 0 };
  }
}

/**
 * Apply a user correction to the database
 */
async function applyUserCorrection(correction) {
  try {
    switch (correction.field_corrected) {
      case "evaluation":
        // Update evaluation for product/norm
        if (correction.norm_id && correction.product_id) {
          await supabase
            .from("evaluations")
            .update({
              result: correction.suggested_value,
              why_this_result: `Community correction: ${correction.correction_reason || "Consensus reached"}`,
              evaluated_by: "community_consensus",
              evaluation_date: new Date().toISOString(),
            })
            .eq("product_id", correction.product_id)
            .eq("norm_id", correction.norm_id);
        }
        break;

      case "product_info":
        // Update product information
        try {
          const updates = JSON.parse(correction.suggested_value);
          await supabase
            .from("products")
            .update(updates)
            .eq("id", correction.product_id);
        } catch {
          console.log("Product info correction requires JSON format");
        }
        break;

      case "incident":
        console.log(`Incident correction applied for product ${correction.product_id}`);
        break;

      default:
        console.log(`Unknown correction type: ${correction.field_corrected}`);
    }

    // Record score impact
    await supabase
      .from("user_corrections")
      .update({ score_impact: 1.0 })
      .eq("id", correction.id);

  } catch (error) {
    console.error("Error applying correction:", error);
  }
}

/**
 * GET /api/corrections
 * Get user's corrections or all corrections (admin)
 */
export async function GET(request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const productSlug = searchParams.get("product");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    let query = supabase
      .from("user_corrections")
      .select(`
        id,
        product_id,
        products(name, slug),
        norm_id,
        norms(code, title),
        field_corrected,
        original_value,
        suggested_value,
        correction_reason,
        status,
        was_applied,
        score_impact,
        created_at,
        updated_at
      `)
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    if (productSlug) {
      // Need to get product ID first
      const { data: product } = await supabase
        .from("products")
        .select("id")
        .eq("slug", productSlug)
        .single();

      if (product) {
        query = query.eq("product_id", product.id);
      }
    }

    const { data: corrections, error } = await query;

    if (error) {
      console.error("Error fetching corrections:", error);
      return NextResponse.json(
        { error: "Failed to fetch corrections" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      corrections: corrections || [],
      total: corrections?.length || 0,
    });

  } catch (error) {
    console.error("Error fetching corrections:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
