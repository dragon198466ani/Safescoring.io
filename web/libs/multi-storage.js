/**
 * MULTI-STORAGE DATA ROUTER
 * Route les données vers le stockage optimal (gratuit)
 *
 * Architecture:
 * - Supabase #1: Users, setups, payments (hot data + auth)
 * - Supabase #2: Products, norms, evaluations (reference data)
 * - Turso: Historical data, archives
 * - Upstash Redis: Cache
 */

import { createClient } from "@supabase/supabase-js";

// =============================================================================
// CLIENTS INITIALIZATION
// =============================================================================

// Supabase #1 - Hot data (users, setups, payments)
export const supabaseMain = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Supabase #2 - Reference data (products, norms) - À configurer
const SUPABASE_REF_URL = process.env.SUPABASE_REF_URL;
const SUPABASE_REF_KEY = process.env.SUPABASE_REF_SERVICE_KEY;

export const supabaseRef = SUPABASE_REF_URL
  ? createClient(SUPABASE_REF_URL, SUPABASE_REF_KEY)
  : supabaseMain; // Fallback to main if not configured

// Turso - Historical data (si configuré)
let tursoClient = null;
if (process.env.TURSO_DATABASE_URL) {
  import("@libsql/client").then(({ createClient }) => {
    tursoClient = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  });
}

// Upstash Redis - Cache (si configuré)
let redisClient = null;
if (process.env.UPSTASH_REDIS_REST_URL) {
  import("@upstash/redis").then(({ Redis }) => {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  });
}

// =============================================================================
// CACHE HELPERS
// =============================================================================

/**
 * Get from cache or fetch
 */
export async function cachedFetch(key, fetcher, ttlSeconds = 300) {
  if (!redisClient) {
    return fetcher();
  }

  try {
    const cached = await redisClient.get(key);
    if (cached) {
      return cached;
    }
  } catch (e) {
    console.warn("Redis cache miss:", e.message);
  }

  const data = await fetcher();

  if (redisClient && data) {
    try {
      await redisClient.set(key, data, { ex: ttlSeconds });
    } catch (e) {
      console.warn("Redis cache set failed:", e.message);
    }
  }

  return data;
}

/**
 * Invalidate cache
 */
export async function invalidateCache(pattern) {
  if (!redisClient) return;

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch (e) {
    console.warn("Cache invalidation failed:", e.message);
  }
}

// =============================================================================
// DATA ROUTING - PRODUCTS (Reference Data)
// =============================================================================

/**
 * Get all products - From Supabase #2 (reference) with cache
 */
export async function getProducts(options = {}) {
  const { limit = 100, offset = 0, category, type } = options;
  const cacheKey = `products:${limit}:${offset}:${category || "all"}:${type || "all"}`;

  return cachedFetch(
    cacheKey,
    async () => {
      let query = supabaseRef
        .from("products")
        .select("*")
        .order("safe_score", { ascending: false })
        .range(offset, offset + limit - 1);

      if (category) query = query.eq("category", category);
      if (type) query = query.eq("type", type);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    300 // 5 min cache
  );
}

/**
 * Get single product by slug
 */
export async function getProduct(slug) {
  return cachedFetch(
    `product:${slug}`,
    async () => {
      const { data, error } = await supabaseRef
        .from("products")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error) throw error;
      return data;
    },
    300
  );
}

/**
 * Get product with full details (evaluations, scores)
 */
export async function getProductFull(slug) {
  return cachedFetch(
    `product_full:${slug}`,
    async () => {
      const { data: product } = await supabaseRef
        .from("products")
        .select("*")
        .eq("slug", slug)
        .single();

      if (!product) return null;

      const { data: evaluations } = await supabaseRef
        .from("evaluations")
        .select("*, norms(*)")
        .eq("product_id", product.id);

      const { data: scores } = await supabaseRef
        .from("safe_scoring_results")
        .select("*")
        .eq("product_id", product.id)
        .single();

      return { ...product, evaluations, scores };
    },
    600 // 10 min cache for full data
  );
}

// =============================================================================
// DATA ROUTING - NORMS (Reference Data)
// =============================================================================

/**
 * Get all norms - From Supabase #2 with long cache
 */
export async function getNorms() {
  return cachedFetch(
    "norms:all",
    async () => {
      const { data, error } = await supabaseRef.from("norms").select("*");
      if (error) throw error;
      return data;
    },
    3600 // 1 hour cache - norms rarely change
  );
}

/**
 * Get norms by pillar
 */
