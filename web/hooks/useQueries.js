"use client";

/**
 * ============================================================================
 * React Query Hooks for SafeScoring
 * ============================================================================
 * 
 * Pre-configured hooks using React Query for common data fetching patterns.
 * These hooks provide automatic caching, deduplication, and background refetching.
 * 
 * BENEFITS:
 * - No more manual loading states
 * - Automatic caching (30s stale time by default)
 * - Request deduplication
 * - Background refetching
 * - Error handling built-in
 * 
 * USAGE:
 * const { data: product, isLoading, error } = useProduct("ledger-nano-x");
 * ============================================================================
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/libs/query-client";

// ============================================================================
// PRODUCT HOOKS
// ============================================================================

/**
 * Fetch a single product by slug
 */
export function useProduct(slug, options = {}) {
  return useQuery({
    queryKey: queryKeys.products.detail(slug),
    queryFn: async () => {
      const res = await fetch(`/api/products/${slug}`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to fetch product");
      }
      return res.json();
    },
    enabled: !!slug,
    staleTime: 60 * 1000, // 1 minute
    ...options,
  });
}

/**
 * Fetch products list with filters
 */
export function useProducts(filters = {}, options = {}) {
  const params = new URLSearchParams();
  
  if (filters.category) params.set("category", filters.category);
  if (filters.type) params.set("type", filters.type);
  if (filters.search) params.set("search", filters.search);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.offset) params.set("offset", String(filters.offset));
  if (filters.scoreType) params.set("scoreType", filters.scoreType);

  return useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: async () => {
      const res = await fetch(`/api/products?${params}`);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
}

/**
 * Fetch product evaluations (detailed norms breakdown)
 */
export function useProductEvaluations(slug, options = {}) {
  return useQuery({
    queryKey: queryKeys.products.evaluations(slug),
    queryFn: async () => {
      const res = await fetch(`/api/products/${slug}/evaluations`);
      if (!res.ok) throw new Error("Failed to fetch evaluations");
      return res.json();
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// ============================================================================
// USER HOOKS
// ============================================================================

/**
 * Fetch user's setups
 */
export function useUserSetups(userId, options = {}) {
  return useQuery({
    queryKey: queryKeys.user.setups(userId),
    queryFn: async () => {
      const res = await fetch("/api/setups");
      if (!res.ok) throw new Error("Failed to fetch setups");
      return res.json();
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
    ...options,
  });
}

/**
 * Fetch user's watchlist
 */
export function useUserWatchlist(userId, options = {}) {
  return useQuery({
    queryKey: queryKeys.user.watchlist(userId),
    queryFn: async () => {
      const res = await fetch("/api/user/watchlist");
      if (!res.ok) throw new Error("Failed to fetch watchlist");
      return res.json();
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
    ...options,
  });
}

/**
 * Fetch user's notifications
 */
export function useUserNotifications(userId, options = {}) {
  return useQuery({
    queryKey: queryKeys.user.notifications(userId),
    queryFn: async () => {
      const res = await fetch("/api/user/notifications");
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    enabled: !!userId,
    staleTime: 10 * 1000, // 10 seconds - notifications should be fresh
    refetchInterval: 60 * 1000, // Refetch every minute
    ...options,
  });
}

// ============================================================================
// SETUP HOOKS
// ============================================================================

/**
 * Fetch a single setup by ID
 */
export function useSetup(setupId, options = {}) {
  return useQuery({
    queryKey: queryKeys.setups.detail(setupId),
    queryFn: async () => {
      const res = await fetch(`/api/setups/${setupId}`);
      if (!res.ok) throw new Error("Failed to fetch setup");
      return res.json();
    },
    enabled: !!setupId,
    staleTime: 30 * 1000,
    ...options,
  });
}

/**
 * Fetch public/community setups
 */
export function usePublicSetups(options = {}) {
  return useQuery({
    queryKey: queryKeys.setups.public,
    queryFn: async () => {
      const res = await fetch("/api/community/stacks");
      if (!res.ok) throw new Error("Failed to fetch public setups");
      return res.json();
    },
    staleTime: 60 * 1000,
    ...options,
  });
}

// ============================================================================
// INCIDENTS HOOKS
// ============================================================================

/**
 * Fetch incidents for map
 */
export function useIncidentsMap(options = {}) {
  return useQuery({
    queryKey: queryKeys.incidents.map,
    queryFn: async () => {
      const res = await fetch("/api/incidents/map");
      if (!res.ok) throw new Error("Failed to fetch incidents");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Fetch physical incidents
 */
export function usePhysicalIncidents(options = {}) {
  return useQuery({
    queryKey: queryKeys.incidents.physical,
    queryFn: async () => {
      const res = await fetch("/api/incidents/physical");
      if (!res.ok) throw new Error("Failed to fetch physical incidents");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

// ============================================================================
// STATS HOOKS
// ============================================================================

/**
 * Fetch dashboard stats
 */
export function useDashboardStats(options = {}) {
  return useQuery({
    queryKey: queryKeys.stats.dashboard,
    queryFn: async () => {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    staleTime: 60 * 1000, // 1 minute
    ...options,
  });
}

/**
 * Fetch leaderboard
 */
export function useLeaderboard(options = {}) {
  return useQuery({
    queryKey: queryKeys.stats.leaderboard,
    queryFn: async () => {
      const res = await fetch("/api/leaderboard");
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
    staleTime: 60 * 1000,
    ...options,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Add product to watchlist
 */
export function useAddToWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, alertThreshold = 5 }) => {
      const res = await fetch("/api/user/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, alertThreshold }),
      });
      if (!res.ok) throw new Error("Failed to add to watchlist");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.watchlist() });
    },
  });
}

/**
 * Remove product from watchlist
 */
export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId) => {
      const res = await fetch(`/api/user/watchlist/${productId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove from watchlist");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.watchlist() });
    },
  });
}

/**
 * Create a new setup
 */
export function useCreateSetup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (setupData) => {
      const res = await fetch("/api/setups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setupData),
      });
      if (!res.ok) throw new Error("Failed to create setup");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.setups.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.setups() });
    },
  });
}

/**
 * Update a setup
 */
export function useUpdateSetup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ setupId, data }) => {
      const res = await fetch(`/api/setups/${setupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update setup");
      return res.json();
    },
    onSuccess: (_, { setupId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.setups.detail(setupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.setups() });
    },
  });
}

/**
 * Delete a setup
 */
export function useDeleteSetup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (setupId) => {
      const res = await fetch(`/api/setups/${setupId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete setup");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.setups.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.setups() });
    },
  });
}

// ============================================================================
// PREFETCH FUNCTIONS (for SSR/SSG)
// ============================================================================

/**
 * Prefetch product data (call from getServerSideProps or generateMetadata)
 */
export async function prefetchProduct(queryClient, slug) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.products.detail(slug),
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/products/${slug}`);
      if (!res.ok) throw new Error("Failed to fetch product");
      return res.json();
    },
  });
}

export default {
  useProduct,
  useProducts,
  useProductEvaluations,
  useUserSetups,
  useUserWatchlist,
  useUserNotifications,
  useSetup,
  usePublicSetups,
  useIncidentsMap,
  usePhysicalIncidents,
  useDashboardStats,
  useLeaderboard,
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useCreateSetup,
  useUpdateSetup,
  useDeleteSetup,
};
