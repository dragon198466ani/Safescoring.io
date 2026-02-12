"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getConsent, setConsent } from "@/libs/cookie-consent";
import { useTranslation } from "@/libs/i18n/LanguageProvider";

/**
 * GDPR/ePrivacy Cookie Consent Banner
 *
 * - Shows on first visit (no consent stored)
 * - Disappears after user makes a choice
 * - Essential cookies (NextAuth session) are never blocked
 * - Analytics/marketing blocked until explicit consent
 * - Sticky bottom banner, DaisyUI themed
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    // Only show if user hasn't made a choice yet
    if (!getConsent()) {
      // Small delay to avoid layout shift on page load
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    setConsent("all");
    setVisible(false);
  };

  const handleEssentialOnly = () => {
    setConsent("essential");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 animate-in slide-in-from-bottom">
      <div className="max-w-4xl mx-auto bg-base-200 border border-base-300 rounded-2xl shadow-2xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-base-content/80">
              {t("cookies.message")}{" "}
              {t("cookies.messageAnalytics")}{" "}
              <Link
                href="/privacy-policy#cookies"
                className="text-primary hover:underline"
              >
                {t("cookies.viewPolicy")}
              </Link>
            </p>
          </div>

          {/* Buttons — GDPR: equal prominence for Accept/Reject */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleEssentialOnly}
              className="btn btn-sm btn-outline"
            >
              {t("cookies.rejectOptional")}
            </button>
            <button
              onClick={handleAcceptAll}
              className="btn btn-sm btn-outline btn-primary"
            >
              {t("cookies.acceptAll")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
