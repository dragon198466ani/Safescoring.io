"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

/**
 * SeniorityTracker - Shows user's seniority and airdrop multiplier progression
 * Encourages early sign-up and continued engagement
 */
export default function SeniorityTracker() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function fetchStats() {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/corrections");
        if (res.ok) {
          const data = await res.json();
          setStats(data.reputation);
        }
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [session?.user?.id]);

  if (!session) {
    return null;
  }

  // Calculate seniority metrics
  const joinDate = session.user.created_at || stats?.created_at || new Date().toISOString();
  const daysSinceJoined = Math.floor(
    (new Date() - new Date(joinDate)) / (1000 * 60 * 60 * 24)
  );
  const seniorityMultiplier = Math.min(2.0, 1 + (daysSinceJoined / 365));

  // Calculate progress to next milestone
  const milestones = [
    { days: 30, label: "1 Month", multiplier: 1.08 },
    { days: 90, label: "3 Months", multiplier: 1.25 },
    { days: 180, label: "6 Months", multiplier: 1.5 },
    { days: 365, label: "1 Year", multiplier: 2.0 },
  ];

  const currentMilestone = milestones.filter(m => daysSinceJoined >= m.days).pop();
  const nextMilestone = milestones.find(m => daysSinceJoined < m.days);

  const progressToNext = nextMilestone
    ? ((daysSinceJoined - (currentMilestone?.days || 0)) / (nextMilestone.days - (currentMilestone?.days || 0))) * 100
    : 100;

  if (loading) {
    return (
      <div className="rounded-xl bg-base-200 border border-base-300 p-4 animate-pulse">
        <div className="h-4 bg-base-300 rounded w-1/3 mb-3"></div>
        <div className="h-8 bg-base-300 rounded w-1/2 mb-2"></div>
        <div className="h-2 bg-base-300 rounded w-full"></div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-base-200 border border-base-300 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-base-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-medium">Seniority Tracker</span>
          </div>
          <span className="text-sm text-blue-400 font-mono">x{seniorityMultiplier.toFixed(2)}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Days active */}
        <div className="text-center">
          <div className="text-3xl font-bold">{daysSinceJoined}</div>
          <div className="text-sm text-base-content/60">days as contributor</div>
        </div>

        {/* Progress bar */}
        {nextMilestone && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-base-content/50">
              <span>{currentMilestone?.label || "Start"}</span>
              <span>{nextMilestone.label}</span>
            </div>
            <div className="h-2 bg-base-300 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                style={{ width: `${Math.min(100, progressToNext)}%` }}
              />
            </div>
            <div className="text-center text-xs text-base-content/50">
              {nextMilestone.days - daysSinceJoined} days until x{nextMilestone.multiplier} multiplier
            </div>
          </div>
        )}

        {!nextMilestone && (
          <div className="text-center p-3 rounded-lg bg-gradient-to-r from-amber-500/20 to-purple-500/20">
            <span className="text-amber-400 font-medium">Max Seniority Reached!</span>
            <p className="text-xs text-base-content/50 mt-1">You have the maximum x2.0 multiplier</p>
          </div>
        )}

        {/* Milestones */}
        <div className="space-y-2">
          {milestones.map((milestone, index) => {
            const achieved = daysSinceJoined >= milestone.days;
            return (
              <div
                key={index}
                className={`flex items-center justify-between p-2 rounded-lg ${
                  achieved ? "bg-green-500/10" : "bg-base-300/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  {achieved ? (
                    <svg
                      className="w-4 h-4 text-green-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-base-content/30" />
                  )}
                  <span className={`text-sm ${achieved ? "text-green-400" : "text-base-content/50"}`}>
                    {milestone.label}
                  </span>
                </div>
                <span className={`text-sm font-mono ${achieved ? "text-green-400" : "text-base-content/40"}`}>
                  x{milestone.multiplier}
                </span>
              </div>
            );
          })}
        </div>

        {/* Join date */}
        <div className="text-center text-xs text-base-content/40 pt-2 border-t border-base-300">
          Member since {new Date(joinDate).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric"
          })}
        </div>
      </div>
    </div>
  );
}
