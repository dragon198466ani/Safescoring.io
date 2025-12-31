import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";
import config from "@/config";

// POST - Track product view and check limits
export async function POST(req) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const body = await req.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json({ error: "Product ID required" }, { status: 400 });
    }

    // Get user's current plan and usage
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("plan_type, has_access, price_id")
      .eq("id", session.user.id)
      .single();

    if (userError) {
      console.error("Error fetching user:", userError);
      return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
    }

    // If user has paid access, allow unlimited views
    if (user?.has_access && user?.price_id !== "free") {
      return NextResponse.json({
        allowed: true,
        remaining: -1, // -1 means unlimited
        limit: -1,
        isPaid: true,
      });
    }

    // For free users, check monthly limit
    const monthYear = new Date().toISOString().slice(0, 7); // "2025-01"
    const limit = config.freemium.monthlyLimit;

    // Check if this product was already viewed this month
    const { data: existingView } = await supabaseAdmin
      .from("product_views")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("product_id", productId)
      .eq("month_year", monthYear)
      .single();

    if (existingView) {
      // Already viewed this product this month, doesn't count against limit
      const { count } = await supabaseAdmin
        .from("product_views")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .eq("month_year", monthYear);

      return NextResponse.json({
        allowed: true,
        remaining: Math.max(0, limit - (count || 0)),
        limit,
        isPaid: false,
        alreadyViewed: true,
      });
    }

    // Count unique products viewed this month
    const { count, error: countError } = await supabaseAdmin
      .from("product_views")
      .select("*", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .eq("month_year", monthYear);

    if (countError) {
      console.error("Error counting views:", countError);
      return NextResponse.json({ error: "Failed to count views" }, { status: 500 });
    }

    const currentCount = count || 0;
    const remaining = limit - currentCount;

    // Check if limit reached
    if (remaining <= 0) {
      return NextResponse.json({
        allowed: false,
        remaining: 0,
        limit,
        isPaid: false,
        limitReached: true,
      });
    }

    // Record the view
    const { error: insertError } = await supabaseAdmin
      .from("product_views")
      .insert({
        user_id: session.user.id,
        product_id: productId,
        month_year: monthYear,
      });

    if (insertError) {
      console.error("Error recording view:", insertError);
      return NextResponse.json({ error: "Failed to record view" }, { status: 500 });
    }

    return NextResponse.json({
      allowed: true,
      remaining: remaining - 1,
      limit,
      isPaid: false,
    });
  } catch (error) {
    console.error("Track view error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
