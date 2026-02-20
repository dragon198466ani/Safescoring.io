"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/libs/i18n/LanguageProvider";
import { useConfetti, ConfettiCanvas } from "./Confetti";

/**
 * Achievement types and their criteria
 */
const ACHIEVEMENTS = {
  securityExpert: {
    id: "securityExpert",
    icon: "shield",
    color: "from-emerald-500 to-green-600",
    criteria: (stats) => stats.stackScore >= 90,
  },
  researcher: {
    id: "researcher",
    icon: "magnifier",
    color: "from-blue-500 to-indigo-600",
    criteria: (stats) => stats.comparisonsCount >= 10,
  },
  pioneer: {
    id: "pioneer",
    icon: "flag",
    color: "from-purple-500 to-pink-600",
    criteria: (stats) => stats.firstReview === true,
  },
  contributor: {
    id: "contributor",
    icon: "star",
    color: "from-amber-500 to-orange-600",
    criteria: (stats) => stats.validCorrections >= 5,
  },
  verified: {
    id: "verified",
    icon: "check",
    color: "from-cyan-500 to-teal-600",
    criteria: (stats) => stats.emailVerified && stats.walletLinked,
  },
  earlyAdopter: {
    id: "earlyAdopter",
    icon: "rocket",
    color: "from-rose-500 to-red-600",
    criteria: (stats) => stats.signupDate && new Date(stats.signupDate) < new Date("2025-06-01"),
  },
  // STREAK ACHIEVEMENTS
  streak3: {
    id: "streak3",
    icon: "fire",
    color: "from-orange-400 to-red-500",
    criteria: (stats) => stats.currentStreak >= 3,
  },
  streak7: {
    id: "streak7",
    icon: "fire",
    color: "from-orange-500 to-red-600",
    criteria: (stats) => stats.currentStreak >= 7,
  },
  streak30: {
    id: "streak30",
    icon: "fire",
    color: "from-yellow-400 via-orange-500 to-red-600",
    criteria: (stats) => stats.currentStreak >= 30,
  },
};

/**
 * Icon components for achievements
 */
const AchievementIcons = {
  shield: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516 11.209 11.209 0 01-7.877-3.08z" clipRule="evenodd" />
    </svg>
  ),
  magnifier: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
    </svg>
  ),
  flag: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path fillRule="evenodd" d="M3 2.25a.75.75 0 01.75.75v.54l1.838-.46a9.75 9.75 0 016.725.738l.108.054a8.25 8.25 0 005.58.652l3.109-.732a.75.75 0 01.917.81 47.784 47.784 0 00.005 10.337.75.75 0 01-.574.812l-3.114.733a9.75 9.75 0 01-6.594-.77l-.108-.054a8.25 8.25 0 00-5.69-.625l-2.202.55V21a.75.75 0 01-1.5 0V3A.75.75 0 013 2.25z" clipRule="evenodd" />
    </svg>
  ),
  star: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
    </svg>
  ),
  check: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
  ),
  rocket: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path fillRule="evenodd" d="M9.315 7.584C12.195 3.883 16.695 1.5 21.75 1.5a.75.75 0 01.75.75c0 5.056-2.383 9.555-6.084 12.436A6.75 6.75 0 019.75 22.5a.75.75 0 01-.75-.75v-4.131A15.838 15.838 0 016.382 15H2.25a.75.75 0 01-.75-.75 6.75 6.75 0 017.815-6.666zM15 6.75a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" clipRule="evenodd" />
      <path d="M5.26 17.242a.75.75 0 10-.897-1.203 5.243 5.243 0 00-2.05 5.022.75.75 0 00.625.627 5.243 5.243 0 005.022-2.051.75.75 0 10-1.202-.897 3.744 3.744 0 01-3.008 1.51c0-1.23.592-2.323 1.51-3.008z" />
    </svg>
  ),
  fire: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path fillRule="evenodd" d="M12.963 2.286a.75.75 0 00-1.071-.136 9.742 9.742 0 00-3.539 6.177A7.547 7.547 0 016.648 6.61a.75.75 0 00-1.152.082A9 9 0 1015.68 4.534a7.46 7.46 0 01-2.717-2.248zM15.75 14.25a3.75 3.75 0 11-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 011.925-3.545 3.75 3.75 0 013.255 3.717z" clipRule="evenodd" />
    </svg>
  ),
};

/**
 * AchievementBadge - Display a single achievement
 */
