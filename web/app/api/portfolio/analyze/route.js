import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { auth } from "@/libs/auth";
import { validateWalletAddress } from "@/libs/security";

/**
 * Portfolio Risk Score API
 *
 * POST /api/portfolio/analyze
 *
 * Analyzes a wallet address or user's setup to calculate
 * a weighted security risk score based on:
 * - Products/platforms used (from setup or detected)
 * - SAFE scores of those products
 * - Diversification across security levels
 *
 * Body:
 * - walletAddress: Optional ETH address to analyze
 * - setupId: Optional setup ID to analyze
 * - manual: Array of { productSlug, allocation } for manual input
 */

/**
 * Calculate weighted portfolio risk score
 */
function calculatePortfolioRisk(products) {
  if (!products || products.length === 0) {
    return { score: null, breakdown: [] };
  }

  // Calculate total allocation
  const totalAllocation = products.reduce((sum, p) => sum + (p.allocation || 1), 0);

  // Calculate weighted score
  let weightedScore = 0;
  const breakdown = [];

  for (const product of products) {
    const weight = (product.allocation || 1) / totalAllocation;
    const contribution = (product.safeScore || 0) * weight;
    weightedScore += contribution;

    breakdown.push({
      name: product.name,
      slug: product.slug,
      type: product.type,
      safeScore: product.safeScore,
      allocation: product.allocation || 1,
      weight: Math.round(weight * 100),
      contribution: Math.round(contribution),
    });
  }

  // Sort by weight descending
  breakdown.sort((a, b) => b.weight - a.weight);

  // Calculate risk level
  let riskLevel;
  if (weightedScore >= 80) {
    riskLevel = "low";
  } else if (weightedScore >= 60) {
    riskLevel = "medium";
  } else if (weightedScore >= 40) {
    riskLevel = "high";
  } else {
    riskLevel = "critical";
  }

  // Find weakest link
  const weakestProduct = [...products].sort((a, b) => (a.safeScore || 0) - (b.safeScore || 0))[0];

  // Calculate diversification score (0-100)
  const uniqueTypes = new Set(products.map(p => p.type));
  const diversificationScore = Math.min(100, uniqueTypes.size * 25);

  return {
    score: Math.round(weightedScore),
    riskLevel,
    breakdown,
    weakestLink: weakestProduct ? {
      name: weakestProduct.name,
      slug: weakestProduct.slug,
      score: weakestProduct.safeScore,
    } : null,
    diversification: {
      score: diversificationScore,
      uniqueTypes: uniqueTypes.size,
      types: [...uniqueTypes],
    },
    recommendations: generateRecommendations(products, weightedScore, weakestProduct),
  };
}

/**
 * Generate security recommendations
 */
function generateRecommendations(products, score, weakestProduct) {
  const recommendations = [];

  // Check for weak products
  const weakProducts = products.filter(p => (p.safeScore || 0) < 60);
  if (weakProducts.length > 0) {
    recommendations.push({
      priority: "high",
      type: "weak_product",
      message: `${weakProducts.length} product(s) have low security scores. Consider alternatives.`,
      products: weakProducts.map(p => p.name),
    });
  }

  // Check diversification
  const types = new Set(products.map(p => p.type));
  if (types.size === 1 && products.length > 1) {
    recommendations.push({
      priority: "medium",
      type: "diversification",
      message: "All your products are the same type. Consider diversifying across different product categories.",
    });
  }

  // Check for custody concentration
  const custodialProducts = products.filter(p =>
    p.type?.toLowerCase().includes("exchange") ||
    p.type?.toLowerCase().includes("custodial")
  );
  if (custodialProducts.length > 0) {
    const custodialWeight = custodialProducts.reduce((sum, p) => sum + (p.allocation || 1), 0);
    const totalWeight = products.reduce((sum, p) => sum + (p.allocation || 1), 0);
    if (custodialWeight / totalWeight > 0.5) {
      recommendations.push({
        priority: "medium",
        type: "custody",
        message: "Over 50% of your portfolio is on custodial platforms. Consider self-custody for better security.",
      });
    }
  }

  // Check overall score
  if (score < 60) {
    recommendations.push({
      priority: "high",
      type: "overall",
      message: "Your portfolio security score is below recommended levels. Review and upgrade your security setup.",
    });
  }

  return recommendations;
}