export async function getNormsByPillar(pillar) {
  return cachedFetch(
    `norms:pillar:${pillar}`,
    async () => {
      const { data, error } = await supabaseRef
        .from("norms")
        .select("*")
        .eq("pillar", pillar);
      if (error) throw error;
      return data;
    },
    3600
  );
}

// =============================================================================
// DATA ROUTING - USER DATA (Hot Data - Supabase #1)
// =============================================================================

/**
 * Get user setups - Always from main Supabase (needs auth)
 */
export async function getUserSetups(userId) {
  // No cache for user-specific data (needs real-time)
  const { data, error } = await supabaseMain
    .from("user_setups")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get user watchlist
 */
export async function getUserWatchlist(userId) {
  const { data, error } = await supabaseMain
    .from("user_watchlist")
    .select("*, products(*)")
    .eq("user_id", userId);

  if (error) throw error;
  return data;
}

/**
 * Create/Update user setup
 */
export async function saveUserSetup(userId, setup) {
  const { data, error } = await supabaseMain.from("user_setups").upsert({
    ...setup,
    user_id: userId,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;

  // Invalidate any cached user data
  await invalidateCache(`user:${userId}:*`);

  return data;
}

// =============================================================================
// DATA ROUTING - HISTORICAL DATA (Turso)
// =============================================================================

/**
 * Get score history - From Turso if available, else Supabase
 */
export async function getScoreHistory(productId, days = 365) {
  if (tursoClient) {
    try {
      const result = await tursoClient.execute({
        sql: `
          SELECT * FROM score_history
          WHERE product_id = ?
          AND recorded_at > datetime('now', '-${days} days')
          ORDER BY recorded_at DESC
        `,
        args: [productId],
      });
      return result.rows;
    } catch (e) {
      console.warn("Turso fetch failed, falling back to Supabase:", e.message);
    }
  }

  // Fallback to Supabase
  const { data } = await supabaseRef
    .from("product_score_history")
    .select("*")
    .eq("product_id", productId)
    .gte("recorded_at", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order("recorded_at", { ascending: false });

  return data;
}

/**
 * Archive old data to Turso
 */
export async function archiveToTurso(table, records) {
  if (!tursoClient) {
    console.warn("Turso not configured, skipping archive");
    return;
  }

  const columns = Object.keys(records[0]);
  const placeholders = columns.map(() => "?").join(", ");

  for (const record of records) {
    await tursoClient.execute({
      sql: `INSERT OR REPLACE INTO ${table}_archive (${columns.join(", ")}) VALUES (${placeholders})`,
      args: columns.map((col) => record[col]),
    });
  }
}

// =============================================================================
// DATA ROUTING - LEADERBOARD (Cached aggregation)
// =============================================================================

/**
 * Get leaderboard - Heavy query, cache aggressively
 */
export async function getLeaderboard(pillar = null, limit = 20) {
  const cacheKey = `leaderboard:${pillar || "all"}:${limit}`;

  return cachedFetch(
    cacheKey,
    async () => {
      let query = supabaseRef
        .from("products")
        .select("id, name, slug, logo_url, safe_score, score_s, score_a, score_f, score_e, type")
        .not("safe_score", "is", null)
        .order("safe_score", { ascending: false })
        .limit(limit);

      if (pillar) {
        query = query.order(`score_${pillar.toLowerCase()}`, { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    600 // 10 min cache
  );
}

// =============================================================================
// STATS - Platform stats (Cached)
// =============================================================================

/**
 * Get platform stats - Expensive, cache long
 */
export async function getPlatformStats() {
  return cachedFetch(
    "platform_stats",
    async () => {
      const [products, norms, evaluations, users] = await Promise.all([
        supabaseRef.from("products").select("id", { count: "exact", head: true }),
        supabaseRef.from("norms").select("id", { count: "exact", head: true }),
        supabaseRef.from("evaluations").select("id", { count: "exact", head: true }),
        supabaseMain.from("users").select("id", { count: "exact", head: true }),
      ]);

      return {
        products: products.count || 0,
        norms: norms.count || 0,
        evaluations: evaluations.count || 0,
        users: users.count || 0,
      };
    },
    1800 // 30 min cache
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  // Clients
  supabaseMain,
  supabaseRef,

  // Cache
  cachedFetch,
  invalidateCache,

  // Products
  getProducts,
  getProduct,
  getProductFull,

  // Norms
  getNorms,
  getNormsByPillar,

  // Users
  getUserSetups,
  getUserWatchlist,
  saveUserSetup,

  // Historical
  getScoreHistory,
  archiveToTurso,

  // Aggregations
  getLeaderboard,
  getPlatformStats,
};
