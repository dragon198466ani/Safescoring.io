import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin, isSupabaseConfigured } from "@/libs/supabase";

/**
 * GET /api/tokens
 * Get user's token balance and available items
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isSupabaseConfigured() || !supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Get user balance
    const { data: balance } = await supabaseAdmin
      .from("user_token_balances")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    // Get available items to spend on
    const { data: items } = await supabaseAdmin
      .from("token_spend_items")
      .select("*")
      .eq("is_active", true)
      .order("tokens_cost");

    // Get earn rules
    const { data: earnRules } = await supabaseAdmin
      .from("token_earn_rules")
      .select("*")
      .order("tokens");

    // Get user's unlocks
    const { data: unlocks } = await supabaseAdmin
      .from("token_unlocks")
      .select("item_code, reference_id, unlocked_at")
      .eq("user_id", session.user.id);

    // Get global token economics
    const { data: economics } = await supabaseAdmin
      .from("token_economics")
      .select("*")
      .single();

    return NextResponse.json({
      balance: {
        available: balance?.available_balance || 0,
        lifetimeEarned: balance?.lifetime_earned || 0,
        lifetimeSpent: balance?.lifetime_spent || 0,
      },
      items: items || [],
      earnRules: earnRules || [],
      unlocks: unlocks || [],
      economics: economics || null,
    });

  } catch (error) {
    console.error("Error fetching tokens:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/tokens
 * Spend tokens on an item
 *
 * Body: { itemCode: string, referenceId?: string }
 */
export async function POST(request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isSupabaseConfigured() || !supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const body = await request.json();
    const { itemCode, referenceId } = body;

    if (!itemCode) {
      return NextResponse.json({ error: "itemCode required" }, { status: 400 });
    }

    // Call spend_tokens function
    const { data, error } = await supabaseAdmin.rpc("spend_tokens", {
      p_user_id: session.user.id,
      p_item_code: itemCode,
      p_reference_id: referenceId || null,
    });

    if (error) {
      console.error("Error spending tokens:", error);
      return NextResponse.json({ error: "Failed to spend tokens" }, { status: 500 });
    }

    if (!data.success) {
      return NextResponse.json({
        error: data.error,
        required: data.required,
        available: data.available,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      spent: data.spent,
      burned: data.burned,
      item: data.item,
    });

  } catch (error) {
    console.error("Error spending tokens:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
