"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

const STREAK_STORAGE_KEY = "safescoring_streak";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Hook for tracking daily login streaks
 * Persists to localStorage and syncs with server when authenticated
 */
export function useStreak() {
  const { data: session } = useSession();
  const [streak, setStreak] = useState({
    currentStreak: 0,
    longestStreak: 0,
    lastVisit: null,
    totalDays: 0,
  });
  const [justIncremented, setJustIncremented] = useState(false);

  // Sync streak with server (defined first to avoid reference issues)
  const syncWithServer = useCallback(async (streakData) => {
    try {
      await fetch("/api/user/streak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(streakData),
      });
    } catch (error) {
      console.error("Failed to sync streak:", error);
    }
  }, []);

  // Load streak from storage
  useEffect(() => {
    const stored = localStorage.getItem(STREAK_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setStreak(parsed);
      } catch (e) {
        console.error("Failed to parse streak data:", e);
      }
    }
  }, []);

  // Check and update streak on mount
  useEffect(() => {
    const checkStreak = () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayStr = today.toISOString().split("T")[0];

      let newStreak = { ...streak };

      if (!streak.lastVisit) {
        // First visit ever
        newStreak = {
          currentStreak: 1,
          longestStreak: 1,
          lastVisit: todayStr,
          totalDays: 1,
        };
        setJustIncremented(true);
      } else {
        const lastVisitDate = new Date(streak.lastVisit);
        const daysDiff = Math.floor(
          (today.getTime() - lastVisitDate.getTime()) / ONE_DAY_MS
        );

        if (daysDiff === 0) {
          // Same day, no change
          return;
        } else if (daysDiff === 1) {
          // Consecutive day - increment streak
          newStreak = {
            currentStreak: streak.currentStreak + 1,
            longestStreak: Math.max(streak.longestStreak, streak.currentStreak + 1),
            lastVisit: todayStr,
            totalDays: streak.totalDays + 1,
          };
          setJustIncremented(true);
        } else {
          // Streak broken - reset to 1
          newStreak = {
            currentStreak: 1,
            longestStreak: streak.longestStreak,
            lastVisit: todayStr,
            totalDays: streak.totalDays + 1,
          };
          setJustIncremented(true);
        }
      }

      setStreak(newStreak);
      localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(newStreak));

      // Sync with server if authenticated
      if (session?.user?.id) {
        syncWithServer(newStreak);
      }
    };

    // Small delay to ensure localStorage is loaded
    const timer = setTimeout(checkStreak, 100);
    return () => clearTimeout(timer);
  }, [streak.lastVisit, session?.user?.id, syncWithServer]);

  // Clear just incremented flag after a delay
  useEffect(() => {
    if (justIncremented) {
      const timer = setTimeout(() => setJustIncremented(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [justIncremented]);

  // Get next milestone
  const getNextMilestone = useCallback(() => {
    const milestones = [3, 7, 14, 30, 60, 90, 180, 365];
    for (const m of milestones) {
      if (streak.currentStreak < m) {
        return {
          target: m,
          remaining: m - streak.currentStreak,
          progress: (streak.currentStreak / m) * 100,
        };
      }
    }
    return { target: 365, remaining: 0, progress: 100 };
  }, [streak.currentStreak]);

  return {
    ...streak,
    justIncremented,
    nextMilestone: getNextMilestone(),
  };
}

/**
 * Streak Display Component
 */
export function StreakDisplay({ size = "md", showDetails = true }) {
  const { currentStreak, longestStreak, justIncremented, nextMilestone } = useStreak();

  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <div className={`flex items-center gap-2 ${sizeClasses[size]}`}>
      {/* Fire icon with animation */}
      <div className={`relative ${justIncremented ? "animate-bounce" : ""}`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`${iconSizes[size]} ${
            currentStreak >= 7
              ? "text-orange-500"
              : currentStreak >= 3
              ? "text-amber-500"
              : "text-base-content/40"
          }`}
        >
          <path
            fillRule="evenodd"
            d="M12.963 2.286a.75.75 0 00-1.071-.136 9.742 9.742 0 00-3.539 6.177A7.547 7.547 0 016.648 6.61a.75.75 0 00-1.152.082A9 9 0 1015.68 4.534a7.46 7.46 0 01-2.717-2.248zM15.75 14.25a3.75 3.75 0 11-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 011.925-3.545 3.75 3.75 0 013.255 3.717z"
            clipRule="evenodd"
          />
        </svg>
        {justIncremented && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
          </span>
        )}
      </div>

      {/* Streak count */}
      <span className="font-bold">{currentStreak}</span>
      <span className="text-base-content/60">day streak</span>

      {/* Progress to next milestone */}
      {showDetails && nextMilestone.remaining > 0 && (
        <div className="tooltip" data-tip={`${nextMilestone.remaining} days to ${nextMilestone.target}-day badge`}>
          <div className="w-16 h-1.5 bg-base-300 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
              style={{ width: `${nextMilestone.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default useStreak;
