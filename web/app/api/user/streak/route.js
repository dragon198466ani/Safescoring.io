import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";

export const dynamic = "force-dynamic";

// GET /api/user/streak - Get current streak info
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(getDefaultStreak());
    }

    const { data, error } = await supabaseAdmin
      .from("user_streaks")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    const streak = data || getDefaultStreak();

    // Calculate milestones
    const milestones = [
      { days: 7, label: "1 Week", unlocked: streak.longest_streak >= 7 },
      { days: 14, label: "2 Weeks", unlocked: streak.longest_streak >= 14 },
      { days: 30, label: "1 Month", unlocked: streak.longest_streak >= 30 },
      { days: 90, label: "3 Months", unlocked: streak.longest_streak >= 90 },
      { days: 180, label: "6 Months", unlocked: streak.longest_streak >= 180 },
      { days: 365, label: "1 Year", unlocked: streak.longest_streak >= 365 },
    ];

    // Next milestone
    const nextMilestone = milestones.find((m) => !m.unlocked);

    return NextResponse.json({
      ...streak,
      milestones,
      next_milestone: nextMilestone || null,
      days_to_next: nextMilestone ? nextMilestone.days - streak.current_streak : 0,
    });
  } catch (error) {
    console.error("Streak GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/user/streak - Record a visit (called automatically on page load)
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false });
    }

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Get existing streak
    const { data: existing } = await supabaseAdmin
      .from("user_streaks")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (!existing) {
      // First visit ever
      const { data, error } = await supabaseAdmin
        .from("user_streaks")
        .insert({
          user_id: session.user.id,
          current_streak: 1,
          longest_streak: 1,
          last_visit_date: today,
          total_visits: 1,
          streak_points_earned: 10,
        })
        .select()
        .single();

      if (error) throw error;

      // Check for first visit achievement
      await checkAndAwardAchievement(session.user.id, "first_visit");

      return NextResponse.json({ ...data, streak_extended: true, points_earned: 10 });
    }

    // Already visited today
    if (existing.last_visit_date === today) {
      return NextResponse.json({ ...existing, streak_extended: false, points_earned: 0 });
    }

    // Check if streak continues (visited yesterday)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const isConsecutive = existing.last_visit_date === yesterday;

    const newStreak = isConsecutive ? existing.current_streak + 1 : 1;
    const newLongest = Math.max(existing.longest_streak, newStreak);
    const pointsEarned = Math.min(newStreak * 10, 100); // Cap at 100 points per day

    const { data, error } = await supabaseAdmin
      .from("user_streaks")
      .update({
        current_streak: newStreak,
        longest_streak: newLongest,
        last_visit_date: today,
        total_visits: existing.total_visits + 1,
        streak_points_earned: existing.streak_points_earned + pointsEarned,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", session.user.id)
      .select()
      .single();

    if (error) throw error;

    // Check streak milestones for achievements
    const streakMilestones = [
      { days: 7, code: "streak_7" },
      { days: 30, code: "streak_30" },
      { days: 90, code: "streak_90" },
      { days: 365, code: "streak_365" },
    ];

    for (const m of streakMilestones) {
      if (newStreak >= m.days) {
        await checkAndAwardAchievement(session.user.id, m.code);
      }
    }

    // Create streak notification at milestones
    if ([7, 14, 30, 60, 90, 180, 365].includes(newStreak)) {
      await supabaseAdmin.from("notifications").insert({
        user_id: session.user.id,
        type: "streak",
        title: `${newStreak}-day streak!`,
        message: `You've checked your crypto security ${newStreak} days in a row. Keep it up!`,
        data: { streak: newStreak, points: pointsEarned },
      });
    }

    return NextResponse.json({
      ...data,
      streak_extended: true,
      points_earned: pointsEarned,
      streak_broken: !isConsecutive && existing.current_streak > 1,
    });
  } catch (error) {
    console.error("Streak POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function checkAndAwardAchievement(userId, code) {
  try {
    const { error } = await supabaseAdmin
      .from("user_achievements")
      .insert({ user_id: userId, achievement_code: code })
      .select()
      .single();

    if (error && error.code === "23505") return; // Already has it
    if (error) throw error;

    // Create notification for new achievement
    const achievementNames = {
      first_visit: "First Visit",
      streak_7: "Week Warrior",
      streak_30: "Monthly Guardian",
      streak_90: "Quarter Master",
      streak_365: "Year of Security",
      first_setup: "Setup Creator",
      expert_score: "Security Expert",
      diversified: "Diversified",
      corrector_10: "Trusted Corrector",
      early_adopter: "Early Adopter",
    };

    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      type: "achievement",
      title: `Achievement unlocked: ${achievementNames[code] || code}`,
      message: `You earned a new badge! Check your profile to see all your achievements.`,
      data: { achievement: code },
    });
  } catch (err) {
    console.error("Achievement award error:", err);
  }
}

function getDefaultStreak() {
  return {
    current_streak: 0,
    longest_streak: 0,
    last_visit_date: null,
    total_visits: 0,
    streak_points_earned: 0,
  };
}
