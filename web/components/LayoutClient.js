"use client";

import { SessionProvider } from "next-auth/react";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "react-hot-toast";
import { Tooltip } from "react-tooltip";
import config from "@/config";
import { StatsProvider } from "@/libs/StatsProvider";
import { LanguageProvider } from "@/libs/i18n/LanguageProvider";
import { ScoringSetupProvider } from "@/libs/ScoringSetupProvider";

// All the client wrappers are here (they can't be in server components)
// 1. SessionProvider: Allow the useSession from next-auth (find out if user is auth or not)
// 2. LanguageProvider: Auto-detect language, provide useTranslation() hook globally
// 3. NextTopLoader: Show a progress bar at the top when navigating between pages
// 4. Toaster: Show Success/Error messages anywhere from the app with toast()
// 5. Tooltip: Show tooltips if any JSX elements has these 2 attributes: data-tooltip-id="tooltip" data-tooltip-content=""
// 6. Web3Provider: Scoped to /agents and /dashboard/agent-api layouts (not loaded globally)
const ClientLayout = ({ children }) => {
  return (
    <>
      <SessionProvider>
        <LanguageProvider>
        <StatsProvider>
        <ScoringSetupProvider>
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
        </ScoringSetupProvider>
        </StatsProvider>
        </LanguageProvider>
      </SessionProvider>
    </>
  );
};

export default ClientLayout;
