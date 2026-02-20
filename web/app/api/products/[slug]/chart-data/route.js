import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

/**
 * GET /api/products/[slug]/chart-data
 * Fetches time-series chart data for a product
 *
 * Query params:
 * - metric: safe_score, dual_score, tvl, volume_24h, users_active, github_commits, github_stars, social_mentions
 * - range: 7d, 30d, 90d, all (default 30d)
 * - pillar: S, A, F, E (optional - for pillar-specific scores)
 * - productId: alternative to slug
 */
export async function GET(request, { params }) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const metric = searchParams.get("metric") || "safe_score";
  const range = searchParams.get("range") || "30d";
  const pillar = searchParams.get("pillar");
  const productIdParam = searchParams.get("productId");

  // Convert range to days
  const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    // Get product ID (from slug or direct productId param)
    let productId = productIdParam;

    if (!productId) {
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("id, defillama_slug, coingecko_id, github_repo")
        .eq("slug", slug)
        .single();

      if (productError || !product) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }
      productId = product.id;
    }

    let data = [];
    let history = [];

    // Handle different metric types
    switch (metric) {
      case "safe_score":
        data = await fetchSafeScoreHistory(productId, days, pillar);
        break;

      case "dual_score":
        // Fetch both AI and Community scores for dual chart
        history = await fetchDualScoreHistory(productId, days, pillar);
        return NextResponse.json({
          metric,
          range,
          history,
          count: history.length,
        });

      case "tvl":
      case "volume_24h":
      case "users_active":
      case "github_commits":
      case "github_stars":
      case "social_mentions":
        data = await fetchChartData(productId, metric, days);
        break;

      default:
        return NextResponse.json({ error: "Invalid metric" }, { status: 400 });
    }

    return NextResponse.json({
      metric,
      days,
      data,
      count: data.length,
    });
  } catch (error) {
    console.error("[API] Chart data error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Fetch SAFE score history from score_history table
 */
async function fetchSafeScoreHistory(productId, days, pillar = null) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  let query = supabase
    .from("score_history")
    .select("safe_score, score_s, score_a, score_f, score_e, recorded_at")
    .eq("product_id", productId)
    .gte("recorded_at", startDate.toISOString())
    .order("recorded_at", { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error("[API] Score history error:", error);
    return [];
  }

  return (data || []).map((d) => ({
    value: pillar ? d[`score_${pillar.toLowerCase()}`] : d.safe_score,
    recorded_at: d.recorded_at,
  }));
}

/**
 * Fetch dual score history (AI + Community) for dual curve chart
 */
async function fetchDualScoreHistory(productId, days, pillar = null) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Fetch AI score history
  const { data: scoreHistory, error: scoreError } = await supabase
    .from("score_history")
    .select("safe_score, score_s, score_a, score_f, score_e, recorded_at")
    .eq("product_id", productId)
    .gte("recorded_at", startDate.toISOString())
    .order("recorded_at", { ascending: true });

  if (scoreError) {
    console.error("[API] Score history error:", scoreError);
  }

  // Fetch community vote aggregates per day
  // Uses vote_agrees (boolean) and product_id directly from evaluation_votes
  const { data: voteData, error: voteError } = await supabase
    .from("evaluation_votes")
    .select(`
      vote_agrees,
      product_id,
      norm_id,
      created_at
    `)
    .eq("product_id", productId)
    .gte("created_at", startDate.toISOString());

  if (voteError) {
    console.error("[API] Vote data error:", voteError);
  }

  // Filter by pillar if needed (requires joining norms)
  let productVotes = voteData || [];
  if (pillar && productVotes.length > 0) {
    const normIds = [...new Set(productVotes.map((v) => v.norm_id))];
    const { data: norms } = await supabase
      .from("norms")
      .select("id, pillar")
      .in("id", normIds)
      .eq("pillar", pillar);

    const pillarNormIds = new Set((norms || []).map((n) => n.id));
    productVotes = productVotes.filter((v) => pillarNormIds.has(v.norm_id));
  }

  // Group votes by date
  const votesByDate = {};
  productVotes.forEach((v) => {
    const date = new Date(v.created_at).toISOString().split("T")[0];
    if (!votesByDate[date]) {
      votesByDate[date] = { true: 0, false: 0 };
    }
    votesByDate[date][v.vote_agrees ? "true" : "false"]++;
  });

  // Build combined history with both AI and community scores
  const history = (scoreHistory || []).map((h) => {
    const date = new Date(h.recorded_at).toISOString().split("T")[0];
    const dateVotes = votesByDate[date];

    const aiScore = pillar ? h[`score_${pillar.toLowerCase()}`] : h.safe_score;

    // Calculate community score based on vote ratio
    let communityScore = null;
    let votesCount = 0;

    if (dateVotes) {
      const totalVotes = dateVotes.true + dateVotes.false;
      votesCount = totalVotes;

      if (totalVotes >= 3) {
        const trueRatio = dateVotes.true / totalVotes;
        // Community score adjusts AI score based on consensus
        if (trueRatio > 0.7) {
          communityScore = aiScore; // Confirmed
        } else if (trueRatio < 0.3) {
          communityScore = Math.max(0, aiScore - 15); // Strongly challenged
        } else {
          // Partial adjustment based on vote ratio
          communityScore = aiScore - (10 * (1 - trueRatio));
        }
      }
    }

    return {
      date: h.recorded_at,
      ai_score: aiScore,
      community_score: communityScore,
      votes_count: votesCount,
    };
  });

  return history;
}

/**
 * Fetch generic chart data from product_chart_data table
 */
async function fetchChartData(productId, metricType, days) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from("product_chart_data")
    .select("value, recorded_at, metadata")
    .eq("product_id", productId)
    .eq("metric_type", metricType)
    .gte("recorded_at", startDate.toISOString())
    .order("recorded_at", { ascending: true });

  if (error) {
    console.error("[API] Chart data error:", error);
    return [];
  }

  return (data || []).map((d) => ({
    value: d.value,
    recorded_at: d.recorded_at,
    metadata: d.metadata,
  }));
}
