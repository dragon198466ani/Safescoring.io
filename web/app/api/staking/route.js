/**
 * API: /api/staking
 * Stake/unstake $SAFE tokens to unlock Premium features
 *
 * NEW SYSTEM:
 * - Bronze (100+): PDF export, +1 setup, 0.5% APY
 * - Silver (500+): API access, alerts, +3 setups, 0.75% APY
 * - Gold (1000+): Score history, +5 setups, 1% APY
 * - Platinum (2500+): Full Explorer features, 1.25% APY
 * - Diamond (5000+): Near-Professional, priority support, 2% APY
 */

import { supabase } from "@/libs/supabase";
import { auth } from "@/libs/auth";
import { NextResponse } from "next/server";
import { getStakingBenefits, getProgressToNextTier, getStakingTier } from "@/libs/staking-benefits";

// Calculate weekly reward based on staked amount and tier APY
function calculateWeeklyReward(totalStaked) {
  if (!totalStaked || totalStaked < 100) return { amount: 0, apy: 0 };
  const tier = getStakingTier(totalStaked);
  if (!tier) return { amount: 0, apy: 0 };
  const apyMap = { bronze: 0.5, silver: 0.75, gold: 1, platinum: 1.25, diamond: 2 };
  const apy = apyMap[tier.key] || 0;
  const weeklyAmount = (totalStaked * (apy / 100)) / 52;
  return { amount: Math.round(weeklyAmount * 100) / 100, apy };
}

export const dynamic = "force-dynamic";

