"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Crisp } from "crisp-sdk-web";
import { SessionProvider } from "next-auth/react";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "react-hot-toast";
import { Tooltip } from "react-tooltip";
import config from "@/config";
import { initMonitoring } from "@/libs/monitoring";
import CookieConsent from "@/components/CookieConsent";
import { LanguageProvider } from "@/libs/i18n/LanguageProvider";
import { NormStatsProvider } from "@/libs/NormStatsProvider";

// Crisp customer chat support:
// This component is separated from ClientLayout because it needs to be wrapped with <SessionProvider> to use useSession() hook
const CrispChat = () => {
  const pathname = usePathname();
  const { data } = useSession();

  useEffect(() => {
    if (config?.crisp?.id) {
      // Set up Crisp
      Crisp.configure(config.crisp.id);

      // (Optional) If onlyShowOnRoutes array is not empty in config.js file, Crisp will be hidden on the routes in the array.
      // Use <AppButtonSupport> instead to show it (user clicks on the button to show Crisp—it cleans the UI)
      if (
        config.crisp.onlyShowOnRoutes &&
        !config.crisp.onlyShowOnRoutes?.includes(pathname)
      ) {
        Crisp.chat.hide();
        Crisp.chat.onChatClosed(() => {
          Crisp.chat.hide();
        });
      }
    }
  }, [pathname]);

  // Add User Unique ID to Crisp to easily identify users when reaching support (optional)
  useEffect(() => {
    if (data?.user && config?.crisp?.id) {
      Crisp.session.setData({ userId: data.user?.id });
    }
  }, [data]);

  return null;
};

// PlausibleLoader: Inject Plausible Analytics script only after user gives cookie consent (RGPD Art. 5(1)(a))
const PlausibleLoader = () => {
  useEffect(() => {
    if (!config.analytics?.plausible?.domain) return;

    const checkAndLoad = () => {
      try {
        const consent = localStorage.getItem("cookie-consent");
        if (consent === "all") {
          // Only inject once
          if (document.querySelector('script[data-domain="' + config.analytics.plausible.domain + '"]')) return;
          const script = document.createElement("script");
          script.defer = true;
          script.setAttribute("data-domain", config.analytics.plausible.domain);
          script.src = config.analytics.plausible.src;
          document.head.appendChild(script);
        }
      } catch {
        // localStorage unavailable
      }
    };

    // Check on mount (user may have already consented in a previous visit)
    checkAndLoad();

    // Listen for consent changes (fired by CookieConsent component)
    const onStorage = (e) => {
      if (e.key === "cookie-consent") checkAndLoad();
    };
    window.addEventListener("storage", onStorage);

    // Also listen for custom event from same-tab consent
    const onConsent = () => checkAndLoad();
    window.addEventListener("cookie-consent-update", onConsent);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cookie-consent-update", onConsent);
    };
  }, []);

  return null;
};

// ReferralLinker: After sign-in, sends stored referral code from localStorage to the server (runs once)
const ReferralLinker = () => {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user?.id) return;

    try {
      const code = localStorage.getItem("referral_code");
      const date = localStorage.getItem("referral_date");
      if (!code) return;

      // Check expiry (30 days)
      const maxAge = (config.referral?.cookieDays || 30) * 24 * 60 * 60 * 1000;
      if (date && Date.now() - parseInt(date, 10) > maxAge) {
        localStorage.removeItem("referral_code");
        localStorage.removeItem("referral_date");
        return;
      }

      // Check if already linked (don't re-send)
      const linked = localStorage.getItem("referral_linked");
      if (linked === session.user.id) return;

      fetch("/api/referral/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralCode: code }),
      }).then((res) => {
        if (res.ok) {
          localStorage.setItem("referral_linked", session.user.id);
          localStorage.removeItem("referral_code");
          localStorage.removeItem("referral_date");
        }
      }).catch(() => {});
    } catch {
      // localStorage unavailable
    }
  }, [session?.user?.id]);

  return null;
};

// All the client wrappers are here (they can't be in server components)
// 1. SessionProvider: Allow the useSession from next-auth (find out if user is auth or not)
// 2. NextTopLoader: Show a progress bar at the top when navigating between pages
// 3. Toaster: Show Success/Error messages anywhere from the app with toast()
// 4. Tooltip: Show tooltips if any JSX elements has these 2 attributes: data-tooltip-id="tooltip" data-tooltip-content=""
// 5. CrispChat: Set Crisp customer chat support (see above)
// 6. Monitoring: Initialize Sentry error tracking (if configured)
const ClientLayout = ({ children, normStats }) => {
  // Initialize monitoring on mount (client-side only)
  useEffect(() => {
    initMonitoring();
  }, []);

  return (
    <>
      <SessionProvider>
        <NormStatsProvider stats={normStats}>
        <LanguageProvider>
          {/* Show a progress bar at the top when navigating between pages */}
          <NextTopLoader color={config.colors.main} showSpinner={false} />

          {/* Content inside app/page.js files  */}
          {children}

          {/* Show Success/Error messages anywhere from the app with toast() */}
          <Toaster
            toastOptions={{
              duration: 3000,
            }}
          />

          {/* Show tooltips if any JSX elements has these 2 attributes: data-tooltip-id="tooltip" data-tooltip-content="" */}
          <Tooltip
            id="tooltip"
            className="z-[60] !opacity-100 max-w-sm shadow-lg"
          />

          {/* GDPR/ePrivacy Cookie Consent Banner */}
          <CookieConsent />

          {/* Set Crisp customer chat support */}
          <CrispChat />

          {/* Link referral code after sign-in */}
          <ReferralLinker />

          {/* Plausible Analytics — consent-gated (RGPD) */}
          <PlausibleLoader />
        </LanguageProvider>
        </NormStatsProvider>
      </SessionProvider>
    </>
  );
};

export default ClientLayout;
