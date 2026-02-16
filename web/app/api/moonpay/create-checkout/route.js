import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { generateMoonPayUrl } from "@/libs/moonpay";
import { supabaseAdmin } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";

/**
 * POST /api/moonpay/create-checkout
 * Generates a MoonPay checkout URL for crypto payment
 */
export async function POST(req) {
  // Rate limit: financial operation
  const protection = await quickProtect(req, "sensitive");
  if (protection.blocked) return protection.response;

  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { planName, successUrl, cancelUrl } = body;

    if (!planName) {
      return NextResponse.json(
        { error: "Plan name is required" },
        { status: 400 }
      );
    }

    if (!successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: "Success and cancel URLs are required" },
        { status: 400 }
      );
    }

    // Validate plan name
    const validPlans = ["explorer", "professional", "enterprise"];
    if (!validPlans.includes(planName.toLowerCase())) {
      return NextResponse.json(
        { error: `Invalid plan. Must be one of: ${validPlans.join(", ")}` },
        { status: 400 }
      );
    }

    // Get current user session
    const session = await auth();

    let user = null;
    if (session?.user?.id && supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from("users")
        .select("id, email, name")
        .eq("id", session.user.id)
        .single();
      user = data;
    }

    // Generate MoonPay checkout URL
    const url = generateMoonPayUrl({
      planName,
      userId: user?.id || "anonymous",
      email: user?.email,
      successUrl,
      cancelUrl,
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error("MoonPay checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create crypto checkout" },
      { status: 500 }
    );
  }
}
