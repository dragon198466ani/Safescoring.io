import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin, isSupabaseConfigured } from "@/libs/supabase";
import { validateRequestOrigin } from "@/libs/security";
import crypto from "crypto";

/**
 * Generate anonymous voter hash from user ID or email
 */
function generateVoterHash(userId, email) {
  const input = userId || email || `anon_${Date.now()}`;
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 32);
}

/**
 * GET /api/community/rewards
 * Get user's token rewards and transaction history
 */
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeTransactions = searchParams.get("transactions") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

    if (!isSupabaseConfigured() || !supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const voterHash = generateVoterHash(session.user.id, session.user.email);

    // Get user's rewards
    const { data: rewards, error: rewardsError } = await supabaseAdmin
      .from("token_rewards")
      .select("*")
      .eq("user_hash", voterHash)
      .single();

    if (rewardsError && rewardsError.code !== "PGRST116") {
      console.error("Error fetching rewards:", rewardsError);
      return NextResponse.json(
        { error: "Failed to fetch rewards" },
        { status: 500 }
      );
    }

    // Get user's rank
    let rank = null;
    if (rewards?.total_earned > 0) {
      const { count } = await supabaseAdmin
        .from("token_rewards")
        .select("*", { count: "exact", head: true })
        .gt("total_earned", rewards.total_earned);

      rank = (count || 0) + 1;
    }

    // Get transactions if requested
    let transactions = [];
    if (includeTransactions) {
      const { data: txData } = await supabaseAdmin
        .from("token_transactions")
        .select("id, action_type, tokens_amount, created_at, description")
        .eq("user_hash", voterHash)
        .order("created_at", { ascending: false })
        .limit(limit);

      transactions = txData || [];
    }

    // Get reward config for reference
    const { data: rewardConfig } = await supabaseAdmin
      .from("reward_config")
      .select("action_type, base_tokens, description")
      .eq("is_active", true);

    return NextResponse.json({
      rewards: rewards || {
        total_earned: 0,
        total_claimed: 0,
        total_pending: 0,
        votes_submitted: 0,
        votes_validated: 0,
        votes_rejected: 0,
        challenges_won: 0,
        challenges_lost: 0,
        daily_streak: 0,
        longest_streak: 0,
        wallet_address: null,
      },
      rank,
      transactions,
      rewardConfig: rewardConfig || [],
      voterHash: `${voterHash.slice(0, 4)}...${voterHash.slice(-4)}`, // For leaderboard reference
    });

  } catch (error) {
    console.error("Error fetching rewards:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/community/rewards
 * Link wallet address for token claims
 */
export async function POST(request) {
  try {
    // SECURITY: Validate origin
    const check = validateRequestOrigin(request);
    if (!check.valid) {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { walletAddress } = body;

    // Validate wallet address format (basic Ethereum address validation)
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured() || !supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const voterHash = generateVoterHash(session.user.id, session.user.email);

    // Check if wallet is already linked to another user
    const { data: existing } = await supabaseAdmin
      .from("token_rewards")
      .select("user_hash")
      .eq("wallet_address", walletAddress.toLowerCase())
      .neq("user_hash", voterHash)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Wallet already linked to another account" },
        { status: 409 }
      );
    }

    // Update or create token_rewards with wallet
    const { data: updated, error } = await supabaseAdmin
      .from("token_rewards")
      .upsert({
        user_hash: voterHash,
        wallet_address: walletAddress.toLowerCase(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_hash",
      })
      .select()
      .single();

    if (error) {
      console.error("Error linking wallet:", error);
      return NextResponse.json(
        { error: "Failed to link wallet" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Wallet linked successfully",
      walletAddress: walletAddress.toLowerCase(),
    });

  } catch (error) {
    console.error("Error linking wallet:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
