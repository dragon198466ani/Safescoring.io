"use client";

/**
 * DashboardClient - Client wrapper for dashboard layout
 *
 * Enables real-time features across all dashboard pages:
 * - Inception-style layer synchronization
 * - Product updates propagate from Product Pages -> Dashboard -> Setup Details
 * - Optimistic updates for instant UI feedback
 * - Handles upgrade modals from URL params (?upgrade=audit)
 */

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { RealtimeStackProvider } from "@/hooks/useRealtimeStack";
import AuditUpgradeModal from "@/components/AuditUpgradeModal";

export default function DashboardClient({ children }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Check for upgrade parameter
  useEffect(() => {
    const upgrade = searchParams.get("upgrade");
    if (upgrade === "audit" || upgrade === "full-audit") {
      setShowAuditModal(true);
    }
  }, [searchParams]);

  const handleCloseAuditModal = () => {
    setShowAuditModal(false);
    // Remove the query param from URL
    const url = new URL(window.location.href);
    url.searchParams.delete("upgrade");
    router.replace(url.pathname, { scroll: false });
  };

  return (
    <RealtimeStackProvider>
      {/* Audit Upgrade Modal */}
      <AuditUpgradeModal isOpen={showAuditModal} onClose={handleCloseAuditModal} />
      {/* Mobile bottom nav for dashboard */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-base-100/95 backdrop-blur-lg border-t border-base-300 safe-area-bottom">
        <nav className="flex items-center justify-around px-2 py-2">
          <DashboardNavItem href="/dashboard" icon="home" label="Home" />
          <DashboardNavItem href="/dashboard/setups" icon="stack" label="Stacks" />
          <DashboardNavItem href="/products" icon="grid" label="Products" />
          <DashboardNavItem href="/dashboard/watchlist" icon="eye" label="Watch" />
        </nav>
      </div>

      {/* Add padding bottom for mobile nav */}
      <div className="pb-16 lg:pb-0">
        {children}
      </div>
    </RealtimeStackProvider>
  );
}

/**
 * Mobile nav item component
 */
function DashboardNavItem({ href, icon, label }) {
  const icons = {
    home: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
    stack: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
      </svg>
    ),
    grid: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
    eye: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  };

  return (
    <a
      href={href}
      className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-base-content/60 hover:text-primary hover:bg-primary/5 transition-all touch-manipulation active:scale-95"
    >
      {icons[icon]}
      <span className="text-xs font-medium">{label}</span>
    </a>
  );
}
