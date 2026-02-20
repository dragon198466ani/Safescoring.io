import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";
import { applyUserRateLimit } from "@/libs/rate-limiters";

/**
 * GET /api/user/notifications/preferences
 * Get user notification preferences
 */
export async function GET(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  // Rate limiting
  const protection = await quickProtect(request, "authenticated");
  if (protection.blocked) return protection.response;

  const supabase = getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch preferences
    const { data: prefs, error } = await supabase
      .from("user_notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found
      console.error("Error fetching preferences:", error);
      return NextResponse.json(
        { error: "Failed to fetch preferences" },
        { status: 500 }
      );
    }

    // Return default preferences if none exist
    const preferences = prefs || {
      email_enabled: true,
      email_digest: "instant",
      telegram_enabled: false,
      telegram_chat_id: null,
      telegram_username: null,
      notify_incidents: true,
      notify_score_changes: true,
      notify_product_updates: true,
      severity_threshold: "high",
      score_change_threshold: 5,
    };

    // Mask telegram chat ID for security
    if (preferences.telegram_chat_id) {
      preferences.telegram_chat_id_masked = "***" + preferences.telegram_chat_id.slice(-4);
    }

    return NextResponse.json({
      preferences,
      userId: user.id,
    });
  } catch (error) {
    console.error("Error in preferences API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/notifications/preferences
 * Update user notification preferences
 */
export async function PUT(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  // Rate limiting
  const protection = await quickProtect(request, "authenticated");
  if (protection.blocked) return protection.response;

  const supabase = getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Validate and sanitize input
    const updates = {};
    const allowedFields = [
      "email_enabled",
      "email_digest",
      "telegram_enabled",
      "notify_incidents",
      "notify_score_changes",
      "notify_product_updates",
      "severity_threshold",
      "score_change_threshold",
      "quiet_hours_start",
      "quiet_hours_end",
      "timezone",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // Validate severity threshold
    if (updates.severity_threshold) {
      const validThresholds = ["critical", "high", "medium", "low"];
      if (!validThresholds.includes(updates.severity_threshold)) {
        return NextResponse.json(
          { error: "Invalid severity threshold" },
          { status: 400 }
        );
      }
    }

    // Validate email digest
    if (updates.email_digest) {
      const validDigests = ["instant", "daily", "weekly", "never"];
      if (!validDigests.includes(updates.email_digest)) {
        return NextResponse.json(
          { error: "Invalid email digest option" },
          { status: 400 }
        );
      }
    }

    // Validate score change threshold
    if (updates.score_change_threshold !== undefined) {
      const threshold = parseInt(updates.score_change_threshold, 10);
      if (isNaN(threshold) || threshold < 1 || threshold > 50) {
        return NextResponse.json(
          { error: "Score change threshold must be between 1 and 50" },
          { status: 400 }
        );
      }
      updates.score_change_threshold = threshold;
    }

    updates.updated_at = new Date().toISOString();

    // Upsert preferences
    const { data: prefs, error } = await supabase
      .from("user_notification_preferences")
      .upsert(
        {
          user_id: user.id,
          ...updates,
        },
        {
          onConflict: "user_id",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Error updating preferences:", error);
      return NextResponse.json(
        { error: "Failed to update preferences" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      preferences: prefs,
    });
  } catch (error) {
    console.error("Error in preferences API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
