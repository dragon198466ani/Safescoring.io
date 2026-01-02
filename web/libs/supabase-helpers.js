/**
 * Supabase Query Helpers
 * Optimized queries with specific column selection and batch operations
 */

import { supabase, isSupabaseConfigured } from "./supabase";

// Column definitions for optimized selects
// Note: products table columns: id, name, slug, url, type_id, brand_id, updated_at, media, description, short_description, price_eur, price_details
const COLUMNS = {
  // Products list view - minimal columns
  productList: `
    id,
    name,
    slug,
    type_id,
    url
  `,

  // Product detail view
  productDetail: `
    id,
    name,
    slug,
    type_id,
    url,
    short_description,
    description,
    media,
    price_eur,
    price_details,
    updated_at
  `,

  // Scores (actual columns are score_s, score_a, score_f, score_e)
  scores: `
    note_finale,
    score_s,
    score_a,
    score_f,
    score_e,
    calculated_at
  `,

  // Product types
  productTypes: `
    id,
    code,
    name,
    category,
    definition
  `,

  // Norms (actual: id, code, pillar, title, description, is_essential, consumer, full)
  norms: `
    id,
    code,
    title,
    pillar,
    description,
    is_essential,
    consumer
  `,

  // Evaluations (actual: id, product_id, norm_id, result, why_this_result, evaluated_by, evaluation_date, confidence_score)
  evaluations: `
    id,
    product_id,
    norm_id,
    result,
    why_this_result,
    evaluation_date
  `,

  // Security incidents (actual: id, incident_id, title, description, incident_type, severity, funds_lost_usd, status, response_quality, source_urls, is_published, incident_date)
  incidents: `
    id,
    incident_id,
    title,
    description,
    incident_date,
    severity,
    incident_type,
    funds_lost_usd,
    funds_recovered_usd,
    status,
    response_quality,
    source_urls
  `,
};

/**
 * Get products list with scores (optimized)
 * Uses v_products_with_scores view (columns: product_id, product_name, etc.)
 */
export async function getProductsWithScores({
  limit = 100,
  offset = 0,
  search = "",
  typeId = null,
  category = null,
  sortBy = "score",
  sortOrder = "desc",
} = {}) {
  if (!isSupabaseConfigured()) {
    return { products: [], total: 0 };
  }

  try {
    // Use the optimized view
    let query = supabase
      .from("v_products_with_scores")
      .select("*", { count: "exact" });

    // Apply filters (use view column names)
    if (search) {
      query = query.ilike("product_name", `%${search}%`);
    }
    if (typeId) {
      query = query.eq("type_id", typeId);
    }

    // Apply sorting (use view column names)
    const orderColumn =
      sortBy === "score" ? "note_finale" : sortBy === "name" ? "product_name" : "last_update";
    query = query.order(orderColumn, {
      ascending: sortOrder === "asc",
      nullsFirst: false,
    });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // Map view columns to expected format
    const products = (data || []).map((p) => ({
      id: p.product_id,
      name: p.product_name,
      slug: p.slug,
      typeId: p.type_id,
      url: p.url,
      shortDescription: p.short_description,
      scores: {
        total: p.note_finale,
        s: p.pilier_s,
        a: p.pilier_a,
        f: p.pilier_f,
        e: p.pilier_e,
      },
      lastUpdate: p.last_update,
    }));

    return {
      products,
      total: count || 0,
    };
  } catch (error) {
    console.error("Error fetching products:", error);
    return { products: [], total: 0, error: error.message };
  }
}

/**
 * Get product by slug with all related data (optimized)
 */
export async function getProductBySlug(slug) {
  if (!isSupabaseConfigured() || !slug) {
    return null;
  }

  try {
    // First get the product to get its ID
    const { data: product, error: productError } = await supabase
      .from("products")
      .select(COLUMNS.productDetail)
      .eq("slug", slug)
      .maybeSingle();

    if (productError) throw productError;
    if (!product) return null;

    // Now fetch related data using the product ID (integer)
    const [scoresResult, typesResult] = await Promise.all([
      // Latest scores (product_id is INTEGER, not slug)
      supabase
        .from("safe_scoring_results")
        .select(COLUMNS.scores)
        .eq("product_id", product.id)
        .maybeSingle(),

      // Product types via mapping
      supabase
        .from("product_type_mapping")
        .select(`
          is_primary,
          product_types (${COLUMNS.productTypes})
        `)
        .eq("product_id", product.id),
    ]);

    return {
      ...product,
      scores: scoresResult.data || null,
      types: typesResult.data?.map((t) => ({
        ...t.product_types,
        isPrimary: t.is_primary,
      })) || [],
    };
  } catch (error) {
    console.error("Error fetching product:", error);
    return null;
  }
}

/**
 * Get product types with counts (optimized)
 */
export async function getProductTypes() {
  if (!isSupabaseConfigured()) {
    return { types: [], categories: [] };
  }

  try {
    const { data, error } = await supabase
      .from("v_product_type_counts")
      .select("*")
      .order("category")
      .order("name");

    if (error) throw error;

    const types = data || [];
    const categories = [...new Set(types.map((t) => t.category))].filter(Boolean);

    return { types, categories };
  } catch (error) {
    console.error("Error fetching product types:", error);
    return { types: [], categories: [], error: error.message };
  }
}

/**
 * Get product evaluations (optimized)
 */
