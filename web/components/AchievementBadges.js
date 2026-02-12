"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

const iconMap = {
  door: "\uD83D\uDEAA",
  setup: "\uD83D\uDEE0\uFE0F",
  fire: "\uD83D\uDD25",
  shield: "\uD83D\uDEE1\uFE0F",
  crown: "\uD83D\uDC51",
  trophy: "\uD83C\uDFC6",
  star: "\u2B50",
  layers: "\uD83D\uDCDA",
  check: "\u2705",
  rocket: "\uD83D\uDE80",
  stack: "\uD83C\uDFD7\uFE0F",
  balance: "\u2696\uFE0F",
};

const categoryColors = {
  engagement: "from-blue-500/20 to-blue-600/20 border-blue-500/30",
  streak: "from-orange-500/20 to-amber-500/20 border-orange-500/30",
  score: "from-green-500/20 to-emerald-500/20 border-green-500/30",
  setup: "from-purple-500/20 to-violet-500/20 border-purple-500/30",
  community: "from-cyan-500/20 to-teal-500/20 border-cyan-500/30",
  special: "from-amber-500/20 to-yellow-500/20 border-amber-500/30",
};

export default function AchievementBadges({ showAll = true }) {
  const { data: session } = useSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAchievements() {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/user/achievements");
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error("Failed to fetch achievements:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAchievements();
  }, [session?.user?.id]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-base-200 border border-base-300 p-6 animate-pulse">
        <div className="h-6 bg-base-300 rounded w-1/3 mb-4" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 bg-base-300 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || !session?.user?.id) return null;

  const achievements = showAll ? data.achievements : data.achievements.filter((a) => a.unlocked);

  if (achievements.length === 0) return null;

  return (
    <div className="rounded-2xl bg-base-200 border border-base-300 overflow-hidden">
      <div className="p-6 border-b border-base-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <span className="text-lg">{"\uD83C\uDFC5"}</span>
            </div>
            <div>
              <h2 className="font-semibold">Achievements</h2>
              <p className="text-sm text-base-content/60">
                {data.unlocked} / {data.total} unlocked
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-base-300 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-purple-400 rounded-full transition-all"
                style={{ width: `${(data.unlocked / data.total) * 100}%` }}
              />
            </div>
            <span className="text-xs text-base-content/50">
              {Math.round((data.unlocked / data.total) * 100)}%
            </span>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {achievements.map((achievement) => {
            const colorClass = categoryColors[achievement.category] || categoryColors.engagement;
            return (
              <div
                key={achievement.code}
                className={`relative p-4 rounded-xl border text-center transition-all ${
                  achievement.unlocked
                    ? `bg-gradient-to-br ${colorClass} hover:scale-105 cursor-default`
                    : "bg-base-300/20 border-base-300/50 opacity-50 grayscale"
                }`}
              >
                <div className="text-2xl mb-2">
                  {iconMap[achievement.icon] || "\u2753"}
                </div>
                <p className="text-xs font-semibold line-clamp-1">{achievement.name}</p>
                <p className="text-xs text-base-content/50 mt-1 line-clamp-2">
                  {achievement.description}
                </p>
                {achievement.unlocked && achievement.unlocked_at && (
                  <p className="text-xs text-base-content/30 mt-2">
                    {new Date(achievement.unlocked_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                )}
                {!achievement.unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl opacity-20">{"\uD83D\uDD12"}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
