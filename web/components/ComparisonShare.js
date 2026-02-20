"use client";

import { useState } from "react";
import { useTranslation } from "@/libs/i18n/LanguageProvider";
import { useShareTracking } from "@/hooks/useShareTracking";
import config from "@/config";

/**
 * ComparisonShare - Generate shareable content for product comparisons
 *
 * Creates engaging comparison content for social media sharing
 *
 * @param {Object} props
 * @param {Object} props.productA - First product { name, slug, score }
 * @param {Object} props.productB - Second product { name, slug, score }
 * @param {string} props.winner - 'A', 'B', or 'tie'
 * @param {Object} props.pillarWins - { A: number, B: number }
 */
const ComparisonShare = ({
  productA,
  productB,
  winner,
  pillarWins = { A: 0, B: 0 },
  className = "",
}) => {
  const { t } = useTranslation();
  const { trackComparisonShare } = useShareTracking();
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : `https://${config.domainName}`;
  const compareUrl = `${baseUrl}/compare/${productA.slug}/${productB.slug}`;

  // Generate share text based on comparison result
  const generateShareText = (platform) => {
    const winnerName = winner === "A" ? productA.name : winner === "B" ? productB.name : null;
    const winnerScore = winner === "A" ? productA.score : winner === "B" ? productB.score : null;
    const loserScore = winner === "A" ? productB.score : winner === "B" ? productA.score : null;

    const hashtags = "#crypto #security #SafeScoring";

    if (winner === "tie") {
      return {
        short: `${productA.name} vs ${productB.name} - It's a tie! Both score ${productA.score}/100 ${hashtags}`,
        long: `Security showdown: ${productA.name} vs ${productB.name}\n\nBoth products score ${productA.score}/100 - A perfect tie!\n\nSee the full breakdown: ${compareUrl}\n\n${hashtags}`,
      };
    }

    return {
      short: `${productA.name} vs ${productB.name} - ${winnerName} wins! ${winnerScore}/100 vs ${loserScore}/100 ${hashtags}`,
      long: `Security showdown: ${productA.name} vs ${productB.name}\n\n${winnerName} wins with ${winnerScore}/100!\n\nPillar victories: ${productA.name} ${pillarWins.A} - ${pillarWins.B} ${productB.name}\n\nSee full comparison: ${compareUrl}\n\n${hashtags}`,
    };
  };

  // Copy comparison link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(compareUrl);
      setCopied(true);
      trackComparisonShare(`${productA.slug}-vs-${productB.slug}`, "copy");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Share to Twitter/X
  const shareToTwitter = () => {
    const text = generateShareText("twitter").short;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(compareUrl)}`;
    window.open(url, "_blank", "width=550,height=420");
    trackComparisonShare(`${productA.slug}-vs-${productB.slug}`, "twitter");
  };

  // Generate visual comparison card (for screenshot/sharing)
  const ComparisonCard = () => {
    const winnerName = winner === "A" ? productA.name : winner === "B" ? productB.name : null;

    return (
      <div className="p-6 rounded-2xl bg-gradient-to-br from-base-200 to-base-300 border border-base-content/10 text-center">
        {/* Header */}
        <div className="text-xs uppercase tracking-wider text-base-content/50 mb-4">
          Security Comparison
        </div>

        {/* Products */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {/* Product A */}
          <div className={`flex-1 p-4 rounded-xl ${winner === "A" ? "bg-green-500/10 border-2 border-green-500/30" : "bg-base-100"}`}>
            <div className="text-lg font-bold mb-1">{productA.name}</div>
            <div className={`text-3xl font-black ${productA.score >= 80 ? "text-green-400" : productA.score >= 60 ? "text-amber-400" : "text-red-400"}`}>
              {productA.score}
            </div>
            <div className="text-xs text-base-content/50">/100</div>
            {winner === "A" && (
              <div className="mt-2 inline-flex items-center gap-1 text-green-400 text-xs font-bold">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                WINNER
              </div>
            )}
          </div>

          {/* VS */}
          <div className="text-2xl font-black text-base-content/20">VS</div>

          {/* Product B */}
          <div className={`flex-1 p-4 rounded-xl ${winner === "B" ? "bg-green-500/10 border-2 border-green-500/30" : "bg-base-100"}`}>
            <div className="text-lg font-bold mb-1">{productB.name}</div>
            <div className={`text-3xl font-black ${productB.score >= 80 ? "text-green-400" : productB.score >= 60 ? "text-amber-400" : "text-red-400"}`}>
              {productB.score}
            </div>
            <div className="text-xs text-base-content/50">/100</div>
            {winner === "B" && (
              <div className="mt-2 inline-flex items-center gap-1 text-green-400 text-xs font-bold">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                WINNER
              </div>
            )}
          </div>
        </div>

        {/* Pillar wins */}
        <div className="text-sm text-base-content/60 mb-4">
          Pillar victories: <span className="font-bold">{productA.name} {pillarWins.A}</span> - <span className="font-bold">{pillarWins.B} {productB.name}</span>
        </div>

        {/* Footer */}
        <div className="text-xs text-base-content/40">
          safescoring.io
        </div>
      </div>
    );
  };

  return (
    <div className={`${className}`}>
      {/* Share CTA */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={shareToTwitter}
          className="btn btn-sm gap-2 bg-black hover:bg-black/80 text-white border-0"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          {t("share.shareOnX") || "Share on X"}
        </button>

        <button
          onClick={handleCopyLink}
          className="btn btn-sm btn-outline gap-2"
        >
          {copied ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-500">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
              {t("share.copied") || "Copied!"}
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
              {t("share.copyLink") || "Copy Link"}
            </>
          )}
        </button>

        <button
          onClick={() => setShowModal(true)}
          className="btn btn-sm btn-ghost gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          {t("share.previewCard") || "Preview"}
        </button>
      </div>

      {/* Modal for preview */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="font-bold text-lg mb-4">
              {t("share.shareComparison") || "Share Comparison"}
            </h3>

            <ComparisonCard />

            <div className="mt-4 text-sm text-base-content/60 text-center">
              {t("share.screenshotTip") || "Take a screenshot to share this card on social media"}
            </div>

            <div className="modal-action">
              <button className="btn" onClick={() => setShowModal(false)}>
                {t("common.close") || "Close"}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowModal(false)} />
        </div>
      )}
    </div>
  );
};

export default ComparisonShare;