const AchievementBadge = ({
  achievementId,
  unlocked = false,
  size = "md",
  showLabel = true,
  showTooltip = true,
  className = "",
}) => {
  const { t } = useTranslation();

  const achievement = ACHIEVEMENTS[achievementId];
  if (!achievement) return null;

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-20 h-20",
  };

  const title = t(`achievements.${achievementId}`) || achievementId;
  const description = t(`achievements.${achievementId}Desc`) || "";

  return (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
      <div
        className={`relative ${sizeClasses[size]} ${showTooltip ? "tooltip" : ""}`}
        data-tip={showTooltip ? `${title}: ${description}` : undefined}
      >
        {/* Badge container */}
        <div
          className={`
            w-full h-full rounded-full p-2
            ${unlocked
              ? `bg-gradient-to-br ${achievement.color} shadow-lg`
              : "bg-base-300 grayscale opacity-50"
            }
            transition-all duration-300
          `}
        >
          <div className="w-full h-full text-white">
            {AchievementIcons[achievement.icon]}
          </div>
        </div>

        {/* Unlocked glow effect */}
        {unlocked && (
          <div
            className={`absolute inset-0 rounded-full bg-gradient-to-br ${achievement.color} opacity-30 blur-md -z-10`}
          />
        )}

        {/* Lock icon for locked achievements */}
        {!unlocked && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-base-100 rounded-full flex items-center justify-center border border-base-300">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-2.5 h-2.5 text-base-content/40">
              <path fillRule="evenodd" d="M8 1a3.5 3.5 0 00-3.5 3.5V7A1.5 1.5 0 003 8.5v5A1.5 1.5 0 004.5 15h7a1.5 1.5 0 001.5-1.5v-5A1.5 1.5 0 0011.5 7V4.5A3.5 3.5 0 008 1zm2 6V4.5a2 2 0 10-4 0V7h4z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* Label */}
      {showLabel && (
        <span className={`text-xs text-center ${unlocked ? "text-base-content" : "text-base-content/40"}`}>
          {title}
        </span>
      )}
    </div>
  );
};

/**
 * AchievementGrid - Display all achievements for a user
 */
export const AchievementGrid = ({
  userStats = {},
  size = "md",
  showLocked = true,
  className = "",
}) => {
  const { t } = useTranslation();

  const achievementList = Object.keys(ACHIEVEMENTS).map((id) => ({
    id,
    unlocked: ACHIEVEMENTS[id].criteria(userStats),
  }));

  const unlockedCount = achievementList.filter((a) => a.unlocked).length;
  const totalCount = achievementList.length;

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{t("achievements.title") || "Achievements"}</h3>
        <span className="text-sm text-base-content/60">
          {unlockedCount}/{totalCount} {t("achievements.unlocked") || "unlocked"}
        </span>
      </div>

      {/* Grid */}
      <div className="flex flex-wrap gap-4">
        {achievementList
          .filter((a) => showLocked || a.unlocked)
          .map((achievement) => (
            <AchievementBadge
              key={achievement.id}
              achievementId={achievement.id}
              unlocked={achievement.unlocked}
              size={size}
            />
          ))}
      </div>
    </div>
  );
};

/**
 * AchievementNotification - Toast-style notification for new achievements
 * Now with confetti celebration!
 */
export const AchievementNotification = ({
  achievementId,
  onClose,
  autoClose = 5000,
}) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(true);
  const { canvasRef, burst } = useConfetti();
  const hasFiredRef = useRef(false);

  // Fire confetti on mount
  useEffect(() => {
    if (!hasFiredRef.current) {
      hasFiredRef.current = true;
      // Small delay to ensure canvas is ready
      setTimeout(() => burst(), 100);
    }
  }, [burst]);

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, autoClose);
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose]);

  if (!visible) return null;

  const achievement = ACHIEVEMENTS[achievementId];
  if (!achievement) return null;

  return (
    <>
      {/* Confetti Canvas */}
      <ConfettiCanvas confettiRef={canvasRef} />

      {/* Achievement Toast */}
      <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
        <div className="alert bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 shadow-2xl max-w-sm">
          <AchievementBadge
            achievementId={achievementId}
            unlocked={true}
            size="lg"
            showLabel={false}
            showTooltip={false}
          />
          <div>
            <h4 className="font-bold text-lg">
              {t("achievements.newUnlock") || "Achievement Unlocked!"}
            </h4>
            <p className="text-sm">
              {t(`achievements.${achievementId}`) || achievementId}
            </p>
          </div>
          <button
            onClick={() => {
              setVisible(false);
              onClose?.();
            }}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
};

export default AchievementBadge;
export { ACHIEVEMENTS };
