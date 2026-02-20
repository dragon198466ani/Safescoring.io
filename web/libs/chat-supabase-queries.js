/**
 * Smart Supabase queries for the autonomous chatbot
 * Source of truth for all product and norm data
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { sanitizeILIKE } from "./sql-sanitize";

/**
 * Search products by name, slug, or type
 * @param {string} query - Search query
 * @param {number} limit - Max results
 * @returns {Promise<Array>} Products with scores
 */
export async function searchProducts(query, limit = 10) {
  if (!isSupabaseConfigured() || !query) return [];

  const normalizedQuery = query.toLowerCase().trim();
  // SECURITY: Sanitize query to prevent ILIKE injection (escape %, _, \)
  const sanitizedQuery = sanitizeILIKE(normalizedQuery, 100);

  if (!sanitizedQuery) return [];

  // Try exact slug match first
  const { data: exactMatch } = await supabase
    .from("products")
    .select(`
      id, name, slug, url, logo_url,
      product_types!inner(code, name, category, is_hardware),
      safe_scoring_results(
        note_finale, score_s, score_a, score_f, score_e,
        note_consumer, s_consumer, a_consumer, f_consumer, e_consumer,
        note_essential, s_essential, a_essential, f_essential, e_essential,
        total_norms_evaluated, total_yes, total_no, total_tbd, total_na
      )
    `)
    .eq("slug", normalizedQuery)
    .limit(1);

  if (exactMatch && exactMatch.length > 0) {
    return formatProducts(exactMatch);
  }

  // Fuzzy search by name
  const { data: nameMatches } = await supabase
    .from("products")
    .select(`
      id, name, slug, url, logo_url,
      product_types!inner(code, name, category, is_hardware),
      safe_scoring_results(
        note_finale, score_s, score_a, score_f, score_e,
        note_consumer, s_consumer, a_consumer, f_consumer, e_consumer,
        note_essential, s_essential, a_essential, f_essential, e_essential,
        total_norms_evaluated, total_yes, total_no, total_tbd, total_na
      )
    `)
    .ilike("name", `%${sanitizedQuery}%`)
    .order("name")
    .limit(limit);

  return formatProducts(nameMatches || []);
}

/**
 * Get full product details with all evaluations
 * @param {string} slug - Product slug
 * @returns {Promise<Object|null>} Product with full details
 */
export async function getProductWithFullDetails(slug) {
  if (!isSupabaseConfigured() || !slug) return null;

  const { data: product, error } = await supabase
    .from("products")
    .select(`
      id, name, slug, url, logo_url, description,
      price_eur, specs,
      product_types!inner(code, name, category, is_hardware, is_custodial),
      brands(name, logo_url, website),
      safe_scoring_results(
        note_finale, score_s, score_a, score_f, score_e,
        note_consumer, s_consumer, a_consumer, f_consumer, e_consumer,
        note_essential, s_essential, a_essential, f_essential, e_essential,
        total_norms_evaluated, total_yes, total_no, total_tbd, total_na,
        last_calculated
      )
    `)
    .eq("slug", slug.toLowerCase().trim())
    .single();

  if (error || !product) return null;

  // Get evaluations summary by pillar
  const { data: evalSummary } = await supabase
    .from("evaluations")
    .select(`
      result,
      norms!inner(code, pillar, title_en, is_essential)
    `)
    .eq("product_id", product.id)
    .in("result", ["YES", "YESp", "NO"]);

  const pillarBreakdown = {
    S: { yes: 0, no: 0, essentialYes: 0, essentialNo: 0, details: [] },
    A: { yes: 0, no: 0, essentialYes: 0, essentialNo: 0, details: [] },
    F: { yes: 0, no: 0, essentialYes: 0, essentialNo: 0, details: [] },
    E: { yes: 0, no: 0, essentialYes: 0, essentialNo: 0, details: [] },
  };

  (evalSummary || []).forEach((e) => {
    const pillar = e.norms?.pillar;
    if (!pillar || !pillarBreakdown[pillar]) return;

    if (e.result === "YES" || e.result === "YESp") {
      pillarBreakdown[pillar].yes++;
      if (e.norms.is_essential) pillarBreakdown[pillar].essentialYes++;
    } else if (e.result === "NO") {
      pillarBreakdown[pillar].no++;
      if (e.norms.is_essential) pillarBreakdown[pillar].essentialNo++;
      // Store critical failures
      if (e.norms.is_essential) {
        pillarBreakdown[pillar].details.push({
          code: e.norms.code,
          title: e.norms.title_en,
        });
      }
    }
  });

  return {
    ...formatProduct(product),
    pillarBreakdown,
  };
}

/**
 * Get norm evaluations for a specific product
 * @param {string} productId - Product ID
 * @param {string} pillar - Optional pillar filter (S, A, F, E)
 * @returns {Promise<Array>} Evaluations with norm details
 */
