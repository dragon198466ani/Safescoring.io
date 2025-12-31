import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

/**
 * GET /api/admin/corrections
 * Get all corrections for admin review
 */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    // Check admin access (you may want to add proper admin check)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Get corrections with user and product info
    let query = supabase
      .from("user_corrections")
      .select(`
        *,
        products(id, name, slug),
        norms(id, code, title, pillar),
        users(id, email, name)
      `)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data: corrections, error, count } = await query;

    if (error) {
      console.error("Error fetching corrections:", error);
      return NextResponse.json(
        { error: "Failed to fetch corrections" },
        { status: 500 }
      );
    }

    // Get stats
    const { data: stats } = await supabase
      .from("user_corrections")
      .select("status")
      .then(({ data }) => {
        const counts = {
          pending: 0,
          reviewing: 0,
          approved: 0,
          rejected: 0,
          partial: 0,
        };
        data?.forEach((c) => {
          if (counts[c.status] !== undefined) {
            counts[c.status]++;
          }
        });
        return { data: counts };
      });

    return NextResponse.json({
      corrections: corrections || [],
      stats: stats || {},
      total: corrections?.length || 0,
      limit,
      offset,
    });

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/corrections
 * Review and update a correction status
 */
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const {
      correctionId,
      status, // approved, rejected, partial
      reviewNotes,
      applyCorrection, // boolean - whether to apply the correction
    } = body;

    if (!correctionId || !status) {
      return NextResponse.json(
        { error: "Correction ID and status are required" },
        { status: 400 }
      );
    }

    const validStatuses = ["pending", "reviewing", "approved", "rejected", "partial"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Get the correction
    const { data: correction, error: fetchError } = await supabase
      .from("user_corrections")
      .select("*")
      .eq("id", correctionId)
      .single();

    if (fetchError || !correction) {
      return NextResponse.json(
        { error: "Correction not found" },
        { status: 404 }
      );
    }

    // Update the correction
    const updateData = {
      status,
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes || null,
      was_applied: applyCorrection || false,
    };

    const { error: updateError } = await supabase
      .from("user_corrections")
      .update(updateData)
      .eq("id", correctionId);

    if (updateError) {
      console.error("Error updating correction:", updateError);
      return NextResponse.json(
        { error: "Failed to update correction" },
        { status: 500 }
      );
    }

    // If approved and should apply, update the relevant data
    if (status === "approved" && applyCorrection) {
      await applyUserCorrection(correction);
    }

    // Update user reputation (trigger should handle this, but we can call manually)
    try {
      await supabase.rpc("update_user_reputation", {
        p_user_id: correction.user_id
      });
    } catch {
      // RPC might not exist
    }

    return NextResponse.json({
      success: true,
      message: `Correction ${status}`,
      correction: {
        id: correctionId,
        status,
        was_applied: applyCorrection || false,
      },
    });

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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
              why_this_result: `User correction: ${correction.correction_reason || "N/A"}`,
              evaluated_by: "user_correction",
              evaluation_date: new Date().toISOString(),
            })
            .eq("product_id", correction.product_id)
            .eq("norm_id", correction.norm_id);
        }
        break;

      case "product_info":
        // Update product information
        // Parse suggested_value as JSON if it contains multiple fields
        try {
          const updates = JSON.parse(correction.suggested_value);
          await supabase
            .from("products")
            .update(updates)
            .eq("id", correction.product_id);
        } catch {
          // If not JSON, it might be a single field update
          console.log("Product info correction requires JSON format");
        }
        break;

      case "incident":
        // Log for manual review
        console.log(`Incident correction applied for product ${correction.product_id}`);
        break;

      default:
        console.log(`Unknown correction type: ${correction.field_corrected}`);
    }

    // Record that the correction impacted the score (for tracking)
    // This helps prove the value of user feedback
    await supabase
      .from("user_corrections")
      .update({
        score_impact: 1.0, // Placeholder - calculate actual impact
      })
      .eq("id", correction.id);

  } catch (error) {
    console.error("Error applying correction:", error);
  }
}
