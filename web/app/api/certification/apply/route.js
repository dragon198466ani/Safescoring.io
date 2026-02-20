/**
 * Certification Application API
 *
 * POST /api/certification/apply - Submit certification application
 * GET /api/certification/apply - Get user's applications
 *
 * Tiers:
 * - starter: $990/month, quarterly re-evaluation
 * - verified: $2990/month, monthly re-evaluation, verified badge
 * - enterprise: $9990/month, weekly monitoring, API access
 */

import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";
import { createCheckout } from "@/libs/lemonsqueezy";

// Pricing configuration
const CERTIFICATION_TIERS = {
  starter: {
    name: "Starter",
    priceMonthly: 990,
    priceYearly: 9500,
    features: [
      "SAFE evaluation on all norms",
      "Public score display",
      "Quarterly re-evaluation",
      "Basic security roadmap",
    ],
    reevaluationDays: 90,
    variantIdMonthly: process.env.LEMON_CERT_STARTER_MONTHLY,
    variantIdYearly: process.env.LEMON_CERT_STARTER_YEARLY,
  },
  verified: {
    name: "Verified",
    priceMonthly: 2990,
    priceYearly: 28700,
    features: [
      "Everything in Starter",
      "Verified Badge (animated)",
      "Monthly re-evaluation",
      "Priority directory listing",
      "Dedicated account manager",
    ],
    reevaluationDays: 30,
    variantIdMonthly: process.env.LEMON_CERT_VERIFIED_MONTHLY,
    variantIdYearly: process.env.LEMON_CERT_VERIFIED_YEARLY,
  },
  enterprise: {
    name: "Enterprise",
    priceMonthly: 9990,
    priceYearly: 95900,
    features: [
      "Everything in Verified",
      "Enterprise Badge (premium)",
      "Weekly monitoring",
      "Custom scoring criteria",
      "White-label reports",
      "API access",
      "Board-ready reports",
    ],
    reevaluationDays: 7,
    variantIdMonthly: process.env.LEMON_CERT_ENTERPRISE_MONTHLY,
    variantIdYearly: process.env.LEMON_CERT_ENTERPRISE_YEARLY,
  },
};

/**
 * POST - Submit certification application
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
    if (!session?.user) {
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

    // Validate required fields
    const requiredFields = ["productId", "tier", "companyName", "contactName", "contactEmail"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate tier
    if (!CERTIFICATION_TIERS[body.tier]) {
      return NextResponse.json(
        { error: "Invalid tier. Must be: starter, verified, or enterprise" },
        { status: 400 }
      );
    }

    // Check if product exists
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, slug")
      .eq("id", body.productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Check for existing active application
    const { data: existing } = await supabase
      .from("certification_applications")
      .select("id, status")
      .eq("product_id", body.productId)
      .in("status", ["pending", "payment_pending", "evaluating", "review", "approved"])
      .single();

    if (existing) {
      return NextResponse.json(
        {
          error: "Active application already exists for this product",
          existingId: existing.id,
          existingStatus: existing.status,
        },
        { status: 409 }
      );
    }

    // Create application
    const applicationData = {
      user_id: session.user.id,
      product_id: body.productId,
      tier: body.tier,
      company_name: body.companyName,
      company_website: body.companyWebsite || null,
      company_size: body.companySize || null,
      contact_name: body.contactName,
      contact_email: body.contactEmail,
      contact_phone: body.contactPhone || null,
      billing_address: body.billingAddress || null,
      vat_number: body.vatNumber || null,
      reason: body.reason || null,
      expected_use: body.expectedUse || null,
      marketing_consent: body.marketingConsent || false,
      billing_cycle: body.billingCycle || "monthly",
      status: "payment_pending",
    };

    const { data: application, error: createError } = await supabase
      .from("certification_applications")
      .insert(applicationData)
      .select()
      .single();

    if (createError) {
      console.error("Error creating application:", createError);
      return NextResponse.json(
        { error: "Failed to create application" },
        { status: 500 }
      );
    }

    // Create checkout URL
    const tierConfig = CERTIFICATION_TIERS[body.tier];
    const variantId = body.billingCycle === "yearly"
      ? tierConfig.variantIdYearly
      : tierConfig.variantIdMonthly;

    let checkoutUrl = null;
    if (variantId) {
      try {
        const checkout = await createCheckout({
          variantId,
          customData: {
            certification_id: application.id,
            product_id: body.productId,
            product_slug: product.slug,
            tier: body.tier,
            user_id: session.user.id,
          },
          email: body.contactEmail,
          name: body.contactName,
        });
        checkoutUrl = checkout?.data?.attributes?.url;
      } catch (err) {
        console.error("Error creating checkout:", err);
      }
    }

    return NextResponse.json({
      success: true,
      application: {
        id: application.id,
        status: application.status,
        tier: application.tier,
        productName: product.name,
      },
      checkoutUrl,
      pricing: {
        tier: tierConfig.name,
        price: body.billingCycle === "yearly"
          ? tierConfig.priceYearly
          : tierConfig.priceMonthly,
        billingCycle: body.billingCycle || "monthly",
      },
    });

  } catch (error) {
    console.error("Certification application error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET - Get user's certification applications
 */
export async function GET(request) {
  const protection = await quickProtect(request, "auth");
  if (protection.blocked) {
    return protection.response;
  }

  try {
    const session = await auth();
    if (!session?.user) {
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
    const productId = searchParams.get("productId");

    let query = supabase
      .from("certification_applications")
      .select(`
        id,
        product_id,
        tier,
        status,
        company_name,
        certificate_number,
        certificate_issued_at,
        certificate_expires_at,
        final_score,
        pillar_scores,
        created_at,
        updated_at,
        products (
          id,
          name,
          slug
        )
      `)
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (productId) {
      query = query.eq("product_id", productId);
    }

    const { data: applications, error } = await query;

    if (error) {
      console.error("Error fetching applications:", error);
      return NextResponse.json(
        { error: "Failed to fetch applications" },
        { status: 500 }
      );
    }

    // Get badges for approved applications
    const approvedIds = applications
      .filter(a => a.status === "approved")
      .map(a => a.id);

    let badges = [];
    if (approvedIds.length > 0) {
      const { data: badgeData } = await supabase
        .from("certification_badges")
        .select("*")
        .in("certification_id", approvedIds)
        .eq("is_active", true);

      badges = badgeData || [];
    }

    // Merge badges with applications
    const result = applications.map(app => ({
      ...app,
      badge: badges.find(b => b.certification_id === app.id) || null,
      tierDetails: CERTIFICATION_TIERS[app.tier],
    }));

    return NextResponse.json({
      applications: result,
      tiers: CERTIFICATION_TIERS,
    });

  } catch (error) {
    console.error("Error fetching applications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
