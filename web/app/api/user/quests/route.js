import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";
import { QUESTS } from "@/libs/quest-definitions";

export const dynamic = "force-dynamic";

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

    // Get user's quest progress
    const { data: userQuests } = await supabaseAdmin
      .from("user_quests")
      .select("*")
      .eq("user_id", userId);

    const questMap = {};
    (userQuests || []).forEach((q) => {
      questMap[q.quest_code] = q;
    });

    // Get user context for auto-checking progress
    const [streakRes, setupsRes, challengesRes] = await Promise.all([
      supabaseAdmin
        .from("user_streaks")
        .select("current_streak, longest_streak")
        .eq("user_id", userId)
        .single(),
      supabaseAdmin
        .from("user_setups")
        .select("id, products")
        .eq("user_id", userId),
      supabaseAdmin
        .from("daily_challenges")
        .select("completed")
        .eq("user_id", userId)
        .eq("completed", true)
        .limit(1),
    ]);

    const streak = streakRes.data || { current_streak: 0, longest_streak: 0 };
    const setups = setupsRes.data || [];
    const hasCompletedChallenge = (challengesRes.data || []).length > 0;

    // Build user state
    const maxStreak = Math.max(streak.current_streak || 0, streak.longest_streak || 0);
    const allProducts = setups.flatMap((s) => s.products || []);
    const hasWallet = allProducts.some((p) => typeof p === "object" && p.role === "wallet");
    const hasExchange = allProducts.some((p) => typeof p === "object" && p.role === "exchange");
    const hasDefi = allProducts.some((p) => typeof p === "object" && p.role === "defi");
    const totalProducts = new Set(allProducts.map((p) => typeof p === "object" ? p.id || p.product_id : p)).size;

    // Auto-check conditions
    const autoChecks = {
      create_setup: setups.length > 0,
      add_3_products: totalProducts >= 3,
      check_health: false, // Manual
      streak_3: maxStreak >= 3,
      streak_7: maxStreak >= 7,
      streak_30: maxStreak >= 30,
      add_wallet: hasWallet,
      add_exchange: hasExchange,
      add_defi: hasDefi,
      view_5_products: false, // Manual
      compare_scores: false, // Manual
      complete_challenge: hasCompletedChallenge,
    };

    // Build quest list with progress
    const quests = Object.entries(QUESTS).map(([code, quest]) => {
      const userQuest = questMap[code];
      const progress = userQuest?.progress || {};

      // Auto-update progress based on checks
      const updatedProgress = { ...progress };
      let autoSteps = 0;

      quest.steps.forEach((step) => {
        if (autoChecks[step.key] && !updatedProgress[step.key]) {
          updatedProgress[step.key] = true;
        }
        if (updatedProgress[step.key]) autoSteps++;
      });

      return {
        code,
        ...quest,
        progress: updatedProgress,
        current_step: autoSteps,
        started: !!userQuest,
        completed: userQuest?.completed_at !== null && userQuest?.completed_at !== undefined,
        completed_at: userQuest?.completed_at,
        points_earned: userQuest?.points_earned || 0,
      };
    });

    // Calculate summary
    const completed = quests.filter((q) => q.completed).length;
    const totalQuests = quests.length;

    return NextResponse.json({
      quests,
      summary: { completed, total: totalQuests },
    });
  } catch (error) {
    console.error("Quests error:", error);
    return NextResponse.json({ error: "Failed to fetch quests" }, { status: 500 });
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

    const { quest_code, step_key } = await request.json();
    const userId = session.user.id;

    if (!quest_code || !QUESTS[quest_code]) {
      return NextResponse.json({ error: "Invalid quest" }, { status: 400 });
    }

    const quest = QUESTS[quest_code];

    // Get or create quest record
    let { data: userQuest } = await supabaseAdmin
      .from("user_quests")
      .select("*")
      .eq("user_id", userId)
      .eq("quest_code", quest_code)
      .single();

    if (!userQuest) {
      const { data: created, error: createError } = await supabaseAdmin
        .from("user_quests")
        .insert({
          user_id: userId,
          quest_code,
          progress: {},
          current_step: 0,
          total_steps: quest.total_steps,
        })
        .select()
        .single();

      if (createError) throw createError;
      userQuest = created;
    }

    if (userQuest.completed_at) {
      return NextResponse.json({ error: "Quest already completed", quest: userQuest });
    }

    // Update step progress
    const progress = { ...(userQuest.progress || {}) };
    if (step_key) {
      progress[step_key] = true;
    }

    // Count completed steps
    const completedSteps = quest.steps.filter((s) => progress[s.key]).length;
    const isComplete = completedSteps >= quest.total_steps;

    // Update quest
    const updateData = {
      progress,
      current_step: completedSteps,
    };

    if (isComplete) {
      updateData.completed_at = new Date().toISOString();
      updateData.points_earned = quest.reward_points;
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("user_quests")
      .update(updateData)
      .eq("id", userQuest.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // If quest completed, award achievement and points
    if (isComplete) {
      // Award achievement
      if (quest.reward_achievement) {
        await supabaseAdmin
          .from("user_achievements")
          .upsert(
            {
              user_id: userId,
              achievement_code: quest.reward_achievement,
              data: { source: "quest", quest_code },
            },
            { onConflict: "user_id,achievement_code" }
          )
          .catch(() => {});
      }

      // Award points
      const { data: streak } = await supabaseAdmin
        .from("user_streaks")
        .select("streak_points_earned")
        .eq("user_id", userId)
        .single();

      if (streak) {
        await supabaseAdmin
          .from("user_streaks")
          .update({
            streak_points_earned: (streak.streak_points_earned || 0) + quest.reward_points,
          })
          .eq("user_id", userId);
      }

      // Create notification
      await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        type: "achievement",
        title: `Quest Complete: ${quest.name}! 🏆`,
        message: `You completed the "${quest.name}" quest and earned ${quest.reward_points} points!`,
        data: { quest_code, points: quest.reward_points },
      });
    }

    return NextResponse.json({
      success: true,
      quest: updated,
      just_completed: isComplete,
      points_earned: isComplete ? quest.reward_points : 0,
    });
  } catch (error) {
    console.error("Quest update error:", error);
    return NextResponse.json({ error: "Failed to update quest" }, { status: 500 });
  }
}
