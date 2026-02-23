"use client";

import { useTranslation } from "@/libs/i18n/LanguageProvider";
import config from "@/config";

// Page title, description, and realtime connection status indicator
export default function PageHeader({
  hasMounted,
  totalProducts,
  isConnected,
  connectionFailed,
  realtimeUpdate,
  reconnect,
  forceRefresh,
}) {
  const { t, locale } = useTranslation();

  return (
    <div className="mb-8">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
        {t("productsPage.title")}
      </h1>
      <p className="text-lg text-base-content/60 max-w-2xl">
        {hasMounted && totalProducts > 0
          ? t("productsPage.description", { count: `${totalProducts}+`, norms: config.safe.stats.totalNorms })
          : t("productsPage.descriptionFallback", { norms: config.safe.stats.totalNorms })}
      </p>
      {/* Realtime sync indicator */}
      <div className="mt-3 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          {isConnected ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </>
          ) : connectionFailed ? (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-base-content/30"></span>
          ) : (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500 animate-pulse"></span>
          )}
        </span>
        <span className={`text-sm ${isConnected ? 'text-green-500' : connectionFailed ? 'text-base-content/50' : 'text-yellow-500'}`}>
          {isConnected ? t("productsPage.realtimeSyncActive") : connectionFailed ? t("productsPage.offlineMode") : t("productsPage.connecting")}
        </span>
        {realtimeUpdate && (
          <span className="text-xs text-base-content/50">
            ({t("productsPage.updated", { time: realtimeUpdate.toLocaleTimeString(locale) })})
          </span>
        )}
        {connectionFailed && (
          <button
            onClick={reconnect}
            className="ml-1 btn btn-ghost btn-xs text-primary"
            title={t("product.retry")}
          >
            {t("product.retry")}
          </button>
        )}
        <button
          onClick={forceRefresh}
          className="ml-2 btn btn-ghost btn-xs"
          title="Force refresh"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </button>
      </div>
    </div>
  );
}
