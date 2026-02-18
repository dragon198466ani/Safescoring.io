import { NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/libs/supabase";

/**
 * GET /api/community/leaderboard
 * Get the community contributor leaderboard
 *
 * Query params:
 * - limit: Number of results (default 50, max 100)
 * - offset: Pagination offset
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!isSupabaseConfigured() || !supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Get leaderboard from view
    const { data: leaderboard, error } = await supabaseAdmin
      .from("community_leaderboard")
      .select("*")
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching leaderboard:", error);

      // Fallback to direct query
      const { data: fallback, error: fallbackError } = await supabaseAdmin
        .from("token_rewards")
        .select(`
          user_hash,
          user_type,
          total_earned,
          total_claimed,
          votes_submitted,
          votes_validated,
          challenges_won,
          challenges_lost,
          daily_streak,
          longest_streak,
          wallet_address
        `)
        .gt("total_earned", 0)
        .order("total_earned", { ascending: false })
        .range(offset, offset + limit - 1);

      if (fallbackError) {
        return NextResponse.json(
          { error: "Failed to fetch leaderboard" },
          { status: 500 }
        );
      }

      // Add rank manually
      const rankedData = (fallback || []).map((item, index) => ({
        ...item,
        rank: offset + index + 1,
        is_wallet_verified: !!item.wallet_address,
        tokens_earned: item.total_earned,
        tokens_claimed: item.total_claimed,
      }));

      return NextResponse.json({
        leaderboard: rankedData,
        pagination: {
          limit,
          offset,
          hasMore: rankedData.length === limit,
        },
      });
    }

    // Get global stats with ONE RPC call (all SQL aggregation server-side)
    let globalStats = {
      totalVoters: 0,
      totalTokensAwarded: 0,
      totalVotes: 0,
      challengesValidated: 0,
    };

    const { data: statsResult } = await supabaseAdmin
      .rpc("get_community_stats")
      .catch(() => ({ data: null }));

    if (statsResult) {
      globalStats = {
        totalVoters: statsResult.total_voters || 0,
        totalTokensAwarded: statsResult.total_tokens_distributed || 0,
        totalVotes: statsResult.total_votes || 0,
        challengesValidated: statsResult.challenges_validated || 0,
      };
    } else {
      // Fallback: use COUNT queries (still server-side, not client-side!)
      const [votersCount, votesCount, challengesCount] = await Promise.all([
        supabaseAdmin.from("token_rewards").select("*", { count: "exact", head: true }).gt("total_earned", 0),
        supabaseAdmin.from("evaluation_votes").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("evaluation_votes").select("*", { count: "exact", head: true }).eq("status", "validated").eq("vote_agrees", false),
      ]);

      globalStats.totalVoters = votersCount.count || 0;
      globalStats.totalVotes = votesCount.count || 0;
      globalStats.challengesValidated = challengesCount.count || 0;
    }

    // Anonymize user_hash for display (show first 4 + last 4 chars)
    const anonymizedLeaderboard = (leaderboard || []).map(entry => ({
      ...entry,
      display_id: entry.user_hash
        ? `${entry.user_hash.slice(0, 4)}...${entry.user_hash.slice(-4)}`
        : "anonymous",
    }));

    return NextResponse.json({
      leaderboard: anonymizedLeaderboard,
      stats: globalStats,
      pagination: {
        limit,
        offset,
        hasMore: (leaderboard?.length || 0) === limit,
      },
    });

  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
