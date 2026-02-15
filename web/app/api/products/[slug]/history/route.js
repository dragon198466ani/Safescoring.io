import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { quickProtect, getClientId } from "@/libs/api-protection";
import { auth } from "@/libs/auth";
import {
  protectAuthenticatedRequest,
  getDataLimitForUser,
  sleep,
  calculatePublicDelay,
} from "@/libs/user-protection";

export const dynamic = "force-dynamic";

// GET /api/products/[slug]/history - Get score history for a product
export async function GET(request, { params }) {
  try {
    const { slug } = await params;

    // Check authentication first
    let session = null;
    let userLimits = { history: 0 }; // Default: NO history for unauthenticated
    let isAuthenticated = false;
    let isPaid = false;

    try {
      session = await auth();
      if (session?.user?.id) {
        isAuthenticated = true;
        isPaid = session.user.hasAccess || false;

        // Check user-level rate limiting and scraping detection
        const userProtection = await protectAuthenticatedRequest(
          session.user.id,
          `/api/products/${slug}/history`,
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
              headers: {
                "Retry-After": String(userProtection.retryAfter || 60),
              },
            }
          );
        }

        // Get limits based on user trust score
        userLimits = getDataLimitForUser(session.user);

        // Apply artificial delay for authenticated users (based on trust score)
        if (userProtection.delay > 0) {
          await sleep(userProtection.delay);
        }
      }
    } catch (_e) {
      // Auth failed, continue as unauthenticated
    }

    // DEV MODE: Skip auth for local development
    if (!isAuthenticated && process.env.NODE_ENV === "development") {
      isAuthenticated = true;
      userLimits = { history: 50 };
    }

    // PROTECTION HARDCORE: History requires authentication
    if (!isAuthenticated) {
      // IP-level rate limiting even for teaser
      const protection = await quickProtect(request, "sensitive");
      if (protection.blocked) {
        return protection.response;
      }

      // Apply artificial delay for unauthenticated users (slows scrapers)
      const publicDelay = calculatePublicDelay(protection.clientId, false);
      await sleep(publicDelay);

      // Return teaser data only - no actual history
      return NextResponse.json(
        {
          product: { slug },
          history: [], // No history for unauthenticated users
          stats: {
            dataPoints: 0,
            trend: "unknown",
          },
          _authRequired: true,
          _note: "Score history requires a free account. Sign up to track how products improve over time.",
          _features: [
            "Track score evolution over time",
            "See improvement trends",
            "Compare historical performance",
          ],
        },
        {
          status: 200,
          headers: {
            "X-Robots-Tag": "noindex, nofollow",
          },
        }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const requestedLimit = parseInt(searchParams.get("limit")) || 12;

    // PROTECTION: Apply limits based on trust score
    const maxLimit = userLimits.history;
    const limit = Math.min(requestedLimit, maxLimit);

    // First get the product ID from slug
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name")
      .eq("slug", slug)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Fetch score history (limited by trust score)
    const { data: history, error: historyError } = await supabase
      .from("score_history")
      .select(`
        id,
        recorded_at,
        safe_score,
        score_s,
        score_a,
        score_f,
        score_e,
        consumer_score,
        essential_score,
        total_evaluations,
        total_yes,
        total_no,
        score_change,
        change_reason,
        triggered_by
      `)
      .eq("product_id", product.id)
      .order("recorded_at", { ascending: false })
      .limit(limit);

    if (historyError) {
      console.error("Error fetching history:", historyError);
      return NextResponse.json(
        { error: "Failed to fetch history" },
        { status: 500 }
      );
    }

    // Calculate statistics
    const stats = {
      dataPoints: history?.length || 0,
      firstRecord: history?.[history.length - 1]?.recorded_at || null,
      lastRecord: history?.[0]?.recorded_at || null,
      highestScore: history?.length
        ? Math.max(...history.map((h) => h.safe_score || 0))
        : null,
      lowestScore: history?.length
        ? Math.min(...history.filter((h) => h.safe_score).map((h) => h.safe_score))
        : null,
      averageScore: history?.length
        ? (
            history.reduce((sum, h) => sum + (h.safe_score || 0), 0) /
            history.filter((h) => h.safe_score).length
          ).toFixed(1)
        : null,
    };

    // Calculate trend (comparing first and last scores)
    let trend = "stable";
    if (history?.length >= 2) {
      const currentScore = history[0]?.safe_score;
      const oldestScore = history[history.length - 1]?.safe_score;
      if (currentScore && oldestScore) {
        const change = currentScore - oldestScore;
        if (change > 2) trend = "improving";
        else if (change < -2) trend = "declining";
      }
    }

    // Generate watermark with user tracking
    const clientId = getClientId(request);
    const watermark = {
      _ss: Buffer.from(JSON.stringify({
        t: Date.now(),
        c: clientId.substring(0, 12),
        u: (session?.user?.id || "dev").substring(0, 8),
        p: slug,
      })).toString("base64"),
    };

    // Build response
    const responseData = {
      product: {
        id: product.id,
        name: product.name,
        slug: slug,
      },
      history: history || [],
      stats: {
        ...stats,
        trend,
      },
      _authenticated: true,
      _maxAllowed: maxLimit,
      ...watermark,
    };

    // Add upgrade message if limited
    if (history?.length >= limit && !isPaid) {
      responseData._note = "Upgrade to Professional for complete historical data";
    }

    return NextResponse.json(responseData, {
      headers: {
        "Cache-Control": "private, max-age=60",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (error) {
    console.error("Error fetching product history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
