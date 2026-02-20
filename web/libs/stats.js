import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import config from "@/config";

// Cache for stats to avoid repeated DB calls during the same request cycle
let statsCache = null;
let statsCacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 minute cache

/**
 * Server-side function to get real-time stats from Supabase
 * Used in generateMetadata and server components
 * Falls back to config values if Supabase is not configured
 */
export async function getStats() {
  // Return cached value if fresh
  if (statsCache && Date.now() - statsCacheTime < CACHE_TTL) {
    return statsCache;
  }

  // Default fallback values from config
  const defaultStats = {
    totalNorms: config.safe?.stats?.totalNorms || 1100,
    totalProducts: config.safe?.stats?.totalProducts || 500,
    totalProductTypes: config.safe?.stats?.totalProductTypes || 88,
  };

  if (!isSupabaseConfigured()) {
    return defaultStats;
  }

  try {
    // Fetch all counts in parallel
    const [normsResult, productsResult, typesResult] = await Promise.all([
      supabase.from("norms").select("*", { count: "exact", head: true }),
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("product_types").select("*", { count: "exact", head: true }),
    ]);

    const stats = {
      totalNorms: normsResult.count || defaultStats.totalNorms,
      totalProducts: productsResult.count || defaultStats.totalProducts,
      totalProductTypes: typesResult.count || defaultStats.totalProductTypes,
    };

    // Update cache
    statsCache = stats;
    statsCacheTime = Date.now();

    return stats;
  } catch (error) {
    console.error("Error fetching stats from Supabase:", error);
    return defaultStats;
  }
}

/**
 * Get formatted stats string for SEO descriptions
 */
export async function getStatsString() {
  const stats = await getStats();
  return `${stats.totalNorms} security norms`;
}

/**
 * Invalidate stats cache (call after data changes)
 */
export function invalidateStatsCache() {
  statsCache = null;
  statsCacheTime = 0;
}
