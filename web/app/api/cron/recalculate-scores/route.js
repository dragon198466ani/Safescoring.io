import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import crypto from "crypto";

/**
 * Auto Score Recalculation — Cron Endpoint
 *
 * POST /api/cron/recalculate-scores
 *
 * Finds products whose scores are stale (last evaluated > 30 days ago)
 * and queues them for re-evaluation. Also recalculates any products
 * with new evaluations that haven't been reflected in scores yet.
 *
 * Schedule: Daily at 5:00 UTC
 * Security: Requires CRON_SECRET header
 */

function verifyCronSecret(provided) {
  const expected = process.env.CRON_SECRET;
  if (!expected || !provided) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(provided),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

export async function POST(request) {
  const authHeader = request.headers.get("authorization") || "";
  const secret = authHeader.replace("Bearer ", "");
  if (!verifyCronSecret(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const results = { stale: 0, recalculated: 0, errors: [] };

  try {
    // Find products with stale scores (last evaluated > 30 days ago)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: staleProducts, error: staleError } = await supabase
      .from("products")
      .select("id, slug, name, last_evaluated_at")
      .eq("is_active", true)
      .or(`last_evaluated_at.is.null,last_evaluated_at.lt.${thirtyDaysAgo}`)
      .order("last_evaluated_at", { ascending: true, nullsFirst: true })
      .limit(25); // Process 25 at a time to stay within cron timeout

    if (staleError) {
      console.error("[CRON:recalc] Stale query error:", staleError.message);
      return NextResponse.json({ error: staleError.message }, { status: 500 });
    }

    results.stale = staleProducts?.length || 0;

    // Recalculate scores using the RPC
    for (const product of staleProducts || []) {
      try {
        const { error: rpcError } = await supabase
          .rpc("calculate_product_scores", { p_product_id: product.id });

        if (rpcError) {
          results.errors.push({ slug: product.slug, error: rpcError.message });
          continue;
        }

        // Update last_evaluated_at
        await supabase
          .from("products")
          .update({ last_evaluated_at: new Date().toISOString() })
          .eq("id", product.id);

        results.recalculated++;
      } catch (err) {
        results.errors.push({ slug: product.slug, error: err.message });
      }
    }

    // Log summary
    console.log(`[CRON:recalc] ${results.recalculated}/${results.stale} products recalculated`);

    return NextResponse.json({
      message: `Recalculated ${results.recalculated} of ${results.stale} stale products`,
      ...results,
    });
  } catch (err) {
    console.error("[CRON:recalc] Fatal:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
