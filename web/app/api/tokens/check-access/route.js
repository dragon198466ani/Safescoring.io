import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin, isSupabaseConfigured } from "@/libs/supabase";

/**
 * GET /api/tokens/check-access?item=detailed_analysis&ref=ledger
 *
 * Check if user has access to a feature via:
 * 1. Subscription plan (always has access if plan includes it)
 * 2. Token unlock (paid with tokens)
 *
 * Returns: { hasAccess: boolean, via: 'subscription' | 'token' | null }
 */
export async function GET(request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const itemCode = searchParams.get("item");
    const referenceId = searchParams.get("ref");

    if (!itemCode) {
      return NextResponse.json({ error: "item parameter required" }, { status: 400 });
    }

    // Not logged in = no access
    if (!session?.user?.id) {
      return NextResponse.json({
        hasAccess: false,
        via: null,
        canUnlock: false,
      });
    }

    if (!isSupabaseConfigured() || !supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Get user's subscription plan
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("subscription_plan")
      .eq("id", session.user.id)
      .single();

    const userPlan = profile?.subscription_plan || "free";

    // Get the item to check what plan it requires
    const { data: item } = await supabaseAdmin
      .from("token_spend_items")
      .select("equivalent_plan, tokens_cost")
      .eq("item_code", itemCode)
      .single();

    if (!item) {
      return NextResponse.json({ error: "Unknown item" }, { status: 404 });
    }

    // Plan hierarchy
    const planHierarchy = {
      free: 0,
      explorer: 1,
      pro: 2,
      professional: 2,
      enterprise: 3,
    };

    const userPlanLevel = planHierarchy[userPlan] || 0;
    const requiredPlanLevel = item.equivalent_plan ? (planHierarchy[item.equivalent_plan] || 0) : 999;

    // Check 1: Does subscription give access?
    if (userPlanLevel >= requiredPlanLevel) {
      return NextResponse.json({
        hasAccess: true,
        via: "subscription",
        plan: userPlan,
      });
    }

    // Check 2: Has user unlocked via tokens?
    const { data: hasTokenAccess } = await supabaseAdmin.rpc("has_token_access", {
      p_user_id: session.user.id,
      p_item_code: itemCode,
      p_reference_id: referenceId || null,
    });

    if (hasTokenAccess) {
      return NextResponse.json({
        hasAccess: true,
        via: "token",
      });
    }

    // No access - check if user CAN unlock
    const { data: balance } = await supabaseAdmin
      .from("user_token_balances")
      .select("available_balance")
      .eq("user_id", session.user.id)
      .single();

    const userBalance = balance?.available_balance || 0;
    const canUnlock = userBalance >= item.tokens_cost;

    return NextResponse.json({
      hasAccess: false,
      via: null,
      canUnlock,
      tokenCost: item.tokens_cost,
      userBalance,
      requiredPlan: item.equivalent_plan,
    });

  } catch (error) {
    console.error("Error checking access:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
