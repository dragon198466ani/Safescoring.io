import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { getCustomerPortalUrl } from "@/libs/lemonsqueezy";
import { supabaseAdmin } from "@/libs/supabase";

/**
 * POST /api/lemonsqueezy/portal
 * Returns the Lemon Squeezy customer portal URL for subscription management
 */
export async function POST(req) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's Lemon Squeezy customer ID from database
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("lemon_squeezy_customer_id")
      .eq("id", session.user.id)
      .single();

    if (error || !user?.lemon_squeezy_customer_id) {
      return NextResponse.json(
        { error: "No subscription found. Please subscribe first." },
        { status: 404 }
      );
    }

    const portalUrl = await getCustomerPortalUrl(user.lemon_squeezy_customer_id);

    return NextResponse.json({ url: portalUrl });
  } catch (error) {
    console.error("Lemon Squeezy portal error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get portal URL" },
      { status: 500 }
    );
  }
}
