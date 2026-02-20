"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useApi } from "@/hooks/useApi";

/**
 * Achievements Component
 *
 * Displays user achievements with gamification elements.
 * Key lock-in feature: users invest time to unlock achievements.
 */
export default function Achievements({ compact = false, className = "" }) {
  const { data: session } = useSession();
  const [newUnlocked, setNewUnlocked] = useState([]);

  // Use useApi for achievements with 2-minute cache
  const { data, isLoading: loading } = useApi(
    session?.user ? "/api/user/achievements" : null,
    { ttl: 2 * 60 * 1000 }
  );

  // Check for new achievements on mount (POST - not cached)
  useEffect(() => {
    if (!session?.user) return;

    const checkNew = async () => {
      try {
        const res = await fetch("/api/user/achievements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "check" }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.newlyUnlocked?.length > 0) {
            setNewUnlocked(json.newlyUnlocked);
          }
        }
      } catch (err) {
        // Silent fail
      }
    };

    checkNew();
  }, [session?.user]);

  if (!session) return null;
  if (loading) {
    return (
      <div className={`flex justify-center p-8 ${className}`}>
        <span className="loading loading-spinner"></span>
      </div>
    );
  }

  if (!data) return null;

  const { stats, byCategory } = data;

  // Compact view - just show level and progress
  if (compact) {
    return (
      <div className={`card bg-base-200 ${className}`}>
        <div className="card-body p-4">
          <div className="flex items-center gap-4">
            <div className="text-4xl">{getLevelIcon(stats.level.level)}</div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold">
                  Level {stats.level.level}: {stats.level.name}
                </span>
                <span className="text-sm opacity-70">
                  {stats.totalPoints} pts
                </span>
              </div>
              <progress
                className="progress progress-primary w-full"
                value={stats.level.progress}
                max="100"
              ></progress>
              {stats.level.nextLevel && (
                <p className="text-xs opacity-60 mt-1">
                  {stats.level.pointsToNext} pts to {stats.level.nextLevel.name}
                </p>
              )}
            </div>
          </div>
          <div className="text-xs text-center mt-2 opacity-70">
            {stats.unlocked}/{stats.total} achievements unlocked
          </div>
        </div>
      </div>
    );
  }

  // Full view
  return (
    <div className={className}>
      {/* New Achievement Toast */}
      {newUnlocked.length > 0 && (
        <div className="toast toast-end z-50">
          {newUnlocked.map((a, i) => (
            <div key={i} className="alert alert-success shadow-lg animate-bounce">
              <div>
                <span className="text-2xl mr-2">{a.icon}</span>
                <div>
                  <h3 className="font-bold">Achievement Unlocked!</h3>
                  <p className="text-sm">{a.name}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Level Card */}
      <div className="card bg-gradient-to-r from-primary/20 to-secondary/20 mb-6">
        <div className="card-body">
          <div className="flex items-center gap-6">
            <div className="text-6xl">{getLevelIcon(stats.level.level)}</div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">
                Level {stats.level.level}: {stats.level.name}
              </h2>
              <p className="text-lg opacity-80">{stats.totalPoints} points</p>
              <div className="mt-2">
                <progress
                  className="progress progress-primary w-full h-3"
                  value={stats.level.progress}
                  max="100"
                ></progress>
                {stats.level.nextLevel && (
                  <p className="text-sm opacity-60 mt-1">
                    {stats.level.pointsToNext} points until{" "}
                    {stats.level.nextLevel.name}
                  </p>
                )}
              </div>
            </div>
            <div className="text-center">
              <div className="stat-value">{stats.unlocked}</div>
              <div className="stat-desc">of {stats.total}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Achievement Categories */}
      {Object.entries(byCategory).map(([category, achievements]) => (
        <div key={category} className="mb-6">
          <h3 className="text-lg font-semibold mb-3 capitalize flex items-center gap-2">
            {getCategoryIcon(category)}
            {category}
            <span className="badge badge-sm">
              {achievements.filter(a => a.unlocked).length}/{achievements.length}
            </span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {achievements.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                isNew={newUnlocked.some(a => a.id === achievement.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Single achievement card
function AchievementCard({ achievement, isNew = false }) {
  const { unlocked, name, description, icon, points, unlockedAt, secret } = achievement;

  return (
    <div
      className={`card card-compact border transition-all ${
        unlocked
          ? isNew
            ? "bg-success/20 border-success animate-pulse"
            : "bg-base-200 border-base-300"
          : "bg-base-100 border-base-200 opacity-50"
      }`}
    >
      <div className="card-body flex-row items-center gap-3">
        <div
          className={`text-3xl ${
            unlocked ? "" : "grayscale opacity-50"
          }`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold ${unlocked ? "" : "text-base-content/50"}`}>
            {name}
          </h4>
          <p className="text-xs opacity-70 line-clamp-2">{description}</p>
          {unlocked && unlockedAt && (
            <p className="text-xs text-success mt-1">
              Unlocked {new Date(unlockedAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="text-right">
          <span className={`badge ${unlocked ? "badge-primary" : "badge-ghost"}`}>
            +{points}
          </span>
        </div>
      </div>
    </div>
  );
}

// Level icon based on level number
function getLevelIcon(level) {
  const icons = {
    1: "🌱",
    2: "🌿",
    3: "🌲",
    4: "⭐",
    5: "💫",
    6: "🛡️",
    7: "🏆",
    8: "💎",
    9: "🔮",
    10: "👑",
  };
  return icons[level] || "🌱";
}

// Category icon
function getCategoryIcon(category) {
  const icons = {
    onboarding: "🚀",
    engagement: "💪",
    exploration: "🔍",
    loyalty: "❤️",
    community: "👥",
    secret: "🔒",
  };
  return icons[category] || "📦";
}

// Export mini badge for header
export function AchievementBadge({ className = "" }) {
  const { data: session } = useSession();

  // Use useApi for achievements (shares cache with main Achievements component)
  const { data } = useApi(
    session?.user ? "/api/user/achievements" : null,
    { ttl: 2 * 60 * 1000 }
  );

  const stats = data?.stats || null;

  if (!session || !stats) return null;

  return (
    <a
      href="/dashboard/achievements"
      className={`flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-full hover:bg-primary/20 transition-colors ${className}`}
    >
      <span>{getLevelIcon(stats.level.level)}</span>
      <span className="text-xs font-medium">Lv.{stats.level.level}</span>
    </a>
  );
}
