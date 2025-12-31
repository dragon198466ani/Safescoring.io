import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { createCheckout } from "@/libs/lemonsqueezy";
import { supabaseAdmin } from "@/libs/supabase";

/**
 * POST /api/lemonsqueezy/create-checkout
 * Creates a Lemon Squeezy checkout session
 */
export async function POST(req) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { variantId, successUrl, cancelUrl } = body;

    if (!variantId) {
      return NextResponse.json(
        { error: "Variant ID is required" },
        { status: 400 }
      );
    }

    if (!successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: "Success and cancel URLs are required" },
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

    // Create checkout
    const checkoutUrl = await createCheckout({
      variantId,
      email: user?.email,
      userId: user?.id,
      successUrl,
      cancelUrl,
      discountCode: body.discountCode,
    });

    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    console.error("Lemon Squeezy checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout" },
      { status: 500 }
    );
  }
}
