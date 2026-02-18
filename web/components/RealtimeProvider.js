"use client";

/**
 * RealtimeProvider - Client-side wrapper for real-time features
 *
 * Wraps the dashboard/setup pages to enable:
 * - Real-time Supabase subscriptions
 * - Cross-component state sync (Inception-style)
 * - Optimistic updates
 */

import { RealtimeStackProvider } from "@/hooks/useRealtimeStack";

export default function RealtimeProvider({ children }) {
  return (
    <RealtimeStackProvider>
      {children}
    </RealtimeStackProvider>
  );
}
