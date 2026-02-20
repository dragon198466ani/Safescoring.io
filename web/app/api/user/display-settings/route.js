import { NextResponse } from "next/server";

import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { applyUserRateLimit } from "@/libs/rate-limiters";

/**
 * Display Settings API
 * Manages theme, language, timezone, and UI preferences
 */

export const dynamic = "force-dynamic";

// Supported languages
const SUPPORTED_LANGUAGES = {
  en: "English",
  fr: "Francais",
  de: "Deutsch",
  es: "Espanol",
  pt: "Portugues",
  it: "Italiano",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
};

// GET - Fetch display settings
export async function GET(req) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(req);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("user_display_settings")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching display settings:", error);
      return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }

    // Return defaults if no settings exist
    if (!data) {
      return NextResponse.json({
        success: true,
        settings: {
          theme: "dark",
          language: "en",
          timezone: "UTC",
          date_format: "YYYY-MM-DD",
          compact_view: false,
          show_score_colors: true,
          default_score_display: "percentage",
          default_dashboard_view: "overview",
          products_per_page: 20,
          reduce_animations: false,
          high_contrast: false,
        },
        supported_languages: SUPPORTED_LANGUAGES,
      });
    }

    return NextResponse.json({
      success: true,
      settings: data,
      supported_languages: SUPPORTED_LANGUAGES,
    });
  } catch (error) {
    console.error("Error in GET /api/user/display-settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Update display settings
export async function POST(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      theme,
      language,
      timezone,
      date_format,
      compact_view,
      show_score_colors,
      default_score_display,
      default_dashboard_view,
      products_per_page,
      reduce_animations,
      high_contrast,
    } = body;

    // Validate theme
    const validThemes = ["light", "dark", "auto"];
    if (theme && !validThemes.includes(theme)) {
      return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
    }

    // Validate language
    if (language && !SUPPORTED_LANGUAGES[language]) {
      return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
    }

    // Validate date format
    const validDateFormats = ["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"];
    if (date_format && !validDateFormats.includes(date_format)) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    // Validate score display
    const validScoreDisplay = ["percentage", "letter", "numeric"];
    if (default_score_display && !validScoreDisplay.includes(default_score_display)) {
      return NextResponse.json({ error: "Invalid score display" }, { status: 400 });
    }

    // Build update object
    const updates = {};
    if (theme !== undefined) updates.theme = theme;
    if (language !== undefined) updates.language = language;
    if (timezone !== undefined) updates.timezone = timezone;
    if (date_format !== undefined) updates.date_format = date_format;
    if (compact_view !== undefined) updates.compact_view = compact_view;
    if (show_score_colors !== undefined) updates.show_score_colors = show_score_colors;
    if (default_score_display !== undefined) updates.default_score_display = default_score_display;
    if (default_dashboard_view !== undefined) updates.default_dashboard_view = default_dashboard_view;
    if (products_per_page !== undefined) updates.products_per_page = Math.max(10, Math.min(100, products_per_page));
    if (reduce_animations !== undefined) updates.reduce_animations = reduce_animations;
    if (high_contrast !== undefined) updates.high_contrast = high_contrast;

    // Upsert settings
    const { data, error } = await supabase
      .from("user_display_settings")
      .upsert({
        user_id: session.user.id,
        ...updates,
      }, { onConflict: "user_id" })
      .select()
      .single();

    if (error) {
      console.error("Error updating display settings:", error);
      return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }

    return NextResponse.json({ success: true, settings: data });
  } catch (error) {
    console.error("Error in POST /api/user/display-settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
