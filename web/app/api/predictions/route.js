import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";

/**
 * Predictions API
 *
 * GET - Get predictions and accuracy stats
 *
 * This data helps validate SafeScoring's methodology over time.
 * All predictions are cryptographically committed to blockchain BEFORE events.
 */

export async function GET(request) {
  // Rate limit: public endpoint with expensive DB queries
  const protection = await quickProtect(request, "public");
  if (protection.blocked) return protection.response;
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // active, validated, expired
  const riskLevel = searchParams.get("risk"); // CRITICAL, HIGH, MEDIUM, LOW, MINIMAL
  const productSlug = searchParams.get("product");
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  try {
    // Build query
    let query = supabase
      .from("predictions")
      .select(`
        id,
        product_id,
        prediction_date,
        safe_score_at_prediction,
        risk_level,
        incident_probability,
        prediction_window_days,
        expires_at,
        weakest_pillar,
        weakest_pillar_score,
        confidence,
        commitment_hash,
        blockchain_tx_hash,
        blockchain_network,
        blockchain_block_number,
        status,
        validated_at,
        incident_occurred,
        accuracy,
        methodology_version,
        products (
          id,
          name,
          slug,
          url
        )
      `)
      .order("prediction_date", { ascending: false })
      .limit(limit);

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }
    if (riskLevel) {
      query = query.eq("risk_level", riskLevel);
    }
    if (productSlug) {
      query = query.eq("products.slug", productSlug);
    }

    const { data: predictions, error } = await query;

    if (error) {
      console.error("Predictions query error:", error);
      return NextResponse.json({ error: "Failed to fetch predictions" }, { status: 500 });
    }

    // Get accuracy stats from materialized view
    const { data: statsData } = await supabase
      .from("prediction_accuracy_stats")
      .select("*")
      .single();

    const stats = statsData || {
      total_predictions: predictions?.length || 0,
      completed_predictions: 0,
      correct_positive: 0,
      correct_negative: 0,
      false_positive: 0,
      false_negative: 0,
      overall_accuracy_percent: null,
    };

    // Calculate additional stats
    const byRiskLevel = {};
    const byStatus = {};

    for (const pred of predictions || []) {
      const risk = pred.risk_level || "UNKNOWN";
      const st = pred.status || "unknown";

      byRiskLevel[risk] = (byRiskLevel[risk] || 0) + 1;
      byStatus[st] = (byStatus[st] || 0) + 1;
    }

    return NextResponse.json({
      predictions: (predictions || []).map((p) => ({
        id: p.id,
        productId: p.product_id,
        product: p.products
          ? {
              id: p.products.id,
              name: p.products.name,
              slug: p.products.slug,
            }
          : null,
        predictionDate: p.prediction_date,
        safeScoreAtPrediction: p.safe_score_at_prediction,
        riskLevel: p.risk_level,
        incidentProbability: p.incident_probability,
        windowDays: p.prediction_window_days,
        expiresAt: p.expires_at,
        weakestPillar: p.weakest_pillar,
        weakestPillarScore: p.weakest_pillar_score,
        confidence: p.confidence,
        commitmentHash: p.commitment_hash,
        blockchain: p.blockchain_tx_hash
          ? {
              txHash: p.blockchain_tx_hash,
              network: p.blockchain_network,
              blockNumber: p.blockchain_block_number,
            }
          : null,
        status: p.status,
        validatedAt: p.validated_at,
        incidentOccurred: p.incident_occurred,
        accuracy: p.accuracy,
        methodology: p.methodology_version,
      })),
      stats: {
        total: stats.total_predictions,
        completed: stats.completed_predictions,
        correctPositive: stats.correct_positive,
        correctNegative: stats.correct_negative,
        falsePositive: stats.false_positive,
        falseNegative: stats.false_negative,
        accuracyPercent: stats.overall_accuracy_percent,
        byRiskLevel,
        byStatus,
      },
      meta: {
        limit,
        returned: predictions?.length || 0,
        filters: { status, riskLevel, productSlug },
      },
    });
  } catch (error) {
    console.error("Predictions API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
