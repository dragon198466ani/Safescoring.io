import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import config from "@/config";

/**
 * Referral Program API
 * GET /api/referral — Get user's referral stats, link, and code
 *
 * Returns: { referralCode, referralLink, totalReferrals, confirmedReferrals, totalRewards }
 */

function generateReferralCode(userId) {
  // Deterministic code from user ID (first 8 chars of hex)
  const hash = userId
    .split("")
    .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0);
  return `SAFE${Math.abs(hash).toString(36).toUpperCase().slice(0, 6)}`;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const referralCode = generateReferralCode(userId);
    const baseUrl = config?.domainName
      ? `https://${config.domainName}`
      : process.env.NEXTAUTH_URL || "https://safescoring.io";
    const referralLink = `${baseUrl}?ref=${referralCode}`;

    // Try to fetch real referral stats from Supabase
    let totalReferrals = 0;
    let confirmedReferrals = 0;
    let totalRewards = 0;

    if (isSupabaseConfigured()) {
      try {
        // Check if referrals table exists and fetch stats
        const { data, error } = await supabase
          .from("referrals")
          .select("id, status")
          .eq("referrer_id", userId);

        if (!error && data) {
          totalReferrals = data.length;
          confirmedReferrals = data.filter((r) => r.status === "confirmed").length;
          // Reward tiers: 1 ref = 1 month Explorer, 5 = Professional, 10+ = airdrop priority
          if (confirmedReferrals >= 10) totalRewards = 3;
          else if (confirmedReferrals >= 5) totalRewards = 2;
          else if (confirmedReferrals >= 1) totalRewards = 1;
        }
      } catch {
        // Table might not exist yet — return zeros
      }
    }

    return NextResponse.json({
      referralCode,
      referralLink,
      totalReferrals,
      confirmedReferrals,
      totalRewards,
    });
  } catch (error) {
    console.error("[Referral] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
