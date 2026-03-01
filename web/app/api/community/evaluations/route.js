import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin, isSupabaseConfigured } from "@/libs/supabase";
import crypto from "crypto";

/**
 * Generate anonymous voter hash from user ID
 * MUST match the hash in evaluation-vote/route.js and community/votes/route.js
 */
function generateVoterHash(userId) {
  const salt = process.env.VOTER_HASH_SALT || "safescoring-voter-salt-2024";
  return crypto
    .createHash("sha256")
    .update(`${userId}:${salt}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * GET /api/community/evaluations
 * Get evaluations available for community voting
 *
 * FOULOSCOPIE SYSTEM:
 * - Blind voting: Results hidden until user votes or threshold reached
 * - Weighted votes: Expertise affects vote weight
 * - Stratified consensus: Diverse voter profiles required
 *
 * Query params:
 * - product: Filter by product slug
 * - pillar: Filter by pillar (S, A, F, E)
 * - limit: Number of results (default 20, max 100)
 * - offset: Pagination offset
 * - excludeVoted: If true, exclude evaluations user already voted on
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productSlug = searchParams.get("product");
    const pillar = searchParams.get("pillar");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");
    const excludeVoted = searchParams.get("excludeVoted") === "true";

    if (!isSupabaseConfigured() || !supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Get user hash if authenticated (for blind voting and vote tracking)
    let voterHash = null;
    const session = await auth();
    if (session?.user?.id) {
      voterHash = generateVoterHash(session.user.id);
    }

    // Validate pillar if provided
    if (pillar && !["S", "A", "F", "E"].includes(pillar.toUpperCase())) {
      return NextResponse.json(
        { error: "Invalid pillar. Must be S, A, F, or E" },
        { status: 400 }
      );
    }

    // Try the new fouloscopie function first (supports blind voting)
    const { data: evaluations, error } = await supabaseAdmin.rpc(
      "get_evaluations_for_voting",
      {
        p_voter_hash: voterHash,
        p_limit: limit,
        p_pillar: pillar?.toUpperCase() || null,
      }
    );

    if (error) {
      console.error("Error fetching evaluations:", error);

      // Fallback to direct query if RPC fails
      let query = supabaseAdmin
        .from("evaluations")
        .select(`
          id,
          product_id,
          products!inner(name, slug),
          norm_id,
          norms!inner(code, title, pillar),
          result
        `)
        .not("result", "is", null)
        .not("result", "in", '("N/A","TBD")')
        .order("evaluation_date", { ascending: false })
        .range(offset, offset + limit - 1);

      if (productSlug) {
        query = query.eq("products.slug", productSlug);
      }
      if (pillar) {
        query = query.eq("norms.pillar", pillar.toUpperCase());
      }

      const { data: fallbackData, error: fallbackError } = await query;

      if (fallbackError) {
        return NextResponse.json(
          { error: "Failed to fetch evaluations" },
          { status: 500 }
        );
      }

      // Format fallback data (with blind voting defaults)
      const formattedData = (fallbackData || []).map(e => ({
        evaluation_id: e.id,
        product_id: e.product_id,
        product_name: e.products?.name,
        product_slug: e.products?.slug,
        norm_id: e.norm_id,
        norm_code: e.norms?.code,
        norm_title: e.norms?.title,
        pillar: e.norms?.pillar,
        ai_result: e.result,
        agree_count: 0,
        disagree_count: 0,
        total_vote_weight: 0,
        user_has_voted: false,
        // Fouloscopie: blind voting - hide results until voted
        can_see_results: false,
        votes_needed: 3,
      }));

      return NextResponse.json({
        evaluations: formattedData,
        pagination: {
          limit,
          offset,
          hasMore: formattedData.length === limit,
        },
      });
    }

    // Filter out already voted if requested
    let filteredEvaluations = evaluations || [];
    if (excludeVoted && voterHash) {
      filteredEvaluations = filteredEvaluations.filter(e => !e.user_has_voted);
    }

    return NextResponse.json({
      evaluations: filteredEvaluations,
      pagination: {
        limit,
        offset,
        hasMore: (evaluations?.length || 0) === limit,
      },
    });

  } catch (error) {
    console.error("Error fetching evaluations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/community/evaluations/[id]
 * Get a single evaluation with vote stats
 */
export async function getEvaluationById(evaluationId) {
  if (!isSupabaseConfigured() || !supabaseAdmin) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("evaluations")
    .select(`
      id,
      product_id,
      products(name, slug, logo_url),
      norm_id,
      norms(code, title, pillar, description),
      result,
      evaluation_date,
      why_this_result,
      confidence_score
    `)
    .eq("id", evaluationId)
    .single();

  if (error || !data) {
    return null;
  }

  // Get vote stats
  const { data: voteStats } = await supabaseAdmin
    .from("evaluation_votes")
    .select("vote_agrees, vote_weight")
    .eq("evaluation_id", evaluationId);

  const stats = {
    agree_count: 0,
    disagree_count: 0,
    total_weight: 0,
  };

  for (const vote of voteStats || []) {
    if (vote.vote_agrees) {
      stats.agree_count++;
    } else {
      stats.disagree_count++;
    }
    stats.total_weight += parseFloat(vote.vote_weight) || 0;
  }

  return {
    ...data,
    vote_stats: stats,
  };
}
