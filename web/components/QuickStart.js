"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUserSetups } from "@/hooks/useApi";

/**
 * QuickStart - Onboarding checklist for new users
 *
 * Shows suggested actions to help users get started:
 * - Create first setup
 * - Compare products
 * - Explore products
 * - Read methodology
 */

const CHECKLIST_ITEMS = [
  {
    id: "quiz",
    label: "Take the security quiz",
    description: "Discover which products fit your needs",
    href: "/quiz",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    colorClass: "bg-primary/20 text-primary",
  },
  {
    id: "setup",
    label: "Create your first setup",
    description: "Combine your wallets and tools to get a security score",
    href: "/dashboard/setups",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
      </svg>
    ),
    colorClass: "bg-secondary/20 text-secondary",
  },
  {
    id: "compare",
    label: "Compare products",
    description: "Side-by-side security analysis of any two products",
    href: "/compare",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
    colorClass: "bg-info/20 text-info",
  },
  {
    id: "explore",
    label: "Explore products",
    description: "Browse 300+ wallets, exchanges, and DeFi protocols",
    href: "/products",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
    colorClass: "bg-warning/20 text-warning",
  },
];

// Helper: Get demo setups from localStorage
const getDemoSetups = () => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("safescoring_demo_setups");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export default function QuickStart({ className = "" }) {
  const [dismissed, setDismissed] = useState(false);
  const [completedItems, setCompletedItems] = useState([]);
  const [hasSetups, setHasSetups] = useState(false);

  // Use useApi for setups (shared cache with other components)
  const { data: setupsData } = useUserSetups();

  // Load completed items from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("quickstart_completed");
    if (saved) {
      setCompletedItems(JSON.parse(saved));
    }
    const wasDismissed = localStorage.getItem("quickstart_dismissed");
    if (wasDismissed) {
      setDismissed(true);
    }
  }, []);

  // Check for setups from API data or localStorage demo setups
  useEffect(() => {
    // First check demo setups in localStorage
    const demoSetups = getDemoSetups();
    if (demoSetups.length > 0) {
      setHasSetups(true);
      return;
    }

    // Then check API data
    if (setupsData?.setups && setupsData.setups.length > 0) {
      setHasSetups(true);
    }
  }, [setupsData]);

  // Mark setup as completed if user has setups
  useEffect(() => {
    if (hasSetups && !completedItems.includes("setup")) {
      const newCompleted = [...completedItems, "setup"];
      setCompletedItems(newCompleted);
      localStorage.setItem("quickstart_completed", JSON.stringify(newCompleted));
    }
  }, [hasSetups, completedItems]);

  const handleItemClick = (itemId) => {
    if (!completedItems.includes(itemId)) {
      const newCompleted = [...completedItems, itemId];
      setCompletedItems(newCompleted);
      localStorage.setItem("quickstart_completed", JSON.stringify(newCompleted));
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("quickstart_dismissed", "true");
  };

  // Don't show if all items completed or dismissed
  if (dismissed || completedItems.length >= CHECKLIST_ITEMS.length) {
    return null;
  }

  const progress = (completedItems.length / CHECKLIST_ITEMS.length) * 100;

  return (
    <div className={`rounded-2xl bg-gradient-to-br from-primary/5 via-base-200 to-secondary/5 border border-base-300 p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold">Quick Start</h3>
            <p className="text-xs text-base-content/60">
              {completedItems.length}/{CHECKLIST_ITEMS.length} completed
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="btn btn-ghost btn-xs"
          title="Dismiss"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-base-300 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {CHECKLIST_ITEMS.map((item) => {
          const isCompleted = completedItems.includes(item.id);
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => handleItemClick(item.id)}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                isCompleted
                  ? "bg-success/10 border border-success/20"
                  : "bg-base-100 border border-base-300 hover:border-primary/50 hover:bg-primary/5"
              }`}
            >
              <div className={`p-2 rounded-lg ${isCompleted ? "bg-success/20 text-success" : item.colorClass}`}>
                {isCompleted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  item.icon
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isCompleted ? "line-through text-base-content/50" : ""}`}>
                  {item.label}
                </p>
                <p className="text-xs text-base-content/50 truncate">
                  {item.description}
                </p>
              </div>
              {!isCompleted && (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-base-content/30">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
