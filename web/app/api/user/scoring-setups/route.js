import { NextResponse } from "next/server";

import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { validateRequestOrigin } from "@/libs/security";
import { checkUnifiedAccess } from "@/libs/access";
import { applyUserRateLimit } from "@/libs/rate-limiters";

/**
 * User Scoring Setups — Custom pillar weight configurations
 *
 * GET    - List user's scoring setups + plan limits
 * POST   - Create a new scoring setup
 * PUT    - Update an existing scoring setup
 * DELETE - Delete a scoring setup
 */

const SCORING_SETUP_LIMITS = {
  free: 1,
  explorer: 3,
  professional: 3,
  enterprise: -1, // unlimited
};

function requireValidOrigin(request) {
  const check = validateRequestOrigin(request);
  if (!check.valid) {
    console.warn(`[SECURITY] CSRF attempt blocked on scoring-setups: ${check.reason}`);
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  return null;
}

/**
 * GET - List user's scoring setups
 */
export async function GET(request) {
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) return rateLimitResult.response;

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const access = await checkUnifiedAccess({ userId: session.user.id });
    const maxSetups = SCORING_SETUP_LIMITS[access.plan] ?? SCORING_SETUP_LIMITS.free;

    const { data: setups, error } = await supabase
      .from("user_scoring_setups")
      .select("id, name, weight_s, weight_a, weight_f, weight_e, is_active, position, created_at, updated_at")
      .eq("user_id", session.user.id)
      .order("position", { ascending: true });

    if (error) {
      console.error("Error fetching scoring setups:", error);
      return NextResponse.json({ error: "Failed to fetch scoring setups" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      setups: setups || [],
      limits: {
        max: maxSetups,
        used: (setups || []).length,
        canCreate: maxSetups === -1 || (setups || []).length < maxSetups,
      },
    });
  } catch (error) {
    console.error("Error in scoring-setups GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST - Create a new scoring setup
 */
export async function POST(request) {
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) return rateLimitResult.response;

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
    const body = await request.json();
    const { name, weight_s, weight_a, weight_f, weight_e, is_active } = body;

    // Validate
    const weights = [weight_s, weight_a, weight_f, weight_e];
    if (weights.some((w) => typeof w !== "number" || w < 0 || w > 100 || !Number.isInteger(w))) {
      return NextResponse.json({ error: "Each weight must be an integer between 0 and 100" }, { status: 400 });
    }
    if (weight_s + weight_a + weight_f + weight_e !== 100) {
      return NextResponse.json({ error: "Weights must sum to 100" }, { status: 400 });
    }
    if (!name || typeof name !== "string" || name.trim().length === 0 || name.length > 50) {
      return NextResponse.json({ error: "Name is required (max 50 characters)" }, { status: 400 });
    }

    // Check plan limit
    const access = await checkUnifiedAccess({ userId: session.user.id });
    const maxSetups = SCORING_SETUP_LIMITS[access.plan] ?? SCORING_SETUP_LIMITS.free;

    const { count } = await supabase
      .from("user_scoring_setups")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.user.id);

    if (maxSetups !== -1 && count >= maxSetups) {
      return NextResponse.json(
        {
          error: `Scoring setup limit reached (${maxSetups}). Upgrade your plan for more.`,
          upgrade: true,
          limit: maxSetups,
        },
        { status: 403 }
      );
    }

    // If is_active, deactivate all others first
    if (is_active) {
      await supabase
        .from("user_scoring_setups")
        .update({ is_active: false })
        .eq("user_id", session.user.id);
    }

    const { data, error } = await supabase
      .from("user_scoring_setups")
      .insert({
        user_id: session.user.id,
        name: name.trim(),
        weight_s,
        weight_a,
        weight_f,
        weight_e,
        is_active: is_active ?? false,
        position: count || 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating scoring setup:", error);
      return NextResponse.json({ error: "Failed to create scoring setup" }, { status: 500 });
    }

    return NextResponse.json({ success: true, setup: data }, { status: 201 });
  } catch (error) {
    console.error("Error in scoring-setups POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT - Update an existing scoring setup
 */
export async function PUT(request) {
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) return rateLimitResult.response;

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
    const body = await request.json();
    const { id, name, weight_s, weight_a, weight_f, weight_e, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: "Setup ID required" }, { status: 400 });
    }

    const updates = {};

    // Validate weights if provided
    if (weight_s !== undefined && weight_a !== undefined && weight_f !== undefined && weight_e !== undefined) {
      const weights = [weight_s, weight_a, weight_f, weight_e];
      if (weights.some((w) => typeof w !== "number" || w < 0 || w > 100 || !Number.isInteger(w))) {
        return NextResponse.json({ error: "Each weight must be an integer between 0 and 100" }, { status: 400 });
      }
      if (weight_s + weight_a + weight_f + weight_e !== 100) {
        return NextResponse.json({ error: "Weights must sum to 100" }, { status: 400 });
      }
      updates.weight_s = weight_s;
      updates.weight_a = weight_a;
      updates.weight_f = weight_f;
      updates.weight_e = weight_e;
    }

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0 || name.length > 50) {
        return NextResponse.json({ error: "Name must be 1-50 characters" }, { status: 400 });
      }
      updates.name = name.trim();
    }

    if (typeof is_active === "boolean") {
      updates.is_active = is_active;

      // If activating, deactivate all others first
      if (is_active) {
        await supabase
          .from("user_scoring_setups")
          .update({ is_active: false })
          .eq("user_id", session.user.id);
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("user_scoring_setups")
      .update(updates)
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating scoring setup:", error);
      return NextResponse.json({ error: "Failed to update scoring setup" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Setup not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, setup: data });
  } catch (error) {
    console.error("Error in scoring-setups PUT:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE - Delete a scoring setup
 */
export async function DELETE(request) {
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) return rateLimitResult.response;

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
    const setupId = searchParams.get("id");

    if (!setupId) {
      return NextResponse.json({ error: "Setup ID required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("user_scoring_setups")
      .delete()
      .eq("id", setupId)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Error deleting scoring setup:", error);
      return NextResponse.json({ error: "Failed to delete scoring setup" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Scoring setup deleted" });
  } catch (error) {
    console.error("Error in scoring-setups DELETE:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