export async function getProductNormsEvaluation(productId, pillar = null) {
  if (!isSupabaseConfigured() || !productId) return [];

  let query = supabase
    .from("evaluations")
    .select(`
      result, why_this_result, confidence_score,
      norms!inner(code, pillar, title_en, title_fr, summary_en, is_essential, is_consumer)
    `)
    .eq("product_id", productId);

  if (pillar) {
    query = query.eq("norms.pillar", pillar);
  }

  const { data: evaluations, error } = await query.order("norms(code)");

  if (error) return [];

  return (evaluations || []).map((e) => ({
    normCode: e.norms.code,
    pillar: e.norms.pillar,
    title: e.norms.title_en,
    summary: e.norms.summary_en,
    isEssential: e.norms.is_essential,
    isConsumer: e.norms.is_consumer,
    result: e.result,
    reason: e.why_this_result,
    confidence: e.confidence_score,
  }));
}

/**
 * Compare multiple products
 * @param {Array<string>} slugs - Product slugs to compare
 * @returns {Promise<Object>} Comparison data
 */
export async function compareProducts(slugs) {
  if (!isSupabaseConfigured() || !slugs || slugs.length < 2) return null;

  const products = await Promise.all(
    slugs.map((slug) => getProductWithFullDetails(slug))
  );

  const validProducts = products.filter(Boolean);
  if (validProducts.length < 2) return null;

  // Find common strengths and weaknesses
  const comparison = {
    products: validProducts,
    winner: null,
    analysis: {
      bestSecurity: null,
      bestAdversity: null,
      bestFidelity: null,
      bestEcosystem: null,
      overallBest: null,
    },
  };

  // Determine winners per pillar
  let maxS = -1, maxA = -1, maxF = -1, maxE = -1, maxTotal = -1;

  validProducts.forEach((p) => {
    const scores = p.scores;
    if (scores.s > maxS) { maxS = scores.s; comparison.analysis.bestSecurity = p.name; }
    if (scores.a > maxA) { maxA = scores.a; comparison.analysis.bestAdversity = p.name; }
    if (scores.f > maxF) { maxF = scores.f; comparison.analysis.bestFidelity = p.name; }
    if (scores.e > maxE) { maxE = scores.e; comparison.analysis.bestEcosystem = p.name; }
    if (scores.total > maxTotal) { maxTotal = scores.total; comparison.analysis.overallBest = p.name; }
  });

  comparison.winner = comparison.analysis.overallBest;

  return comparison;
}

/**
 * Get personalized recommendations based on user profile
 * @param {Object} userProfile - User preferences and context
 * @returns {Promise<Array>} Recommended products
 */
export async function getRecommendations(userProfile = {}) {
  if (!isSupabaseConfigured()) return [];

  const { riskTolerance, useCase, budget, isHardwarePreferred } = userProfile;

  let query = supabase
    .from("products")
    .select(`
      id, name, slug, url, logo_url, price_eur,
      product_types!inner(code, name, category, is_hardware),
      safe_scoring_results!inner(
        note_finale, score_s, score_a, score_f, score_e
      )
    `)
    .not("safe_scoring_results", "is", null)
    .gt("safe_scoring_results.note_finale", 0);

  // Filter by hardware preference
  if (isHardwarePreferred !== undefined) {
    query = query.eq("product_types.is_hardware", isHardwarePreferred);
  }

  // Filter by budget
  if (budget) {
    query = query.lte("price_eur", budget);
  }

  // Order by security for risk-averse users
  if (riskTolerance === "conservative" || riskTolerance === "risk-averse") {
    query = query.order("safe_scoring_results(score_s)", { ascending: false });
  } else {
    query = query.order("safe_scoring_results(note_finale)", { ascending: false });
  }

  const { data: products, error } = await query.limit(10);

  if (error) return [];

  return formatProducts(products || []);
}

/**
 * Search norms by keyword
 * @param {string} keywords - Search keywords
 * @returns {Promise<Array>} Matching norms
 */
export async function searchNorms(keywords) {
  if (!isSupabaseConfigured() || !keywords) return [];

  const { data: norms, error } = await supabase
    .from("norms")
    .select("code, pillar, title_en, title_fr, summary_en, summary_fr, is_essential")
    .or(`title_en.ilike.%${keywords}%,summary_en.ilike.%${keywords}%,code.ilike.%${keywords}%`)
    .order("code")
    .limit(10);

  if (error) return [];

  return (norms || []).map((n) => ({
    code: n.code,
    pillar: n.pillar,
    pillarName: getPillarName(n.pillar),
    title: n.title_en,
    summary: n.summary_en,
    isEssential: n.is_essential,
  }));
}

/**
 * Get products that comply with a specific norm
 * @param {string} normCode - Norm code
 * @returns {Promise<Array>} Products that pass this norm
 */
