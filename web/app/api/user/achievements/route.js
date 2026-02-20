import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { applyUserRateLimit } from "@/libs/rate-limiters";

/**
 * User Achievements System
 *
 * Gamification layer to increase user engagement and retention.
 * Key lock-in feature: users invest time to unlock achievements.
 */

// Achievement definitions
const ACHIEVEMENTS = {
  // Onboarding achievements
  first_login: {
    id: "first_login",
    name: "Welcome Aboard",
    description: "Complete your first login to SafeScoring",
    icon: "🎉",
    category: "onboarding",
    points: 10,
    secret: false,
  },
  profile_complete: {
    id: "profile_complete",
    name: "Identity Verified",
    description: "Complete your user profile",
    icon: "✓",
    category: "onboarding",
    points: 20,
    secret: false,
  },

  // Engagement achievements
  first_setup: {
    id: "first_setup",
    name: "Stack Architect",
    description: "Create your first security setup",
    icon: "🏗️",
    category: "engagement",
    points: 25,
    secret: false,
  },
  five_setups: {
    id: "five_setups",
    name: "Multi-Stack Master",
    description: "Create 5 security setups",
    icon: "🏆",
    category: "engagement",
    points: 50,
    secret: false,
  },
  first_watchlist: {
    id: "first_watchlist",
    name: "Watchful Eye",
    description: "Add your first product to watchlist",
    icon: "👁️",
    category: "engagement",
    points: 15,
    secret: false,
  },
  watchlist_25: {
    id: "watchlist_25",
    name: "Market Analyst",
    description: "Track 25 products in your watchlist",
    icon: "📊",
    category: "engagement",
    points: 75,
    secret: false,
  },

  // Exploration achievements
  products_viewed_10: {
    id: "products_viewed_10",
    name: "Curious Mind",
    description: "View 10 different product pages",
    icon: "🔍",
    category: "exploration",
    points: 20,
    secret: false,
  },
  products_viewed_50: {
    id: "products_viewed_50",
    name: "Security Researcher",
    description: "View 50 different product pages",
    icon: "🧪",
    category: "exploration",
    points: 50,
    secret: false,
  },
  products_viewed_100: {
    id: "products_viewed_100",
    name: "Expert Analyst",
    description: "View 100 different product pages",
    icon: "🎓",
    category: "exploration",
    points: 100,
    secret: false,
  },
  compare_first: {
    id: "compare_first",
    name: "Decision Maker",
    description: "Compare two products for the first time",
    icon: "⚖️",
    category: "exploration",
    points: 15,
    secret: false,
  },

  // Loyalty achievements
  streak_7: {
    id: "streak_7",
    name: "Weekly Warrior",
    description: "Visit SafeScoring 7 days in a row",
    icon: "🔥",
    category: "loyalty",
    points: 50,
    secret: false,
  },
  streak_30: {
    id: "streak_30",
    name: "Monthly Champion",
    description: "Visit SafeScoring 30 days in a row",
    icon: "💎",
    category: "loyalty",
    points: 150,
    secret: false,
  },
  streak_100: {
    id: "streak_100",
    name: "Legendary Devotee",
    description: "Visit SafeScoring 100 days in a row",
    icon: "👑",
    category: "loyalty",
    points: 500,
    secret: false,
  },
  member_1_year: {
    id: "member_1_year",
    name: "Founding Member",
    description: "Be a member for 1 year",
    icon: "🎂",
    category: "loyalty",
    points: 200,
    secret: false,
  },

  // Community achievements
  first_correction: {
    id: "first_correction",
    name: "Community Helper",
    description: "Submit your first score correction",
    icon: "✏️",
    category: "community",
    points: 30,
    secret: false,
  },
  corrections_accepted_5: {
    id: "corrections_accepted_5",
    name: "Quality Contributor",
    description: "Have 5 corrections accepted",
    icon: "⭐",
    category: "community",
    points: 100,
    secret: false,
  },
  share_setup: {
    id: "share_setup",
    name: "Knowledge Sharer",
    description: "Share a setup publicly",
    icon: "📤",
    category: "community",
    points: 25,
    secret: false,
  },

  // Secret achievements
  night_owl: {
    id: "night_owl",
    name: "Night Owl",
    description: "Check security scores at 3 AM",
    icon: "🦉",
    category: "secret",
    points: 15,
    secret: true,
  },
  early_bird: {
    id: "early_bird",
    name: "Early Bird",
    description: "Check security scores at 6 AM",
    icon: "🐦",
    category: "secret",
    points: 15,
    secret: true,
  },
  perfectionist: {
    id: "perfectionist",
    name: "Perfectionist",
    description: "Create a setup with 90+ SAFE score",
    icon: "💯",
    category: "secret",
    points: 100,
    secret: true,
  },
};

