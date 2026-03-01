import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";

// Simple delay helper for rate-limiting public access
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Calculate artificial delay for public (unauthenticated) access to discourage scraping
function calculatePublicDelay(clientId, isAuthenticated) {
  if (isAuthenticated) return 0;
  // Base delay of 200ms for public access
  return 200;
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

  const pillars = [
    { code: "S", name: "Security", score: Math.round(weightedSum.S / totalWeight) },
    { code: "A", name: "Anonymity", score: Math.round(weightedSum.A / totalWeight) },
    { code: "F", name: "Fidelity", score: Math.round(weightedSum.F / totalWeight) },
    { code: "E", name: "Efficiency", score: Math.round(weightedSum.E / totalWeight) },
  ];
  const weakestPillar = pillars.reduce((min, p) => p.score < min.score ? p : min);

  return {
    score_s: Math.round(weightedSum.S / totalWeight),
    score_a: Math.round(weightedSum.A / totalWeight),
    score_f: Math.round(weightedSum.F / totalWeight),
    score_e: Math.round(weightedSum.E / totalWeight),
    note_finale: Math.round(weightedSum.total / totalWeight),
    products_count: productsWithScores.length,
    weakest_pillar: weakestPillar,
  };
}

// GET - Get a shared stack by token (public access)
export async function GET(request, { params }) {
  try {
    // IP-level protection for public endpoint
    const protection = await quickProtect(request, "public");
    if (protection.blocked) {
      return protection.response;
    }

    // Apply artificial delay for public access
    const publicDelay = calculatePublicDelay(protection.clientId, false);
    await sleep(publicDelay);

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { token } = await params;

    // Fetch the setup by share token
    const { data: setup, error: setupError } = await supabaseAdmin
      .from("user_setups")
      .select("id, name, description, products, created_at, share_token_expires_at")
      .eq("share_token", token)
      .maybeSingle();

    if (setupError || !setup) {
      return NextResponse.json({ error: "Shared stack not found" }, { status: 404 });
    }

    // SECURITY: Check if token has expired
    if (setup.share_token_expires_at) {
      const expiresAt = new Date(setup.share_token_expires_at);
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { error: "Share link has expired" },
          { status: 410 } // 410 Gone
        );
      }
    }

    const productIds = setup.products?.map(p => p.product_id) || [];

    if (productIds.length === 0) {
      return NextResponse.json({
        setup: {
          ...setup,
          productDetails: [],
          combinedScore: null,
        },
      });
    }

    // Fetch product details and scores
    const { data: products } = await supabaseAdmin
      .from("products")
      .select(`
        id,
        name,
        slug,
        url,
        short_description,
        product_types:type_id (code, name, category)
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

      // Helper to get logo URL
      const getLogoUrl = (url) => {
        if (!url) return null;
        try {
          const domain = new URL(url).hostname.replace('www.', '');
          return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        } catch {
          return null;
        }
      };

      return {
        ...product,
        logo_url: getLogoUrl(product.url),
        role: setupProduct?.role || "other",
        scores: score || null,
      };
    });

    // Calculate combined score
    const combinedScore = calculateCombinedScore(productDetails);

    return NextResponse.json({
      setup: {
        name: setup.name,
        description: setup.description,
        created_at: setup.created_at,
        productDetails,
        combinedScore,
      },
    });
  } catch (error) {
    console.error("Get shared stack error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
