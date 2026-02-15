import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { requireAdmin as requireAdminAuth } from "@/libs/admin-auth";

export const dynamic = "force-dynamic";

// Admin authentication check using centralized RBAC
async function requireAdmin() {
  const admin = await requireAdminAuth();
  return !!admin;
}

/**
 * POST /api/admin/recalculate-scores
 * Recalculates SAFE scores for a single product or all products
 *
 * Body: { productId?: string } - If productId is provided, recalculate for that product only
 *                                Otherwise, recalculate for all products
 */
export async function POST(request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { productId } = body;

    if (productId) {
      // Recalculate for a single product using the SQL function
      // Convert to integer if it's a string
      const productIdInt = parseInt(productId, 10);
      if (isNaN(productIdInt)) {
        return NextResponse.json(
          { error: "Invalid productId - must be an integer" },
          { status: 400 }
        );
      }

      const { data, error } = await supabase.rpc("calculate_product_scores", {
        p_product_id: productIdInt,
      });

      if (error) {
        console.error("Error recalculating scores:", error);
        return NextResponse.json(
          { error: "Failed to recalculate scores" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Scores recalculated for product",
        result: data,
      });
    } else {
      // Recalculate for all products
      const { data, error } = await supabase.rpc("recalculate_all_scores");

      if (error) {
        console.error("Error recalculating all scores:", error);
        return NextResponse.json(
          { error: "Failed to recalculate scores" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Scores recalculated for all products",
        result: data,
      });
    }
  } catch (error) {
    console.error("Recalculate scores error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/recalculate-scores?productId=xxx
 * Alternative GET endpoint for easier testing
 */
export async function GET(request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (productId) {
      const productIdInt = parseInt(productId, 10);
      if (isNaN(productIdInt)) {
        return NextResponse.json(
          { error: "Invalid productId - must be an integer" },
          { status: 400 }
        );
      }

      const { data, error } = await supabase.rpc("calculate_product_scores", {
        p_product_id: productIdInt,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: "Scores recalculated",
        result: data,
      });
    }

    // If no productId, return info about the endpoint
    return NextResponse.json({
      message: "Recalculate Scores API",
      usage: {
        single: "GET /api/admin/recalculate-scores?productId=<uuid>",
        all: "POST /api/admin/recalculate-scores with empty body",
      },
    });
  } catch (error) {
    console.error("Recalculate scores error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
