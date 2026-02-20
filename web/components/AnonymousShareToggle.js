"use client";

import { useState } from "react";
import { useTranslation } from "@/libs/i18n/LanguageProvider";

/**
 * AnonymousShareToggle - Enable/disable anonymous sharing for a setup
 *
 * When enabled:
 * - Setup appears in community catalog
 * - Only score, archetype, and pillar percentages shown
 * - Products never revealed
 * - User identity never revealed
 */
const AnonymousShareToggle = ({
  setupId,
  initialEnabled = false,
  score,
  percentile,
  onToggle,
  className = "",
}) => {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    const newState = !enabled;

    try {
      const res = await fetch("/api/catalog/anonymous", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setupId,
          shareAnonymous: newState,
        }),
      });

      if (res.ok) {
        setEnabled(newState);
        onToggle?.(newState);
      }
    } catch (err) {
      console.error("Failed to toggle anonymous sharing:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`rounded-xl border border-base-300 bg-base-200/50 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            enabled ? "bg-gradient-to-br from-primary to-secondary" : "bg-base-300"
          }`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-5 h-5 ${enabled ? "text-white" : "text-base-content/40"}`}>
              <path fillRule="evenodd" d="M8.25 6.75a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0ZM15.75 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM2.25 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM6.31 15.117A6.745 6.745 0 0 1 12 12a6.745 6.745 0 0 1 6.709 7.498.75.75 0 0 1-.372.568A12.696 12.696 0 0 1 12 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 0 1-.372-.568 6.787 6.787 0 0 1 1.019-4.38Z" clipRule="evenodd" />
              <path d="M5.082 14.254a8.287 8.287 0 0 0-1.308 5.135 9.687 9.687 0 0 1-1.764-.44l-.115-.04a.563.563 0 0 1-.373-.487l-.01-.121a3.75 3.75 0 0 1 3.57-4.047ZM20.226 19.389a8.287 8.287 0 0 0-1.308-5.135 3.75 3.75 0 0 1 3.57 4.047l-.01.121a.563.563 0 0 1-.373.486l-.115.04c-.567.2-1.156.349-1.764.441Z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-sm">
              {t("anonymousShare.title") || "Share with Community"}
            </h3>
            <p className="text-xs text-base-content/60">
              {t("anonymousShare.subtitle") || "Your products stay secret"}
            </p>
          </div>
        </div>

        <label className="swap">
          <input
            type="checkbox"
            checked={enabled}
            onChange={handleToggle}
            disabled={loading}
          />
          <div className={`toggle ${enabled ? "bg-primary" : ""} ${loading ? "opacity-50" : ""}`} />
        </label>
      </div>

      {/* What gets shared */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full px-4 py-2 flex items-center justify-between text-xs text-base-content/50 hover:bg-base-300/50 transition-colors border-t border-base-300"
      >
        <span>{t("anonymousShare.whatShared") || "What gets shared?"}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-4 h-4 transition-transform ${showDetails ? "rotate-180" : ""}`}
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Details panel */}
      {showDetails && (
        <div className="p-4 bg-base-100 border-t border-base-300 space-y-3">
          {/* What IS shared */}
          <div>
            <div className="text-xs font-bold text-green-500 uppercase tracking-wide mb-2 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
              </svg>
              {t("anonymousShare.shared") || "Shared"}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded">
                <span className="w-6 text-center text-lg">🎯</span>
                <span>{t("anonymousShare.overallScore") || "Overall Score"}</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded">
                <span className="w-6 text-center text-lg">📊</span>
                <span>{t("anonymousShare.pillarPercentages") || "Pillar %"}</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded">
                <span className="w-6 text-center text-lg">🏆</span>
                <span>{t("anonymousShare.percentile") || "Percentile"}</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded">
                <span className="w-6 text-center text-lg">🔖</span>
                <span>{t("anonymousShare.archetype") || "Archetype"}</span>
              </div>
            </div>
          </div>

          {/* What is NOT shared */}
          <div>
            <div className="text-xs font-bold text-red-500 uppercase tracking-wide mb-2 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M5 8a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 5 8Z" clipRule="evenodd" />
              </svg>
              {t("anonymousShare.notShared") || "Never Shared"}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded text-base-content/60">
                <span className="w-6 text-center text-lg">📦</span>
                <span>{t("anonymousShare.products") || "Products Used"}</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded text-base-content/60">
                <span className="w-6 text-center text-lg">👤</span>
                <span>{t("anonymousShare.identity") || "Your Identity"}</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded text-base-content/60">
                <span className="w-6 text-center text-lg">📧</span>
                <span>{t("anonymousShare.email") || "Email"}</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded text-base-content/60">
                <span className="w-6 text-center text-lg">🏠</span>
                <span>{t("anonymousShare.wallet") || "Wallet Address"}</span>
              </div>
            </div>
          </div>

          {/* Preview of what community sees */}
          {enabled && score && (
            <div className="mt-4 p-3 bg-base-200 rounded-lg">
              <div className="text-xs text-base-content/50 mb-2">
                {t("anonymousShare.communityPreview") || "Community sees:"}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-3xl font-black text-primary">{score}</div>
                <div className="flex-1">
                  <div className="text-sm font-bold">Anonymous Setup</div>
                  <div className="text-xs text-base-content/60">
                    {percentile ? `Top ${100 - percentile}%` : "Calculating..."} • Hardware Maximalist
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status message */}
      {enabled && (
        <div className="px-4 py-2 bg-primary/10 text-primary text-xs text-center border-t border-primary/20">
          <span className="inline-flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
              <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
            </svg>
            {t("anonymousShare.active") || "Visible in Community Catalog"}
          </span>
        </div>
      )}
    </div>
  );
};

export default AnonymousShareToggle;
