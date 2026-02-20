/**
 * Custom Hooks Index
 *
 * Central export for all custom hooks
 * Import from '@/hooks' instead of individual files
 *
 * @example
 * import { useApi, useDebounce, useNotification } from '@/hooks';
 */

// API & Data Fetching
export { default as useApi, usePaginatedApi, useInfiniteApi } from "./useApi";
export {
  useSupabaseSubscription,
  useMultipleSubscriptions,
  useSetupSubscription,
  useSetupHistorySubscription,
} from "./useSupabaseSubscription";
export { default as useRealtimeProducts } from "./useRealtimeProducts";
export { default as useRealtimeMap } from "./useRealtimeMap";
export { default as useRealtimePresence } from "./useRealtimePresence";
export { default as useStats, formatWithStats } from "./useStats";

// Setup Real-time
export {
  default as useSetupScores,
  useAnimatedScore,
  useScoreChange,
} from "./useSetupScores";

// UI & UX
export { default as useDebounce } from "./useDebounce";
export { default as useIntersectionObserver } from "./useIntersectionObserver";
export { useOnlineStatus, ConnectionIndicator } from "./useOnlineStatus";
export { useNotification, notificationPresets } from "./useNotification";

// User & Session
export { default as useMemory } from "./useMemory";
export { default as usePresence } from "./usePresence";
export { useStreak, StreakDisplay } from "./useStreak";

// Notifications
export { usePushNotifications } from "./usePushNotifications";
export { useScoreNotifications, useProductScoreWatch, useMultiProductScoreWatch } from "./useScoreNotifications";

// Real-time All Tables
export {
  useRealtimeTable,
  useUserNotifications,
  useWatchlistAlerts,
  useSetupRealtime,
  useMapPresence,
  useIncidentsRealtime,
  useDashboardStats,
  useAllRealtimeNotifications,
} from "./useRealtimeNotifications";

// React Query Hooks (cached data fetching)
export {
  useProduct,
  useProducts,
  useProductEvaluations,
  useUserSetups,
  useUserWatchlist,
  useUserNotifications as useUserNotificationsQuery,
  useSetup,
  usePublicSetups,
  useIncidentsMap,
  usePhysicalIncidents,
  useDashboardStats as useDashboardStatsQuery,
  useLeaderboard,
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useCreateSetup,
  useUpdateSetup,
  useDeleteSetup,
} from "./useQueries";

// Performance
export { default as useWebVitals } from "./useWebVitals";
