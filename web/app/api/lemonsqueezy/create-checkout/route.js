import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { createCheckout } from "@/libs/lemonsqueezy";
import { supabaseAdmin } from "@/libs/supabase";
import { getCountryPPPTier } from "@/libs/ppp";

/**
 * POST /api/lemonsqueezy/create-checkout
 * Creates a Lemon Squeezy checkout session.
 * PPP validation: verifies discount code matches IP country tier.
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

    // ============================================================
    // PPP SERVER-SIDE VALIDATION
    // Verify discount code matches IP country tier to prevent abuse.
    // If mismatch → silently strip discount code (no error, no accusation).
    // ============================================================
    let validatedDiscountCode = body.discountCode || null;
    const ipCountry = req.headers.get("x-vercel-ip-country") || "";

    if (validatedDiscountCode && ipCountry) {
      const pppData = getCountryPPPTier(ipCountry);

      // Only allow discount code if it matches the expected code for this country
      if (pppData.discountCode !== validatedDiscountCode) {
        // Mismatch: user may have manually injected a discount code
        // Silently strip it — no error, no accusation
        validatedDiscountCode = null;

        // Log the attempt for fraud review
        if (supabaseAdmin) {
          try {
            await supabaseAdmin.from("ppp_audit_log").insert({
              user_id: user?.id || null,
              ip_country: ipCountry,
              detected_tier: pppData.tier,
              applied_tier: 0,
              vpn_detected: false,
              vpn_signals: { reason: "discount_code_mismatch", attempted: body.discountCode },
              discount_code: null,
              action: "denied",
            });
          } catch {
            // Non-critical
          }
        }
      } else {
        // Valid: log the successful PPP checkout
        if (supabaseAdmin) {
          try {
            await supabaseAdmin.from("ppp_audit_log").insert({
              user_id: user?.id || null,
              ip_country: ipCountry,
              detected_tier: pppData.tier,
              applied_tier: pppData.tier,
              vpn_detected: false,
              discount_code: validatedDiscountCode,
              action: "checkout",
            });
          } catch {
            // Non-critical
          }
        }
      }
    }

    // Create checkout with validated discount code
    const checkoutUrl = await createCheckout({
      variantId,
      email: user?.email,
      userId: user?.id,
      successUrl,
      cancelUrl,
      discountCode: validatedDiscountCode,
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
