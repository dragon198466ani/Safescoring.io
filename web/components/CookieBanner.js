"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/libs/i18n/LanguageProvider";

/**
 * Multi-Jurisdiction Cookie Consent Banner
 *
 * Compliant with:
 * - GDPR (EU) - Art. 7: Explicit consent
 * - CCPA (California) - Do Not Sell option
 * - LGPD (Brazil) - Consent requirements
 * - UK GDPR - Same as EU GDPR
 * - PIPEDA (Canada) - Meaningful consent
 * - APPI (Japan) - Consent for certain data
 * - ePrivacy Directive 2002/58/CE
 */

const CONSENT_KEY = "cookie_consent";
const CONSENT_VERSION = "2.0"; // Increment when cookie policy changes

// Jurisdiction detection based on timezone (client-side fallback)
const detectJurisdiction = () => {
  if (typeof window === "undefined") return "GDPR";

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // California detection
  if (timezone.includes("Los_Angeles") || timezone.includes("America/Los_Angeles")) {
    return "CCPA";
  }
  // Brazil
  if (timezone.includes("Sao_Paulo") || timezone.includes("America/Sao_Paulo")) {
    return "LGPD";
  }
  // UK
  if (timezone.includes("London") || timezone.includes("Europe/London")) {
    return "UK_GDPR";
  }
  // Japan
  if (timezone.includes("Tokyo") || timezone.includes("Asia/Tokyo")) {
    return "APPI";
  }
  // Canada
  if (timezone.includes("Toronto") || timezone.includes("Vancouver") || timezone.includes("America/Toronto")) {
    return "PIPEDA";
  }
  // EU countries
  if (timezone.includes("Europe/")) {
    return "GDPR";
  }

  return "GDPR"; // Default to strictest
};