export async function getProductsComplyingWithNorm(normCode) {
  if (!isSupabaseConfigured() || !normCode) return [];

  const { data: evaluations, error } = await supabase
    .from("evaluations")
    .select(`
      products!inner(id, name, slug, logo_url),
      norms!inner(code)
    `)
    .eq("norms.code", normCode.toUpperCase())
    .in("result", ["YES", "YESp"])
    .limit(20);

  if (error) return [];

  return (evaluations || []).map((e) => ({
    id: e.products.id,
    name: e.products.name,
    slug: e.products.slug,
    logoUrl: e.products.logo_url,
  }));
}

/**
 * Get top products by category
 * @param {string} category - Product category
 * @param {number} limit - Max results
 * @returns {Promise<Array>} Top products in category
 */
export async function getTopProductsByCategory(category, limit = 5) {
  if (!isSupabaseConfigured()) return [];

  const categoryMap = {
    "hardware": "HW",
    "hardware wallet": "HW",
    "exchange": "CEX",
    "defi": "DEFI",
    "software wallet": "SW",
    "custodial": "CUST",
  };

  const typeCode = categoryMap[category?.toLowerCase()] || category;

  const { data: products, error } = await supabase
    .from("products")
    .select(`
      id, name, slug, logo_url,
      product_types!inner(code, name, category, is_hardware),
      safe_scoring_results!inner(
        note_finale, score_s, score_a, score_f, score_e
      )
    `)
    .eq("product_types.code", typeCode)
    .not("safe_scoring_results", "is", null)
    .order("safe_scoring_results(note_finale)", { ascending: false })
    .limit(limit);

  if (error) return [];

  return formatProducts(products || []);
}

/**
 * Get recent security incidents
 * @param {string} productSlug - Optional product filter
 * @returns {Promise<Array>} Recent incidents
 */
export async function getSecurityIncidents(productSlug = null) {
  if (!isSupabaseConfigured()) return [];

  let query = supabase
    .from("security_incidents")
    .select(`
      id, title, description, severity, incident_date, source_url,
      products(name, slug)
    `)
    .order("incident_date", { ascending: false })
    .limit(10);

  if (productSlug) {
    query = query.eq("products.slug", productSlug);
  }

  const { data: incidents, error } = await query;

  if (error) return [];

  return (incidents || []).map((i) => ({
    id: i.id,
    title: i.title,
    description: i.description,
    severity: i.severity,
    date: i.incident_date,
    sourceUrl: i.source_url,
    product: i.products?.name,
    productSlug: i.products?.slug,
  }));
}

// ============== Helper Functions ==============

function formatProduct(p) {
  if (!p) return null;

  const scores = p.safe_scoring_results?.[0] || p.safe_scoring_results || {};

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    url: p.url,
    logoUrl: p.logo_url,
    description: p.description,
    priceEur: p.price_eur,
    type: {
      code: p.product_types?.code,
      name: p.product_types?.name,
      category: p.product_types?.category,
      isHardware: p.product_types?.is_hardware,
      isCustodial: p.product_types?.is_custodial,
    },
    brand: p.brands ? {
      name: p.brands.name,
      logoUrl: p.brands.logo_url,
      website: p.brands.website,
    } : null,
    scores: {
      total: Math.round(scores.note_finale || 0),
      s: Math.round(scores.score_s || 0),
      a: Math.round(scores.score_a || 0),
      f: Math.round(scores.score_f || 0),
      e: Math.round(scores.score_e || 0),
      consumer: {
        total: Math.round(scores.note_consumer || 0),
        s: Math.round(scores.s_consumer || 0),
        a: Math.round(scores.a_consumer || 0),
        f: Math.round(scores.f_consumer || 0),
        e: Math.round(scores.e_consumer || 0),
      },
      essential: {
        total: Math.round(scores.note_essential || 0),
        s: Math.round(scores.s_essential || 0),
        a: Math.round(scores.a_essential || 0),
        f: Math.round(scores.f_essential || 0),
        e: Math.round(scores.e_essential || 0),
      },
    },
    stats: {
      totalNorms: scores.total_norms_evaluated || 0,
      yes: scores.total_yes || 0,
      no: scores.total_no || 0,
      tbd: scores.total_tbd || 0,
      na: scores.total_na || 0,
    },
    lastCalculated: scores.last_calculated,
  };
}

function formatProducts(products) {
  return (products || []).map(formatProduct).filter(Boolean);
}

function getPillarName(code) {
  const names = {
    S: "Security",
    A: "Adversity",
    F: "Fidelity",
    E: "Ecosystem",
  };
  return names[code] || code;
}

export default {
  searchProducts,
  getProductWithFullDetails,
  getProductNormsEvaluation,
  compareProducts,
  getRecommendations,
  searchNorms,
  getProductsComplyingWithNorm,
  getTopProductsByCategory,
  getSecurityIncidents,
};
