import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

/**
 * GET /api/leaderboard
 * Get top contributors leaderboard for future token airdrop
 */
export async function GET(request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const period = searchParams.get("period") || "all"; // all, month, week

    // Get leaderboard from user_reputation table
    let query = supabase
      .from("user_reputation")
      .select(`
        user_id,
        corrections_submitted,
        corrections_approved,
        corrections_rejected,
        reputation_score,
        reputation_level,
        points_earned,
        badges,
        created_at,
        users!inner (
          id,
          name,
          image,
          created_at
        )
      `)
      .order("points_earned", { ascending: false })
      .order("reputation_score", { ascending: false })
      .limit(limit);

    const { data: leaderboard, error } = await query;

    if (error) {
      console.error("Error fetching leaderboard:", error);
      return NextResponse.json(
        { error: "Failed to fetch leaderboard" },
        { status: 500 }
      );
    }

    // Calculate additional metrics and format response
    const formattedLeaderboard = (leaderboard || []).map((entry, index) => {
      const user = entry.users;
      const daysSinceJoined = Math.floor(
        (new Date() - new Date(user.created_at)) / (1000 * 60 * 60 * 24)
      );

      // Calculate estimated airdrop multiplier based on:
      // - Points earned
      // - Reputation level
      // - Seniority (days since joined)
      const levelMultiplier = {
        newcomer: 1.0,
        contributor: 1.2,
        trusted: 1.5,
        expert: 2.0,
        oracle: 3.0,
      }[entry.reputation_level] || 1.0;

      const seniorityMultiplier = Math.min(2.0, 1 + (daysSinceJoined / 365));

      const estimatedPoints = Math.round(
        (entry.points_earned || entry.corrections_approved * 50) *
        levelMultiplier *
        seniorityMultiplier
      );

      return {
        rank: index + 1,
        userId: entry.user_id,
        name: user.name || "Anonymous",
        avatar: user.image,
        stats: {
          correctionsSubmitted: entry.corrections_submitted || 0,
          correctionsApproved: entry.corrections_approved || 0,
          approvalRate: entry.corrections_submitted > 0
            ? Math.round((entry.corrections_approved / entry.corrections_submitted) * 100)
            : 0,
        },
        reputation: {
          score: Math.round(entry.reputation_score || 50),
          level: entry.reputation_level || "newcomer",
        },
        seniority: {
          joinedAt: user.created_at,
          daysActive: daysSinceJoined,
          multiplier: seniorityMultiplier.toFixed(2),
        },
        airdrop: {
          basePoints: entry.points_earned || entry.corrections_approved * 50,
          estimatedPoints: estimatedPoints,
          levelMultiplier: levelMultiplier,
        },
        badges: entry.badges || [],
      };
    });

    // Get global stats
    const { data: globalStats } = await supabase
      .from("user_reputation")
      .select("points_earned, corrections_approved")
      .not("points_earned", "is", null);

    const totalPoints = (globalStats || []).reduce(
      (sum, r) => sum + (r.points_earned || r.corrections_approved * 50),
      0
    );
    const totalContributors = globalStats?.length || 0;

    return NextResponse.json({
      leaderboard: formattedLeaderboard,
      global: {
        totalContributors,
        totalPointsDistributed: totalPoints,
        averagePoints: totalContributors > 0 ? Math.round(totalPoints / totalContributors) : 0,
      },
      airdropInfo: {
        message: "Early contributors will be rewarded. Points accumulated now will count towards the future $SAFE token airdrop.",
        formula: "Airdrop = Base Points × Level Multiplier × Seniority Multiplier",
        snapshotDate: "TBA",
      },
    });

  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
