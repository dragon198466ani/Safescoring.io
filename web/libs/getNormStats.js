import { createClient } from "@supabase/supabase-js";

/**
 * Fetches norm statistics dynamically from Supabase.
 * Used server-side (SSR/ISR) to avoid hardcoding norm counts.
 * Cached for 1 hour via ISR revalidation.
 */

let cachedStats = null;
let cacheTimestamp = 0;
const CACHE_TTL = 3600 * 1000; // 1 hour in ms

function getSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Use service role key only if it's a real JWT (not placeholder)
  const apiKey = (serviceKey && serviceKey.startsWith('eyJ'))
    ? serviceKey
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, apiKey);
}

export async function getNormStats() {
  // Return cache if still valid
  if (cachedStats && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedStats;
  }

  try {
    const supabase = getSupabase();

    // Count norms by pillar
    const { data: norms, error } = await supabase
      .from("norms")
      .select("pillar");

    if (error) throw error;

    const pillarCounts = { S: 0, A: 0, F: 0, E: 0 };
    norms?.forEach((n) => {
      if (pillarCounts.hasOwnProperty(n.pillar)) {
        pillarCounts[n.pillar]++;
      }
    });

    const totalNorms = norms?.length || 0;

    // Count products
    const { count: totalProducts } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true });

    // Count product types
    const { count: totalProductTypes } = await supabase
      .from("product_types")
      .select("id", { count: "exact", head: true });

    // Count evaluations
    const { count: totalEvaluations } = await supabase
      .from("evaluations")
      .select("id", { count: "exact", head: true });

    const stats = {
      totalNorms,
      pillarCounts,
      totalProducts: totalProducts || 0,
      totalProductTypes: totalProductTypes || 0,
      totalEvaluations: totalEvaluations || 0,
      updatedAt: new Date().toISOString(),
    };

    // Update cache
    cachedStats = stats;
    cacheTimestamp = Date.now();

    return stats;
  } catch (error) {
    console.error("getNormStats error:", error);
    // Return last cache if available, otherwise null
    return cachedStats || null;
  }
}