export async function POST(request) {
  const session = await auth();

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { walletAddress, setupId, manual } = body;

    let products = [];

    // Option 1: Analyze from setup
    if (setupId) {
      if (!session?.user) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }

      // Fetch setup with products
      const { data: setup, error: setupError } = await supabase
        .from("user_setups")
        .select(`
          id,
          name,
          setup_products (
            product_id,
            role,
            products (
              id,
              name,
              slug,
              product_types:type_id (name)
            )
          )
        `)
        .eq("id", setupId)
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (setupError || !setup) {
        return NextResponse.json({ error: "Setup not found" }, { status: 404 });
      }

      // Get SAFE scores for setup products
      const productIds = setup.setup_products.map(sp => sp.product_id);
      const { data: scores } = await supabase
        .from("safe_scoring_results")
        .select("product_id, note_finale")
        .in("product_id", productIds)
        .order("calculated_at", { ascending: false });

      // Create score map
      const scoreMap = {};
      for (const score of scores || []) {
        if (!scoreMap[score.product_id]) {
          scoreMap[score.product_id] = Math.round(score.note_finale || 0);
        }
      }

      // Build products array
      products = setup.setup_products.map(sp => ({
        name: sp.products?.name,
        slug: sp.products?.slug,
        type: sp.products?.product_types?.name,
        safeScore: scoreMap[sp.product_id] || null,
        allocation: sp.role === "wallet" ? 2 : 1, // Wallets weighted higher
        role: sp.role,
      }));
    }

    // Option 2: Manual product list
    else if (manual && Array.isArray(manual)) {
      const slugs = manual.map(m => m.productSlug).filter(Boolean);

      if (slugs.length === 0) {
        return NextResponse.json({ error: "No products provided" }, { status: 400 });
      }

      // Fetch products with scores
      const { data: productData } = await supabase
        .from("products")
        .select(`
          id,
          name,
          slug,
          product_types:type_id (name)
        `)
        .in("slug", slugs);

      if (!productData || productData.length === 0) {
        return NextResponse.json({ error: "No valid products found" }, { status: 404 });
      }

      // Get SAFE scores
      const productIds = productData.map(p => p.id);
      const { data: scores } = await supabase
        .from("safe_scoring_results")
        .select("product_id, note_finale")
        .in("product_id", productIds)
        .order("calculated_at", { ascending: false });

      const scoreMap = {};
      for (const score of scores || []) {
        if (!scoreMap[score.product_id]) {
          scoreMap[score.product_id] = Math.round(score.note_finale || 0);
        }
      }

      // Build products array with allocations
      const manualMap = {};
      for (const m of manual) {
        manualMap[m.productSlug] = m.allocation || 1;
      }

      products = productData.map(p => ({
        name: p.name,
        slug: p.slug,
        type: p.product_types?.name,
        safeScore: scoreMap[p.id] || null,
        allocation: manualMap[p.slug] || 1,
      }));
    }

    // Option 3: Wallet analysis (placeholder - would need on-chain data)
    else if (walletAddress) {
      const validation = validateWalletAddress(walletAddress);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      // For now, return a placeholder response
      // In production, this would use on-chain data APIs
      return NextResponse.json({
        message: "Wallet analysis coming soon",
        walletAddress: validation.sanitized,
        portfolioRisk: null,
        supported: false,
      });
    }

    else {
      return NextResponse.json({
        error: "Provide setupId, manual products, or walletAddress",
      }, { status: 400 });
    }

    // Calculate risk score
    const portfolioRisk = calculatePortfolioRisk(products);

    return NextResponse.json({
      portfolioRisk,
      products: products.length,
      analyzedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Portfolio analysis error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
