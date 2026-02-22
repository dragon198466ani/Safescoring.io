"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { QUEST_CATEGORIES } from "@/libs/quest-definitions";

export default function QuestPanel() {
  const { data: session } = useSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedQuest, setExpandedQuest] = useState(null);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    async function fetchQuests() {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/user/quests");
        if (res.ok) setData(await res.json());
      } catch (err) {
        console.error("Failed to fetch quests:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchQuests();
  }, [session?.user?.id]);

  const completeStep = async (questCode, stepKey) => {
    setUpdating(`${questCode}-${stepKey}`);
    try {
      const res = await fetch("/api/user/quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quest_code: questCode, step_key: stepKey }),
      });
      if (res.ok) {
        // Refresh quests
        const refreshRes = await fetch("/api/user/quests");
        if (refreshRes.ok) setData(await refreshRes.json());
      }
    } catch (err) {
      console.error("Failed to complete step:", err);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-base-200 border border-base-300 p-6 animate-pulse">
        <div className="h-6 bg-base-300 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-base-300 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || !session?.user?.id) return null;

  const { quests, summary } = data;

  return (
    <div className="rounded-2xl bg-base-200 border border-base-300 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-base-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <span className="text-lg">🗺️</span>
            </div>
            <div>
              <h2 className="font-semibold">Quest Paths</h2>
              <p className="text-sm text-base-content/60">
                {summary.completed} / {summary.total} completed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-20 h-2 bg-base-300 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-400 to-primary rounded-full transition-all"
                style={{ width: `${(summary.completed / summary.total) * 100}%` }}
              />
            </div>
            <span className="text-xs text-base-content/50">
              {Math.round((summary.completed / summary.total) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Quest list */}
      <div className="p-4 space-y-3">
        {quests.map((quest) => {
          const isExpanded = expandedQuest === quest.code;
          const catStyle = QUEST_CATEGORIES[quest.category] || QUEST_CATEGORIES.learning;
          const progressPct = (quest.current_step / quest.total_steps) * 100;

          return (
            <div
              key={quest.code}
              className={`rounded-xl border transition-all ${
                quest.completed
                  ? "bg-gradient-to-br from-green-500/10 to-base-200 border-green-500/30"
                  : `bg-gradient-to-br ${catStyle.color}`
              }`}
            >
              {/* Quest header */}
              <button
                onClick={() => setExpandedQuest(isExpanded ? null : quest.code)}
                className="w-full p-4 flex items-center gap-3 text-left"
              >
                <span className="text-2xl">{quest.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{quest.name}</h3>
                    {quest.completed && <span className="badge badge-success badge-xs">Done</span>}
                  </div>
                  <p className="text-xs text-base-content/50 truncate">{quest.description}</p>
                  {/* Mini progress bar */}
                  <div className="w-full h-1.5 bg-base-300/50 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        quest.completed ? "bg-green-400" : "bg-primary"
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs text-base-content/50">
                    {quest.current_step}/{quest.total_steps}
                  </span>
                  <div className="text-xs font-bold text-primary mt-1">
                    +{quest.reward_points} pts
                  </div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {/* Expanded steps */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-2">
                  {quest.steps.map((step, i) => {
                    const isDone = quest.progress[step.key];
                    const isUpdating = updating === `${quest.code}-${step.key}`;

                    return (
                      <div
                        key={step.key}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          isDone ? "bg-green-500/10" : "bg-base-100/50"
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isDone ? "bg-green-500 text-white" : "bg-base-300 text-base-content/50"
                        }`}>
                          {isDone ? "✓" : i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${isDone ? "line-through text-base-content/40" : ""}`}>
                            {step.label}
                          </p>
                          <p className="text-xs text-base-content/40">{step.description}</p>
                        </div>
                        {!isDone && !quest.completed && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              completeStep(quest.code, step.key);
                            }}
                            disabled={isUpdating}
                            className="btn btn-xs btn-ghost"
                          >
                            {isUpdating ? (
                              <span className="loading loading-spinner loading-xs" />
                            ) : (
                              "Done"
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
