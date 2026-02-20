/**
 * Admin API: Resolve Stale TBD Evaluations
 * POST /api/admin/resolve-tbd
 *
 * Automatically resolves TBD evaluations older than threshold to NO.
 * Conservative policy: if we can't confirm implementation, assume NO.
 */

import { NextResponse } from "next/server";
import { supabase } from "@/libs/supabase";
import { requireAdmin } from "@/libs/admin-auth";

export async function POST(request) {
  // Admin authentication required
  const authResult = await requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const daysThreshold = parseInt(body.daysThreshold) || 7;
    const maxResolve = Math.min(parseInt(body.maxResolve) || 100, 500);
    const dryRun = body.dryRun === true;

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);
    const cutoffDateStr = cutoffDate.toISOString().split("T")[0];

    // Get stale TBD evaluations
    const { data: tbdEvals, error: fetchError } = await supabase
      .from("evaluations")
      .select("id, product_id, norm_id, why_this_result, evaluation_date")
      .eq("result", "TBD")
      .lt("evaluation_date", cutoffDateStr)
      .limit(maxResolve);

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to fetch TBD evaluations", details: fetchError.message },
        { status: 500 }
      );
    }

    if (!tbdEvals || tbdEvals.length === 0) {
      return NextResponse.json({
        resolved: 0,
        productsAffected: 0,
        message: `No TBD evaluations older than ${daysThreshold} days`,
      });
    }

    // Get unique products
    const productsAffected = [...new Set(tbdEvals.map((e) => e.product_id))];

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        wouldResolve: tbdEvals.length,
        productsAffected: productsAffected.length,
        threshold: daysThreshold,
        sample: tbdEvals.slice(0, 5).map((e) => ({
          id: e.id,
          productId: e.product_id,
          normId: e.norm_id,
          date: e.evaluation_date,
        })),
      });
    }

    // Archive to history first
    const historyRecords = tbdEvals.map((e) => ({
      product_id: e.product_id,
      norm_id: e.norm_id,
      result: "TBD",
      why_this_result: e.why_this_result || "",
      evaluated_by: "tbd_before_auto_resolve",
      evaluation_date: e.evaluation_date,
      archived_at: new Date().toISOString(),
    }));

    await supabase.from("evaluation_history").insert(historyRecords);

    // Update TBD to NO
    const resolutionNote = `[AUTO-RESOLVED] TBD after ${daysThreshold} days. Conservative policy: unconfirmed = NO. Resolved at ${new Date().toISOString()}`;

    let resolved = 0;
    for (const e of tbdEvals) {
      const { error: updateError } = await supabase
        .from("evaluations")
        .update({
          result: "NO",
          why_this_result: `${e.why_this_result || ""} ${resolutionNote}`.trim(),
          evaluated_by: "auto_tbd_resolver",
          evaluation_date: new Date().toISOString().split("T")[0],
        })
        .eq("id", e.id);

      if (!updateError) {
        resolved++;
      }
    }

    // Trigger score recalculation for affected products
    let recalculated = 0;
    for (const productId of productsAffected) {
      const { error: recalcError } = await supabase.rpc(
        "calculate_product_scores",
        { p_product_id: productId }
      );
      if (!recalcError) {
        recalculated++;
      }
    }

    return NextResponse.json({
      resolved,
      productsAffected: productsAffected.length,
      recalculated,
      threshold: daysThreshold,
      policy: "Conservative: TBD defaults to NO after threshold",
      resolvedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("TBD Resolution error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// GET: Check TBD status
export async function GET(request) {
  const authResult = await requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  try {
    // Count TBD by age
    const { data: tbdStats, error } = await supabase
      .from("evaluations")
      .select("product_id, evaluation_date")
      .eq("result", "TBD");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const now = new Date();
    const stats = {
      total: tbdStats?.length || 0,
      productsAffected: new Set(tbdStats?.map((e) => e.product_id) || []).size,
      byAge: {
        lessThan7Days: 0,
        between7And14Days: 0,
        between14And30Days: 0,
        moreThan30Days: 0,
      },
    };

    tbdStats?.forEach((e) => {
      const evalDate = new Date(e.evaluation_date);
      const daysDiff = Math.floor((now - evalDate) / (1000 * 60 * 60 * 24));

      if (daysDiff < 7) stats.byAge.lessThan7Days++;
      else if (daysDiff < 14) stats.byAge.between7And14Days++;
      else if (daysDiff < 30) stats.byAge.between14And30Days++;
      else stats.byAge.moreThan30Days++;
    });

    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
