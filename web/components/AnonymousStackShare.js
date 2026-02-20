"use client";

import { useState } from "react";
import { useTranslation } from "@/libs/i18n/LanguageProvider";
import { useShareTracking } from "@/hooks/useShareTracking";
import config from "@/config";

/**
 * AnonymousStackShare - Share stack SCORE without revealing products
 *
 * Creates shareable content that:
 * - Shows the score (social proof)
 * - Hides which products are used (security)
 * - Encourages others to check their own stack
 */
const AnonymousStackShare = ({
  stackScore,
  productCount,
  percentile = null, // "top 15%" of users
  strongestPillar = null,
  className = "",
}) => {
  const { t } = useTranslation();
  const { trackShare } = useShareTracking();
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const baseUrl = typeof window !== "undefined"
    ? window.location.origin
    : `https://${config.domainName}`;

  // URL to analyze your own stack (not the user's stack)
  const ctaUrl = `${baseUrl}/dashboard/setups`;

  // Generate anonymous share texts
  const getShareText = (platform) => {
    const scoreEmoji = stackScore >= 90 ? "🛡️" : stackScore >= 80 ? "✅" : stackScore >= 60 ? "⚠️" : "🔴";
    const hashtags = "#crypto #security #SafeScoring";

    const percentileText = percentile ? ` (${percentile})` : "";
    const pillarText = strongestPillar ? `Strongest: ${strongestPillar}. ` : "";

    const templates = {
      brag: `${scoreEmoji} My crypto security stack just scored ${stackScore}/100${percentileText}!\n\n${pillarText}How secure is YOUR stack?\n\n${ctaUrl}\n\n${hashtags}`,
      challenge: `Think your crypto stack is secure? 🤔\n\nMine just scored ${stackScore}/100 on SafeScoring.\n\nCheck yours: ${ctaUrl}\n\n${hashtags}`,
      awareness: `${scoreEmoji} Just analyzed my crypto security setup.\n\nScore: ${stackScore}/100\n${productCount} products evaluated\n\nKnow your security score: ${ctaUrl}\n\n${hashtags}`,
      minimal: `My SafeScore: ${stackScore}/100 ${scoreEmoji}\n\nWhat's yours? ${ctaUrl}`,
    };

    // Choose template based on score
    if (stackScore >= 85) return templates.brag;
    if (stackScore >= 70) return templates.challenge;
    return templates.awareness;
  };

  // Share functions
  const shareToTwitter = () => {
    const text = getShareText("twitter");
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "width=550,height=420");
    trackShare("setup", "anonymous-score", "twitter");
  };

  const shareToLinkedIn = () => {
    const text = getShareText("linkedin");
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(ctaUrl)}`;
    window.open(url, "_blank", "width=550,height=420");
    trackShare("setup", "anonymous-score", "linkedin");
  };

  const shareToTelegram = () => {
    const text = getShareText("telegram");
    const url = `https://t.me/share/url?url=${encodeURIComponent(ctaUrl)}&text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
    trackShare("setup", "anonymous-score", "telegram");
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(getShareText("copy"));
      setCopied(true);
      trackShare("setup", "anonymous-score", "copy");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Score level info
  const getScoreLevel = () => {
    if (stackScore >= 90) return { label: t("share.securityElite") || "Security Elite", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" };
    if (stackScore >= 80) return { label: t("share.wellProtected") || "Well Protected", color: "text-green-400", bg: "bg-green-500/10 border-green-500/30" };
    if (stackScore >= 70) return { label: t("share.aboveAverage") || "Above Average", color: "text-lime-400", bg: "bg-lime-500/10 border-lime-500/30" };
    if (stackScore >= 60) return { label: t("share.needsAttention") || "Needs Attention", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" };
    return { label: t("share.atRisk") || "At Risk", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" };
  };

  const level = getScoreLevel();

  return (
    <div className={className}>
      {/* Share CTA Button */}
      <button
        onClick={() => setShowModal(true)}
        className="btn btn-primary gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
        </svg>
        {t("share.shareYourScore") || "Share Your Score"}
      </button>

      {/* Modal */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg">
                {t("share.shareYourScore") || "Share Your Score"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="btn btn-ghost btn-sm btn-circle"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>

            {/* Privacy notice */}
            <div className="alert alert-info mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">
                {t("share.privacyNote") || "Only your score is shared. Your products remain private."}
              </span>
            </div>

            {/* Score Preview Card */}
            <div className={`rounded-xl border-2 p-6 text-center mb-6 ${level.bg}`}>
              <div className="text-xs uppercase tracking-wider text-base-content/50 mb-2">
                SafeScore
              </div>
              <div className={`text-5xl font-black mb-2 ${level.color}`}>
                {stackScore}
              </div>
              <div className="text-sm text-base-content/60 mb-3">
                /100
              </div>
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${level.color} bg-base-100/50`}>
                {level.label}
              </div>
              {percentile && (
                <div className="mt-3 text-xs text-base-content/50">
                  {percentile}
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-base-content/10 text-xs text-base-content/40">
                {productCount} {t("share.productsAnalyzed") || "products analyzed"} • safescoring.io
              </div>
            </div>

            {/* Share buttons */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={shareToTwitter}
                className="btn btn-outline gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                X / Twitter
              </button>

              <button
                onClick={shareToLinkedIn}
                className="btn btn-outline gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </button>

              <button
                onClick={shareToTelegram}
                className="btn btn-outline gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                Telegram
              </button>

              <button
                onClick={copyText}
                className={`btn gap-2 ${copied ? "btn-success" : "btn-outline"}`}
              >
                {copied ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                    {t("share.copied") || "Copied!"}
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                    </svg>
                    {t("share.copyText") || "Copy Text"}
                  </>
                )}
              </button>
            </div>

            {/* Preview text */}
            <div className="bg-base-200 rounded-lg p-3 text-sm text-base-content/70">
              <div className="text-xs text-base-content/50 mb-2 uppercase tracking-wide">
                {t("share.preview") || "Preview"}
              </div>
              <p className="whitespace-pre-line text-xs">
                {getShareText("preview").split('\n').slice(0, 4).join('\n')}...
              </p>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowModal(false)} />
        </div>
      )}
    </div>
  );
};

/**
 * ChallengeShare - Challenge friends to beat your score
 */
export const ChallengeShare = ({ stackScore, className = "" }) => {
  const { t } = useTranslation();
  const { trackShare } = useShareTracking();

  const baseUrl = typeof window !== "undefined"
    ? window.location.origin
    : `https://${config.domainName}`;

  const challengeText = `🎯 Security Challenge!\n\nMy crypto stack scored ${stackScore}/100.\n\nCan you beat me?\n\n${baseUrl}/dashboard/setups\n\n#crypto #security #SafeScoring`;

  const shareChallenge = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(challengeText)}`;
    window.open(url, "_blank", "width=550,height=420");
    trackShare("setup", "challenge", "twitter");
  };

  return (
    <button
      onClick={shareChallenge}
      className={`btn btn-outline btn-sm gap-2 ${className}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
      </svg>
      {t("share.challengeFriends") || "Challenge Friends"}
    </button>
  );
};

/**
 * PercentileShare - Share your ranking among users
 */
export const PercentileShare = ({ percentile, className = "" }) => {
  const { t } = useTranslation();
  const { trackShare } = useShareTracking();

  const baseUrl = typeof window !== "undefined"
    ? window.location.origin
    : `https://${config.domainName}`;

  const shareText = `🏆 My crypto security stack is in the ${percentile} of all users on SafeScoring!\n\nWhere do you rank?\n\n${baseUrl}/dashboard/setups\n\n#crypto #security`;

  const share = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "width=550,height=420");
    trackShare("setup", "percentile", "twitter");
  };

  if (!percentile) return null;

  return (
    <button
      onClick={share}
      className={`btn btn-ghost btn-sm gap-2 ${className}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172" />
      </svg>
      {t("share.shareRanking") || `Share: ${percentile}`}
    </button>
  );
};

export default AnonymousStackShare;
