import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { requireAdmin } from "@/libs/admin-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/data-freshness
 *
 * Returns the freshness status of all data types in the system.
 * Helps identify what needs to be refreshed.
 *
 * Response:
 * {
 *   products: { total, scraped_last_7_days, needs_refresh, oldest_scrape },
 *   norms: { total, with_official_doc, needs_doc_scrape },
 *   evaluations: { total_products, evaluated, pending, last_batch },
 *   scores: { calculated, stale_30_days },
 *   prices: { updated_last_week, needs_update },
 *   evaluation_history: { total_changes, changes_today, changes_this_week }
 * }
 */
export async function GET(request) {
  try {
    // Check admin auth
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Execute all queries in parallel for performance
    const [
      productsResult,
      productsScrapedResult,
      normsResult,
      normsWithDocResult,
      evaluationsResult,
      evaluatedProductsResult,
      scoresResult,
      staleScoresResult,
      pricesResult,
      historyResult,
    ] = await Promise.all([
      // Total products
      supabase.from("products").select("id", { count: "exact", head: true }),

      // Products scraped in last 7 days (check specs.last_scraped)
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .gte("updated_at", weekAgo),

      // Total norms
      supabase.from("norms").select("id", { count: "exact", head: true }),

      // Norms with official documentation
      supabase
        .from("norms")
        .select("id", { count: "exact", head: true })
        .not("official_doc_summary", "is", null),

      // Total evaluations count
      supabase
        .from("evaluations")
        .select("id", { count: "exact", head: true }),

      // Distinct evaluated products
      supabase.from("evaluations").select("product_id"),

      // Products with calculated scores
      supabase
        .from("safe_scoring_results")
        .select("product_id", { count: "exact", head: true }),

      // Stale scores (not updated in 30 days)
      supabase
        .from("safe_scoring_results")
        .select("product_id", { count: "exact", head: true })
        .lt("calculated_at", monthAgo),

      // Products with prices updated in last week
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .not("price_eur", "is", null)
        .gte("updated_at", weekAgo),

      // Evaluation history stats (if table exists)
      supabase.rpc("get_evaluation_stats").catch(() => ({ data: null })),
    ]);

    // Calculate unique evaluated products
    const evaluatedProductIds = evaluatedProductsResult.data
      ? new Set(evaluatedProductsResult.data.map((e) => e.product_id))
      : new Set();

    // Get last evaluation date
    const { data: lastEval } = await supabase
      .from("evaluations")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Get oldest scrape date
    const { data: oldestProduct } = await supabase
      .from("products")
      .select("updated_at, name")
      .not("updated_at", "is", null)
      .order("updated_at", { ascending: true })
      .limit(1)
      .single();

    const totalProducts = productsResult.count || 0;
    const totalNorms = normsResult.count || 0;
    const scoredProducts = scoresResult.count || 0;

    const response = {
      timestamp: now.toISOString(),

      products: {
        total: totalProducts,
        scraped_last_7_days: productsScrapedResult.count || 0,
        needs_refresh: totalProducts - (productsScrapedResult.count || 0),
        oldest_update: oldestProduct?.updated_at || null,
        oldest_product: oldestProduct?.name || null,
      },

      norms: {
        total: totalNorms,
        with_official_doc: normsWithDocResult.count || 0,
        needs_doc_scrape: totalNorms - (normsWithDocResult.count || 0),
        coverage_percent:
          totalNorms > 0
            ? Math.round(((normsWithDocResult.count || 0) / totalNorms) * 100)
            : 0,
      },

      evaluations: {
        total_evaluations: evaluationsResult.count || 0,
        products_evaluated: evaluatedProductIds.size,
        products_pending: totalProducts - evaluatedProductIds.size,
        last_batch: lastEval?.created_at || null,
        coverage_percent:
          totalProducts > 0
            ? Math.round((evaluatedProductIds.size / totalProducts) * 100)
            : 0,
      },

      scores: {
        calculated: scoredProducts,
        stale_30_days: staleScoresResult.count || 0,
        missing: totalProducts - scoredProducts,
        freshness_percent:
          scoredProducts > 0
            ? Math.round(
                ((scoredProducts - (staleScoresResult.count || 0)) /
                  scoredProducts) *
                  100
              )
            : 0,
      },

      prices: {
        updated_last_week: pricesResult.count || 0,
        needs_update: totalProducts - (pricesResult.count || 0),
        coverage_percent:
          totalProducts > 0
            ? Math.round(((pricesResult.count || 0) / totalProducts) * 100)
            : 0,
      },

      evaluation_history: historyResult.data || {
        total_changes: 0,
        changes_today: 0,
        changes_this_week: 0,
        upgrades: 0,
        downgrades: 0,
        new_evaluations: 0,
        products_affected: 0,
      },

      recommendations: generateRecommendations({
        products_needs_refresh:
          totalProducts - (productsScrapedResult.count || 0),
        norms_needs_doc: totalNorms - (normsWithDocResult.count || 0),
        products_pending: totalProducts - evaluatedProductIds.size,
        stale_scores: staleScoresResult.count || 0,
        prices_outdated: totalProducts - (pricesResult.count || 0),
      }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching data freshness:", error);
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * Generate actionable recommendations based on freshness data
 */
function generateRecommendations(data) {
  const recommendations = [];

  if (data.products_needs_refresh > 10) {
    recommendations.push({
      priority: "high",
      action: "refresh_products",
      message: `${data.products_needs_refresh} products need scraping refresh`,
      command: `python -m src.automation.data_refresh_pipeline --step products`,
    });
  }

  if (data.norms_needs_doc > 50) {
    recommendations.push({
      priority: "medium",
      action: "refresh_norms",
      message: `${data.norms_needs_doc} norms missing documentation`,
      command: `python -m src.automation.data_refresh_pipeline --step norms`,
    });
  }

  if (data.products_pending > 5) {
    recommendations.push({
      priority: "high",
      action: "run_evaluations",
      message: `${data.products_pending} products pending evaluation`,
      command: `python -m src.automation.data_refresh_pipeline --step evaluations`,
    });
  }

  if (data.stale_scores > 0) {
    recommendations.push({
      priority: "medium",
      action: "refresh_scores",
      message: `${data.stale_scores} products have stale scores (>30 days)`,
      command: `curl -X POST /api/admin/recalculate-scores`,
    });
  }

  if (data.prices_outdated > 20) {
    recommendations.push({
      priority: "low",
      action: "refresh_prices",
      message: `${data.prices_outdated} products need price update`,
      command: `python -m src.automation.data_refresh_pipeline --step prices`,
    });
  }

  return recommendations;
}

/**
 * POST /api/admin/data-freshness
 *
 * Trigger a specific refresh action.
 * Body: { action: "refresh_products" | "refresh_norms" | "refresh_prices" | "run_evaluations" }
 */
export async function POST(request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { action, limit = 10 } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Missing action parameter" },
        { status: 400 }
      );
    }

    // For now, we just return the command to run
    // In the future, this could trigger a background job
    const commands = {
      refresh_products: `python -m src.automation.data_refresh_pipeline --step products --limit ${limit}`,
      refresh_norms: `python -m src.automation.data_refresh_pipeline --step norms --limit ${limit}`,
      refresh_prices: `python -m src.automation.data_refresh_pipeline --step prices --limit ${limit}`,
      run_evaluations: `python -m src.automation.data_refresh_pipeline --step evaluations --limit ${limit}`,
      refresh_all: `python -m src.automation.data_refresh_pipeline --step all --limit ${limit}`,
    };

    if (!commands[action]) {
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `To run this action, execute the following command:`,
      command: commands[action],
      note: "Automated execution via queue will be available in a future update.",
    });
  } catch (error) {
    console.error("Error processing refresh action:", error);
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}
