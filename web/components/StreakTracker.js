"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export default function StreakTracker({ variant = "full" }) {
  const { data: session } = useSession();
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);
  const [justExtended, setJustExtended] = useState(false);

  useEffect(() => {
    async function recordAndFetch() {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Record the visit
        const postRes = await fetch("/api/user/streak", { method: "POST" });
        if (postRes.ok) {
          const data = await postRes.json();
          setStreak(data);
          if (data.streak_extended) {
            setJustExtended(true);
            setTimeout(() => setJustExtended(false), 3000);
          }
        }
      } catch (err) {
        // Fallback: just fetch
        try {
          const getRes = await fetch("/api/user/streak");
          if (getRes.ok) setStreak(await getRes.json());
        } catch {
          // ignore
        }
      } finally {
        setLoading(false);
      }
    }
    recordAndFetch();
  }, [session?.user?.id]);

  if (loading || !session?.user?.id) {
    return null;
  }

  if (!streak) return null;

  const fireIntensity = streak.current_streak >= 30 ? 3 : streak.current_streak >= 7 ? 2 : streak.current_streak >= 1 ? 1 : 0;

  if (variant === "compact") {
    return (
      <div className={`rounded-xl border p-3 flex items-center gap-3 transition-all ${
        justExtended ? "bg-orange-500/10 border-orange-500/30" : "bg-base-200 border-base-300"
      }`}>
        <div className="text-xl">
          {fireIntensity >= 3 ? "\uD83D\uDD25" : fireIntensity >= 2 ? "\uD83D\uDD25" : fireIntensity >= 1 ? "\u2728" : "\u26AA"}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{streak.current_streak}</span>
            <span className="text-xs text-base-content/50">day streak</span>
          </div>
        </div>
        {justExtended && (
          <span className="text-xs text-orange-400 font-medium animate-bounce">+{streak.points_earned} pts</span>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${
      justExtended ? "bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/30" : "bg-base-200 border-base-300"
    }`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            {fireIntensity >= 2 ? "\uD83D\uDD25" : "\u2728"} Security Check Streak
          </h3>
          {justExtended && (
            <span className="text-xs font-medium text-orange-400 px-2 py-1 rounded-full bg-orange-400/10 animate-pulse">
              +{streak.points_earned} pts!
            </span>
          )}
        </div>

        {/* Current streak */}
        <div className="text-center mb-6">
          <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">
            {streak.current_streak}
          </div>
          <div className="text-sm text-base-content/60 mt-1">
            {streak.current_streak === 1 ? "day" : "days"} in a row
          </div>
          {streak.streak_broken && (
            <div className="text-xs text-red-400 mt-2">
              Streak reset! Previous: {streak.longest_streak} days
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 text-center mb-6">
          <div className="p-3 rounded-lg bg-base-300/30">
            <div className="text-lg font-bold">{streak.longest_streak}</div>
            <div className="text-xs text-base-content/50">Best Streak</div>
          </div>
          <div className="p-3 rounded-lg bg-base-300/30">
            <div className="text-lg font-bold">{streak.total_visits}</div>
            <div className="text-xs text-base-content/50">Total Visits</div>
          </div>
          <div className="p-3 rounded-lg bg-base-300/30">
            <div className="text-lg font-bold text-amber-400">{streak.streak_points_earned}</div>
            <div className="text-xs text-base-content/50">Streak Points</div>
          </div>
        </div>

        {/* Next milestone progress */}
        {streak.next_milestone && (
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-base-content/60">Next: {streak.next_milestone.label}</span>
              <span className="text-base-content/40">{streak.days_to_next} days to go</span>
            </div>
            <div className="h-2 bg-base-300 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${(streak.current_streak / streak.next_milestone.days) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Milestones */}
        {streak.milestones && (
          <div className="flex flex-wrap gap-2 mt-4">
            {streak.milestones.map((m) => (
              <span
                key={m.days}
                className={`text-xs px-2 py-1 rounded-full ${
                  m.unlocked
                    ? "bg-amber-400/20 text-amber-400 font-medium"
                    : "bg-base-300/50 text-base-content/30"
                }`}
              >
                {m.unlocked ? "\u2713" : "\u25CB"} {m.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
