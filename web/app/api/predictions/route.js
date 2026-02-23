/**
 * API: /api/predictions
 * Public predictions tracking for Data Moat (Phase 3.6)
 *
 * GET  - List predictions (public, filterable by status/product/limit)
 * POST - Create prediction (admin only)
 *
 * Predictions are public statements about crypto product security.
 * When predictions come true, they build credibility and create
 * an irreplicable data moat for SafeScoring.
 */

import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { auth } from "@/libs/auth";
import { isAdminEmail } from "@/libs/admin-auth";

export const dynamic = "force-dynamic";

// ─── GET: List predictions (public) ─────────────────────────────

export async function GET(request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      predictions: [],
      stats: getDefaultStats(),
    });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const product = searchParams.get("product");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);

    // Build query for score_predictions
    let query = supabase
      .from("score_predictions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    // Apply filters
    if (status && ["pending", "confirmed", "missed"].includes(status)) {
      query = query.eq("status", status);
    }

    if (product) {
      query = query.eq("product_slug", product);
    }

    const { data: predictions, error } = await query;

    if (error) throw error;

    // Fetch product names for all unique slugs in results
    const slugs = [...new Set((predictions || []).map((p) => p.product_slug))];
    let productMap = {};

    if (slugs.length > 0) {
      const { data: products } = await supabase
        .from("products")
        .select("slug, name")
        .in("slug", slugs);

      if (products) {
        productMap = Object.fromEntries(products.map((p) => [p.slug, p.name]));
      }
    }

    // Format predictions for response
    const formattedPredictions = (predictions || []).map((p) => ({
      id: p.id,
      product_slug: p.product_slug,
      product_name: productMap[p.product_slug] || p.product_slug,
      prediction: p.prediction,
      category: p.category,
      confidence: p.confidence,
      created_at: p.created_at,
      deadline: p.deadline,
      status: p.status,
      outcome: p.outcome || null,
      outcome_date: p.outcome_date || null,
      related_score: p.related_pillar
        ? { pillar: p.related_pillar, score_at_prediction: p.score_at_prediction }
        : null,
    }));

    // Calculate stats from all predictions (unfiltered)
    const { data: allPredictions, error: statsError } = await supabase
      .from("score_predictions")
      .select("status");

    if (statsError) throw statsError;

    const all = allPredictions || [];
    const total = all.length;
    const confirmed = all.filter((p) => p.status === "confirmed").length;
    const missed = all.filter((p) => p.status === "missed").length;
    const pending = all.filter((p) => p.status === "pending").length;
    const resolved = confirmed + missed;
    const accuracyRate = resolved > 0 ? Math.round((confirmed / resolved) * 100) : 0;

    return NextResponse.json({
      predictions: formattedPredictions,
      stats: {
        total,
        confirmed,
        missed,
        pending,
        accuracy_rate: accuracyRate,
      },
    });
  } catch (error) {
    console.error("[Predictions API] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST: Create prediction (admin only) ───────────────────────

export async function POST(request) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Admin role check
    if (!isAdminEmail(session.user.email)) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      product_slug,
      prediction,
      category,
      confidence,
      deadline,
      related_pillar,
      score_at_prediction,
    } = body;

    // Validate required fields
    if (!product_slug || !prediction || !deadline) {
      return NextResponse.json(
        { error: "Missing required fields: product_slug, prediction, deadline" },
        { status: 400 }
      );
    }

    // Validate confidence value
    if (confidence && !["low", "medium", "high"].includes(confidence)) {
      return NextResponse.json(
        { error: "Invalid confidence value. Must be: low, medium, or high" },
        { status: 400 }
      );
    }

    // Validate related_pillar
    if (related_pillar && !["S", "A", "F", "E"].includes(related_pillar)) {
      return NextResponse.json(
        { error: "Invalid related_pillar. Must be: S, A, F, or E" },
        { status: 400 }
      );
    }

    // Validate deadline is in the future
    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime()) || deadlineDate <= new Date()) {
      return NextResponse.json(
        { error: "Deadline must be a valid future date" },
        { status: 400 }
      );
    }

    // Verify product exists
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("slug, name")
      .eq("slug", product_slug)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: `Product not found: ${product_slug}` },
        { status: 404 }
      );
    }

    // Insert prediction
    const { data: newPrediction, error: insertError } = await supabase
      .from("score_predictions")
      .insert({
        product_slug,
        prediction,
        category: category || "incident_risk",
        confidence: confidence || "medium",
        deadline: deadlineDate.toISOString(),
        related_pillar: related_pillar || null,
        score_at_prediction: score_at_prediction || null,
        created_by: session.user.id || null,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("[Predictions API] Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create prediction" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        prediction: {
          id: newPrediction.id,
          product_slug: newPrediction.product_slug,
          product_name: product.name,
          prediction: newPrediction.prediction,
          category: newPrediction.category,
          confidence: newPrediction.confidence,
          deadline: newPrediction.deadline,
          status: newPrediction.status,
          related_score: newPrediction.related_pillar
            ? {
                pillar: newPrediction.related_pillar,
                score_at_prediction: newPrediction.score_at_prediction,
              }
            : null,
          created_at: newPrediction.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Predictions API] POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

function getDefaultStats() {
  return {
    total: 0,
    confirmed: 0,
    missed: 0,
    pending: 0,
    accuracy_rate: 0,
  };
}
