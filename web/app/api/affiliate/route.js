import { NextResponse } from "next/server";

import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

/**
 * Affiliate Program API
 *
 * GET - Get current user's affiliate account
 * POST - Apply to become an affiliate
 */

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const { data: affiliate, error } = await supabase
      .from("affiliates")
      .select(`
        id,
        code,
        name,
        email,
        website,
        commission_rate,
        status,
        payout_method,
        total_referrals,
        total_conversions,
        total_earnings,
        pending_payout,
        lifetime_payout,
        created_at,
        approved_at
      `)
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching affiliate:", error);
      return NextResponse.json({ error: "Failed to fetch affiliate data" }, { status: 500 });
    }

    if (!affiliate) {
      return NextResponse.json({ affiliate: null });
    }

    // Get recent stats
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [clicksResult, conversionsResult] = await Promise.all([
      supabase
        .from("affiliate_clicks")
        .select("*", { count: "exact", head: true })
        .eq("affiliate_id", affiliate.id)
        .gte("created_at", thirtyDaysAgo.toISOString()),
      supabase
        .from("affiliate_conversions")
        .select("*", { count: "exact", head: true })
        .eq("affiliate_id", affiliate.id)
        .gte("created_at", thirtyDaysAgo.toISOString()),
    ]);

    return NextResponse.json({
      affiliate: {
        id: affiliate.id,
        code: affiliate.code,
        name: affiliate.name,
        email: affiliate.email,
        website: affiliate.website,
        commissionRate: affiliate.commission_rate,
        status: affiliate.status,
        payoutMethod: affiliate.payout_method,
        stats: {
          totalReferrals: affiliate.total_referrals,
          totalConversions: affiliate.total_conversions,
          totalEarnings: parseFloat(affiliate.total_earnings || 0),
          pendingPayout: parseFloat(affiliate.pending_payout || 0),
          lifetimePayout: parseFloat(affiliate.lifetime_payout || 0),
          last30DaysClicks: clicksResult.count || 0,
          last30DaysConversions: conversionsResult.count || 0,
        },
        createdAt: affiliate.created_at,
        approvedAt: affiliate.approved_at,
        referralLink: `https://safescoring.io/?ref=${affiliate.code}`,
      },
    });

  } catch (error) {
    console.error("Affiliate GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const { name, email, website, payoutMethod, payoutDetails } = await request.json();

    // Check if already an affiliate
    const { data: existing } = await supabase
      .from("affiliates")
      .select("id, status")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "You already have an affiliate account", status: existing.status },
        { status: 400 }
      );
    }

    // Create affiliate account
    const { data: affiliate, error } = await supabase
      .from("affiliates")
      .insert({
        user_id: session.user.id,
        name: name || session.user.name,
        email: email || session.user.email,
        website,
        payout_method: payoutMethod || "crypto",
        payout_details: payoutDetails || {},
        status: "pending",
      })
      .select("id, code")
      .single();

    if (error) {
      console.error("Error creating affiliate:", error);
      return NextResponse.json({ error: "Failed to create affiliate account" }, { status: 500 });
    }

    return NextResponse.json({
      message: "Affiliate application submitted successfully",
      affiliate: {
        id: affiliate.id,
        code: affiliate.code,
        status: "pending",
      },
    }, { status: 201 });

  } catch (error) {
    console.error("Affiliate POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
