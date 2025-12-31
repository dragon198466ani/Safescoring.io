import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { quickProtect, getClientId } from "@/libs/api-protection";
import { auth } from "@/libs/auth";
import {
  protectAuthenticatedRequest,
  sleep,
  calculatePublicDelay,
} from "@/libs/user-protection";

export const dynamic = "force-dynamic";

// GET /api/products/[slug] - Get a single product with full details
export async function GET(request, { params }) {
  try {
    const { slug } = await params;

    // Check authentication first
    let session = null;
    let isAuthenticated = false;
    let isPaid = false;

    try {
      session = await auth();
      if (session?.user?.id) {
        isAuthenticated = true;
        isPaid = session.user.hasAccess || false;

        // Check user-level rate limiting
        const userProtection = await protectAuthenticatedRequest(
          session.user.id,
          `/api/products/${slug}`,
          { isPaid, productSlug: slug }
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
      }
    } catch (e) {
      // Auth failed, continue as unauthenticated
    }

    // IP-level protection for unauthenticated requests
    if (!isAuthenticated) {
      const protection = await quickProtect(request, "public");
      if (protection.blocked) {
        return protection.response;
      }

      // Apply artificial delay for unauthenticated users
      const publicDelay = calculatePublicDelay(protection.clientId, false);
      await sleep(publicDelay);
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    // Fetch product
    const { data: product, error: productError } = await supabase
      .from("products")
      .select(`
        id,
        name,
        slug,
        url,
        description,
        specs,
        type_id,
        created_at,
        updated_at,
        last_monthly_update,
        product_types (
          id,
          code,
          name,
          category
        )
      `)
      .eq("slug", slug)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Fetch evaluation counts
    const { data: evaluations, error: evalError } = await supabase
      .from("evaluations")
      .select("result")
      .eq("product_id", product.id);

    let evaluationStats = {
      totalNorms: 0,
      yes: 0,
      no: 0,
      na: 0,
      tbd: 0,
    };

    if (!evalError && evaluations) {
      evaluationStats.totalNorms = evaluations.length;
      evaluations.forEach((e) => {
        const result = e.result?.toUpperCase();
        if (result === "YES" || result === "YESP") {
          evaluationStats.yes++;
        } else if (result === "NO") {
          evaluationStats.no++;
        } else if (result === "N/A" || result === "NA") {
          evaluationStats.na++;
        } else if (result === "TBD") {
          evaluationStats.tbd++;
        }
      });
    }

    // Fetch safe_scoring_results for detailed pillar scores
    const { data: safeScoring } = await supabase
      .from("safe_scoring_results")
      .select("*")
      .eq("product_id", product.id)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .single();

    // Extract social links from specs if available
    const specs = product.specs || {};
    const socialLinks = {
      discord: specs.discord || specs.discord_url || specs.social_discord || null,
      twitter: specs.twitter || specs.twitter_url || specs.social_twitter || specs.x_url || null,
      telegram: specs.telegram || specs.telegram_url || specs.social_telegram || null,
    };

    // Transform data for frontend
    const transformedProduct = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      url: product.url || "",
      type: product.product_types?.name || "Unknown",
      category: product.product_types?.category || "other",
      brand: product.product_types?.name || "Unknown",
      website: product.url || "#",
      description: product.description || "",
      specs: specs,
      socialLinks: socialLinks,
      scores: {
        total: safeScoring?.note_finale || 0,
        s: safeScoring?.score_s || 0,
        a: safeScoring?.score_a || 0,
        f: safeScoring?.score_f || 0,
        e: safeScoring?.score_e || 0,
        // Consumer scores
        consumer: {
          total: safeScoring?.note_consumer || 0,
          s: safeScoring?.s_consumer || 0,
          a: safeScoring?.a_consumer || 0,
          f: safeScoring?.f_consumer || 0,
          e: safeScoring?.e_consumer || 0,
        },
        // Essential scores
        essential: {
          total: safeScoring?.note_essential || 0,
          s: safeScoring?.s_essential || 0,
          a: safeScoring?.a_essential || 0,
          f: safeScoring?.f_essential || 0,
          e: safeScoring?.e_essential || 0,
        },
      },
      evaluationDetails: evaluationStats,
      verified: true,
      lastUpdate: product.last_monthly_update || product.updated_at,
      createdAt: product.created_at,
    };

    // Generate watermark for tracking
    const clientId = getClientId(request);
    const watermark = {
      _ss: Buffer.from(JSON.stringify({
        t: Date.now(),
        c: clientId.substring(0, 12),
        p: slug,
      })).toString("base64"),
    };

    return NextResponse.json(
      { ...transformedProduct, ...watermark },
      {
        headers: {
          "Cache-Control": isAuthenticated
            ? "private, max-age=30"
            : "public, s-maxage=60, stale-while-revalidate=300",
          "X-Robots-Tag": "noindex, nofollow",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
