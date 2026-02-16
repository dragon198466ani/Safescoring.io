import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";

export const dynamic = "force-dynamic";

// POST /api/referral/link — Link a referral code to the current user (called once after sign-in)
export async function POST(request) {
  const protection = await quickProtect(request, "sensitive");
  if (protection.blocked) return protection.response;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { referralCode } = await request.json();

    if (!referralCode || typeof referralCode !== "string" || referralCode.length < 4 || referralCode.length > 16) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 400 });
    }

    // Check if user already has a referrer
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("referred_by")
      .eq("id", session.user.id)
      .single();

    if (user?.referred_by) {
      return NextResponse.json({ ok: true, already: true });
    }

    // Find the referrer by their referral code
    const { data: referrer } = await supabaseAdmin
      .from("users")
      .select("id, referral_count")
      .eq("referral_code", referralCode.toUpperCase())
      .single();

    if (!referrer) {
      return NextResponse.json({ error: "Referral code not found" }, { status: 404 });
    }

    // Don't allow self-referral
    if (referrer.id === session.user.id) {
      return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 });
    }

    // Link the referral
    await supabaseAdmin
      .from("users")
      .update({ referred_by: referralCode.toUpperCase() })
      .eq("id", session.user.id);

    // Increment referrer's count
    await supabaseAdmin
      .from("users")
      .update({ referral_count: (referrer.referral_count || 0) + 1 })
      .eq("id", referrer.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Referral link error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
