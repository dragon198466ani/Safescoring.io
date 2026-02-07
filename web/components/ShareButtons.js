"use client";

import { useState } from "react";

/**
 * ShareButtons - Social sharing component for products, hacks, and setups.
 * Generates pre-filled share links for Twitter/X, LinkedIn, Reddit, and copy-to-clipboard.
 *
 * Props:
 * - url: relative URL path (e.g., "/products/ledger-nano-x")
 * - title: share text
 * - type: "product" | "hack" | "setup" | "compare" (adjusts messaging)
 * - score: optional numeric score to include in share text
 * - compact: boolean for smaller layout
 */

const BASE_URL = "https://safescoring.io";

function getShareText(title, type, score) {
  switch (type) {
    case "product":
      return score
        ? `${title} has a SafeScore of ${score}/100. Check the full security breakdown:`
        : `${title} — Full security analysis on SafeScoring:`;
    case "hack":
      return `${title} — Security analysis and lessons learned:`;
    case "setup":
      return score
        ? `My crypto stack scores ${score}/100 on SafeScoring. How safe is yours?`
        : `Check out my crypto security stack on SafeScoring:`;
    case "compare":
      return `${title} — See which one is more secure:`;
    default:
      return `${title} | SafeScoring`;
  }
}

export default function ShareButtons({ url, title, type = "product", score, compact = false }) {
  const [copied, setCopied] = useState(false);

  const fullUrl = `${BASE_URL}${url}`;
  const text = getShareText(title, type, score);

  const shareLinks = {
    twitter: `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(fullUrl)}&via=SafeScoring`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullUrl)}`,
    reddit: `https://www.reddit.com/submit?url=${encodeURIComponent(fullUrl)}&title=${encodeURIComponent(title)}`,
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = fullUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const buttonClass = compact
    ? "btn btn-ghost btn-xs btn-circle"
    : "btn btn-ghost btn-sm btn-circle";

  const iconSize = compact ? "w-3.5 h-3.5" : "w-4 h-4";

  return (
    <div className="flex items-center gap-1">
      {!compact && (
        <span className="text-xs text-base-content/40 mr-1">Share</span>
      )}

      {/* Twitter/X */}
      <a
        href={shareLinks.twitter}
        target="_blank"
        rel="noopener noreferrer"
        className={`${buttonClass} hover:text-[#1DA1F2] hover:bg-[#1DA1F2]/10`}
        title="Share on X/Twitter"
      >
        <svg className={iconSize} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>

      {/* LinkedIn */}
      <a
        href={shareLinks.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        className={`${buttonClass} hover:text-[#0077B5] hover:bg-[#0077B5]/10`}
        title="Share on LinkedIn"
      >
        <svg className={iconSize} viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      </a>

      {/* Reddit */}
      <a
        href={shareLinks.reddit}
        target="_blank"
        rel="noopener noreferrer"
        className={`${buttonClass} hover:text-[#FF4500] hover:bg-[#FF4500]/10`}
        title="Share on Reddit"
      >
        <svg className={iconSize} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
        </svg>
      </a>

      {/* Copy Link */}
      <button
        onClick={handleCopy}
        className={`${buttonClass} ${copied ? "text-green-400 bg-green-400/10" : "hover:text-primary hover:bg-primary/10"}`}
        title={copied ? "Copied!" : "Copy link"}
      >
        {copied ? (
          <svg className={iconSize} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ) : (
          <svg className={iconSize} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.25 8.497" />
          </svg>
        )}
      </button>
    </div>
  );
}
