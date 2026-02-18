import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

/**
 * 3-Track Scores API
 * Returns AI, Community, and Hybrid scores for a product
 *
 * GET /api/products/[slug]/scores-3track
 * Query params:
 *   - pillar: S, A, F, E (optional, defaults to all)
 *   - history: true/false (include historical data for timeline)
 *   - days: number of days for history (default 30)
 *
 * Used by:
 * - Product page 3-graph display
 * - Score comparison charts
 * - Community voting dashboard
 */

export async function GET(request, { params }) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const pillar = searchParams.get("pillar");
  const includeHistory = searchParams.get("history") === "true";
  const days = parseInt(searchParams.get("days") || "30", 10);

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET",
    "Cache-Control": "public, max-age=60, s-maxage=60",
  };

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500, headers }
    );
  }

  try {
    // Fetch product
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, slug, url, type_id")
      .eq("slug", slug)
      .maybeSingle();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404, headers }
      );
    }

    // Fetch 3-track scores
    let scoresQuery = supabase
      .from("product_scores_3track")
      .select("*")
      .eq("product_id", product.id);

    if (pillar) {
      scoresQuery = scoresQuery.eq("pillar", pillar.toUpperCase());
    }

    const { data: scores, error: scoresError } = await scoresQuery;

    if (scoresError) {
      console.error("Error fetching 3-track scores:", scoresError);
      return NextResponse.json(
        { error: "Failed to fetch scores" },
        { status: 500, headers }
      );
    }

    // If no 3-track scores exist yet, fall back to view
    let finalScores = scores;
    if (!scores || scores.length === 0) {
      // Try the graph data view
      const { data: graphData } = await supabase
        .from("product_scores_graph_data")
        .select("*")
        .eq("product_slug", slug)
        .maybeSingle();

      if (graphData) {
        finalScores = graphData;
      }
    }

    // Build response
    const response = {
      product: {
        id: product.id,
        slug: product.slug,
        name: product.name,
        url: product.url,
      },
      scores: {
        pillars: {},
        overall: {
          ai: null,
          community: null,
          hybrid: null,
        },
        totals: {
          evaluations: 0,
          communityVotes: 0,
          confirmed: 0,
          challenged: 0,
        },
      },
      lastUpdated: {
        ai: null,
        community: null,
      },
    };

    // Process pillar scores
    if (Array.isArray(finalScores)) {
      let aiSum = 0,
        communitySum = 0,
        hybridSum = 0,
        pillarCount = 0;

      for (const s of finalScores) {
        response.scores.pillars[s.pillar] = {
          ai: {
            score: s.ai_score,
            evaluated: s.ai_evaluated_count,
            passed: s.ai_passed_count,
            failed: s.ai_failed_count,
            partial: s.ai_partial_count,
            confidence: s.ai_confidence,
          },
          community: {
            score: s.community_score,
            confirmed: s.community_confirmed_count,
            challenged: s.community_challenged_count,
            pending: s.community_pending_count,
            totalVotes: s.community_total_votes,
            confidence: s.community_confidence,
          },
          hybrid: {
            score: s.hybrid_score,
            aiWeight: s.hybrid_ai_weight,
            communityWeight: s.hybrid_community_weight,
          },
        };

        if (s.ai_score !== null) {
          aiSum += parseFloat(s.ai_score);
          pillarCount++;
        }
        if (s.community_score !== null) {
          communitySum += parseFloat(s.community_score);
        }
        if (s.hybrid_score !== null) {
          hybridSum += parseFloat(s.hybrid_score);
        }

        response.scores.totals.evaluations += s.ai_evaluated_count || 0;
        response.scores.totals.communityVotes += s.community_total_votes || 0;
        response.scores.totals.confirmed += s.community_confirmed_count || 0;
        response.scores.totals.challenged += s.community_challenged_count || 0;

        if (s.last_ai_update) {
          response.lastUpdated.ai = s.last_ai_update;
        }
        if (s.last_community_update) {
          response.lastUpdated.community = s.last_community_update;
        }
      }

      if (pillarCount > 0) {
        response.scores.overall.ai = Math.round((aiSum / pillarCount) * 100) / 100;
        response.scores.overall.community = Math.round((communitySum / pillarCount) * 100) / 100;
        response.scores.overall.hybrid = Math.round((hybridSum / pillarCount) * 100) / 100;
      }
    }

    // Include history if requested
    if (includeHistory) {
      const { data: history, error: historyError } = await supabase.rpc(
        "get_product_score_history",
        {
          p_product_slug: slug,
          p_pillar: pillar || null,
          p_days: days,
        }
      );

      if (!historyError && history) {
        response.history = history.map((h) => ({
          timestamp: h.recorded_at,
          pillar: h.pillar,
          ai: h.ai_score,
          community: h.community_score,
          hybrid: h.hybrid_score,
          changeType: h.change_type,
          votesAtTime: h.votes_at_time,
        }));
      }
    }

    // Add consensus stats
    const { data: consensusStats } = await supabase
      .from("evaluation_source_stats")
      .select("*")
      .maybeSingle();

    if (consensusStats) {
      response.globalStats = {
        totalEvaluations: consensusStats.total_evaluations,
        aiEvaluated: consensusStats.ai_evaluated,
        communityConfirmed: consensusStats.community_confirmed,
        communityChallenged: consensusStats.community_challenged,
        pendingConsensus: consensusStats.pending_consensus,
        aiErrorRatePct: consensusStats.ai_error_rate_pct,
      };
    }

    return NextResponse.json(response, { headers });
  } catch (error) {
    console.error("Error fetching 3-track scores:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
