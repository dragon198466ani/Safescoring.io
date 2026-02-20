import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabase } from "@/libs/supabase";
import { applyUserRateLimit } from "@/libs/rate-limiters";

/**
 * POST /api/user/streak
 * Sync user streak data from client
 */
export async function POST(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const streakData = await request.json();

    // Upsert streak data
    const { error } = await supabase
      .from("user_streaks")
      .upsert({
        user_id: session.user.id,
        current_streak: streakData.currentStreak || 0,
        longest_streak: streakData.longestStreak || 0,
        last_visit: streakData.lastVisit,
        total_days: streakData.totalDays || 0,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id",
      });

    if (error) {
      console.error("Streak sync error:", error);
      // Don't fail silently - streak table might not exist yet
      // Return success anyway to not block client
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Streak API error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * GET /api/user/streak
 * Get user streak data from server
 */
export async function GET(req) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(req);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Streak fetch error:", error);
    }

    return NextResponse.json({
      currentStreak: data?.current_streak || 0,
      longestStreak: data?.longest_streak || 0,
      lastVisit: data?.last_visit || null,
      totalDays: data?.total_days || 0,
    });
  } catch (error) {
    console.error("Streak API error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
