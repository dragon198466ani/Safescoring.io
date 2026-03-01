import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import config from "@/config";

// Cache using globalThis so it persists across hot reloads in dev
// and across requests within the same serverless instance
const CACHE_TTL = 60 * 1000; // 1 minute cache

if (!globalThis.__statsCache) {
  globalThis.__statsCache = { data: null, time: 0 };
}

// Default fallback values from config
const defaultStats = {
  totalNorms: config.safe?.stats?.totalNorms || 2376,
  totalProducts: config.safe?.stats?.totalProducts || 1535,
  totalProductTypes: config.safe?.stats?.totalProductTypes || 78,
  normsByPillar: {
    S: 872,
    A: 540,
    F: 346,
    E: 618,
  },
};

/**
 * Server-side function to get real-time stats from Supabase
 * Used in generateMetadata and server components
 *
 * Priority: platform_stats table (pre-computed by DB triggers)
 *         → direct COUNT queries (fallback)
 *         → config.js hardcoded values (offline fallback)
 */
export async function getStats() {
  // Return cached value if fresh
  const cache = globalThis.__statsCache;
  if (cache.data && Date.now() - cache.time < CACHE_TTL) {
    return cache.data;
  }

  if (!isSupabaseConfigured()) {
    return defaultStats;
  }

  try {
    // Try platform_stats first (pre-computed by triggers, single row read = fast)
    const { data, error } = await supabase
      .from("platform_stats")
      .select("total_norms, total_products, total_product_types, norms_security, norms_adversity, norms_fidelity, norms_efficiency")
      .eq("id", 1)
      .single();

    if (!error && data) {
      const stats = {
        totalNorms: data.total_norms || defaultStats.totalNorms,
        totalProducts: data.total_products || defaultStats.totalProducts,
        totalProductTypes: data.total_product_types || defaultStats.totalProductTypes,
        normsByPillar: {
          S: data.norms_security || defaultStats.normsByPillar.S,
          A: data.norms_adversity || defaultStats.normsByPillar.A,
          F: data.norms_fidelity || defaultStats.normsByPillar.F,
          E: data.norms_efficiency || defaultStats.normsByPillar.E,
        },
      };

      globalThis.__statsCache.data = stats;
      globalThis.__statsCache.time = Date.now();
      return stats;
    }

    // Fallback: direct COUNT queries (if platform_stats table doesn't exist yet)
    const [normsResult, productsResult, typesResult] = await Promise.all([
      supabase.from("norms").select("*", { count: "exact", head: true }),
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("product_types").select("*", { count: "exact", head: true }),
    ]);

    const stats = {
      totalNorms: normsResult.count || defaultStats.totalNorms,
      totalProducts: productsResult.count || defaultStats.totalProducts,
      totalProductTypes: typesResult.count || defaultStats.totalProductTypes,
      normsByPillar: defaultStats.normsByPillar, // Can't get pillar breakdown from COUNT
    };

    globalThis.__statsCache.data = stats;
    globalThis.__statsCache.time = Date.now();
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
  globalThis.__statsCache.data = null;
  globalThis.__statsCache.time = 0;
}
