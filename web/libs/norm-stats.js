import { supabase, isSupabaseConfigured } from "@/libs/supabase";

/**
 * Server-side helper — fetches real norm/product counts from the database.
 * This is the SINGLE SOURCE OF TRUTH. No hardcoded numbers.
 *
 * Usage (server components & API routes only):
 *   const stats = await getNormStats();
 *   // stats.totalNorms, stats.byPillar.S, stats.totalProducts, etc.
 */
export async function getNormStats() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const [
      { count: totalNorms },
      { data: pillarRows },
      { count: totalProducts },
      { count: totalProductTypes },
      { count: totalEvaluations },
    ] = await Promise.all([
      supabase.from("norms").select("*", { count: "exact", head: true }),
      supabase.from("norms").select("pillar"),
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("product_types").select("*", { count: "exact", head: true }),
      supabase.from("evaluations").select("*", { count: "exact", head: true }),
    ]);

    const byPillar = { S: 0, A: 0, F: 0, E: 0 };
    if (pillarRows) {
      for (const row of pillarRows) {
        if (byPillar[row.pillar] !== undefined) {
          byPillar[row.pillar]++;
        }
      }
    }

    return {
      totalNorms: totalNorms || 0,
      byPillar,
      totalProducts: totalProducts || 0,
      totalProductTypes: totalProductTypes || 0,
      totalEvaluations: totalEvaluations || 0,
    };
  } catch (error) {
    console.error("getNormStats error:", error);
    return null;
  }
}
