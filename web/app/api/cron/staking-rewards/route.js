import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Weekly Staking Rewards Distribution
 *
 * This cron job distributes $SAFE rewards to all stakers based on their tier:
 * - Bronze (100+): 0.5% weekly
 * - Silver (500+): 0.75% weekly
 * - Gold (1000+): 1% weekly
 * - Platinum (2500+): 1.25% weekly
 * - Diamond (5000+): 2% weekly
 *
 * Maximum reward per user: 200 $SAFE/week (prevents abuse)
 *
 * Schedule: Run weekly via Vercel Cron or external scheduler
 * Endpoint: GET /api/cron/staking-rewards
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

// Reward rates by tier (weekly)
const REWARD_RATES = {
  diamond: 0.02,    // 2%
  platinum: 0.0125, // 1.25%
  gold: 0.01,       // 1%
  silver: 0.0075,   // 0.75%
  bronze: 0.005,    // 0.5%
};

// Maximum reward per week per user
const MAX_WEEKLY_REWARD = 200;

export async function GET(request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = request.headers.get("x-cron-secret");

    if (CRON_SECRET && cronSecret !== CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all stakers with their totals and tiers
    const { data: stakers, error: stakersError } = await supabase
      .from("user_staking_summary")
      .select("user_id, total_staked, tier")
      .gte("total_staked", 100)
      .not("tier", "is", null);

    if (stakersError) {
      console.error("Error fetching stakers:", stakersError);
      return NextResponse.json({ error: "Failed to fetch stakers" }, { status: 500 });
    }

    if (!stakers || stakers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No stakers to reward",
        totalDistributed: 0,
        stakersRewarded: 0,
      });
    }

    let totalDistributed = 0;
    let stakersRewarded = 0;
    const rewardLogs = [];

    // Process each staker
    for (const staker of stakers) {
      const rate = REWARD_RATES[staker.tier] || 0;
      if (rate === 0) continue;

      // Calculate reward (capped)
      const rawReward = Math.floor(staker.total_staked * rate);
      const reward = Math.min(rawReward, MAX_WEEKLY_REWARD);

      if (reward <= 0) continue;

      // Add reward to user's balance - fetch current and update
      const { data: currentPoints } = await supabase
        .from("user_points")
        .select("balance, total_earned")
        .eq("user_id", staker.user_id)
        .single();

      if (currentPoints) {
        // User exists, update their balance
        await supabase
          .from("user_points")
          .update({
            balance: currentPoints.balance + reward,
            total_earned: currentPoints.total_earned + reward,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", staker.user_id);
      } else {
        // User doesn't exist in points table, create them
        await supabase.from("user_points").insert({
          user_id: staker.user_id,
          balance: reward,
          total_earned: reward,
        });
      }

      // Log the reward (columns match SAFE_POINTS_COMBINED.sql)
      const { error: logError } = await supabase.from("staking_rewards").insert({
        user_id: staker.user_id,
        amount: reward,
        tier: staker.tier,
        apy_rate: rate,
      });

      if (!logError) {
        totalDistributed += reward;
        stakersRewarded++;
        rewardLogs.push({
          user_id: staker.user_id.substring(0, 8) + "...",
          tier: staker.tier,
          staked: staker.total_staked,
          reward,
        });
      }
    }

    console.log(`[Staking Rewards] Distributed ${totalDistributed} $SAFE to ${stakersRewarded} stakers`);

    return NextResponse.json({
      success: true,
      totalDistributed,
      stakersRewarded,
      totalStakers: stakers.length,
      distributedAt: new Date().toISOString(),
      // Only include details in non-production for debugging
      ...(process.env.NODE_ENV !== "production" && { details: rewardLogs }),
    });
  } catch (error) {
    console.error("[Staking Rewards] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(request) {
  return GET(request);
}
