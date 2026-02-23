"use client";

import { useTranslation } from "@/libs/i18n/LanguageProvider";

// Error alert with retry button and retry-in-progress indicator
export default function ErrorRetryBanner({ error, retryCount, onRetry }) {
  const { t } = useTranslation();

  return (
    <>
      {/* Error state with retry */}
      {error && (
        <div className="alert alert-error mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex flex-col">
            <span className="font-medium">{error}</span>
            {error.includes("500") && (
              <span className="text-xs opacity-80 mt-1">
                {t("productsPage.dbConnectionIssue")}
              </span>
            )}
          </div>
          <button
            onClick={onRetry}
            className="btn btn-sm btn-ghost"
          >
            {t("product.retry")}
          </button>
        </div>
      )}

      {/* Retry indicator */}
      {retryCount > 0 && !error && (
        <div className="alert alert-warning mb-6">
          <span className="loading loading-spinner loading-sm"></span>
          <span>{t("productsPage.attempt", { current: retryCount, max: 3 })}</span>
        </div>
      )}
    </>
  );
}
