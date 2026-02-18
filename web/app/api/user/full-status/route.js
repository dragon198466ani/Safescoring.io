import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin, isSupabaseConfigured } from "@/libs/supabase";

/**
 * GET /api/user/full-status
 * Returns complete user status: subscription + token balance + effective tier
 *
 * This endpoint shows how subscription and token benefits combine
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!isSupabaseConfigured() || !supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Try the view first (most complete)
    const { data: fullStatus, error: viewError } = await supabaseAdmin
      .from("user_full_status")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (!viewError && fullStatus) {
      return NextResponse.json({
        // Subscription info
        subscription: {
          plan: fullStatus.subscription_plan || "free",
          status: fullStatus.subscription_status || "inactive",
          includedTokenTier: fullStatus.sub_token_tier || "none",
          monthlyTokenReward: fullStatus.sub_monthly_tokens || 0,
          baseVoteMultiplier: fullStatus.sub_vote_multiplier || 1.0,
        },

        // Token info
        tokens: {
          available: fullStatus.token_balance || 0,
          staked: fullStatus.staked_tokens || 0,
          stakingTier: fullStatus.stake_tier,
          lifetimeEarned: fullStatus.lifetime_tokens_earned || 0,
          lifetimeSpent: fullStatus.lifetime_tokens_spent || 0,
        },

        // Combined effective values
        effective: {
          tier: fullStatus.effective_tier || "none",
          voteMultiplier: fullStatus.effective_vote_multiplier || 1.0,
        },

        // What the user can do
        capabilities: getCapabilities(fullStatus.effective_tier),
      });
    }

    // Fallback: build manually from separate tables
    const [profileResult, tokenResult, mappingResult] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("subscription_plan, subscription_status")
        .eq("id", session.user.id)
        .single(),
      supabaseAdmin
        .from("user_token_balances")
        .select("*")
        .eq("user_id", session.user.id)
        .single(),
      supabaseAdmin
        .from("subscription_token_mapping")
        .select("*"),
    ]);

    const profile = profileResult.data || {};
    const tokens = tokenResult.data || {};
    const mappings = mappingResult.data || [];

    const plan = profile.subscription_plan || "free";
    const mapping = mappings.find(m => m.subscription_plan === plan) || {
      included_token_tier: "none",
      monthly_token_reward: 0,
      included_vote_multiplier: 1.0,
    };

    // Calculate effective tier
    const stakeTier = tokens.staking_tier;
    const subTier = mapping.included_token_tier;
    const effectiveTier = getHigherTier(stakeTier, subTier);

    // Vote multiplier is always 1.0 - neutral scoring (1 person = 1 vote)
    const effectiveMultiplier = 1.0;

    return NextResponse.json({
      subscription: {
        plan,
        status: profile.subscription_status || "inactive",
        includedTokenTier: subTier,
        monthlyTokenReward: mapping.monthly_token_reward || 0,
        baseVoteMultiplier: subMultiplier,
      },
      tokens: {
        available: tokens.available_balance || 0,
        staked: tokens.staked_balance || 0,
        stakingTier: stakeTier || null,
        lifetimeEarned: tokens.lifetime_earned || 0,
        lifetimeSpent: tokens.lifetime_spent || 0,
      },
      effective: {
        tier: effectiveTier,
        voteMultiplier: effectiveMultiplier,
      },
      capabilities: getCapabilities(effectiveTier),
    });

  } catch (error) {
    console.error("Error fetching user full status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Get capabilities for a tier
 */
function getCapabilities(tier) {
  // voteWeight is always 1.0 - neutral scoring (1 person = 1 vote)
  const caps = {
    none: {
      voteWeight: 1.0,
      monthlyTokens: 0,
      betaAccess: false,
      privateChannel: false,
      founderCalls: false,
      prioritySupport: false,
    },
    bronze: {
      voteWeight: 1.0,
      monthlyTokens: 10,
      betaAccess: false,
      privateChannel: false,
      founderCalls: false,
      prioritySupport: false,
    },
    silver: {
      voteWeight: 1.0,
      monthlyTokens: 30,
      betaAccess: false,
      privateChannel: false,
      founderCalls: false,
      prioritySupport: true,
    },
    gold: {
      voteWeight: 1.0,
      monthlyTokens: 75,
      betaAccess: true,
      privateChannel: true,
      founderCalls: false,
      prioritySupport: true,
    },
    platinum: {
      voteWeight: 1.0,
      monthlyTokens: 200,
      betaAccess: true,
      privateChannel: true,
      founderCalls: true,
      prioritySupport: true,
    },
  };

  return caps[tier] || caps.none;
}

/**
 * Get the higher tier between two
 */
function getHigherTier(tier1, tier2) {
  const order = ["none", "bronze", "silver", "gold", "platinum"];
  const idx1 = order.indexOf(tier1 || "none");
  const idx2 = order.indexOf(tier2 || "none");
  return order[Math.max(idx1, idx2)];
}

/**
 * Get staking bonus multiplier
 */
function getStakeBonus(tier) {
  const bonuses = {
    platinum: 1.5,
    gold: 1.3,
    silver: 1.2,
    bronze: 1.1,
  };
  return bonuses[tier] || 1.0;
}
