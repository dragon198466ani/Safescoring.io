import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";

export const dynamic = "force-dynamic";

const CHALLENGE_TYPES = [
  {
    type: "create_setup",
    title: "Create a Setup",
    description: "Build your first crypto security stack",
    points: 20,
    condition: "no_setup",
    cta: "/dashboard/setups",
  },
  {
    type: "check_health",
    title: "Health Check",
    description: "Review your setup's health score and recommendations",
    points: 10,
    condition: "has_setup",
    cta: "/dashboard",
  },
  {
    type: "add_product",
    title: "Expand Your Stack",
    description: "Add a new product to strengthen your security",
    points: 15,
    condition: "has_setup",
    cta: "/dashboard/setups",
  },
  {
    type: "review_incident",
    title: "Stay Informed",
    description: "Check the latest security incidents in crypto",
    points: 10,
    condition: "always",
    cta: "/products",
  },
  {
    type: "explore_products",
    title: "Discovery Time",
    description: "Explore 3 different products and their SAFE scores",
    points: 10,
    condition: "always",
    cta: "/products",
  },
  {
    type: "compare_scores",
    title: "Compare & Contrast",
    description: "Compare your setup score with the community average",
    points: 15,
    condition: "has_setup",
    cta: "/dashboard",
  },
  {
    type: "share_setup",
    title: "Spread the Word",
    description: "Share your security setup with the community",
    points: 25,
    condition: "has_setup",
    cta: "/dashboard/setups",
  },
];

function selectChallenge(userState, date) {
  // Deterministic selection based on date + user state
  const eligible = CHALLENGE_TYPES.filter((c) => {
    if (c.condition === "no_setup") return !userState.hasSetup;
    if (c.condition === "has_setup") return userState.hasSetup;
    return true;
  });

  // Use date as seed for consistent daily challenge
  const dayOfYear = Math.floor(
    (new Date(date) - new Date(new Date(date).getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24)
  );
  const index = dayOfYear % eligible.length;
  return eligible[index];
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const userId = session.user.id;
    const today = new Date().toISOString().split("T")[0];

    // Check if challenge already exists for today
    const { data: existing } = await supabaseAdmin
      .from("daily_challenges")
      .select("*")
      .eq("user_id", userId)
      .eq("challenge_date", today)
      .single();

    if (existing) {
      return NextResponse.json({
        challenge: existing,
        cta: CHALLENGE_TYPES.find((c) => c.type === existing.challenge_type)?.cta || "/dashboard",
      });
    }

    // Determine user state for challenge selection
    const { count: setupCount } = await supabaseAdmin
      .from("user_setups")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    const userState = { hasSetup: (setupCount || 0) > 0 };
    const challenge = selectChallenge(userState, today);

    // Create today's challenge
    const { data: newChallenge, error } = await supabaseAdmin
      .from("daily_challenges")
      .insert({
        user_id: userId,
        challenge_date: today,
        challenge_type: challenge.type,
        challenge_title: challenge.title,
        challenge_description: challenge.description,
        points_value: challenge.points,
      })
      .select()
      .single();

    if (error) {
      // Might be a race condition - try to fetch again
      const { data: retryData } = await supabaseAdmin
        .from("daily_challenges")
        .select("*")
        .eq("user_id", userId)
        .eq("challenge_date", today)
        .single();

      if (retryData) {
        return NextResponse.json({
          challenge: retryData,
          cta: challenge.cta,
        });
      }
      throw error;
    }

    return NextResponse.json({
      challenge: newChallenge,
      cta: challenge.cta,
    });
  } catch (error) {
    console.error("Daily challenge error:", error);
    return NextResponse.json({ error: "Failed to get challenge" }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const userId = session.user.id;
    const today = new Date().toISOString().split("T")[0];

    // Get today's challenge
    const { data: challenge, error: fetchError } = await supabaseAdmin
      .from("daily_challenges")
      .select("*")
      .eq("user_id", userId)
      .eq("challenge_date", today)
      .single();

    if (fetchError || !challenge) {
      return NextResponse.json({ error: "No challenge found for today" }, { status: 404 });
    }

    if (challenge.completed) {
      return NextResponse.json({ error: "Challenge already completed", challenge });
    }

    // Mark as completed
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("daily_challenges")
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq("id", challenge.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Award points to streak
    await supabaseAdmin
      .from("user_streaks")
      .update({
        streak_points_earned: supabaseAdmin.raw
          ? supabaseAdmin.raw("streak_points_earned + " + challenge.points_value)
          : challenge.points_value,
      })
      .eq("user_id", userId)
      .catch(() => {
        // Fallback: just update
      });

    // Try updating points manually
    const { data: streak } = await supabaseAdmin
      .from("user_streaks")
      .select("streak_points_earned")
      .eq("user_id", userId)
      .single();

    if (streak) {
      await supabaseAdmin
        .from("user_streaks")
        .update({ streak_points_earned: (streak.streak_points_earned || 0) + challenge.points_value })
        .eq("user_id", userId);
    }

    // Create notification
    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      type: "achievement",
      title: "Challenge Complete! 🎯",
      message: `You completed "${challenge.challenge_title}" and earned ${challenge.points_value} points!`,
      data: { challenge_type: challenge.challenge_type, points: challenge.points_value },
    });

    return NextResponse.json({
      success: true,
      challenge: updated,
      points_earned: challenge.points_value,
    });
  } catch (error) {
    console.error("Challenge completion error:", error);
    return NextResponse.json({ error: "Failed to complete challenge" }, { status: 500 });
  }
}
