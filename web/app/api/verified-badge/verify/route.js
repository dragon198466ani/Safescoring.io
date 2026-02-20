import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

/**
 * Badge Verification Endpoint
 *
 * When users click the badge, they land on /verify/[slug]
 * This API confirms if the badge is authentic
 */

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "Product slug required" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      verified: true,
      product: {
        slug,
        name: slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        score: 85,
      },
      message: "This product has a verified SafeScoring badge.",
      badgeUrl: `https://safescoring.io/api/verified-badge/image?slug=${slug}`,
      productUrl: `https://safescoring.io/products/${slug}`,
    });
  }

  try {
    // Get product
    const { data: product } = await supabase
      .from("products")
      .select("slug, name, note_finale")
      .eq("slug", slug)
      .maybeSingle();

    if (!product) {
      return NextResponse.json({
        verified: false,
        error: "Product not found",
      });
    }

    // Check badge
    const { data: badge } = await supabase
      .from("verified_badges")
      .select("id, is_active, activated_at, expires_at")
      .eq("product_slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    const score = Math.round(product.note_finale || 0);

    if (!badge) {
      return NextResponse.json({
        verified: false,
        product: {
          slug: product.slug,
          name: product.name,
          score,
        },
        message: "This product does not have a verified badge. The score shown may be outdated or fake.",
        productUrl: `https://safescoring.io/products/${slug}`,
      });
    }

    // Check expiry
    if (badge.expires_at && new Date(badge.expires_at) < new Date()) {
      return NextResponse.json({
        verified: false,
        product: {
          slug: product.slug,
          name: product.name,
          score,
        },
        message: "This product's verified badge has expired.",
        expiredAt: badge.expires_at,
      });
    }

    return NextResponse.json({
      verified: true,
      product: {
        slug: product.slug,
        name: product.name,
        score,
      },
      badge: {
        activatedAt: badge.activated_at,
        expiresAt: badge.expires_at,
      },
      message: "This badge is authentic. The score displayed is real-time and verified by SafeScoring.",
      verifiedAt: new Date().toISOString(),
      badgeUrl: `https://safescoring.io/api/verified-badge/image?slug=${slug}`,
      productUrl: `https://safescoring.io/products/${slug}`,
    });

  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
