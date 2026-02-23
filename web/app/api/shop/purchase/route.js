/**
 * API: /api/shop/purchase
 * Purchase a content item with $SAFE tokens
 */

import { supabase } from "@/libs/supabase";
import { auth } from "@/libs/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { content_type, reference_id } = await request.json();

    if (!content_type) {
      return NextResponse.json({ error: "Missing content_type" }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    // Check user balance
    const { data: pointsData } = await supabase
      .from("user_points")
      .select("balance")
      .eq("user_id", session.user.id)
      .single();

    const balance = pointsData?.balance || 0;

    // Content pricing
    const prices = {
      deep_analysis: 20,
      pillar_breakdown: 10,
      risk_report: 15,
      setup_analysis: 25,
      setup_comparison: 15,
    };

    const price = prices[content_type] || 10;

    if (balance < price) {
      return NextResponse.json({
        success: false,
        error: `Solde insuffisant. ${price} $SAFE requis, vous avez ${balance} $SAFE.`,
      }, { status: 400 });
    }

    // Debit and create purchase
    const { error: debitError } = await supabase.rpc("debit_user_points", {
      p_user_id: session.user.id,
      p_amount: price,
      p_reason: `Purchase: ${content_type}`,
    });

    if (debitError) {
      return NextResponse.json({ success: false, error: debitError.message }, { status: 400 });
    }

    // Record the purchase
    await supabase.from("user_active_items").insert({
      user_id: session.user.id,
      content_type,
      reference_id: reference_id || null,
    });

    return NextResponse.json({
      success: true,
      content: content_type,
      cost: price,
      newBalance: balance - price,
    });
  } catch (error) {
    console.error("Error processing purchase:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
