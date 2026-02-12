import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";

export const dynamic = "force-dynamic";

const ACHIEVEMENTS = [
  { code: "first_visit", name: "First Visit", description: "Visited SafeScoring for the first time", icon: "door", category: "engagement" },
  { code: "first_setup", name: "Setup Creator", description: "Created your first crypto setup", icon: "setup", category: "engagement" },
  { code: "streak_7", name: "Week Warrior", description: "7-day security check streak", icon: "fire", category: "streak" },
  { code: "streak_30", name: "Monthly Guardian", description: "30-day security check streak", icon: "shield", category: "streak" },
  { code: "streak_90", name: "Quarter Master", description: "90-day security check streak", icon: "crown", category: "streak" },
  { code: "streak_365", name: "Year of Security", description: "365-day security check streak", icon: "trophy", category: "streak" },
  { code: "expert_score", name: "Security Expert", description: "Average setup score above 80", icon: "star", category: "score" },
  { code: "diversified", name: "Diversified", description: "5+ products in a single setup", icon: "layers", category: "setup" },
  { code: "corrector_10", name: "Trusted Corrector", description: "10+ corrections approved", icon: "check", category: "community" },
  { code: "early_adopter", name: "Early Adopter", description: "Among the first 100 users", icon: "rocket", category: "special" },
  { code: "five_setups", name: "Stack Builder", description: "Created 5 different setups", icon: "stack", category: "setup" },
  { code: "all_pillars_70", name: "Balanced", description: "All SAFE pillars above 70", icon: "balance", category: "score" },
];

// GET /api/user/achievements
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ achievements: ACHIEVEMENTS.map((a) => ({ ...a, unlocked: false })), total: ACHIEVEMENTS.length, unlocked: 0 });
    }

    const { data: userAchievements } = await supabaseAdmin
      .from("user_achievements")
      .select("achievement_code, unlocked_at")
      .eq("user_id", session.user.id);

    const unlockedMap = Object.fromEntries(
      (userAchievements || []).map((a) => [a.achievement_code, a.unlocked_at])
    );

    const achievements = ACHIEVEMENTS.map((a) => ({
      ...a,
      unlocked: !!unlockedMap[a.code],
      unlocked_at: unlockedMap[a.code] || null,
    }));

    return NextResponse.json({
      achievements,
      total: ACHIEVEMENTS.length,
      unlocked: Object.keys(unlockedMap).length,
    });
  } catch (error) {
    console.error("Achievements error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
