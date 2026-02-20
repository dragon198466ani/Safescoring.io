"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/libs/i18n/LanguageProvider";
import ShareButtons from "./ShareButtons";

/**
 * ShareToUnlock - Soft gamification component that encourages sharing
 *
 * This is a "soft" implementation - it suggests sharing but doesn't block content.
 * Uses localStorage to track if user has shared before.
 *
 * @param {Object} props
 * @param {string} props.featureName - Name of the feature to unlock
 * @param {string} props.url - URL to share
 * @param {string} props.title - Title for sharing
 * @param {string} props.type - Type of content (product, comparison, setup)
 * @param {React.ReactNode} props.children - Content to show after unlock
 * @param {string} props.productName - Product name for share text
 * @param {number} props.score - Score for share text
 * @param {boolean} props.showAlways - Always show children (soft mode - default true)
 */
const ShareToUnlock = ({
  featureName = "detailed breakdown",
  url,
  title,
  type = "product",
  children,
  productName,
  score,
  showAlways = true, // Soft mode - always show content
}) => {
  const { t } = useTranslation();
  const [hasShared, setHasShared] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if user has shared before
  useEffect(() => {
    const shareHistory = localStorage.getItem("ss_share_history");
    if (shareHistory) {
      try {
        const history = JSON.parse(shareHistory);
        if (history.includes(url)) {
          setHasShared(true);
          setIsExpanded(true);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [url]);

  // Record share action
  const handleShareComplete = () => {
    setHasShared(true);
    setIsExpanded(true);

    // Save to localStorage
    try {
      const shareHistory = localStorage.getItem("ss_share_history");
      const history = shareHistory ? JSON.parse(shareHistory) : [];
      if (!history.includes(url)) {
        history.push(url);
        localStorage.setItem("ss_share_history", JSON.stringify(history.slice(-50))); // Keep last 50
      }
    } catch (e) {
      // Ignore storage errors
    }
  };

  // In soft mode, always show children
  if (showAlways && isExpanded) {
    return (
      <div className="relative">
        {children}
        {/* Thank you badge */}
        {hasShared && (
          <div className="absolute -top-2 -right-2 z-10">
            <div className="tooltip tooltip-left" data-tip={t("share.thankYou") || "Thanks for sharing!"}>
              <span className="badge badge-success badge-sm gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
                Shared
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Teaser content - faded/blurred */}
      <div className={`transition-all duration-300 ${!isExpanded ? "blur-sm opacity-50 pointer-events-none select-none" : ""}`}>
        {children}
      </div>

      {/* Share prompt overlay */}
      {!isExpanded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-base-200 via-base-200/80 to-transparent">
          <div className="text-center p-6 max-w-md">
            {/* Icon */}
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-lg font-bold mb-2">
              {t("shareToUnlock.title") || `Share to see ${featureName}`}
            </h3>

            {/* Description */}
            <p className="text-sm text-base-content/60 mb-4">
              {t("shareToUnlock.description") || "Help others discover this tool and unlock the full view."}
            </p>

            {/* Share buttons */}
            <div className="flex justify-center mb-4">
              <ShareButtons
                url={url}
                title={title}
                type={type}
                productName={productName}
                score={score}
                variant="compact"
                onShare={handleShareComplete}
              />
            </div>

            {/* Skip option (soft mode) */}
            {showAlways && (
              <button
                onClick={() => setIsExpanded(true)}
                className="text-xs text-base-content/40 hover:text-base-content/60 underline"
              >
                {t("shareToUnlock.skip") || "Skip for now"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * ShareSuggestion - Even softer version, just a suggestion banner
 */
export const ShareSuggestion = ({
  url,
  title,
  type = "product",
  productName,
  score,
  className = "",
}) => {
  const { t } = useTranslation();
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    const dismissed = sessionStorage.getItem("ss_share_suggestion_dismissed");
    if (dismissed) {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem("ss_share_suggestion_dismissed", "true");
  };

  if (isDismissed) return null;

  return (
    <div className={`alert bg-primary/10 border border-primary/20 ${className}`}>
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
          <div>
            <p className="text-sm font-medium">
              {t("shareToUnlock.suggestion") || "Found this helpful? Share it with others!"}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ShareButtons
          url={url}
          title={title}
          type={type}
          productName={productName}
          score={score}
          variant="icon-only"
        />
        <button
          onClick={handleDismiss}
          className="btn btn-ghost btn-xs"
          aria-label="Dismiss"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ShareToUnlock;
