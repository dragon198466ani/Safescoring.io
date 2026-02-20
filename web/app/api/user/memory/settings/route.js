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
    console.warn(`[SECURITY] CSRF attempt blocked on memory settings: ${check.reason}`);
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  return null;
}

// Default settings for new users
const DEFAULT_SETTINGS = {
  memory_enabled: true,
  auto_extract_facts: true,
  store_conversations: true,
  max_retention_days: 365,
  anonymize_in_training: true,
  remember_preferences: true,
  remember_goals: true,
  remember_risk_profile: true,
  remember_product_interests: true,
};

// GET /api/user/memory/settings - Fetch user's memory settings
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

    // Fetch user memory settings
    const { data: settings, error } = await supabase
      .from("user_memory_settings")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching memory settings:", error);
      return NextResponse.json(
        { error: "Failed to fetch memory settings" },
        { status: 500 }
      );
    }

    // Return default settings if none exist yet
    if (!settings) {
      return NextResponse.json({
        success: true,
        settings: DEFAULT_SETTINGS,
        isDefault: true,
      });
    }

    return NextResponse.json({
      success: true,
      settings,
      isDefault: false,
    });
  } catch (error) {
    console.error("Error in GET /api/user/memory/settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/user/memory/settings - Save/update memory settings
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

    // Validate allowed fields
    const allowedFields = [
      'memory_enabled',
      'auto_extract_facts',
      'store_conversations',
      'max_retention_days',
      'anonymize_in_training',
      'remember_preferences',
      'remember_goals',
      'remember_risk_profile',
      'remember_product_interests',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // Type validation
        if (field === 'max_retention_days') {
          const days = parseInt(body[field], 10);
          if (isNaN(days) || days < 30 || days > 3650) {
            return NextResponse.json(
              { error: "max_retention_days must be between 30 and 3650" },
              { status: 400 }
            );
          }
          updates[field] = days;
        } else {
          // Boolean fields
          updates[field] = Boolean(body[field]);
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Check if settings already exist
    const { data: existing } = await supabase
      .from("user_memory_settings")
      .select("id")
      .eq("user_id", session.user.id)
      .single();

    let result;

    if (existing) {
      // Update existing settings
      const { data, error } = await supabase
        .from("user_memory_settings")
        .update(updates)
        .eq("user_id", session.user.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating memory settings:", error);
        return NextResponse.json(
          { error: "Failed to update memory settings" },
          { status: 500 }
        );
      }

      result = data;
    } else {
      // Insert new settings with defaults
      const newSettings = {
        user_id: session.user.id,
        ...DEFAULT_SETTINGS,
        ...updates,
      };

      const { data, error } = await supabase
        .from("user_memory_settings")
        .insert(newSettings)
        .select()
        .single();

      if (error) {
        console.error("Error inserting memory settings:", error);
        return NextResponse.json(
          { error: "Failed to save memory settings" },
          { status: 500 }
        );
      }

      result = data;
    }

    return NextResponse.json({
      success: true,
      settings: result,
    });
  } catch (error) {
    console.error("Error in POST /api/user/memory/settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
