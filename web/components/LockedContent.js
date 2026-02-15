"use client";

import Link from "next/link";
import { useTranslation } from "@/libs/i18n/LanguageProvider";

/**
 * LockedContent - Shows blurred content with sign-up CTA for non-authenticated users
 */
export default function LockedContent({ children, title = "Premium Content" }) {
  const { t } = useTranslation();

  return (
    <div className="relative">
      {/* Blurred content */}
      <div className="blur-md select-none pointer-events-none opacity-60">
        {children}
      </div>

      {/* Overlay with CTA */}
      <div className="absolute inset-0 flex items-center justify-center bg-base-200/60 backdrop-blur-sm rounded-xl">
        <div className="text-center p-6 max-w-sm">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-primary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h3 className="font-semibold text-lg mb-2">{title}</h3>
          <p className="text-sm text-base-content/60 mb-4">
            {t("lockedContent.description")}
          </p>
          <Link href="/signin" className="btn btn-primary btn-sm">
            {t("lockedContent.createAccount")}
          </Link>
        </div>
      </div>
    </div>
  );
}
