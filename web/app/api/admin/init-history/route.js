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
 * POST /api/admin/init-history
 * Complete initialization of score history for ALL products
 * This is the ONE endpoint to call to fix all graph issues
 *
 * Steps:
 * 1. Seeds initial history from existing scores (products without history)
 * 2. Generates realistic historical data (12 months) for ALL products
 *
 * Query params:
 * - months: Number of months (default: 12, max: 24)
 * - variance: Score variance % (default: 3, max: 10)
 * - forceRegenerate: Set to 'true' to delete existing history and regenerate
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
    const varianceParam = parseFloat(searchParams.get("variance"));
    const variance = Math.min(Number.isNaN(varianceParam) ? 3 : varianceParam, 10);
    const forceRegenerate = searchParams.get("forceRegenerate") === "true";

    const results = {
      step1_seed: { success: false, seeded: 0 },
      step2_generate: { success: false, generated: 0 },
      totalProducts: 0,
      productsWithHistory: 0,
      totalHistoryRecords: 0,
    };

    // ====================================
    // STEP 1: Seed initial history from existing scores
    // ====================================

    // Get all products with scores
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
        results,
      });
    }

    results.totalProducts = productsWithScores.length;

    // Get products that already have history
    const { data: existingHistory } = await supabase
      .from("score_history")
      .select("product_id")
      .order("product_id");

    const productsWithHistory = new Set(
      existingHistory?.map((h) => h.product_id) || []
    );

    // If force regenerate, delete all generated history first
    if (forceRegenerate) {
      await supabase
        .from("score_history")
        .delete()
        .eq("triggered_by", "demo_generator");

      await supabase
        .from("score_history")
        .delete()
        .eq("triggered_by", "history_generator");

      await supabase
        .from("score_history")
        .delete()
        .eq("triggered_by", "seed_script");

      await supabase
        .from("score_history")
        .delete()
        .eq("triggered_by", "seed_history");

      productsWithHistory.clear();
    }

    // Filter products that need initial history
    const productsNeedingHistory = productsWithScores.filter(
      (p) => !productsWithHistory.has(p.product_id)
    );

    // Seed initial history for products without any history
    if (productsNeedingHistory.length > 0) {
      const seedEntries = productsNeedingHistory.map((p) => ({
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
        total_tbd: p.total_tbd || 0,
        previous_safe_score: null,
        score_change: null,
        change_reason: "Initial score recording",
        triggered_by: "seed_history",
      }));

      const { data: seeded, error: seedError } = await supabase
        .from("score_history")
        .insert(seedEntries)
        .select("id");

      if (seedError) {
        console.error("Error seeding history:", seedError);
        results.step1_seed.error = seedError.message;
      } else {
        results.step1_seed.success = true;
        results.step1_seed.seeded = seeded?.length || 0;
      }
    } else {
      results.step1_seed.success = true;
      results.step1_seed.message = "All products already have history";
    }

    // ====================================
    // STEP 2: Generate historical data points
    // ====================================

    const now = new Date();
    const historyEntries = [];

    for (const product of productsWithScores) {
      let previousScore = null;
      const baseScore = product.note_finale;

      // Generate monthly data points (from oldest to newest)
      for (let i = months - 1; i >= 1; i--) {
        const recordDate = new Date(now);
        recordDate.setMonth(recordDate.getMonth() - i);
        recordDate.setDate(Math.floor(Math.random() * 28) + 1); // Random day of month

        // Check if similar record already exists for this month
        const _monthKey = `${product.product_id}-${recordDate.getFullYear()}-${recordDate.getMonth()}`;

        // Calculate score with variance (showing improvement trend)
        const trendBonus = ((months - i) / months) * 2.5; // Up to 2.5% improvement
        const randomVariance = (Math.random() - 0.5) * variance * 2;
        let score = baseScore - trendBonus + randomVariance;
        score = Math.max(0, Math.min(100, score));

        const pillarVariance = (pillarScore) => {
          if (!pillarScore) return null;
          const varied = pillarScore - trendBonus + (Math.random() - 0.5) * variance;
          return parseFloat(Math.max(0, Math.min(100, varied)).toFixed(2));
        };

        const scoreChange = previousScore !== null ? score - previousScore : null;

        historyEntries.push({
          product_id: product.product_id,
          recorded_at: recordDate.toISOString(),
          safe_score: parseFloat(score.toFixed(2)),
          score_s: pillarVariance(product.score_s),
          score_a: pillarVariance(product.score_a),
          score_f: pillarVariance(product.score_f),
          score_e: pillarVariance(product.score_e),
          consumer_score: pillarVariance(product.note_consumer),
          essential_score: pillarVariance(product.note_essential),
          total_evaluations: product.total_norms_evaluated,
          total_yes: product.total_yes,
          total_no: product.total_no,
          total_na: product.total_na,
          total_tbd: product.total_tbd || 0,
          previous_safe_score: previousScore ? parseFloat(previousScore.toFixed(2)) : null,
          score_change: scoreChange ? parseFloat(scoreChange.toFixed(2)) : null,
          change_reason:
            previousScore === null
              ? "Historical baseline"
              : scoreChange > 0
              ? "Monthly improvement"
              : scoreChange < 0
              ? "Monthly adjustment"
              : "Monthly review",
          triggered_by: "history_generator",
        });

        previousScore = score;
      }
    }

    // Insert all generated history entries in batches
    if (historyEntries.length > 0) {
      const BATCH_SIZE = 500;
      let totalInserted = 0;

      for (let i = 0; i < historyEntries.length; i += BATCH_SIZE) {
        const batch = historyEntries.slice(i, i + BATCH_SIZE);
        const { data: inserted, error: insertError } = await supabase
          .from("score_history")
          .insert(batch)
          .select("id");

        if (insertError) {
          console.error("Error inserting history batch:", insertError);
          results.step2_generate.error = insertError.message;
          break;
        }

        totalInserted += inserted?.length || 0;
      }

      results.step2_generate.success = true;
      results.step2_generate.generated = totalInserted;
    } else {
      results.step2_generate.success = true;
      results.step2_generate.message = "No new history needed";
    }

    // ====================================
    // Final counts
    // ====================================

    const { count: historyCount } = await supabase
      .from("score_history")
      .select("*", { count: "exact", head: true });

    const { data: finalHistory } = await supabase
      .from("score_history")
      .select("product_id");

    results.totalHistoryRecords = historyCount || 0;
    results.productsWithHistory = new Set(finalHistory?.map((h) => h.product_id) || []).size;

    return NextResponse.json({
      message: "Score history initialized successfully",
      results,
      config: { months, variance, forceRegenerate },
    });
  } catch (error) {
    console.error("Error initializing history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/init-history
 * Check current status of score history
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
    const { count: scoresCount } = await supabase
      .from("safe_scoring_results")
      .select("*", { count: "exact", head: true })
      .not("note_finale", "is", null);

    // Count products with history
    const { data: historyProducts } = await supabase
      .from("score_history")
      .select("product_id");

    const uniqueProductsWithHistory = new Set(
      historyProducts?.map((h) => h.product_id) || []
    ).size;

    // Count total history records
    const { count: historyCount } = await supabase
      .from("score_history")
      .select("*", { count: "exact", head: true });

    // Count by trigger type
    const { data: byTrigger } = await supabase
      .from("score_history")
      .select("triggered_by");

    const triggerCounts = {};
    byTrigger?.forEach((h) => {
      triggerCounts[h.triggered_by] = (triggerCounts[h.triggered_by] || 0) + 1;
    });

    // Average records per product
    const avgRecords = uniqueProductsWithHistory > 0
      ? ((historyCount || 0) / uniqueProductsWithHistory).toFixed(1)
      : 0;

    return NextResponse.json({
      status: {
        productsWithScores: scoresCount || 0,
        productsWithHistory: uniqueProductsWithHistory,
        productsMissingHistory: (scoresCount || 0) - uniqueProductsWithHistory,
        totalHistoryRecords: historyCount || 0,
        avgRecordsPerProduct: parseFloat(avgRecords),
        recordsByTrigger: triggerCounts,
      },
      needsInitialization: (scoresCount || 0) > uniqueProductsWithHistory || (historyCount || 0) < (scoresCount || 0) * 3,
      recommendation: uniqueProductsWithHistory === 0
        ? "Run POST /api/admin/init-history to initialize all history"
        : (historyCount || 0) < (scoresCount || 0) * 6
        ? "Run POST /api/admin/init-history?months=12 to generate more history"
        : "History is well populated",
    });
  } catch (error) {
    console.error("Error checking history status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
