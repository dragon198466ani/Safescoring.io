import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/globe/users
 * Fetches users who have opted to display their setup on the 3D globe
 * Returns anonymous data with emojis and optional setup info
 */
export async function GET(request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Service unavailable" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "200"), 500);
    const includeProducts = searchParams.get("products") === "true";

    // Fetch users who have opted to show on globe
    const { data: globeUsers, error } = await supabase
      .from("user_globe_presence")
      .select(`
        id,
        country_code,
        display_emoji,
        anonymous_name,
        show_products,
        product_count,
        average_score,
        last_active_at,
        setup_id
      `)
      .order("last_active_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching globe users:", error);
      // Return empty array instead of error for graceful degradation
      return NextResponse.json({
        success: true,
        users: [],
        stats: { total: 0 },
      });
    }

    // Group users by country for efficient rendering
    const countryMap = new Map();
    
    // Generate consistent random positions within countries
    const seededRandom = (seed) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    globeUsers?.forEach((user, index) => {
      const country = user.country_code || "XX";
      
      if (!countryMap.has(country)) {
        countryMap.set(country, {
          country,
          users: [],
        });
      }

      // Generate position seed based on user id hash
      const seed = user.id * 7 + index * 13;
      
      countryMap.get(country).users.push({
        id: user.id,
        emoji: user.display_emoji || "🛡️",
        name: user.anonymous_name || generateAnonymousName(seed),
        showProducts: user.show_products,
        productCount: user.show_products ? user.product_count : null,
        averageScore: user.show_products ? user.average_score : null,
        isActive: isRecentlyActive(user.last_active_at),
        seed: seededRandom(seed),
        angle: seededRandom(seed * 2) * 2 * Math.PI,
      });
    });

    // Convert to array format
    const usersData = Array.from(countryMap.values()).map((loc) => ({
      country: loc.country,
      count: loc.users.length,
      userSeeds: loc.users.map((u) => ({
        seed: u.seed,
        angle: u.angle,
        emoji: u.emoji,
        pseudonym: u.name,
        showProducts: u.showProducts,
        productCount: u.productCount,
        averageScore: u.averageScore,
        isActive: u.isActive,
        // For real-time presence display
        currentAction: u.isActive ? getRandomActivity() : null,
      })),
    }));

    // Optionally fetch product details for users who show products
    let productDetails = {};
    if (includeProducts) {
      const setupIds = globeUsers
        ?.filter((u) => u.show_products && u.setup_id)
        .map((u) => u.setup_id) || [];

      if (setupIds.length > 0) {
        const { data: setupProducts } = await supabase
          .from("user_setup_products")
          .select(`
            setup_id,
            product:products (
              id,
              name,
              slug,
              media
            )
          `)
          .in("setup_id", setupIds)
          .limit(100);

        if (setupProducts) {
          setupProducts.forEach((sp) => {
            if (!productDetails[sp.setup_id]) {
              productDetails[sp.setup_id] = [];
            }
            if (sp.product) {
              productDetails[sp.setup_id].push({
                name: sp.product.name,
                slug: sp.product.slug,
                logo: extractLogo(sp.product.media),
              });
            }
          });
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        users: usersData,
        stats: {
          total: globeUsers?.length || 0,
          countries: countryMap.size,
          activeNow: globeUsers?.filter((u) => isRecentlyActive(u.last_active_at)).length || 0,
        },
        productDetails: includeProducts ? productDetails : undefined,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("Error in GET /api/globe/users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper: Check if user was active in last 15 minutes
function isRecentlyActive(lastActiveAt) {
  if (!lastActiveAt) return false;
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  return new Date(lastActiveAt) > fifteenMinutesAgo;
}

// Helper: Generate anonymous name from seed
function generateAnonymousName(seed) {
  const adjectives = [
    "Crypto", "Secure", "Smart", "Swift", "Bold",
    "Wise", "Brave", "Calm", "Keen", "Sharp",
    "Noble", "Quick", "Bright", "Cool", "Epic",
    "Lunar", "Solar", "Stellar", "Cosmic", "Quantum",
  ];
  
  const nouns = [
    "Holder", "Trader", "Builder", "Keeper", "Guardian",
    "Pioneer", "Explorer", "Voyager", "Ranger", "Seeker",
    "Wizard", "Knight", "Sage", "Master", "Champion",
    "Phoenix", "Dragon", "Wolf", "Eagle", "Lion",
  ];
  
  const adjIndex = Math.floor(Math.abs(Math.sin(seed) * 10000)) % adjectives.length;
  const nounIndex = Math.floor(Math.abs(Math.cos(seed) * 10000)) % nouns.length;
  
  return `${adjectives[adjIndex]}${nouns[nounIndex]}`;
}

// Helper: Get random activity for active users
function getRandomActivity() {
  const activities = [
    "Browsing products 🔍",
    "Checking scores 📊",
    "Building setup 🛠️",
    "Exploring map 🗺️",
    "Reading docs 📖",
    "Comparing wallets 💼",
    "Analyzing DeFi 📈",
    "Securing stack 🔒",
  ];
  return activities[Math.floor(Math.random() * activities.length)];
}

// Helper: Extract logo from media
function extractLogo(media) {
  if (!media) return null;
  if (typeof media === "string") return media;
  if (Array.isArray(media) && media.length > 0) {
    const img = media.find((m) => m.type === "image" || m.url);
    return img?.url || null;
  }
  return null;
}
