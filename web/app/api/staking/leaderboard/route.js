/**
 * API: /api/staking/leaderboard
 * Top stakers leaderboard
 */

import { supabase } from "@/libs/supabase";
import { auth } from "@/libs/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const session = await auth();

    // Top 20 stakers
    const { data: topStakers, error } = await supabase
      .from("user_staking")
      .select(`
        user_id,
        amount
      `)
      .eq("status", "active")
      .order("amount", { ascending: false });

    if (error) {
      console.error("Leaderboard error:", error);
      return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
    }

    // Aggregate by user
    const userTotals = {};
    for (const stake of topStakers || []) {
      if (!userTotals[stake.user_id]) {
        userTotals[stake.user_id] = 0;
      }
      userTotals[stake.user_id] += stake.amount;
    }

    // Sort and get top 20
    const sortedUsers = Object.entries(userTotals)
      .map(([userId, total]) => ({ userId, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);

    // Get user info (pseudonyms only for privacy)
    const userIds = sortedUsers.map(u => u.userId);
    const { data: users } = await supabase
      .from("profiles")
      .select("id, pseudonym, avatar_url")
      .in("id", userIds);

    const userMap = {};
    for (const user of users || []) {
      userMap[user.id] = user;
    }

    // Build leaderboard
    const leaderboard = sortedUsers.map((entry, index) => {
      const user = userMap[entry.userId];
      const tier = entry.total >= 1000 ? 3 : entry.total >= 500 ? 2 : entry.total >= 100 ? 1 : 0;

      return {
        rank: index + 1,
        pseudonym: user?.pseudonym || `Staker #${entry.userId.slice(0, 4)}`,
        avatar: user?.avatar_url,
        totalStaked: entry.total,
        tier,
        voteBonus: tier === 3 ? 1.0 : tier === 2 ? 0.5 : tier === 1 ? 0.2 : 0,
        isCurrentUser: session?.user?.id === entry.userId,
      };
    });

    // Get current user's rank if logged in
    let currentUserRank = null;
    if (session?.user?.id && userTotals[session.user.id]) {
      const userTotal = userTotals[session.user.id];
      const rank = Object.values(userTotals).filter(t => t > userTotal).length + 1;
      currentUserRank = {
        rank,
        totalStaked: userTotal,
        tier: userTotal >= 1000 ? 3 : userTotal >= 500 ? 2 : userTotal >= 100 ? 1 : 0,
      };
    }

    // Stats
    const totalStakedGlobal = Object.values(userTotals).reduce((a, b) => a + b, 0);
    const totalStakers = Object.keys(userTotals).length;

    return NextResponse.json({
      leaderboard,
      currentUserRank,
      stats: {
        totalStakedGlobal,
        totalStakers,
        averageStake: totalStakers > 0 ? Math.round(totalStakedGlobal / totalStakers) : 0,
      },
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
