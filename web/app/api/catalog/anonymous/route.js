import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET /api/catalog/anonymous
 *
 * Returns anonymized setups from the community
 * - No user identity revealed
 * - No specific product names
 * - Only aggregated scores and categories
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all";
    const sort = searchParams.get("sort") || "score";
    const archetype = searchParams.get("archetype");
    const limit = parseInt(searchParams.get("limit") || "24");

    // Build query for setups that opted into sharing
    let query = supabase
      .from("setups")
      .select(`
        id,
        score,
        product_count,
        category_count,
        archetype,
        pillar_scores,
        created_at,
        views,
        percentile
      `)
      .eq("share_anonymous", true) // Only setups that opted in
      .limit(limit);

    // Apply filters
    if (filter === "top10") {
      query = query.gte("percentile", 90);
    }

    if (archetype) {
      query = query.eq("archetype", archetype);
    }

    // Apply sorting
    switch (sort) {
      case "recent":
        query = query.order("created_at", { ascending: false });
        break;
      case "views":
        query = query.order("views", { ascending: false, nullsFirst: false });
        break;
      case "score":
      default:
        query = query.order("score", { ascending: false });
    }

    const { data: rawSetups, error } = await query;

    if (error) {
      console.error("Error fetching anonymous catalog:", error);
      return NextResponse.json({ error: "Failed to fetch setups" }, { status: 500 });
    }

    // Anonymize the data
    const setups = (rawSetups || []).map((setup) => ({
      id: setup.id,
      score: setup.score,
      productCount: setup.product_count || 0,
      categoryCount: setup.category_count || 0,
      archetype: setup.archetype || "balanced",
      percentile: setup.percentile || calculatePercentile(setup.score),
      pillars: setup.pillar_scores || {},
      createdAt: setup.created_at,
      views: setup.views || 0,
    }));

    return NextResponse.json({
      setups,
      total: setups.length,
    });
  } catch (error) {
    console.error("Anonymous catalog error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/catalog/anonymous
 *
 * Share your setup anonymously
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { setupId, shareAnonymous } = body;

    if (!setupId) {
      return NextResponse.json({ error: "Setup ID required" }, { status: 400 });
    }

    // Update setup's anonymous sharing preference
    const { error } = await supabase
      .from("setups")
      .update({ share_anonymous: shareAnonymous })
      .eq("id", setupId);

    if (error) {
      console.error("Error updating anonymous sharing:", error);
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Anonymous sharing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Helper: Calculate percentile based on score
function calculatePercentile(score) {
  // Approximate percentile based on score distribution
  if (score >= 90) return 95;
  if (score >= 85) return 88;
  if (score >= 80) return 80;
  if (score >= 75) return 70;
  if (score >= 70) return 60;
  if (score >= 65) return 50;
  if (score >= 60) return 40;
  if (score >= 55) return 30;
  return 20;
}
