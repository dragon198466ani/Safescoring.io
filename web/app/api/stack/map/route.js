import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { checkRateLimit } from "@/libs/rate-limit";

export const dynamic = "force-dynamic";

// Security: Validate setupId (positive integer only)
function isValidSetupId(id) {
  const num = parseInt(id, 10);
  return !isNaN(num) && num > 0 && num <= 2147483647 && String(num) === id;
}

// Security: Get client identifier for rate limiting
function getClientId(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return `stack-map:${ip}`;
}

// GET /api/stack/map?setupId=123 - Get geographic data for a user's stack
export async function GET(request) {
  try {
    // Security: Rate limiting
    const clientId = getClientId(request);
    const rateLimitResult = checkRateLimit(clientId, "authenticated");
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests", resetIn: rateLimitResult.resetIn },
        { status: 429 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    // Security: Require authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const setupId = searchParams.get("setupId");

    // Security: Validate setupId format
    if (!setupId || !isValidSetupId(setupId)) {
      return NextResponse.json(
        { error: "Invalid setupId parameter" },
        { status: 400 }
      );
    }

    // Security: Fetch setup AND verify ownership in single query
    const { data: setup, error: setupError } = await supabase
      .from("user_setups")
      .select("id, name, description, products, combined_score, user_id, is_public")
      .eq("id", parseInt(setupId, 10))
      .single();

    // Security: Verify the setup belongs to the user OR is public
    if (setupError || !setup) {
      return NextResponse.json(
        { error: "Setup not found" },
        { status: 404 }
      );
    }

    if (setup.user_id !== session.user.id && !setup.is_public) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Extract and validate product IDs from the setup
    const productIds = (setup.products || [])
      .map(p => p.product_id)
      .filter(id => typeof id === "number" && Number.isInteger(id) && id > 0);

    if (productIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          setup: {
            id: setup.id,
            name: setup.name,
            description: setup.description,
            combined_score: setup.combined_score,
          },
          products: [],
          stats: {
            totalProducts: 0,
            countries: 0,
            averageScore: null,
          },
        },
      });
    }

    // Fetch products with their locations and scores
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select(`
        id,
        slug,
        name,
        logo_url,
        country_origin,
        headquarters,
        year_founded,
        safe_scoring_results (
          note_finale,
          score_s,
          score_a,
          score_f,
          score_e
        )
      `)
      .in("id", productIds);

    if (productsError) {
      console.error("Error fetching products:", productsError);
      return NextResponse.json(
        { error: "Failed to fetch products" },
        { status: 500 }
      );
    }

    // Group products by country
    const locationMap = new Map();
    const enrichedProducts = [];

    (products || []).forEach((product) => {
      const country = product.country_origin;
      const score = product.safe_scoring_results?.[0] || null;

      // Find role from setup.products
      const productConfig = setup.products.find(p => p.product_id === product.id);
      const role = productConfig?.role || 'other';

      const enrichedProduct = {
        id: product.id,
        slug: product.slug,
        name: product.name,
        logo_url: product.logo_url,
        role: role,
        country: country,
        city: product.headquarters,
        yearFounded: product.year_founded,
        score: score,
      };

      enrichedProducts.push(enrichedProduct);

      // Group by country for map markers
      if (country) {
        if (!locationMap.has(country)) {
          locationMap.set(country, {
            country,
            city: product.headquarters,
            products: [],
            averageScore: 0,
            hasWallet: false,
          });
        }

        const location = locationMap.get(country);
        location.products.push(enrichedProduct);

        if (role === 'wallet') {
          location.hasWallet = true;
        }
      }
    });

    // Calculate average scores per location
    const locations = Array.from(locationMap.values()).map((loc) => {
      const scores = loc.products
        .map(p => p.score?.note_finale)
        .filter(s => s !== null && s !== undefined);

      const averageScore = scores.length > 0
        ? scores.reduce((sum, s) => sum + s, 0) / scores.length
        : null;

      return {
        type: "stack",
        location: {
          country: loc.country,
          city: loc.city,
        },
        products: loc.products,
        count: loc.products.length,
        averageScore: averageScore,
        hasWallet: loc.hasWallet,
      };
    });

    // Calculate overall stats
    const allScores = enrichedProducts
      .map(p => p.score?.note_finale)
      .filter(s => s !== null && s !== undefined);

    const stats = {
      totalProducts: enrichedProducts.length,
      countries: locationMap.size,
      averageScore: allScores.length > 0
        ? allScores.reduce((sum, s) => sum + s, 0) / allScores.length
        : null,
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          setup: {
            id: setup.id,
            name: setup.name,
            description: setup.description,
            combined_score: setup.combined_score,
          },
          locations,
          products: enrichedProducts,
          stats,
        },
      },
      {
        headers: {
          "Cache-Control": "private, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching stack map data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
