import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";
import {
  protectAuthenticatedRequest,
  sleep,
  calculatePublicDelay,
} from "@/libs/user-protection";
import config from "@/config";

// Get plan limits based on user's subscription
function getPlanLimits(userPlanType) {
  const plans = config.lemonsqueezy?.plans || [];

  // Map plan types to config plan names
  const planMap = {
    free: "Free",
    explorer: "Explorer",
    pro: "Professional",
    enterprise: "Enterprise",
  };

  const planName = planMap[userPlanType] || "Free";
  const plan = plans.find(p => p.name === planName) || plans[0];

  return {
    maxSetups: plan?.limits?.maxSetups || 1,
    maxProductsPerSetup: plan?.limits?.maxProductsPerSetup || 3,
  };
}

// GET - Get all user setups with combined scores
export async function GET(request) {
  try {
    const session = await auth();

    // Allow anonymous access - return empty state for non-authenticated users
    if (!session?.user?.id) {
      // IP-level protection for unauthenticated requests
      const protection = await quickProtect(request, "public");
      if (protection.blocked) {
        return protection.response;
      }

      // Apply artificial delay for unauthenticated users
      const publicDelay = calculatePublicDelay(protection.clientId, false);
      await sleep(publicDelay);

      return NextResponse.json({
        setups: [],
        limits: {
          max: 1,
          used: 0,
          canCreate: false, // Must sign in to create
          isPaid: false,
          isAnonymous: true,
        },
      });
    }

    // Check user-level rate limiting for authenticated users
    const isPaid = session.user.hasAccess || false;
    const userPlanType = session.user.planType || "free";
    const userProtection = await protectAuthenticatedRequest(
      session.user.id,
      "/api/setups",
      { isPaid }
    );

    if (!userProtection.allowed) {
      return NextResponse.json(
        {
          error: userProtection.message,
          reason: userProtection.reason,
          retryAfter: userProtection.retryAfter,
        },
        {
          status: userProtection.status,
          headers: { "Retry-After": String(userProtection.retryAfter || 60) },
        }
      );
    }

    // Apply artificial delay for authenticated users
    if (userProtection.delay > 0) {
      await sleep(userProtection.delay);
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Get plan limits
    const planLimits = getPlanLimits(userPlanType);

    // Get user's setups
    const { data: setups, error } = await supabaseAdmin
      .from("user_setups")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching setups:", error);
      return NextResponse.json({ error: "Failed to fetch setups" }, { status: 500 });
    }

    // Use plan-based limits (-1 means unlimited)
    const maxSetups = planLimits.maxSetups === -1 ? 999 : planLimits.maxSetups;

    // Enrich setups with product details
    const enrichedSetups = await Promise.all(
      (setups || []).map(async (setup) => {
        const productIds = setup.products?.map(p => p.product_id) || [];

        if (productIds.length === 0) {
          return { ...setup, productDetails: [], combinedScore: null };
        }

        // Fetch product details and scores
        const { data: products } = await supabaseAdmin
          .from("products")
          .select(`
            id,
            name,
            slug,
            short_description,
            product_types:type_id (code, name)
          `)
          .in("id", productIds);

        const { data: scores } = await supabaseAdmin
          .from("safe_scoring_results")
          .select("product_id, note_finale, score_s, score_a, score_f, score_e")
          .in("product_id", productIds);

        // Map products with their scores
        const productDetails = (products || []).map(product => {
          const score = scores?.find(s => s.product_id === product.id);
          const setupProduct = setup.products?.find(p => p.product_id === product.id);
          return {
            ...product,
            role: setupProduct?.role || "other",
            scores: score || null,
          };
        });

        // Calculate combined score (weighted average based on role)
        const combinedScore = calculateCombinedScore(productDetails);

        return {
          ...setup,
          productDetails,
          combinedScore,
        };
      })
    );

    return NextResponse.json({
      setups: enrichedSetups,
      limits: {
        max: maxSetups,
        maxProductsPerSetup: planLimits.maxProductsPerSetup === -1 ? 999 : planLimits.maxProductsPerSetup,
        used: setups?.length || 0,
        canCreate: (setups?.length || 0) < maxSetups,
        isPaid,
        planType: userPlanType,
      },
    });
  } catch (error) {
    console.error("Setups GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create a new setup
export async function POST(request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user-level rate limiting for authenticated users
    const isPaid = session.user.hasAccess || false;
    const userPlanType = session.user.planType || "free";
    const userProtection = await protectAuthenticatedRequest(
      session.user.id,
      "/api/setups",
      { isPaid }
    );

    if (!userProtection.allowed) {
      return NextResponse.json(
        {
          error: userProtection.message,
          reason: userProtection.reason,
          retryAfter: userProtection.retryAfter,
        },
        {
          status: userProtection.status,
          headers: { "Retry-After": String(userProtection.retryAfter || 60) },
        }
      );
    }

    // Apply artificial delay for authenticated users
    if (userProtection.delay > 0) {
      await sleep(userProtection.delay);
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Get plan limits
    const planLimits = getPlanLimits(userPlanType);
    const maxSetups = planLimits.maxSetups === -1 ? 999 : planLimits.maxSetups;
    const maxProductsPerSetup = planLimits.maxProductsPerSetup === -1 ? 999 : planLimits.maxProductsPerSetup;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { name, description, products } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Check product count limit
    if (products && products.length > maxProductsPerSetup) {
      return NextResponse.json(
        {
          error: `Product limit exceeded. Your plan allows ${maxProductsPerSetup} products per setup. Upgrade for more.`,
          limit: maxProductsPerSetup,
          planType: userPlanType,
        },
        { status: 403 }
      );
    }

    // Count existing setups
    const { count } = await supabaseAdmin
      .from("user_setups")
      .select("*", { count: "exact", head: true })
      .eq("user_id", session.user.id);

    if (count >= maxSetups) {
      return NextResponse.json(
        {
          error: `Setup limit reached. Your plan allows ${maxSetups} setups. Upgrade to create more.`,
          limit: maxSetups,
          planType: userPlanType,
        },
        { status: 403 }
      );
    }

    // Create the setup
    const { data: setup, error } = await supabaseAdmin
      .from("user_setups")
      .insert({
        user_id: session.user.id,
        name: name.trim(),
        description: description?.trim() || null,
        products: products || [],
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating setup:", error);
      return NextResponse.json({ error: "Failed to create setup" }, { status: 500 });
    }

    return NextResponse.json({ setup }, { status: 201 });
  } catch (error) {
    console.error("Setups POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Helper function to calculate combined SAFE score
function calculateCombinedScore(productDetails) {
  if (!productDetails || productDetails.length === 0) return null;

  const productsWithScores = productDetails.filter(p => p.scores?.note_finale);
  if (productsWithScores.length === 0) return null;

  // Weight by role: wallet = 2x, other = 1x
  let totalWeight = 0;
  let weightedSum = { S: 0, A: 0, F: 0, E: 0, total: 0 };

  productsWithScores.forEach(product => {
    const weight = product.role === "wallet" ? 2 : 1;
    totalWeight += weight;

    weightedSum.S += (product.scores.score_s || 0) * weight;
    weightedSum.A += (product.scores.score_a || 0) * weight;
    weightedSum.F += (product.scores.score_f || 0) * weight;
    weightedSum.E += (product.scores.score_e || 0) * weight;
    weightedSum.total += (product.scores.note_finale || 0) * weight;
  });

  if (totalWeight === 0) return null;

  return {
    score_s: Math.round(weightedSum.S / totalWeight),
    score_a: Math.round(weightedSum.A / totalWeight),
    score_f: Math.round(weightedSum.F / totalWeight),
    score_e: Math.round(weightedSum.E / totalWeight),
    note_finale: Math.round(weightedSum.total / totalWeight),
    products_count: productsWithScores.length,
    weakest_pillar: findWeakestPillar(weightedSum, totalWeight),
  };
}

function findWeakestPillar(weightedSum, totalWeight) {
  const pillars = [
    { code: "S", name: "Security", score: weightedSum.S / totalWeight },
    { code: "A", name: "Adversity", score: weightedSum.A / totalWeight },
    { code: "F", name: "Fidelity", score: weightedSum.F / totalWeight },
    { code: "E", name: "Efficiency", score: weightedSum.E / totalWeight },
  ];

  return pillars.reduce((min, p) => p.score < min.score ? p : min, pillars[0]);
}