// Calculate user level from total points
function calculateLevel(points) {
  const levels = [
    { level: 1, minPoints: 0, name: "Beginner" },
    { level: 2, minPoints: 50, name: "Explorer" },
    { level: 3, minPoints: 150, name: "Analyst" },
    { level: 4, minPoints: 300, name: "Expert" },
    { level: 5, minPoints: 500, name: "Master" },
    { level: 6, minPoints: 800, name: "Guardian" },
    { level: 7, minPoints: 1200, name: "Champion" },
    { level: 8, minPoints: 1800, name: "Legend" },
    { level: 9, minPoints: 2500, name: "Mythic" },
    { level: 10, minPoints: 3500, name: "Transcendent" },
  ];

  let userLevel = levels[0];
  for (const level of levels) {
    if (points >= level.minPoints) {
      userLevel = level;
    }
  }

  const nextLevel = levels.find(l => l.minPoints > points);
  const progress = nextLevel
    ? ((points - userLevel.minPoints) / (nextLevel.minPoints - userLevel.minPoints)) * 100
    : 100;

  return {
    ...userLevel,
    points,
    progress: Math.round(progress),
    nextLevel: nextLevel || null,
    pointsToNext: nextLevel ? nextLevel.minPoints - points : 0,
  };
}

// GET - Get user's achievements
export async function GET(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    // Get user's unlocked achievements
    const { data: userAchievements, error } = await supabase
      .from("user_achievements")
      .select("achievement_code, unlocked_at")
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Error fetching achievements:", error);
      // Continue with empty achievements if table doesn't exist
    }

    const unlockedMap = new Map(
      (userAchievements || []).map(a => [a.achievement_code, a.unlocked_at])
    );

    // Calculate total points
    let totalPoints = 0;
    const achievements = Object.values(ACHIEVEMENTS).map(achievement => {
      const isUnlocked = unlockedMap.has(achievement.id);
      const unlockedAt = unlockedMap.get(achievement.id);

      if (isUnlocked) {
        totalPoints += achievement.points;
      }

      // Hide secret achievement details if not unlocked
      if (achievement.secret && !isUnlocked) {
        return {
          id: achievement.id,
          name: "???",
          description: "Secret achievement - keep exploring!",
          icon: "🔒",
          category: "secret",
          points: achievement.points,
          secret: true,
          unlocked: false,
          unlockedAt: null,
        };
      }

      return {
        ...achievement,
        unlocked: isUnlocked,
        unlockedAt,
      };
    });

    // Group by category
    const byCategory = achievements.reduce((acc, a) => {
      if (!acc[a.category]) acc[a.category] = [];
      acc[a.category].push(a);
      return acc;
    }, {});

    // Calculate level
    const level = calculateLevel(totalPoints);

    return NextResponse.json({
      achievements,
      byCategory,
      stats: {
        total: Object.keys(ACHIEVEMENTS).length,
        unlocked: unlockedMap.size,
        totalPoints,
        level,
      },
    });
  } catch (error) {
    console.error("Error in achievements GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Check and unlock achievements
export async function POST(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const { action, data } = await request.json();

    if (action === "check") {
      // Check for achievements to unlock based on user activity
      const newlyUnlocked = [];

      // Get current user achievements
      const { data: existing } = await supabase
        .from("user_achievements")
        .select("achievement_code")
        .eq("user_id", session.user.id);

      const alreadyUnlocked = new Set((existing || []).map(a => a.achievement_code));

      // Check various achievement conditions
      const checks = await Promise.all([
        checkSetupAchievements(session.user.id, alreadyUnlocked),
        checkWatchlistAchievements(session.user.id, alreadyUnlocked),
        checkStreakAchievements(session.user.id, alreadyUnlocked),
        checkTimeBasedAchievements(alreadyUnlocked),
      ]);

      const toUnlock = checks.flat().filter(Boolean);

      // Unlock new achievements
      for (const achievementId of toUnlock) {
        if (!alreadyUnlocked.has(achievementId)) {
          await supabase.from("user_achievements").insert({
            user_id: session.user.id,
            achievement_code: achievementId,
            unlocked_at: new Date().toISOString(),
          });

          newlyUnlocked.push(ACHIEVEMENTS[achievementId]);
        }
      }

      return NextResponse.json({
        newlyUnlocked,
        message: newlyUnlocked.length > 0
          ? `Unlocked ${newlyUnlocked.length} achievement(s)!`
          : "No new achievements",
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Error in achievements POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Check setup-related achievements
async function checkSetupAchievements(userId, alreadyUnlocked) {
  const toUnlock = [];

  const { data: setups } = await supabase
    .from("user_setups")
    .select("id, products, score")
    .eq("user_id", userId);

  const setupCount = setups?.length || 0;

  if (setupCount >= 1 && !alreadyUnlocked.has("first_setup")) {
    toUnlock.push("first_setup");
  }
  if (setupCount >= 5 && !alreadyUnlocked.has("five_setups")) {
    toUnlock.push("five_setups");
  }

  // Check for perfectionist (90+ score setup)
  const hasHighScore = setups?.some(s => (s.score || 0) >= 90);
  if (hasHighScore && !alreadyUnlocked.has("perfectionist")) {
    toUnlock.push("perfectionist");
  }

  return toUnlock;
}

// Check watchlist achievements
async function checkWatchlistAchievements(userId, alreadyUnlocked) {
  const toUnlock = [];

  const { count } = await supabase
    .from("user_watchlist")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (count >= 1 && !alreadyUnlocked.has("first_watchlist")) {
    toUnlock.push("first_watchlist");
  }
  if (count >= 25 && !alreadyUnlocked.has("watchlist_25")) {
    toUnlock.push("watchlist_25");
  }

  return toUnlock;
}

// Check streak achievements
async function checkStreakAchievements(userId, alreadyUnlocked) {
  const toUnlock = [];

  const { data: user } = await supabase
    .from("users")
    .select("current_streak, created_at")
    .eq("id", userId)
    .maybeSingle();

  const streak = user?.current_streak || 0;

  if (streak >= 7 && !alreadyUnlocked.has("streak_7")) {
    toUnlock.push("streak_7");
  }
  if (streak >= 30 && !alreadyUnlocked.has("streak_30")) {
    toUnlock.push("streak_30");
  }
  if (streak >= 100 && !alreadyUnlocked.has("streak_100")) {
    toUnlock.push("streak_100");
  }

  // Check 1 year membership
  if (user?.created_at) {
    const membershipDays = Math.floor(
      (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (membershipDays >= 365 && !alreadyUnlocked.has("member_1_year")) {
      toUnlock.push("member_1_year");
    }
  }

  return toUnlock;
}

// Check time-based achievements
async function checkTimeBasedAchievements(alreadyUnlocked) {
  const toUnlock = [];
  const hour = new Date().getHours();

  if (hour >= 3 && hour < 4 && !alreadyUnlocked.has("night_owl")) {
    toUnlock.push("night_owl");
  }
  if (hour >= 6 && hour < 7 && !alreadyUnlocked.has("early_bird")) {
    toUnlock.push("early_bird");
  }

  return toUnlock;
}

// Export achievement definitions for other modules
export const achievementDefinitions = ACHIEVEMENTS;
