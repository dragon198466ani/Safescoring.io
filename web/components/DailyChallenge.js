"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function DailyChallenge() {
  const { data: session } = useSession();
  const [challenge, setChallenge] = useState(null);
  const [cta, setCta] = useState("/dashboard");
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);

  useEffect(() => {
    async function fetchChallenge() {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/user/challenges");
        if (res.ok) {
          const data = await res.json();
          setChallenge(data.challenge);
          setCta(data.cta || "/dashboard");
        }
      } catch (err) {
        console.error("Failed to fetch challenge:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchChallenge();
  }, [session?.user?.id]);

  const completeChallenge = async () => {
    setCompleting(true);
    try {
      const res = await fetch("/api/user/challenges", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setChallenge(data.challenge);
        setPointsEarned(data.points_earned);
        setJustCompleted(true);
      }
    } catch (err) {
      console.error("Failed to complete challenge:", err);
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-base-200 border border-base-300 p-6 animate-pulse">
        <div className="h-5 bg-base-300 rounded w-1/3 mb-3" />
        <div className="h-4 bg-base-300 rounded w-2/3 mb-4" />
        <div className="h-10 bg-base-300 rounded w-1/3" />
      </div>
    );
  }

  if (!challenge || !session?.user?.id) return null;

  const isCompleted = challenge.completed;

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${
      isCompleted
        ? "bg-gradient-to-br from-green-500/10 to-base-200 border-green-500/30"
        : "bg-gradient-to-br from-primary/10 to-base-200 border-primary/30"
    }`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{isCompleted ? "✅" : "🎯"}</span>
            <h3 className="font-semibold text-sm">Daily Challenge</h3>
          </div>
          <span className={`badge badge-sm ${isCompleted ? "badge-success" : "badge-primary"}`}>
            +{challenge.points_value} pts
          </span>
        </div>

        {/* Challenge content */}
        <h4 className="font-bold text-lg mb-1">{challenge.challenge_title}</h4>
        <p className="text-sm text-base-content/60 mb-4">{challenge.challenge_description}</p>

        {/* Points animation */}
        {justCompleted && (
          <div className="mb-3 animate-bounce text-center">
            <span className="text-2xl font-black text-green-400">+{pointsEarned} pts!</span>
          </div>
        )}

        {/* Action */}
        {isCompleted ? (
          <div className="text-center">
            <p className="text-sm text-green-400 font-medium">
              Challenge completed! Come back tomorrow for a new one 🔥
            </p>
          </div>
        ) : (
          <div className="flex gap-2">
            <Link href={cta} className="btn btn-primary btn-sm flex-1">
              Go do it
            </Link>
            <button
              onClick={completeChallenge}
              disabled={completing}
              className="btn btn-outline btn-success btn-sm"
            >
              {completing ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                "Done ✓"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
