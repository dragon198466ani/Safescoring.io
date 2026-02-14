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
 * POST /api/admin/seed-history
 * Seeds initial score history from existing safe_scoring_results
 * This creates the first historical data point for products that have scores but no history
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

    // Get all products with scores but no history yet
    const { data: productsWithScores, error: scoresError } = await supabase
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
        total_tbd,
        calculated_at
      `)
      .not("note_finale", "is", null);

    if (scoresError) {
      console.error("Error fetching scores:", scoresError);
      return NextResponse.json(
        { error: "Failed to fetch scores" },
        { status: 500 }
      );
    }

    if (!productsWithScores?.length) {
      return NextResponse.json({
        message: "No products with scores found",
        seeded: 0,
      });
    }

    // Get products that already have history
    const { data: existingHistory, error: historyError } = await supabase
      .from("score_history")
      .select("product_id")
      .order("product_id");

    if (historyError) {
      console.error("Error checking history:", historyError);
    }

    const productsWithHistory = new Set(
      existingHistory?.map((h) => h.product_id) || []
    );

    // Filter products that need initial history
    const productsNeedingHistory = productsWithScores.filter(
      (p) => !productsWithHistory.has(p.product_id)
    );

    if (!productsNeedingHistory.length) {
      return NextResponse.json({
        message: "All products already have history",
        seeded: 0,
        totalProducts: productsWithScores.length,
      });
    }

    // Create initial history entries
    const historyEntries = productsNeedingHistory.map((p) => ({
      product_id: p.product_id,
      recorded_at: p.calculated_at || new Date().toISOString(),
      safe_score: p.note_finale,
      score_s: p.score_s,
      score_a: p.score_a,
      score_f: p.score_f,
      score_e: p.score_e,
      consumer_score: p.note_consumer,
      essential_score: p.note_essential,
      total_evaluations: p.total_norms_evaluated,
      total_yes: p.total_yes,
      total_no: p.total_no,
      total_na: p.total_na,
      total_tbd: p.total_tbd,
      previous_safe_score: null,
      score_change: null,
      change_reason: "Initial score recording",
      triggered_by: "seed_history",
    }));

    // Insert history entries
    const { data: inserted, error: insertError } = await supabase
      .from("score_history")
      .insert(historyEntries)
      .select("id, product_id");

    if (insertError) {
      console.error("Error inserting history:", insertError);
      return NextResponse.json(
        { error: "Failed to insert history", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Score history seeded successfully",
      seeded: inserted?.length || 0,
      totalProducts: productsWithScores.length,
      productsWithExistingHistory: productsWithHistory.size,
    });
  } catch (error) {
    console.error("Error seeding history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/seed-history
 * Check status of score history vs scores
 */
export async function GET() {
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

    // Count products with scores
    const { count: scoresCount, error: scoresError } = await supabase
      .from("safe_scoring_results")
      .select("*", { count: "exact", head: true })
      .not("note_finale", "is", null);

    // Count unique products with history
    const { data: historyProducts, error: historyError } = await supabase
      .from("score_history")
      .select("product_id")
      .order("product_id");

    const uniqueProductsWithHistory = new Set(
      historyProducts?.map((h) => h.product_id) || []
    ).size;

    // Count total history records
    const { count: historyCount, error: countError } = await supabase
      .from("score_history")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      productsWithScores: scoresCount || 0,
      productsWithHistory: uniqueProductsWithHistory,
      totalHistoryRecords: historyCount || 0,
      needsSeeding: (scoresCount || 0) > uniqueProductsWithHistory,
      productsMissingHistory: (scoresCount || 0) - uniqueProductsWithHistory,
    });
  } catch (error) {
    console.error("Error checking history status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
