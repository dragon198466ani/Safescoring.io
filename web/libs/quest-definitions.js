/**
 * Quest Definitions for SafeScoring
 * Each quest is a multi-step objective path that guides users
 */

export const QUESTS = {
  security_novice: {
    name: "Security Novice",
    description: "Learn the basics of crypto security",
    icon: "🛡️",
    category: "learning",
    total_steps: 3,
    reward_points: 50,
    reward_achievement: "security_novice",
    steps: [
      {
        key: "create_setup",
        label: "Create your first setup",
        description: "Build a crypto security stack in the Setup Builder",
      },
      {
        key: "add_3_products",
        label: "Add 3 products to a setup",
        description: "Diversify your stack with at least 3 products",
      },
      {
        key: "check_health",
        label: "Check your setup health score",
        description: "View your setup's health analysis and recommendations",
      },
    ],
  },

  streak_master: {
    name: "Streak Master",
    description: "Build a consistent security habit",
    icon: "🔥",
    category: "streak",
    total_steps: 3,
    reward_points: 100,
    reward_achievement: "streak_master",
    steps: [
      {
        key: "streak_3",
        label: "Maintain a 3-day streak",
        description: "Visit SafeScoring 3 days in a row",
      },
      {
        key: "streak_7",
        label: "Maintain a 7-day streak",
        description: "Keep your streak alive for a full week",
      },
      {
        key: "streak_30",
        label: "Maintain a 30-day streak",
        description: "One month of consistent security monitoring",
      },
    ],
  },

  diversifier: {
    name: "The Diversifier",
    description: "Build a well-rounded security setup",
    icon: "📚",
    category: "setup",
    total_steps: 3,
    reward_points: 75,
    reward_achievement: "diversified",
    steps: [
      {
        key: "add_wallet",
        label: "Add a wallet to your setup",
        description: "Include a hardware or software wallet",
      },
      {
        key: "add_exchange",
        label: "Add an exchange",
        description: "Add a crypto exchange for trading",
      },
      {
        key: "add_defi",
        label: "Add a DeFi product",
        description: "Complete your stack with a DeFi protocol",
      },
    ],
  },

  inspector: {
    name: "The Inspector",
    description: "Become a thorough security reviewer",
    icon: "🔍",
    category: "engagement",
    total_steps: 3,
    reward_points: 60,
    reward_achievement: "inspector",
    steps: [
      {
        key: "view_5_products",
        label: "View 5 different products",
        description: "Explore product pages to learn about SAFE scores",
      },
      {
        key: "compare_scores",
        label: "Compare your setup vs community",
        description: "See how your security compares to other users",
      },
      {
        key: "complete_challenge",
        label: "Complete a daily challenge",
        description: "Finish at least one daily challenge",
      },
    ],
  },
};

export const QUEST_CATEGORIES = {
  learning: { label: "Learning", color: "from-blue-500/20 to-blue-600/20 border-blue-500/30" },
  streak: { label: "Consistency", color: "from-orange-500/20 to-amber-500/20 border-orange-500/30" },
  setup: { label: "Building", color: "from-purple-500/20 to-violet-500/20 border-purple-500/30" },
  engagement: { label: "Engagement", color: "from-green-500/20 to-emerald-500/20 border-green-500/30" },
};
