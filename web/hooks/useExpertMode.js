"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { useSession } from "next-auth/react";

// Context for expert mode
const ExpertModeContext = createContext(undefined);

// Storage key
const STORAGE_KEY = "safescoring_expert_mode";
const AUTO_SET_KEY = "safescoring_expert_auto_set";

// User types that should default to expert mode
const EXPERT_USER_TYPES = ["developer", "researcher", "institution"];

// Check if user has a crypto wallet installed (indicates crypto experience)
function hasWalletInstalled() {
  if (typeof window === "undefined") return false;
  return !!(window.ethereum || window.solana || window.phantom);
}

/**
 * Hook to manage expert mode state with localStorage persistence.
 * Expert mode shows technical details by default in components like Pillars.
 *
 * @returns {Object} { isExpert, toggleExpertMode, setExpertMode }
 */
export function useExpertMode() {
  const context = useContext(ExpertModeContext);

  // If used outside provider, create a standalone hook
  if (context === undefined) {
    return useExpertModeStandalone();
  }

  return context;
}

// Standalone hook (when not using provider)
function useExpertModeStandalone() {
  const [isExpert, setIsExpert] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const { data: session } = useSession();

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setIsExpert(JSON.parse(stored));
      }
    } catch (error) {
      console.error("[useExpertMode] Error reading from localStorage:", error);
    }
    setIsLoaded(true);
  }, []);

  // Auto-detect expert mode based on user profile or wallet presence
  useEffect(() => {
    if (!isLoaded) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const autoSetKey = localStorage.getItem(AUTO_SET_KEY);

      // For logged-in users with a profile
      if (session?.user?.userType) {
        const userId = session.user.id;
        if (autoSetKey === userId) return; // Already auto-set for this user

        const shouldBeExpert = EXPERT_USER_TYPES.includes(session.user.userType);
        setIsExpert(shouldBeExpert);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(shouldBeExpert));
        localStorage.setItem(AUTO_SET_KEY, userId);
        console.log(`[useExpertMode] Auto-set to ${shouldBeExpert ? "expert" : "simple"} for user type: ${session.user.userType}`);
        return;
      }

      // For anonymous users: detect wallet presence (only once)
      if (stored === null && autoSetKey !== "wallet_checked") {
        const walletDetected = hasWalletInstalled();
        if (walletDetected) {
          setIsExpert(true);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(true));
          console.log("[useExpertMode] Wallet detected, auto-set to expert mode");
        }
        localStorage.setItem(AUTO_SET_KEY, "wallet_checked");
      }
    } catch (error) {
      console.error("[useExpertMode] Error auto-setting expert mode:", error);
    }
  }, [isLoaded, session?.user?.userType, session?.user?.id]);

  // Save to localStorage when changed manually
  useEffect(() => {
    if (!isLoaded) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(isExpert));
    } catch (error) {
      console.error("[useExpertMode] Error saving to localStorage:", error);
    }
  }, [isExpert, isLoaded]);

  const toggleExpertMode = useCallback(() => {
    setIsExpert(prev => !prev);
  }, []);

  const setExpertMode = useCallback((value) => {
    setIsExpert(Boolean(value));
  }, []);

  return {
    isExpert,
    isLoaded,
    toggleExpertMode,
    setExpertMode,
  };
}

/**
 * Provider component for expert mode context.
 * Use this at the app root to share expert mode state across all components.
 */
export function ExpertModeProvider({ children }) {
  const expertMode = useExpertModeStandalone();

  return (
    <ExpertModeContext.Provider value={expertMode}>
      {children}
    </ExpertModeContext.Provider>
  );
}

/**
 * Toggle button component for expert mode.
 * Can be placed in Header, Footer, or Settings.
 */
export function ExpertModeToggle({ className = "" }) {
  const { isExpert, isLoaded, toggleExpertMode } = useExpertMode();

  if (!isLoaded) return null;

  return (
    <button
      onClick={toggleExpertMode}
      className={`flex items-center gap-2 text-sm transition-colors ${className}`}
      aria-pressed={isExpert}
      aria-label={isExpert ? "Switch to beginner mode" : "Switch to expert mode"}
      title={isExpert ? "Currently showing technical details" : "Currently showing simplified view"}
    >
      <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        isExpert ? "bg-primary" : "bg-base-300"
      }`}>
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            isExpert ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
      <span className="text-base-content/70">
        {isExpert ? "Expert" : "Simple"}
      </span>
    </button>
  );
}

export default useExpertMode;
