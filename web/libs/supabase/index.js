/**
 * ============================================================================
 * SUPABASE - Unified Exports
 * ============================================================================
 * 
 * Single import point for all Supabase-related functionality.
 * 
 * USAGE:
 * import { 
 *   getSupabase,           // Client-side
 *   getSupabaseServer,     // Server-side (API routes)
 *   getSupabaseAdmin,      // Admin operations
 *   isSupabaseConfigured,  // Check if configured
 *   getProductComplete,    // Optimized product query
 *   getProductsListing,    // Optimized products list
 * } from "@/libs/supabase";
 * 
 * ============================================================================
 */

// ============================================================================
// CORE CLIENTS (from supabase.js)
// ============================================================================
export {
  getSupabase,
  getSupabaseServer,
  getSupabaseAdmin,
  isSupabaseConfigured,
  supabase,
  supabaseAdmin,
} from "../supabase";

// ============================================================================
// OPTIMIZED QUERIES (from supabase-optimized.js)
// ============================================================================
export {
  getProductComplete,
  getProductsListing,
  getProductMetadata,
  getProductIncidents,
  getCached,
  clearCache,
  invalidateProductCache,
  invalidateAllScoresCaches,
} from "../supabase-optimized";

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Execute a query with automatic error handling
 * @param {Function} queryFn - Async function that returns Supabase query result
 * @returns {Promise<{data: any, error: Error|null}>}
 */
export async function safeQuery(queryFn) {
  try {
    const result = await queryFn();
    return { data: result.data, error: result.error };
  } catch (error) {
    console.error("[Supabase] Query error:", error);
    return { data: null, error };
  }
}

/**
 * Execute multiple queries in parallel
 * @param {Array<Function>} queries - Array of query functions
 * @returns {Promise<Array<{data: any, error: Error|null}>>}
 */
export async function parallelQueries(queries) {
  return Promise.all(queries.map(safeQuery));
}

/**
 * Get a single record by ID
 * @param {string} table - Table name
 * @param {number|string} id - Record ID
 * @param {string} select - Fields to select
 */
export async function getById(table, id, select = "*") {
  const { getSupabaseServer, isSupabaseConfigured } = await import("../supabase");
  
  if (!isSupabaseConfigured()) return null;
  
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq("id", id)
    .maybeSingle();
  
  if (error) {
    console.error(`[Supabase] Error fetching ${table}:`, error);
    return null;
  }
  
  return data;
}

/**
 * Get a single record by slug
 * @param {string} table - Table name
 * @param {string} slug - Record slug
 * @param {string} select - Fields to select
 */
export async function getBySlug(table, slug, select = "*") {
  const { getSupabaseServer, isSupabaseConfigured } = await import("../supabase");
  
  if (!isSupabaseConfigured()) return null;
  
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq("slug", slug)
    .maybeSingle();
  
  if (error) {
    console.error(`[Supabase] Error fetching ${table}:`, error);
    return null;
  }
  
  return data;
}

// ============================================================================
// TABLE NAMES (for type safety)
// ============================================================================
export const TABLES = {
  PRODUCTS: "products",
  PRODUCT_TYPES: "product_types",
  PRODUCT_TYPE_MAPPING: "product_type_mapping",
  NORMS: "norms",
  EVALUATIONS: "evaluations",
  SAFE_SCORING_RESULTS: "safe_scoring_results",
  SAFE_SCORING_DEFINITIONS: "safe_scoring_definitions",
  USERS: "users",
  USER_SETUPS: "user_setups",
  USER_WATCHLIST: "user_watchlist",
  USER_PRESENCE: "user_presence",
  PHYSICAL_INCIDENTS: "physical_incidents",
  SECURITY_INCIDENTS: "security_incidents",
  SCORE_HISTORY: "score_history",
  SETUP_HISTORY: "setup_history",
};

// ============================================================================
// RPC FUNCTION NAMES
// ============================================================================
export const RPC = {
  GET_PRODUCT_COMPLETE: "get_product_complete",
  GET_PRODUCTS_LISTING: "get_products_listing",
  CALCULATE_PRODUCT_SCORES: "calculate_product_scores",
  GET_NORMS_MVP_STATUS: "get_norms_mvp_status",
  REPAIR_DATA_COHERENCE: "repair_data_coherence",
  GET_INTEGRITY_REPORT: "get_integrity_report",
};
