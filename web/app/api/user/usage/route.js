import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";
import config from "@/config";
import { getPlanLimits } from "@/libs/config-constants";

// GET - Get user's current usage stats
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Get user's plan info
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("plan_type, has_access, price_id, trial_ends_at")
      .eq("id", session.user.id)
      .single();

    if (userError) {
      console.error("Error fetching user:", userError);
      return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
    }

    // If user has paid access, return plan-specific limits
    if (user?.has_access && user?.price_id !== "free") {
      const plan = config.lemonsqueezy.plans.find(p => p.variantId === user.price_id);
      const planCode = plan?.name?.toLowerCase() || "explorer";
      const planLimits = plan?.limits || getPlanLimits(planCode);
      return NextResponse.json({
        plan: planCode,
        planType: plan?.name || "Paid",
        isPaid: true,
        hasAccess: true,
        used: 0,
        limit: -1, // unlimited views
        remaining: -1,
        limits: planLimits,
        trialEndsAt: user.trial_ends_at,
        isTrialing: user.trial_ends_at && new Date(user.trial_ends_at) > new Date(),
      });
    }

    // For free users, count this month's views
    const monthYear = new Date().toISOString().slice(0, 7);
    const limit = config.freemium.monthlyLimit;

    const { count, error: countError } = await supabaseAdmin
      .from("product_views")
      .select("*", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .eq("month_year", monthYear);

    if (countError) {
      console.error("Error counting views:", countError);
      return NextResponse.json({ error: "Failed to count views" }, { status: 500 });
    }

    const used = count || 0;

    const freeLimits = getPlanLimits("free");
    return NextResponse.json({
      plan: "free",
      planType: "Free",
      isPaid: false,
      hasAccess: true,
      used,
      limit,
      remaining: Math.max(0, limit - used),
      limits: freeLimits,
      resetDate: getNextMonthStart(),
    });
  } catch (error) {
    console.error("Usage GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function getNextMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
}
