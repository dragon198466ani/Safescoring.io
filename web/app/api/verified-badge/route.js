import { NextResponse } from "next/server";

import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { createCheckout } from "@/libs/lemonsqueezy";
import { BASE_URL } from "@/libs/config-constants";

/**
 * Verified Badge API
 *
 * Simple badge system - proves score authenticity
 *
 * Value proposition:
 * - Dynamic SVG (can't be faked)
 * - Click to verify on SafeScoring
 * - Real-time score updates
 * - "verified: true" flag in API
 *
 * Pricing: $19/month or $190/year
 */

const PRICE_MONTHLY = 19;
const PRICE_YEARLY = 190;

// LemonSqueezy variant IDs for verified badges
const BADGE_VARIANT_MONTHLY = process.env.LEMON_SQUEEZY_BADGE_MONTHLY_VARIANT_ID;
const BADGE_VARIANT_YEARLY = process.env.LEMON_SQUEEZY_BADGE_YEARLY_VARIANT_ID;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json(
      { error: "Product slug required" },
      { status: 400 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      hasVerifiedBadge: false,
      pricing: {
        monthly: PRICE_MONTHLY,
        yearly: PRICE_YEARLY,
      },
    });
  }

  try {
    const { data: badge } = await supabase
      .from("verified_badges")
      .select("id, is_active, badge_style, expires_at")
      .eq("product_slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    return NextResponse.json({
      hasVerifiedBadge: !!badge,
      badge: badge ? {
        id: badge.id,
        style: badge.badge_style,
        expiresAt: badge.expires_at,
      } : null,
      pricing: {
        monthly: PRICE_MONTHLY,
        yearly: PRICE_YEARLY,
      },
    });

  } catch (error) {
    console.error("Verified badge GET error:", error);
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
    const { productSlug, billingCycle = "monthly" } = await request.json();

    if (!productSlug) {
      return NextResponse.json(
        { error: "Product slug required" },
        { status: 400 }
      );
    }

    // Get product
    const { data: product } = await supabase
      .from("products")
      .select("id, slug, name")
      .eq("slug", productSlug)
      .maybeSingle();

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check for existing badge
    const { data: existing } = await supabase
      .from("verified_badges")
      .select("id, is_active")
      .eq("product_slug", productSlug)
      .maybeSingle();

    if (existing?.is_active) {
      return NextResponse.json(
        { error: "Product already has an active verified badge" },
        { status: 400 }
      );
    }

    const price = billingCycle === "yearly" ? PRICE_YEARLY : PRICE_MONTHLY;
    const variantId = billingCycle === "yearly" ? BADGE_VARIANT_YEARLY : BADGE_VARIANT_MONTHLY;

    // Check if LemonSqueezy is configured
    if (!variantId) {
      return NextResponse.json(
        { error: "Payment system not configured. Please contact support." },
        { status: 503 }
      );
    }

    // Create pending badge record (will be activated after payment)
    const badgeData = {
      product_id: product.id,
      product_slug: productSlug,
      user_id: session.user.id,
      is_active: false, // Activated after payment confirmation
      billing_cycle: billingCycle,
      price_paid: price,
      payment_status: "pending",
    };

    let badge;
    if (existing) {
      const { data, error } = await supabase
        .from("verified_badges")
        .update(badgeData)
        .eq("id", existing.id)
        .select("id")
        .single();
      badge = data;
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from("verified_badges")
        .insert(badgeData)
        .select("id")
        .single();
      badge = data;
      if (error) throw error;
    }

    // Create LemonSqueezy checkout session
    const checkoutUrl = await createCheckout({
      variantId,
      email: session.user.email,
      userId: session.user.id,
      successUrl: `${BASE_URL}/dashboard?badge_success=true&product=${productSlug}`,
      cancelUrl: `${BASE_URL}/products/${productSlug}?badge_cancelled=true`,
      customData: {
        badge_id: badge.id,
        product_slug: productSlug,
        type: "verified_badge",
      },
    });

    return NextResponse.json({
      success: true,
      badgeId: badge.id,
      price,
      billingCycle,
      checkoutUrl,
      embedCode: `<a href="https://safescoring.io/verify/${productSlug}"><img src="https://safescoring.io/api/verified-badge/image?slug=${productSlug}" alt="SafeScoring Verified" /></a>`,
    }, { status: 201 });

  } catch (error) {
    console.error("Verified badge POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