export async function getProductEvaluations(productId) {
  if (!isSupabaseConfigured() || !productId) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("evaluations")
      .select(`
        ${COLUMNS.evaluations},
        norms (${COLUMNS.norms})
      `)
      .eq("product_id", productId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching evaluations:", error);
    return [];
  }
}

/**
 * Get product security incidents (optimized)
 * Uses junction table incident_product_impact to link incidents to products
 */
export async function getProductIncidents(productId) {
  if (!isSupabaseConfigured() || !productId) {
    return { incidents: [], stats: {} };
  }

  try {
    // Query via junction table incident_product_impact
    const { data, error } = await supabase
      .from("incident_product_impact")
      .select(`
        impact_level,
        funds_lost_usd,
        security_incidents (${COLUMNS.incidents})
      `)
      .eq("product_id", productId);

    if (error) throw error;

    // Flatten the data structure
    const incidents = (data || [])
      .filter((d) => d.security_incidents)
      .map((d) => ({
        ...d.security_incidents,
        impact_level: d.impact_level,
        product_funds_lost: d.funds_lost_usd,
      }))
      .sort((a, b) => new Date(b.incident_date) - new Date(a.incident_date));

    // Calculate stats
    const stats = {
      totalIncidents: incidents.length,
      totalFundsLost: incidents.reduce((sum, i) => sum + (i.funds_lost_usd || 0), 0),
      bySeverity: incidents.reduce((acc, i) => {
        acc[i.severity] = (acc[i.severity] || 0) + 1;
        return acc;
      }, {}),
      hasActiveIncidents: incidents.some((i) => i.status !== "resolved"),
      riskLevel: calculateRiskLevel(incidents),
    };

    return { incidents, stats };
  } catch (error) {
    console.error("Error fetching incidents:", error);
    return { incidents: [], stats: {}, error: error.message };
  }
}

/**
 * Calculate risk level from incidents
 */
function calculateRiskLevel(incidents) {
  if (!incidents.length) return "low";

  const criticalCount = incidents.filter((i) => i.severity === "critical").length;
  const highCount = incidents.filter((i) => i.severity === "high").length;
  const hasActive = incidents.some((i) => i.status !== "resolved");

  if (criticalCount > 0 && hasActive) return "critical";
  if (criticalCount > 2 || (highCount > 3 && hasActive)) return "high";
  if (highCount > 0 || criticalCount > 0) return "medium";
  return "low";
}

/**
 * Batch get multiple products by IDs
 */
export async function getProductsByIds(ids) {
  if (!isSupabaseConfigured() || !ids?.length) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("v_products_with_scores")
      .select("*")
      .in("product_id", ids);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error batch fetching products:", error);
    return [];
  }
}

/**
 * Get norms for a product type (optimized)
 */
export async function getNormsForType(typeId) {
  if (!isSupabaseConfigured() || !typeId) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("norm_applicability")
      .select(`
        is_applicable,
        norms (${COLUMNS.norms})
      `)
      .eq("type_id", typeId)
      .eq("is_applicable", true);

    if (error) throw error;
    return data?.map((d) => d.norms).filter(Boolean) || [];
  } catch (error) {
    console.error("Error fetching norms:", error);
    return [];
  }
}

/**
 * Get product score history (optimized with view)
 */
export async function getProductScoreHistory(productId, { limit = 30 } = {}) {
  if (!isSupabaseConfigured() || !productId) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("v_score_history_summary")
      .select("*")
      .eq("product_id", productId)
      .order("recorded_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching score history:", error);
    return [];
  }
}

/**
 * Get product incidents via optimized view
 */
export async function getProductIncidentsOptimized(productId) {
  if (!isSupabaseConfigured() || !productId) {
    return { incidents: [], stats: {} };
  }

  try {
    const { data, error } = await supabase
      .from("v_product_incidents")
      .select("*")
      .eq("product_id", productId);

    if (error) throw error;

    const incidents = data || [];

    // Calculate stats
    const stats = {
      totalIncidents: incidents.length,
      totalFundsLost: incidents.reduce((sum, i) => sum + (i.funds_lost_usd || 0), 0),
      bySeverity: incidents.reduce((acc, i) => {
        acc[i.severity] = (acc[i.severity] || 0) + 1;
        return acc;
      }, {}),
      hasActiveIncidents: incidents.some((i) => i.status !== "resolved"),
      riskLevel: calculateRiskLevel(incidents),
    };

    return { incidents, stats };
  } catch (error) {
    console.error("Error fetching incidents:", error);
    return { incidents: [], stats: {}, error: error.message };
  }
}

/**
 * Get pending corrections count for admin dashboard
 */
export async function getPendingCorrectionsCount() {
  if (!isSupabaseConfigured()) {
    return 0;
  }

  try {
    const { count, error } = await supabase
      .from("user_corrections")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error("Error fetching corrections count:", error);
    return 0;
  }
}

/**
 * Get user setups (portfolios)
 */
export async function getUserSetups(userId) {
  if (!isSupabaseConfigured() || !userId) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("user_setups")
      .select("id, name, description, products, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching user setups:", error);
    return [];
  }
}

export default {
  getProductsWithScores,
  getProductBySlug,
  getProductTypes,
  getProductEvaluations,
  getProductIncidents,
  getProductIncidentsOptimized,
  getProductsByIds,
  getNormsForType,
  getProductScoreHistory,
  getPendingCorrectionsCount,
  getUserSetups,
  COLUMNS,
};
