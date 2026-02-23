import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import crypto from "crypto";

/**
 * Auto-Verify Predictions — Cron Endpoint
 *
 * POST /api/cron/verify-predictions
 *
 * Checks pending predictions past their target date,
 * compares with actual scores, and updates status.
 *
 * Schedule: Daily at 14:00 UTC
 */

function verifyCronSecret(provided) {
  const expected = process.env.CRON_SECRET;
  if (!expected || !provided) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch { return false; }
}

export async function POST(request) {
  const authHeader = request.headers.get("authorization") || "";
  if (!verifyCronSecret(authHeader.replace("Bearer ", ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const results = { verified: 0, confirmed: 0, partially: 0, missed: 0, errors: [] };

  try {
    const now = new Date().toISOString();

    // Get expired pending predictions
    const { data: predictions, error } = await supabase
      .from("score_predictions")
      .select("*")
      .eq("status", "pending")
      .lt("target_date", now)
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!predictions?.length) {
      return NextResponse.json({ message: "No predictions to verify", ...results });
    }

    for (const pred of predictions) {
      try {
        // Get current product score
        const { data: product } = await supabase
          .from("products")
          .select("score_overall, score_s, score_a, score_f, score_e")
          .eq("id", pred.product_id)
          .single();

        if (!product) {
          results.errors.push({ id: pred.id, error: "Product not found" });
          continue;
        }

        const actualScore = product.score_overall;
        const predictedScore = pred.predicted_score;
        const predictedDirection = pred.predicted_direction; // "up", "down", "stable"
        const originalScore = pred.original_score;

        let newStatus = "missed";
        const diff = Math.abs(actualScore - predictedScore);
        const actualDirection = actualScore > originalScore ? "up" : actualScore < originalScore ? "down" : "stable";

        if (diff <= 5) {
          newStatus = "confirmed";
          results.confirmed++;
        } else if (predictedDirection && actualDirection === predictedDirection) {
          newStatus = "partially_confirmed";
          results.partially++;
        } else {
          results.missed++;
        }

        await supabase
          .from("score_predictions")
          .update({
            status: newStatus,
            actual_score: actualScore,
            verified_at: now,
            accuracy_delta: diff,
          })
          .eq("id", pred.id);

        results.verified++;
      } catch (err) {
        results.errors.push({ id: pred.id, error: err.message });
      }
    }

    console.log(`[CRON:predictions] Verified ${results.verified}: ${results.confirmed} confirmed, ${results.missed} missed`);
    return NextResponse.json({ message: `Verified ${results.verified} predictions`, ...results });
  } catch (err) {
    console.error("[CRON:predictions] Fatal:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
