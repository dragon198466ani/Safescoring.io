import { NextResponse } from "next/server";

import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { validateRequestOrigin } from "@/libs/security";
import { applyUserRateLimit } from "@/libs/rate-limiters";

export const dynamic = "force-dynamic";

/**
 * SECURITY: Validate origin for state-changing requests
 */
function requireValidOrigin(request) {
  const check = validateRequestOrigin(request);
  if (!check.valid) {
    console.warn(`[SECURITY] CSRF attempt blocked on preferences: ${check.reason}`);
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  return null;
}

// GET /api/user/preferences - Fetch user's saved preferences
export async function GET(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch user preferences
    const { data: preferences, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found, which is ok
      console.error("Error fetching preferences:", error);
      return NextResponse.json(
        { error: "Failed to fetch preferences" },
        { status: 500 }
      );
    }

    // Return empty preferences if none exist yet
    if (!preferences) {
      return NextResponse.json({
        success: true,
        preferences: {
          preferences: [],
          quiz_results: {},
          ai_insights: {},
          min_preferred_score: 0,
          max_preferred_score: 10,
          preferred_product_types: [],
        },
      });
    }

    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (error) {
    console.error("Error in GET /api/user/preferences:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/user/preferences - Save/update user preferences
export async function POST(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  try {
    // SECURITY: Validate origin to prevent CSRF
    const originError = requireValidOrigin(request);
    if (originError) return originError;

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      preferences = [],
      quiz_results = {},
      ai_insights = {},
      min_preferred_score,
      max_preferred_score,
      preferred_product_types = [],
      merge = true, // If true, merge with existing; if false, replace
    } = body;

    // Check if preferences already exist
    const { data: existing } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    let result;

    if (existing) {
      // Update existing preferences
      const updates = {};

      if (merge) {
        // Merge arrays/objects
        if (preferences.length > 0) {
          const mergedPreferences = [
            ...new Set([
              ...(existing.preferences || []),
              ...preferences,
            ]),
          ];
          updates.preferences = mergedPreferences;
        }

        if (Object.keys(quiz_results).length > 0) {
          updates.quiz_results = {
            ...(existing.quiz_results || {}),
            ...quiz_results,
          };
        }

        if (Object.keys(ai_insights).length > 0) {
          updates.ai_insights = {
            ...(existing.ai_insights || {}),
            ...ai_insights,
          };
        }

        if (preferred_product_types.length > 0) {
          const mergedTypes = [
            ...new Set([
              ...(existing.preferred_product_types || []),
              ...preferred_product_types,
            ]),
          ];
          updates.preferred_product_types = mergedTypes;
        }
      } else {
        // Replace completely
        if (preferences.length > 0) updates.preferences = preferences;
        if (Object.keys(quiz_results).length > 0) updates.quiz_results = quiz_results;
        if (Object.keys(ai_insights).length > 0) updates.ai_insights = ai_insights;
        if (preferred_product_types.length > 0) updates.preferred_product_types = preferred_product_types;
      }

      if (min_preferred_score !== undefined) updates.min_preferred_score = min_preferred_score;
      if (max_preferred_score !== undefined) updates.max_preferred_score = max_preferred_score;

      const { data, error } = await supabase
        .from("user_preferences")
        .update(updates)
        .eq("user_id", session.user.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating preferences:", error);
        return NextResponse.json(
          { error: "Failed to update preferences" },
          { status: 500 }
        );
      }

      result = data;
    } else {
      // Insert new preferences
      const { data, error } = await supabase
        .from("user_preferences")
        .insert({
          user_id: session.user.id,
          preferences,
          quiz_results,
          ai_insights,
          min_preferred_score: min_preferred_score ?? 0,
          max_preferred_score: max_preferred_score ?? 10,
          preferred_product_types,
        })
        .select()
        .single();

      if (error) {
        console.error("Error inserting preferences:", error);
        return NextResponse.json(
          { error: "Failed to save preferences" },
          { status: 500 }
        );
      }

      result = data;
    }

    return NextResponse.json({
      success: true,
      preferences: result,
    });
  } catch (error) {
    console.error("Error in POST /api/user/preferences:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/user/preferences - Clear user preferences
export async function DELETE(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  try {
    // SECURITY: Validate origin to prevent CSRF
    const originError = requireValidOrigin(request);
    if (originError) return originError;

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { error } = await supabase
      .from("user_preferences")
      .delete()
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Error deleting preferences:", error);
      return NextResponse.json(
        { error: "Failed to delete preferences" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Preferences cleared successfully",
    });
  } catch (error) {
    console.error("Error in DELETE /api/user/preferences:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
