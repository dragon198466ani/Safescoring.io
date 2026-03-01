"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import SwipeCardStack from "./SwipeCardStack";
import ProofModal from "./ProofModal";

/**
 * SwipeVoting - Tinder-style voting to earn $SAFE tokens
 * Vote YES/NO on AI evaluations. Earn tokens for every vote.
 * Bonus tokens when your vote matches the community consensus.
 */
export default function SwipeVoting({
  productSlug = null,
  pillar = null,
  maxItems = 10,
  onComplete = null,
  onVoteSubmitted = null,
}) {
  const { data: session, status } = useSession();
  const stackRef = useRef(null);

  const [evaluations, setEvaluations] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Always blind mode — avoids anchoring bias
  const blindMode = true;

  const [showReveal, setShowReveal] = useState(false);
  const [revealData, setRevealData] = useState(null);

  const [showProofModal, setShowProofModal] = useState(false);
  const [lastVotedEvaluation, setLastVotedEvaluation] = useState(null);

  const [tokenReward, setTokenReward] = useState(null);
  const [sessionTokens, setSessionTokens] = useState(0);
  const [userStats, setUserStats] = useState(null);
  const [dailyQuota, setDailyQuota] = useState(null);

  // Fetch evaluations
  const fetchEvaluations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: maxItems.toString(),
        filter: "not_voted",
      });

      if (productSlug) params.append("productSlug", productSlug);
      if (pillar) params.append("pillar", pillar);

      const res = await fetch(`/api/community/evaluation-vote?${params}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load evaluations");
      }

      setEvaluations(data.evaluations || []);
      setUserStats(data.userStats);
      setDailyQuota(data.dailyQuota);
    } catch (err) {
      console.error("[SwipeVoting] Fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [maxItems, productSlug, pillar]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchEvaluations();
    }
  }, [status, fetchEvaluations]);

  // Handle swipe — instant vote with reveal
  const handleSwipe = useCallback(
    async (direction) => {
      const evaluation = evaluations[currentIndex];
      if (!evaluation || isSubmitting) return;

      const isAgree = direction === "right";

      setIsSubmitting(true);
      try {
        const res = await fetch("/api/community/evaluation-vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            evaluationId: evaluation.id,
            voteAgrees: isAgree,
          }),
        });

        const result = await res.json();

        if (!res.ok) {
          throw new Error(result.error || "Vote failed");
        }

        const earned = result.tokensEarned || 1;
        showTokenRewardAnim(earned);
        setSessionTokens((prev) => prev + earned);
        setUserStats(result.userStats);
        setDailyQuota(result.dailyQuota);

        setLastVotedEvaluation({ ...evaluation, voteAgrees: isAgree });

        // Reveal: compare user vs AI
        const userVotedYes = isAgree;
        const aiSaidYes = evaluation.ai_result === "YES";
        const match = (userVotedYes && aiSaidYes) || (!userVotedYes && !aiSaidYes);

        setRevealData({
          evaluation,
          userVote: isAgree,
          aiResult: evaluation.ai_result,
          aiJustification: evaluation.ai_justification,
          match,
          communityDecision: result.communityDecision,
          validationResult: result.validationResult,
        });
        setShowReveal(true);

        onVoteSubmitted?.({
          evaluationId: evaluation.id,
          voteAgrees: isAgree,
          tokensEarned: earned,
        });
      } catch (err) {
        console.error("[SwipeVoting] Vote error:", err);
        setError(err.message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [evaluations, currentIndex, isSubmitting, onVoteSubmitted]
  );

  const closeReveal = useCallback(() => {
    setShowReveal(false);
    setRevealData(null);
    setCurrentIndex((prev) => prev + 1);
  }, []);

  const submitProof = async ({ evidenceUrl, evidenceType }) => {
    if (!lastVotedEvaluation) return;

    try {
      const res = await fetch("/api/community/evaluation-vote/proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evaluationId: lastVotedEvaluation.id,
          evidenceUrl,
          evidenceType,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Error");
      }

      showTokenRewardAnim(result.bonusTokens || 2);
      setSessionTokens((prev) => prev + (result.bonusTokens || 2));
      setUserStats(result.userStats);
      setShowProofModal(false);
      setLastVotedEvaluation(null);
    } catch (err) {
      console.error("[SwipeVoting] Proof error:", err);
    }
  };

  const showTokenRewardAnim = (amount) => {
    setTokenReward(amount);
    setTimeout(() => setTokenReward(null), 1500);
  };

  const handleQuickYes = () => {
    if (!isSubmitting && currentIndex < evaluations.length) handleSwipe("right");
  };

  const handleQuickNo = () => {
    if (!isSubmitting && currentIndex < evaluations.length) handleSwipe("left");
  };

  // Completion callback
  useEffect(() => {
    if (currentIndex >= evaluations.length && evaluations.length > 0 && !loading) {
      onComplete?.();
    }
  }, [currentIndex, evaluations.length, loading, onComplete]);

  // ── Not authenticated ──
  if (status === "unauthenticated") {
    return (
      <div className="text-center py-16 px-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-2">Sign in to Vote</h3>
        <p className="text-base-content/60 mb-6 max-w-xs mx-auto">
          Earn <span className="font-bold text-primary">$SAFE tokens</span> by verifying AI evaluations
        </p>
        <a href="/api/auth/signin?callbackUrl=/community" className="btn btn-primary">Sign In</a>
      </div>
    );
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
        <p className="text-sm text-base-content/50">Loading evaluations...</p>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="text-center py-16 px-4">
        <div className="w-14 h-14 rounded-2xl bg-error/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold mb-1">Something went wrong</h3>
        <p className="text-sm text-base-content/60 mb-4">{error}</p>
        <button onClick={fetchEvaluations} className="btn btn-primary btn-sm">Retry</button>
      </div>
    );
  }

  // ── No evaluations available ──
  if (evaluations.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-2">All caught up!</h3>
        <p className="text-sm text-base-content/60 mb-6 max-w-xs mx-auto">
          No evaluations left to vote on. Come back later for new ones.
        </p>
        {userStats && (
          <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-5 py-2.5">
            <span className="text-primary font-bold text-lg">{userStats.total_earned || 0}</span>
            <span className="text-sm text-base-content/60">$SAFE earned</span>
          </div>
        )}
      </div>
    );
  }

  // ── Session complete ──
  if (currentIndex >= evaluations.length) {
    return (
      <div className="text-center py-16 px-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-amber-400/20 flex items-center justify-center mx-auto mb-5">
          <span className="text-4xl">&#127942;</span>
        </div>
        <h3 className="text-2xl font-bold mb-2">Session Complete!</h3>
        <p className="text-sm text-base-content/60 mb-6">
          You voted on {evaluations.length} evaluation{evaluations.length > 1 ? "s" : ""}
        </p>

        {/* Session summary */}
        <div className="inline-flex flex-col gap-3 items-center mb-6">
          <div className="flex items-center gap-3 bg-base-200 rounded-xl px-6 py-3">
            <div className="text-center">
              <div className="text-2xl font-black text-primary">+{sessionTokens}</div>
              <div className="text-[10px] text-base-content/50 uppercase font-medium">$SAFE earned</div>
            </div>
            {userStats?.daily_streak > 1 && (
              <>
                <div className="w-px h-8 bg-base-content/10"></div>
                <div className="text-center">
                  <div className="text-2xl font-black text-amber-400">{userStats.daily_streak}</div>
                  <div className="text-[10px] text-base-content/50 uppercase font-medium">Day streak</div>
                </div>
              </>
            )}
          </div>
        </div>

        <button onClick={fetchEvaluations} className="btn btn-primary">
          Vote More
        </button>
      </div>
    );
  }

  // ── MAIN VOTING UI ──
  const quotaUsed = dailyQuota?.used || 0;
  const quotaMax = dailyQuota?.max || 10;
  const quotaPct = Math.min(100, (quotaUsed / quotaMax) * 100);

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto px-4">

      {/* ── TOP BAR: tokens + progress + quota ── */}
      <div className="w-full flex items-center justify-between mb-3">
        {/* Tokens earned this session */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-primary/10 rounded-full px-3 py-1">
            <span className="text-sm font-bold text-primary">{sessionTokens}</span>
            <span className="text-xs text-primary/70">$SAFE</span>
          </div>
          {userStats?.daily_streak > 1 && (
            <span className="text-sm text-amber-400 font-medium">&#128293; {userStats.daily_streak}d</span>
          )}
        </div>

        {/* Daily quota */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-base-content/40">
            {quotaUsed}/{quotaMax} today
          </span>
          <div className="w-8 h-8 relative">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                className="text-base-content/10"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                className={quotaPct >= 90 ? "text-red-400" : "text-primary"}
                strokeWidth="3"
                strokeDasharray={`${quotaPct}, 100`}
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Session progress bar ── */}
      <div className="w-full mb-4">
        <div className="flex items-center justify-between text-[10px] text-base-content/40 mb-1 uppercase font-medium tracking-wide">
          <span>Progress</span>
          <span>{currentIndex + 1} of {evaluations.length}</span>
        </div>
        <div className="w-full h-1 bg-base-content/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((currentIndex) / evaluations.length) * 100}%` }}
          />
        </div>
      </div>

      {/* ── Card stack ── */}
      <SwipeCardStack
        ref={stackRef}
        evaluations={evaluations}
        currentIndex={currentIndex}
        onSwipe={handleSwipe}
        disabled={isSubmitting}
        blindMode={blindMode}
      />

      {/* ── Action buttons ── */}
      <div className="flex items-center justify-center gap-6 py-5">
        {/* NO button */}
        <button
          onClick={handleQuickNo}
          disabled={isSubmitting}
          className="group flex flex-col items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Vote NO"
        >
          <div className="w-16 h-16 rounded-full border-2 border-red-500/80 text-red-500
                          flex items-center justify-center
                          group-hover:bg-red-500/10 group-active:scale-90
                          transition-all duration-150">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span className="text-[10px] font-bold text-red-400/70 uppercase">No</span>
        </button>

        {/* YES button */}
        <button
          onClick={handleQuickYes}
          disabled={isSubmitting}
          className="group flex flex-col items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Vote YES"
        >
          <div className="w-16 h-16 rounded-full border-2 border-green-500/80 text-green-500
                          flex items-center justify-center
                          group-hover:bg-green-500/10 group-active:scale-90
                          transition-all duration-150">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-[10px] font-bold text-green-400/70 uppercase">Yes</span>
        </button>
      </div>

      {/* ── Optional proof button ── */}
      {lastVotedEvaluation && !showProofModal && !showReveal && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
          <button
            onClick={() => setShowProofModal(true)}
            className="btn btn-sm btn-outline btn-primary gap-2 shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Add source (+2 $SAFE)
          </button>
        </div>
      )}

      {/* ── Proof modal ── */}
      <ProofModal
        isOpen={showProofModal}
        onClose={() => {
          setShowProofModal(false);
          setLastVotedEvaluation(null);
        }}
        onSubmit={submitProof}
        evaluation={lastVotedEvaluation}
      />

      {/* ── Reveal modal — shows AI result after vote ── */}
      {showReveal && revealData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4" onClick={closeReveal}>
          <div className="bg-base-200 rounded-2xl max-w-sm w-full shadow-2xl animate-scale-in overflow-hidden" onClick={(e) => e.stopPropagation()}>

            {/* Match header — full-width colored bar */}
            <div className={`py-5 text-center ${
              revealData.match
                ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20"
                : "bg-gradient-to-r from-amber-500/20 to-orange-500/20"
            }`}>
              <div className="text-4xl mb-2">{revealData.match ? "&#127919;" : "&#129300;"}</div>
              <h3 className={`text-lg font-bold ${revealData.match ? "text-green-400" : "text-amber-400"}`}>
                {revealData.match ? "You matched the AI!" : "Different opinion"}
              </h3>
              <p className="text-xs text-base-content/50 mt-0.5">
                {revealData.match ? "Great intuition — bonus pending" : "Your vote counts toward consensus"}
              </p>
            </div>

            {/* Comparison row */}
            <div className="px-5 py-4">
              <div className="flex items-stretch gap-3 mb-4">
                {/* Your vote */}
                <div className={`flex-1 p-3 rounded-xl text-center border ${
                  revealData.userVote
                    ? "bg-green-500/10 border-green-500/20"
                    : "bg-red-500/10 border-red-500/20"
                }`}>
                  <p className="text-[10px] text-base-content/40 uppercase font-medium mb-1">You</p>
                  <p className={`text-xl font-black ${revealData.userVote ? "text-green-400" : "text-red-400"}`}>
                    {revealData.userVote ? "YES" : "NO"}
                  </p>
                </div>

                {/* VS */}
                <div className="flex items-center">
                  <span className="text-xs font-bold text-base-content/20">VS</span>
                </div>

                {/* AI verdict */}
                <div className={`flex-1 p-3 rounded-xl text-center border ${
                  revealData.aiResult === "YES"
                    ? "bg-green-500/10 border-green-500/20"
                    : revealData.aiResult === "NO"
                      ? "bg-red-500/10 border-red-500/20"
                      : "bg-amber-500/10 border-amber-500/20"
                }`}>
                  <p className="text-[10px] text-base-content/40 uppercase font-medium mb-1">AI</p>
                  <p className={`text-xl font-black ${
                    revealData.aiResult === "YES" ? "text-green-400" :
                    revealData.aiResult === "NO" ? "text-red-400" : "text-amber-400"
                  }`}>
                    {revealData.aiResult === "YES" ? "YES" :
                     revealData.aiResult === "NO" ? "NO" : "PARTIAL"}
                  </p>
                </div>
              </div>

              {/* AI justification (collapsed) */}
              {revealData.aiJustification && (
                <div className="bg-base-300/40 rounded-lg p-3 mb-4">
                  <p className="text-[10px] text-base-content/40 uppercase font-medium mb-1">AI reasoning</p>
                  <p className="text-xs text-base-content/60 line-clamp-3 leading-relaxed">{revealData.aiJustification}</p>
                </div>
              )}

              {/* Community consensus badge */}
              {revealData.communityDecision && (
                <div className="text-center mb-4">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                    revealData.validationResult === "confirmed"
                      ? "bg-green-500/15 text-green-400"
                      : "bg-amber-500/15 text-amber-400"
                  }`}>
                    {revealData.validationResult === "confirmed" ? "&#10003; AI Confirmed" : "&#9888; AI Challenged"}
                  </span>
                </div>
              )}

              {/* Continue button */}
              <button onClick={closeReveal} className="w-full btn btn-primary btn-sm">
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Token reward float animation ── */}
      {tokenReward !== null && (
        <div className="fixed inset-0 pointer-events-none z-[60] flex items-center justify-center">
          <div className="animate-token-float">
            <div className="bg-primary/90 text-primary-content px-5 py-2 rounded-full text-lg font-bold shadow-xl shadow-primary/25">
              +{tokenReward} $SAFE
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
