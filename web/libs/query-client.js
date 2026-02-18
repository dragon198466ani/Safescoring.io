"use client";

/**
 * ============================================================================
 * React Query Client Configuration
 * ============================================================================
 * 
 * Centralized QueryClient configuration for optimal caching and performance.
 * 
 * BENEFITS:
 * - Automatic caching of API responses
 * - Deduplication of identical requests
 * - Background refetching for fresh data
 * - Optimistic updates support
 * - Retry logic with exponential backoff
 * 
 * USAGE:
 * 1. Wrap app with QueryClientProvider (in LayoutClient.js)
 * 2. Use useQuery/useMutation hooks in components
 * 
 * EXAMPLE:
 * const { data, isLoading } = useQuery({
 *   queryKey: ['product', slug],
 *   queryFn: () => fetch(`/api/products/${slug}`).then(r => r.json()),
 * });
 * ============================================================================
 */

import { QueryClient } from "@tanstack/react-query";

// Create a client with optimized defaults
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is considered fresh for 30 seconds
        staleTime: 30 * 1000,
        
        // Keep unused data in cache for 5 minutes
        gcTime: 5 * 60 * 1000,
        
        // Retry failed requests 2 times with exponential backoff
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // Don't refetch on window focus in production (reduces API calls)
        refetchOnWindowFocus: process.env.NODE_ENV === "development",
        
        // Don't refetch on reconnect automatically
        refetchOnReconnect: false,
        
        // Network mode - always try to fetch
        networkMode: "always",
      },
      mutations: {
        // Retry mutations once
        retry: 1,
        
        // Network mode
        networkMode: "always",
      },
    },
  });
}

// Singleton for client-side
let browserQueryClient = null;

export function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always create a new client
    return createQueryClient();
  }
  
  // Browser: reuse existing client
  if (!browserQueryClient) {
    browserQueryClient = createQueryClient();
  }
  return browserQueryClient;
}

// ============================================================================
// QUERY KEY FACTORIES
// ============================================================================
// Centralized query keys for consistency and easy invalidation

export const queryKeys = {
  // Products
  products: {
    all: ["products"],
    list: (filters) => ["products", "list", filters],
    detail: (slug) => ["products", "detail", slug],
    scores: (slug) => ["products", "scores", slug],
    evaluations: (slug) => ["products", "evaluations", slug],
  },
  
  // User data
  user: {
    all: ["user"],
    profile: (userId) => ["user", "profile", userId],
    setups: (userId) => ["user", "setups", userId],
    watchlist: (userId) => ["user", "watchlist", userId],
    notifications: (userId) => ["user", "notifications", userId],
  },
  
  // Setups
  setups: {
    all: ["setups"],
    detail: (setupId) => ["setups", "detail", setupId],
    history: (setupId) => ["setups", "history", setupId],
    public: ["setups", "public"],
  },
  
  // Incidents
  incidents: {
    all: ["incidents"],
    physical: ["incidents", "physical"],
    security: ["incidents", "security"],
    map: ["incidents", "map"],
  },
  
  // Stats & Dashboard
  stats: {
    dashboard: ["stats", "dashboard"],
    leaderboard: ["stats", "leaderboard"],
    community: ["stats", "community"],
  },
  
  // Norms
  norms: {
    all: ["norms"],
    byPillar: (pillar) => ["norms", "pillar", pillar],
  },
};

// ============================================================================
// PREFETCH HELPERS
// ============================================================================

/**
 * Prefetch product data for faster navigation
 */
export async function prefetchProduct(queryClient, slug) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.products.detail(slug),
    queryFn: async () => {
      const res = await fetch(`/api/products/${slug}`);
      if (!res.ok) throw new Error("Failed to fetch product");
      return res.json();
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Prefetch products list
 */
export async function prefetchProductsList(queryClient, filters = {}) {
  const params = new URLSearchParams(filters);
  await queryClient.prefetchQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: async () => {
      const res = await fetch(`/api/products?${params}`);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// INVALIDATION HELPERS
// ============================================================================

/**
 * Invalidate all product-related queries
 */
export function invalidateProducts(queryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
}

/**
 * Invalidate user data after login/logout
 */
export function invalidateUserData(queryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.setups.all });
}

/**
 * Invalidate everything (use sparingly)
 */
export function invalidateAll(queryClient) {
  queryClient.invalidateQueries();
}

export default getQueryClient;
