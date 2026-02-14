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
 * POST /api/admin/generate-history
 * Generates simulated historical data for products to demonstrate score evolution charts
 *
 * Query params:
 * - months: Number of months of history to generate (default: 12, max: 24)
 * - variance: Score variance percentage (default: 5, max: 15)
 * - productId: Optional specific product ID to generate history for
 */
export async function POST(request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const monthsParam = parseInt(searchParams.get("months"));
    const months = Math.min(Number.isNaN(monthsParam) ? 12 : monthsParam, 24);
    const varianceParam = parseInt(searchParams.get("variance"));
    const variance = Math.min(Number.isNaN(varianceParam) ? 5 : varianceParam, 15);
    const specificProductId = searchParams.get("productId");

    // Get products with current scores
    let query = supabase
      .from("safe_scoring_results")
      .select(`
        product_id,
        note_finale,
        score_s,
        score_a,
        score_f,
        score_e,
        note_consumer,
        note_essential,
        total_norms_evaluated,
        total_yes,
        total_no,
        total_na,
        total_tbd
      `)
      .not("note_finale", "is", null);

    if (specificProductId) {
      query = query.eq("product_id", parseInt(specificProductId));
    }

    const { data: products, error: productsError } = await query;

    if (productsError) {
      console.error("Error fetching products:", productsError);
      return NextResponse.json(
        { error: "Failed to fetch products" },
        { status: 500 }
      );
    }

    if (!products?.length) {
      return NextResponse.json({
        message: "No products with scores found",
        generated: 0,
      });
    }

    // Delete ONLY demo-generated history for these products (preserve real data from triggers)
    const productIds = products.map((p) => p.product_id);
    await supabase
      .from("score_history")
      .delete()
      .in("product_id", productIds)
      .eq("triggered_by", "demo_generator");

    // Generate historical data
    const historyEntries = [];
    const now = new Date();

    for (const product of products) {
      let previousScore = null;

      // Generate data points for each month (from oldest to newest)
      for (let i = months - 1; i >= 0; i--) {
        const recordDate = new Date(now);
        recordDate.setMonth(recordDate.getMonth() - i);
        recordDate.setDate(1); // First of the month

        // Calculate score with some variance (scores generally improve over time)
        const baseScore = product.note_finale;
        // Add some random variance, with a slight upward trend over time
        const trendBonus = ((months - i) / months) * 3; // Up to 3% improvement trend
        const randomVariance = (Math.random() - 0.5) * variance * 2;
        let score = baseScore - trendBonus + randomVariance;

        // Clamp score between 0 and 100
        score = Math.max(0, Math.min(100, score));

        // For the most recent entry, use the actual current score
        if (i === 0) {
          score = baseScore;
        }

        // Calculate pillar scores with similar variance
        const pillarVariance = (pillarScore) => {
          if (!pillarScore) return null;
          const varied = pillarScore + (Math.random() - 0.5) * variance;
          return Math.max(0, Math.min(100, varied));
        };

        const scoreChange = previousScore !== null ? score - previousScore : null;

        historyEntries.push({
          product_id: product.product_id,
          recorded_at: recordDate.toISOString(),
          safe_score: parseFloat(score.toFixed(2)),
          score_s: i === 0 ? product.score_s : pillarVariance(product.score_s),
          score_a: i === 0 ? product.score_a : pillarVariance(product.score_a),
          score_f: i === 0 ? product.score_f : pillarVariance(product.score_f),
          score_e: i === 0 ? product.score_e : pillarVariance(product.score_e),
          consumer_score: i === 0 ? product.note_consumer : pillarVariance(product.note_consumer),
          essential_score: i === 0 ? product.note_essential : pillarVariance(product.note_essential),
          total_evaluations: product.total_norms_evaluated,
          total_yes: product.total_yes,
          total_no: product.total_no,
          total_na: product.total_na,
          total_tbd: product.total_tbd || 0,
          previous_safe_score: previousScore,
          score_change: scoreChange ? parseFloat(scoreChange.toFixed(2)) : null,
          change_reason: i === months - 1 ? "Initial recording" :
                        scoreChange > 0 ? "Score improved" :
                        scoreChange < 0 ? "Score decreased" : "Monthly update",
          triggered_by: "demo_generator",
        });

        previousScore = score;
      }
    }

    // Insert all history entries
    const { data: inserted, error: insertError } = await supabase
      .from("score_history")
      .insert(historyEntries)
      .select("id");

    if (insertError) {
      console.error("Error inserting history:", insertError);
      return NextResponse.json(
        { error: "Failed to insert history", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Historical data generated successfully",
      generated: inserted?.length || 0,
      products: products.length,
      monthsPerProduct: months,
      variance: variance,
    });
  } catch (error) {
    console.error("Error generating history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/generate-history
 * Clears all generated historical data
 */
export async function DELETE(request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    let query = supabase.from("score_history").delete();

    if (productId) {
      query = query.eq("product_id", parseInt(productId));
    } else {
      // Delete all demo-generated history
      query = query.eq("triggered_by", "demo_generator");
    }

    const { error } = await query;

    if (error) {
      console.error("Error deleting history:", error);
      return NextResponse.json(
        { error: "Failed to delete history" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Historical data cleared successfully",
    });
  } catch (error) {
    console.error("Error clearing history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
