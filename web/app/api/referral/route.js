import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";
import config from "@/config";

export const dynamic = "force-dynamic";

function generateReferralCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// GET /api/referral — Get user's referral stats & code
export async function GET(request) {
  const protection = await quickProtect(request, "standard");
  if (protection.blocked) return protection.response;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Get user's referral code
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("referral_code, referral_count")
      .eq("id", session.user.id)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If no referral code yet, generate one
    let referralCode = user.referral_code;
    if (!referralCode) {
      referralCode = generateReferralCode();
      // Retry if code collision (unlikely)
      for (let attempt = 0; attempt < 3; attempt++) {
        const { error } = await supabaseAdmin
          .from("users")
          .update({ referral_code: referralCode })
          .eq("id", session.user.id);

        if (!error) break;
        referralCode = generateReferralCode();
      }
    }

    const referralCount = user.referral_count || 0;

    // Determine tier
    const tiers = config.referral?.tiers || [];
    let currentTier = null;
    let nextTier = null;
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (referralCount >= tiers[i].min) {
        currentTier = tiers[i];
        nextTier = tiers[i + 1] || null;
        break;
      }
    }
    if (!currentTier && tiers.length > 0) {
      nextTier = tiers[0];
    }

    const shareUrl = `https://${config.domainName}/?ref=${referralCode}`;

    return NextResponse.json({
      referralCode,
      referralCount,
      shareUrl,
      currentTier: currentTier?.name || null,
      currentReward: currentTier?.reward || null,
      nextTier: nextTier ? {
        name: nextTier.name,
        min: nextTier.min,
        reward: nextTier.reward,
        remaining: nextTier.min - referralCount,
      } : null,
      tiers,
    });
  } catch (error) {
    console.error("Referral GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