const defaultConsent = {
  essential: true, // Always required, cannot be disabled
  analytics: false,
  marketing: false,
  doNotSell: true, // CCPA: Default to opted-out of sale
  version: CONSENT_VERSION,
  timestamp: null,
  jurisdiction: null,
};

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState(defaultConsent);
  const [jurisdiction, setJurisdiction] = useState("GDPR");

  // i18n - Get translation function
  const { t } = useLanguage();

  useEffect(() => {
    // Detect jurisdiction
    const detected = detectJurisdiction();
    setJurisdiction(detected);

    // Check if consent was already given
    const savedConsent = localStorage.getItem(CONSENT_KEY);

    if (savedConsent) {
      try {
        const parsed = JSON.parse(savedConsent);
        // Re-ask consent if policy version changed
        if (parsed.version !== CONSENT_VERSION) {
          setShowBanner(true);
        } else {
          setConsent(parsed);
          applyConsent(parsed);
        }
      } catch {
        setShowBanner(true);
      }
    } else {
      // First visit - show banner
      setShowBanner(true);
    }
  }, []);

  const applyConsent = (consentData) => {
    // Apply consent choices to third-party services
    if (typeof window !== "undefined") {
      // Disable/enable analytics based on consent
      if (consentData.analytics) {
        // Enable analytics if you add any (currently none)
        window.localStorage.setItem("analytics_enabled", "true");
      } else {
        window.localStorage.removeItem("analytics_enabled");
      }

      // Disable/enable marketing cookies
      if (consentData.marketing) {
        window.localStorage.setItem("marketing_enabled", "true");
      } else {
        window.localStorage.removeItem("marketing_enabled");
      }

      // Crisp chat - only load if marketing consent given
      // Note: Crisp is loaded in LayoutClient.js, this flag can be checked there
      window.__cookieConsent = consentData;
    }
  };

  const saveConsent = (consentData) => {
    const finalConsent = {
      ...consentData,
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      jurisdiction: jurisdiction,
    };

    localStorage.setItem(CONSENT_KEY, JSON.stringify(finalConsent));
    setConsent(finalConsent);
    applyConsent(finalConsent);
    setShowBanner(false);
  };

  const acceptAll = () => {
    saveConsent({
      essential: true,
      analytics: true,
      marketing: true,
    });
  };

  const acceptEssentialOnly = () => {
    saveConsent({
      essential: true,
      analytics: false,
      marketing: false,
    });
  };

  const saveCustom = () => {
    saveConsent(consent);
  };

  const updateConsent = (type, value) => {
    setConsent(prev => ({
      ...prev,
      [type]: value,
    }));
  };

  if (!showBanner) return null;

  // Get jurisdiction-specific message (uses translations when available)
  const getJurisdictionMessage = () => {
    // Base message from translations
    const baseMessage = t("cookies.message");

    switch (jurisdiction) {
      case "CCPA":
        return `${baseMessage} ${t("cookies.ccpaMessage")}`;
      case "LGPD":
        return baseMessage;
      case "PIPEDA":
        return baseMessage;
      case "APPI":
        return baseMessage;
      default:
        return baseMessage;
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-base-300 border-t border-base-content/10 shadow-lg">
      <div className="max-w-6xl mx-auto">
        {!showDetails ? (
          // Simple banner view
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-base-content/80">
                {getJurisdictionMessage()}{" "}
                {t("cookies.messageAnalytics")}{" "}
                <Link href="/cookies" className="link link-primary">
                  {t("common.learnMore")}
                </Link>
                {jurisdiction === "CCPA" && (
                  <>
                    {" | "}
                    <Link href="/privacy/ccpa" className="link link-primary">
                      {t("cookies.doNotSell")}
                    </Link>
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowDetails(true)}
                className="btn btn-ghost h-10 min-h-0 touch-manipulation active:scale-[0.97] transition-transform"
              >
                {t("cookies.customize")}
              </button>
              <button
                onClick={acceptEssentialOnly}
                className="btn btn-outline h-10 min-h-0 touch-manipulation active:scale-[0.97] transition-transform"
              >
                {t("cookies.essentialOnly")}
              </button>
              <button
                onClick={acceptAll}
                className="btn btn-primary h-10 min-h-0 touch-manipulation active:scale-[0.97] transition-transform"
              >
                {t("cookies.acceptAll")}
              </button>
            </div>
          </div>
        ) : (
          // Detailed consent view
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">{t("cookies.title")}</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="btn btn-ghost btn-circle min-w-[40px] min-h-[40px] touch-manipulation active:scale-[0.97] transition-transform"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="grid gap-3">
              {/* Essential cookies - always on */}
              <div className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                <div>
                  <h4 className="font-medium">{t("cookies.essential")}</h4>
                  <p className="text-sm text-base-content/60">
                    {t("cookies.essentialDesc")}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="toggle toggle-primary"
                />
              </div>

              {/* Analytics cookies */}
              <div className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                <div>
                  <h4 className="font-medium">{t("cookies.analytics")}</h4>
                  <p className="text-sm text-base-content/60">
                    {t("cookies.analyticsDesc")}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={consent.analytics}
                  onChange={(e) => updateConsent("analytics", e.target.checked)}
                  className="toggle toggle-primary"
                />
              </div>

              {/* Marketing cookies */}
              <div className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                <div>
                  <h4 className="font-medium">{t("cookies.marketing")}</h4>
                  <p className="text-sm text-base-content/60">
                    {t("cookies.marketingDesc")}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={consent.marketing}
                  onChange={(e) => updateConsent("marketing", e.target.checked)}
                  className="toggle toggle-primary"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Link href="/cookies" className="link link-primary text-sm">
                {t("cookies.viewPolicy")}
              </Link>
              <div className="flex gap-2">
                <button
                  onClick={acceptEssentialOnly}
                  className="btn btn-ghost h-10 min-h-0 touch-manipulation active:scale-[0.97] transition-transform"
                >
                  {t("cookies.rejectOptional")}
                </button>
                <button
                  onClick={saveCustom}
                  className="btn btn-primary h-10 min-h-0 touch-manipulation active:scale-[0.97] transition-transform"
                >
                  {t("cookies.savePreferences")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to check cookie consent status
 * Usage: const { hasAnalytics, hasMarketing } = useCookieConsent();
 */
export function useCookieConsent() {
  const [consent, setConsent] = useState(defaultConsent);

  useEffect(() => {
    const savedConsent = localStorage.getItem(CONSENT_KEY);
    if (savedConsent) {
      try {
        setConsent(JSON.parse(savedConsent));
      } catch {
        // Invalid consent, use defaults
      }
    }
  }, []);

  return {
    hasEssential: consent.essential,
    hasAnalytics: consent.analytics,
    hasMarketing: consent.marketing,
    consentTimestamp: consent.timestamp,
  };
}

/**
 * Function to reset cookie consent (for settings page)
 */
export function resetCookieConsent() {
  localStorage.removeItem(CONSENT_KEY);
  window.location.reload();
}