// GET: Fetch user's staking data with benefits
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const userId = session.user.id;

    // Fetch balance, stakes, and reward history
    const [balanceRes, stakesRes, rewardsRes] = await Promise.all([
      supabase
        .from("user_points")
        .select("balance, total_earned")
        .eq("user_id", userId)
        .single(),
      supabase
        .from("user_staking")
        .select("*")
        .eq("user_id", userId)
        .in("status", ["active", "unstaking"])
        .order("staked_at", { ascending: false }),
      supabase
        .from("staking_rewards")
        .select("amount, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const balance = balanceRes.data?.balance || 0;
    const totalEarned = balanceRes.data?.total_earned || 0;
    const stakes = stakesRes.data || [];
    const recentRewards = rewardsRes.data || [];

    // Calculate totals
    const totalStaked = stakes
      .filter((s) => s.status === "active")
      .reduce((sum, s) => sum + s.amount, 0);

    const totalUnstaking = stakes
      .filter((s) => s.status === "unstaking")
      .reduce((sum, s) => sum + s.amount, 0);

    // Get benefits based on stake amount
    const benefits = getStakingBenefits(totalStaked);
    const progress = getProgressToNextTier(totalStaked);
    const weeklyReward = calculateWeeklyReward(totalStaked);

    // Calculate total rewards received
    const totalRewardsReceived = recentRewards.reduce((sum, r) => sum + r.amount, 0);

    return NextResponse.json({
      balance,
      totalEarned,
      totalStaked,
      totalUnstaking,
      stakes,
      // Benefits from staking
      benefits,
      tier: benefits.tier,
      tierName: benefits.tierName,
      tierIcon: benefits.tierIcon,
      // Progress to next tier
      progress,
      // Rewards info
      weeklyReward,
      recentRewards,
      totalRewardsReceived,
      // Vote power is neutral: 1 person = 1 vote regardless of stake
      voteBonus: 0,
    });
  } catch (error) {
    console.error("Error fetching staking data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Stake, unstake, or withdraw tokens
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { action, amount, stakeId } = await request.json();
    const userId = session.user.id;

    if (action === "stake") {
      if (!amount || amount < 100) {
        return NextResponse.json({ error: "Minimum 100 $SAFE" }, { status: 400 });
      }

      // Check balance first
      const { data: pointsData } = await supabase
        .from("user_points")
        .select("balance")
        .eq("user_id", userId)
        .single();

      if (!pointsData || pointsData.balance < amount) {
        return NextResponse.json({
          success: false,
          error: "Insufficient balance",
        }, { status: 400 });
      }

      // Try RPC first
      const { data, error } = await supabase.rpc("stake_tokens", {
        p_user_id: userId,
        p_amount: amount,
      });

      if (error) {
        // Fallback to manual transaction if RPC doesn't exist
        if (error.code === "42883") {
          // Deduct from balance
          await supabase
            .from("user_points")
            .update({ balance: pointsData.balance - amount })
            .eq("user_id", userId);

          // Create stake
          const { data: stakeData, error: stakeError } = await supabase
            .from("user_staking")
            .insert({
              user_id: userId,
              amount,
              status: "active",
            })
            .select()
            .single();

          if (stakeError) {
            // Rollback balance
            await supabase
              .from("user_points")
              .update({ balance: pointsData.balance })
              .eq("user_id", userId);
            return NextResponse.json({ error: stakeError.message }, { status: 400 });
          }

          // Calculate new total
          const { data: allStakes } = await supabase
            .from("user_staking")
            .select("amount")
            .eq("user_id", userId)
            .eq("status", "active");

          const newTotal = allStakes?.reduce((sum, s) => sum + s.amount, 0) || amount;
          const newBenefits = getStakingBenefits(newTotal);

          return NextResponse.json({
            success: true,
            stake_id: stakeData.id,
            amount_staked: amount,
            total_staked: newTotal,
            new_balance: pointsData.balance - amount,
            tier: newBenefits.tier,
            tierName: newBenefits.tierName,
            benefits: newBenefits,
          });
        }

        console.error("Stake error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      // Add benefits to RPC response
      const newBenefits = getStakingBenefits(data?.total_staked || amount);
      return NextResponse.json({
        ...data,
        tier: newBenefits.tier,
        tierName: newBenefits.tierName,
        benefits: newBenefits,
      });
    }

    if (action === "unstake") {
      if (!stakeId) {
        return NextResponse.json({ error: "Missing stakeId" }, { status: 400 });
      }

      // Try RPC first
      const { data, error } = await supabase.rpc("unstake_tokens", {
        p_user_id: userId,
        p_stake_id: stakeId,
      });

      if (error) {
        // Fallback to manual update
        if (error.code === "42883") {
          const unlockAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

          const { data: stakeData, error: updateError } = await supabase
            .from("user_staking")
            .update({
              status: "unstaking",
              unlock_at: unlockAt,
            })
            .eq("id", stakeId)
            .eq("user_id", userId)
            .eq("status", "active")
            .select()
            .single();

          if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 400 });
          }

          return NextResponse.json({
            success: true,
            stake_id: stakeId,
            amount: stakeData?.amount,
            unlock_at: unlockAt,
            message: "Unstaking initiated. Tokens available in 7 days.",
          });
        }

        console.error("Unstake error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json(data);
    }

    if (action === "withdraw") {
      // Try RPC first
      const { data, error } = await supabase.rpc("withdraw_unstaked_tokens", {
        p_user_id: userId,
      });

      if (error) {
        // Fallback to manual withdrawal
        if (error.code === "42883") {
          const now = new Date().toISOString();

          // Get stakes ready for withdrawal
          const { data: readyStakes } = await supabase
            .from("user_staking")
            .select("*")
            .eq("user_id", userId)
            .eq("status", "unstaking")
            .lte("unlock_at", now);

          if (!readyStakes || readyStakes.length === 0) {
            return NextResponse.json({
              success: true,
              withdrawn_amount: 0,
              stakes_withdrawn: 0,
            });
          }

          const totalWithdraw = readyStakes.reduce((sum, s) => sum + s.amount, 0);
          const stakeIds = readyStakes.map((s) => s.id);

          // Update stakes to withdrawn
          await supabase
            .from("user_staking")
            .update({ status: "withdrawn" })
            .in("id", stakeIds);

          // Add back to balance
          const { data: currentPoints } = await supabase
            .from("user_points")
            .select("balance")
            .eq("user_id", userId)
            .single();

          await supabase
            .from("user_points")
            .update({ balance: (currentPoints?.balance || 0) + totalWithdraw })
            .eq("user_id", userId);

          return NextResponse.json({
            success: true,
            withdrawn_amount: totalWithdraw,
            stakes_withdrawn: readyStakes.length,
          });
        }

        console.error("Withdraw error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error in staking action:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
