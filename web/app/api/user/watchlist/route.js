import { NextResponse } from "next/server";

import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { validateRequestOrigin } from "@/libs/security";
import { checkUnifiedAccess, getPlanLimits } from "@/libs/access";
import { applyUserRateLimit } from "@/libs/rate-limiters";

/**
 * User Watchlist Management
 *
 * GET - List user's watchlist with current scores
 * POST - Add product to watchlist
 * DELETE - Remove product from watchlist
 * PATCH - Update watchlist settings (alerts, notes)
 */

// Plan limits for watchlist
const WATCHLIST_LIMITS = {
  free: 5,
  explorer: 25,
  professional: 100,
  enterprise: -1, // unlimited
};

/**
 * SECURITY: Validate origin for state-changing requests
 */
function requireValidOrigin(request) {
  const check = validateRequestOrigin(request);
  if (!check.valid) {
    console.warn(`[SECURITY] CSRF attempt blocked on watchlist: ${check.reason}`);
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  return null;
}

/**
 * GET - List user's watchlist with current scores
 */
export async function GET(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    // Get user's plan for limits
    const access = await checkUnifiedAccess({ userId: session.user.id });
    const planLimit = WATCHLIST_LIMITS[access.plan] ?? WATCHLIST_LIMITS.free;

    // Get watchlist with product details and latest scores
    const { data: watchlist, error } = await supabase
      .from("user_watchlist")
      .select(`
        id,
        product_id,
        alert_on_score_change,
        alert_threshold,
        alert_email,
        score_at_add,
        notes,
        created_at,
        last_alert_at,
        products (
          id,
          name,
          slug,
          url,
          product_types:type_id (name, slug)
        )
      `)
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching watchlist:", error);
      return NextResponse.json({ error: "Failed to fetch watchlist" }, { status: 500 });
    }

    // Get current scores for all products in watchlist
    const productIds = watchlist.map(w => w.product_id);

    let scoreMap = {};
    if (productIds.length > 0) {
      const { data: scores } = await supabase
        .from("safe_scoring_results")
        .select("product_id, note_finale, score_s, score_a, score_f, score_e, calculated_at")
        .in("product_id", productIds)
        .order("calculated_at", { ascending: false });

      // Create score map (latest score per product)
      for (const score of scores || []) {
        if (!scoreMap[score.product_id]) {
          scoreMap[score.product_id] = score;
        }
      }
    }

    // Format response
    const items = watchlist.map(w => {
      const currentScore = scoreMap[w.product_id];
      const scoreAtAdd = w.score_at_add;
      const currentScoreValue = currentScore ? Math.round(currentScore.note_finale || 0) : null;

      let scoreChange = null;
      if (scoreAtAdd !== null && currentScoreValue !== null) {
        scoreChange = currentScoreValue - scoreAtAdd;
      }

      return {
        id: w.id,
        product: {
          id: w.products?.id,
          name: w.products?.name,
          slug: w.products?.slug,
          url: w.products?.url,
          type: w.products?.product_types?.name || "Unknown",
          typeSlug: w.products?.product_types?.slug,
        },
        scores: {
          current: currentScoreValue,
          atAdd: scoreAtAdd,
          change: scoreChange,
          s: currentScore ? Math.round(currentScore.score_s || 0) : null,
          a: currentScore ? Math.round(currentScore.score_a || 0) : null,
          f: currentScore ? Math.round(currentScore.score_f || 0) : null,
          e: currentScore ? Math.round(currentScore.score_e || 0) : null,
          lastUpdated: currentScore?.calculated_at || null,
        },
        alerts: {
          enabled: w.alert_on_score_change,
          threshold: w.alert_threshold,
          email: w.alert_email,
          lastTriggered: w.last_alert_at,
        },
        notes: w.notes,
        addedAt: w.created_at,
      };
    });

    return NextResponse.json({
      watchlist: items,
      count: items.length,
      limit: planLimit,
      canAdd: planLimit === -1 || items.length < planLimit,
    });

  } catch (error) {
    console.error("Error in watchlist GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST - Add product to watchlist
 */
export async function POST(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  // SECURITY: Validate origin
  const originError = requireValidOrigin(request);
  if (originError) return originError;

  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const { productSlug, alertOnChange = true, alertThreshold = 5, notes = null } = await request.json();

    // Validate input
    if (!productSlug) {
      return NextResponse.json({ error: "Product slug is required" }, { status: 400 });
    }

    if (typeof productSlug !== "string" || productSlug.length > 100) {
      return NextResponse.json({ error: "Invalid product slug" }, { status: 400 });
    }

    if (notes && notes.length > 500) {
      return NextResponse.json({ error: "Notes too long (max 500 characters)" }, { status: 400 });
    }

    // Check plan limits
    const access = await checkUnifiedAccess({ userId: session.user.id });
    const planLimit = WATCHLIST_LIMITS[access.plan] ?? WATCHLIST_LIMITS.free;

    // Count current watchlist items
    const { count: currentCount } = await supabase
      .from("user_watchlist")
      .select("*", { count: "exact", head: true })
      .eq("user_id", session.user.id);

    if (planLimit !== -1 && currentCount >= planLimit) {
      return NextResponse.json({
        error: `Watchlist limit reached (${planLimit} products). Upgrade your plan for more.`,
        upgrade: true,
        limit: planLimit,
      }, { status: 403 });
    }

    // Get product ID and current score
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name")
      .eq("slug", productSlug)
      .maybeSingle();

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Get current score for the product
    const { data: scoreData } = await supabase
      .from("safe_scoring_results")
      .select("note_finale")
      .eq("product_id", product.id)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentScore = scoreData ? Math.round(scoreData.note_finale || 0) : null;

    // Add to watchlist
    const { data, error } = await supabase
      .from("user_watchlist")
      .insert({
        user_id: session.user.id,
        product_id: product.id,
        alert_on_score_change: alertOnChange,
        alert_threshold: alertThreshold,
        score_at_add: currentScore,
        notes: notes || null,
      })
      .select("id")
      .single();

    if (error) {
      // Check for duplicate
      if (error.code === "23505") {
        return NextResponse.json({ error: "Product already in watchlist" }, { status: 409 });
      }
      console.error("Error adding to watchlist:", error);
      return NextResponse.json({ error: "Failed to add to watchlist" }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      productName: product.name,
      scoreAtAdd: currentScore,
      message: "Product added to watchlist",
    }, { status: 201 });

  } catch (error) {
    console.error("Error in watchlist POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE - Remove product from watchlist
 */
export async function DELETE(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  // SECURITY: Validate origin
  const originError = requireValidOrigin(request);
  if (originError) return originError;

  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const watchlistId = searchParams.get("id");
    const productSlug = searchParams.get("productSlug");

    if (!watchlistId && !productSlug) {
      return NextResponse.json({ error: "Watchlist ID or product slug required" }, { status: 400 });
    }

    let query = supabase
      .from("user_watchlist")
      .delete()
      .eq("user_id", session.user.id);

    if (watchlistId) {
      query = query.eq("id", watchlistId);
    } else if (productSlug) {
      // Get product ID first
      const { data: product } = await supabase
        .from("products")
        .select("id")
        .eq("slug", productSlug)
        .maybeSingle();

      if (!product) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      query = query.eq("product_id", product.id);
    }

    const { error } = await query;

    if (error) {
      console.error("Error removing from watchlist:", error);
      return NextResponse.json({ error: "Failed to remove from watchlist" }, { status: 500 });
    }

    return NextResponse.json({ message: "Product removed from watchlist" });

  } catch (error) {
    console.error("Error in watchlist DELETE:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH - Update watchlist settings
 */
export async function PATCH(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  // SECURITY: Validate origin
  const originError = requireValidOrigin(request);
  if (originError) return originError;

  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const { id, alertOnChange, alertThreshold, alertEmail, notes } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Watchlist ID required" }, { status: 400 });
    }

    // Build update object
    const updates = {};
    if (typeof alertOnChange === "boolean") updates.alert_on_score_change = alertOnChange;
    if (typeof alertThreshold === "number") updates.alert_threshold = Math.max(1, Math.min(50, alertThreshold));
    if (typeof alertEmail === "boolean") updates.alert_email = alertEmail;
    if (notes !== undefined) updates.notes = notes?.slice(0, 500) || null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const { error } = await supabase
      .from("user_watchlist")
      .update(updates)
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Error updating watchlist:", error);
      return NextResponse.json({ error: "Failed to update watchlist" }, { status: 500 });
    }

    return NextResponse.json({ message: "Watchlist updated", updates });

  } catch (error) {
    console.error("Error in watchlist PATCH:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
