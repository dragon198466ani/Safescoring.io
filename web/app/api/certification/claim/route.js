/**
 * API: /api/certification/claim
 * Certification Claims System - Phase 3: Care Economy
 *
 * POST /api/certification/claim - Submit a claim for "SafeScoring Approved" certification
 * GET  /api/certification/claim - Get user's certification claims
 *
 * Certification tiers:
 * - standard ($49/year): Digital badge, listed as "Scored by SafeScoring"
 * - verified ($199/year): Digital badge + verified mark + priority re-evaluation
 * - premium ($499/year): All verified + physical certificate + NFT + custom report
 */

import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";

// Certification tier definitions
const CERTIFICATION_TIERS = {
  standard: {
    name: "Standard",
    price: 49,
    description: "Digital badge, listed as 'Scored by SafeScoring'",
    features: [
      "Digital badge for your website",
      "Listed as 'Scored by SafeScoring'",
      "Annual re-evaluation",
      "Public score display",
    ],
  },
  verified: {
    name: "Verified",
    price: 199,
    description: "Digital badge + verified mark + priority re-evaluation",
    features: [
      "Everything in Standard",
      "Verified mark on profile",
      "Priority re-evaluation (quarterly)",
      "Improvement roadmap",
      "Email support",
    ],
  },
  premium: {
    name: "Premium",
    price: 499,
    description: "All Verified + physical certificate + NFT + custom report",
    features: [
      "Everything in Verified",
      "Physical certificate shipped worldwide",
      "On-chain NFT certification badge",
      "Custom detailed security report",
      "Dedicated account manager",
      "Monthly re-evaluation",
    ],
  },
};

const MINIMUM_SCORE_REQUIRED = 50;

export const dynamic = "force-dynamic";

/**
 * POST - Submit certification claim
 */
export async function POST(request) {
  // Rate limiting
  const protection = await quickProtect(request, "auth");
  if (protection.blocked) {
    return protection.response;
  }

  try {
    // Require authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { product_slug, contact_email, company_name, website, tier } = body;

    // Validate required fields
    if (!product_slug) {
      return NextResponse.json(
        { error: "Missing required field: product_slug" },
        { status: 400 }
      );
    }

    if (!contact_email) {
      return NextResponse.json(
        { error: "Missing required field: contact_email" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contact_email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate tier
    const selectedTier = tier || "standard";
    if (!CERTIFICATION_TIERS[selectedTier]) {
      return NextResponse.json(
        { error: "Invalid tier. Must be: standard, verified, or premium" },
        { status: 400 }
      );
    }

    // Validate website URL if provided
    if (website) {
      try {
        new URL(website);
      } catch {
        return NextResponse.json(
          { error: "Invalid website URL format" },
          { status: 400 }
        );
      }
    }

    // Check if product exists and get current score
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("slug, name, overall_score")
      .eq("slug", product_slug)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Product not found. Please verify the product slug." },
        { status: 404 }
      );
    }

    const currentScore = product.overall_score || null;
    const eligible = currentScore === null || currentScore >= MINIMUM_SCORE_REQUIRED;

    // Check for existing active/pending claim for this product
    const { data: existingClaim } = await supabase
      .from("certification_claims")
      .select("id, status, tier")
      .eq("product_slug", product_slug)
      .in("status", ["pending", "approved"])
      .single();

    if (existingClaim) {
      return NextResponse.json(
        {
          error: "An active certification claim already exists for this product",
          existing_claim_id: existingClaim.id,
          existing_status: existingClaim.status,
          existing_tier: existingClaim.tier,
        },
        { status: 409 }
      );
    }

    // Create the certification claim
    const claimData = {
      product_slug,
      user_id: session.user.id,
      contact_email,
      company_name: company_name || null,
      website: website || null,
      tier: selectedTier,
      status: "pending",
      current_score: currentScore,
    };

    const { data: claim, error: createError } = await supabase
      .from("certification_claims")
      .insert(claimData)
      .select()
      .single();

    if (createError) {
      console.error("Error creating certification claim:", createError);
      return NextResponse.json(
        { error: "Failed to create certification claim" },
        { status: 500 }
      );
    }

    // Build next steps based on eligibility
    const nextSteps = eligible
      ? [
          "Our team will review your claim within 48h",
          `You'll receive an email at ${contact_email}`,
        ]
      : [
          `Your product's current score (${currentScore}) is below the minimum required (${MINIMUM_SCORE_REQUIRED})`,
          "Improve your product's security posture and reapply",
          `You'll receive guidance at ${contact_email}`,
        ];

    return NextResponse.json({
      claim_id: claim.id,
      status: "pending_review",
      product_slug: claim.product_slug,
      current_score: currentScore,
      eligible,
      minimum_score_required: MINIMUM_SCORE_REQUIRED,
      tier: selectedTier,
      tier_details: CERTIFICATION_TIERS[selectedTier],
      next_steps: nextSteps,
    });
  } catch (error) {
    console.error("Certification claim error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET - Retrieve user's certification claims
 */
export async function GET(request) {
  const protection = await quickProtect(request, "auth");
  if (protection.blocked) {
    return protection.response;
  }

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const productSlug = searchParams.get("product_slug");

    let query = supabase
      .from("certification_claims")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (productSlug) {
      query = query.eq("product_slug", productSlug);
    }

    const { data: claims, error } = await query;

    if (error) {
      console.error("Error fetching certification claims:", error);
      return NextResponse.json(
        { error: "Failed to fetch claims" },
        { status: 500 }
      );
    }

    // Enrich claims with tier details
    const enrichedClaims = (claims || []).map((claim) => ({
      ...claim,
      tier_details: CERTIFICATION_TIERS[claim.tier] || null,
    }));

    return NextResponse.json({
      claims: enrichedClaims,
      tiers: CERTIFICATION_TIERS,
    });
  } catch (error) {
    console.error("Error fetching claims:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
