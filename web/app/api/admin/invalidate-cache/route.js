import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { revalidatePath } from "next/cache";
import { invalidateProductCache, invalidateAllScoresCaches } from "@/libs/supabase-optimized";
import { clearCache } from "@/libs/api-cache";

/**
 * POST /api/admin/invalidate-cache
 *
 * Invalidates various caches to force fresh data.
 * Admin-only endpoint.
 *
 * Body:
 *   - type: "product" | "all" | "listings"
 *   - slug: string (required if type === "product")
 */
export async function POST(request) {
  try {
    // Admin auth check
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, slug } = body;

    if (!type) {
      return NextResponse.json(
        { error: "Missing 'type' parameter. Use: product, all, or listings" },
        { status: 400 }
      );
    }

    const results = {
      type,
      invalidated: [],
      timestamp: new Date().toISOString(),
    };

    if (type === "product") {
      if (!slug) {
        return NextResponse.json(
          { error: "Missing 'slug' parameter for product invalidation" },
          { status: 400 }
        );
      }

      // Invalidate product-specific caches
      invalidateProductCache(slug);

      // Revalidate Next.js ISR pages
      revalidatePath(`/products/${slug}`);
      revalidatePath("/products");
      revalidatePath("/leaderboard");

      // Clear client-side caches (this affects server memory only)
      clearCache();

      results.invalidated = [
        `product_${slug}`,
        `ISR:/products/${slug}`,
        "ISR:/products",
        "ISR:/leaderboard",
        "client_cache",
      ];
      results.message = `Cache invalidated for product: ${slug}`;
    } else if (type === "listings") {
      // Invalidate listing-related caches only
      invalidateAllScoresCaches();

      revalidatePath("/products");
      revalidatePath("/leaderboard");
      revalidatePath("/");

      clearCache();

      results.invalidated = [
        "products_listing",
        "rankings",
        "stats",
        "ISR:/products",
        "ISR:/leaderboard",
        "ISR:/",
        "client_cache",
      ];
      results.message = "Listing caches invalidated";
    } else if (type === "all") {
      // Nuclear option - invalidate everything
      invalidateAllScoresCaches();

      // Revalidate all major pages
      revalidatePath("/products");
      revalidatePath("/leaderboard");
      revalidatePath("/");
      revalidatePath("/compare");
      revalidatePath("/methodology");

      // Clear all client-side caches
      clearCache();

      results.invalidated = [
        "all_server_caches",
        "ISR:all_major_pages",
        "client_cache",
      ];
      results.message = "All caches invalidated";
    } else {
      return NextResponse.json(
        { error: `Invalid type '${type}'. Use: product, all, or listings` },
        { status: 400 }
      );
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("[invalidate-cache] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
