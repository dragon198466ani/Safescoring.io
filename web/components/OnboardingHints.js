"use client";

import { useState, useEffect, useCallback } from "react";
import { HelpBubble } from "@/components/common/Tooltip";

/**
 * OnboardingHints - Contextual help bubbles for new users
 * 
 * Shows progressive hints based on user actions and progress.
 * Persists dismissed hints in localStorage.
 * 
 * @example
 * <OnboardingHints userId={user.id} />
 */

const HINTS = [
  {
    id: "welcome",
    title: "Welcome to SafeScoring! 👋",
    content: "Let's help you secure your crypto setup. Start by exploring the dashboard.",
    position: "bottom-right",
    trigger: "first_visit",
    delay: 1000,
  },
  {
    id: "create_setup",
    title: "Create Your First Setup",
    content: "A setup combines your wallets, exchanges and DeFi tools. Click 'New Setup' to begin.",
    position: "bottom-left",
    trigger: "no_setups",
    delay: 3000,
  },
  {
    id: "add_products",
    title: "Add Products",
    content: "Drag products from the catalog or click to add them to your setup.",
    position: "bottom-right",
    trigger: "empty_setup",
    delay: 2000,
  },
  {
    id: "understand_score",
    title: "Understanding Your Score",
    content: "The SAFE score combines Security, Anti-coercion, Fidelity, and Ergonomics. Tap any pillar for details.",
    position: "top-right",
    trigger: "has_score",
    delay: 2000,
  },
  {
    id: "explore_map",
    title: "Explore the 3D Map",
    content: "See where your products are located worldwide. Toggle 'Global View' to explore.",
    position: "bottom-left",
    trigger: "has_multiple_products",
    delay: 5000,
  },
  {
    id: "drag_reorder",
    title: "Reorder Products",
    content: "Drag and drop to reorder products in your setup. The order affects priority calculations.",
    position: "bottom-right",
    trigger: "has_products",
    delay: 4000,
  },
];

const STORAGE_KEY = "safescoring_onboarding_hints";

export default function OnboardingHints({
  userId,
  hasSetups = false,
  hasProducts = false,
  hasScore = false,
  setupCount = 0,
  productCount = 0,
}) {
  const [activeHint, setActiveHint] = useState(null);
  const [dismissedHints, setDismissedHints] = useState(new Set());
  const [mounted, setMounted] = useState(false);

  // Load dismissed hints from localStorage
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setDismissedHints(new Set(JSON.parse(stored)));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Determine which hint to show based on context
  useEffect(() => {
    if (!mounted) return;

    const getApplicableHint = () => {
      for (const hint of HINTS) {
        if (dismissedHints.has(hint.id)) continue;

        switch (hint.trigger) {
          case "first_visit":
            if (dismissedHints.size === 0) return hint;
            break;
          case "no_setups":
            if (!hasSetups && setupCount === 0) return hint;
            break;
          case "empty_setup":
            if (hasSetups && productCount === 0) return hint;
            break;
          case "has_score":
            if (hasScore) return hint;
            break;
          case "has_multiple_products":
            if (productCount >= 2) return hint;
            break;
          case "has_products":
            if (productCount >= 1) return hint;
            break;
        }
      }
      return null;
    };

    const hint = getApplicableHint();
    if (hint) {
      const timer = setTimeout(() => {
        setActiveHint(hint);
      }, hint.delay);
      return () => clearTimeout(timer);
    } else {
      setActiveHint(null);
    }
  }, [mounted, dismissedHints, hasSetups, hasProducts, hasScore, setupCount, productCount]);

  const dismissHint = useCallback((hintId) => {
    setDismissedHints((prev) => {
      const next = new Set(prev);
      next.add(hintId);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // Ignore localStorage errors
      }
      return next;
    });
    setActiveHint(null);
  }, []);

  const resetHints = useCallback(() => {
    setDismissedHints(new Set());
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  if (!mounted || !activeHint) return null;

  return (
    <HelpBubble
      title={activeHint.title}
      content={activeHint.content}
      position={activeHint.position}
      show={true}
      pulse={true}
      onDismiss={() => dismissHint(activeHint.id)}
    />
  );
}

/**
 * useOnboardingProgress - Hook to track user onboarding progress
 */
export function useOnboardingProgress() {
  const [progress, setProgress] = useState({
    hasVisited: false,
    hasCreatedSetup: false,
    hasAddedProduct: false,
    hasViewedScore: false,
    hasExploredMap: false,
    completedSteps: 0,
    totalSteps: 5,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("safescoring_onboarding_progress");
      if (stored) {
        setProgress(JSON.parse(stored));
      }
    } catch {
      // Ignore
    }
  }, []);

  const markStep = useCallback((step) => {
    setProgress((prev) => {
      const next = { ...prev, [step]: true };
      next.completedSteps = [
        next.hasVisited,
        next.hasCreatedSetup,
        next.hasAddedProduct,
        next.hasViewedScore,
        next.hasExploredMap,
      ].filter(Boolean).length;

      try {
        localStorage.setItem("safescoring_onboarding_progress", JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  return { progress, markStep };
}

/**
 * OnboardingChecklist - Visual checklist for onboarding progress
 */
export function OnboardingChecklist({ className = "" }) {
  const { progress } = useOnboardingProgress();

  const steps = [
    { key: "hasVisited", label: "Visit dashboard", icon: "👋" },
    { key: "hasCreatedSetup", label: "Create a setup", icon: "📦" },
    { key: "hasAddedProduct", label: "Add products", icon: "➕" },
    { key: "hasViewedScore", label: "View your score", icon: "📊" },
    { key: "hasExploredMap", label: "Explore the map", icon: "🌍" },
  ];

  const isComplete = progress.completedSteps === progress.totalSteps;

  if (isComplete) return null;

  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-sm">Getting Started</h4>
        <span className="text-xs text-base-content/60">
          {progress.completedSteps}/{progress.totalSteps}
        </span>
      </div>
      
      <div className="space-y-2">
        {steps.map((step) => (
          <div
            key={step.key}
            className={`flex items-center gap-2 text-sm ${
              progress[step.key] ? "text-base-content/50 line-through" : ""
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
              progress[step.key] 
                ? "bg-green-500/20 text-green-400" 
                : "bg-base-300 text-base-content/50"
            }`}>
              {progress[step.key] ? "✓" : step.icon}
            </span>
            <span>{step.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 h-1.5 bg-base-300 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-500"
          style={{ width: `${(progress.completedSteps / progress.totalSteps) * 100}%` }}
        />
      </div>
    </div>
  );
}
