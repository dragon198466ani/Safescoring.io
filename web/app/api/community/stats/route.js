import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/libs/supabase";

export const revalidate = 300; // Cache 5 minutes

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Fetch all setups with combined scores (anonymized)
    const { data: setups, error: setupError } = await supabaseAdmin
      .from("user_setups")
      .select("id, products, combined_score")
      .not("products", "eq", "[]");

    if (setupError) throw setupError;

    const validSetups = (setups || []).filter((s) => s.combined_score?.total);

    if (validSetups.length === 0) {
      return NextResponse.json({
        totalSetups: 0,
        averageScore: 0,
        distribution: { "0-20": 0, "20-40": 0, "40-60": 0, "60-80": 0, "80-100": 0 },
        pillarAverages: { S: 0, A: 0, F: 0, E: 0 },
        popularProducts: [],
      });
    }

    // Score distribution
    const scores = validSetups.map((s) => s.combined_score.total);
    const distribution = {
      "0-20": scores.filter((s) => s < 20).length,
      "20-40": scores.filter((s) => s >= 20 && s < 40).length,
      "40-60": scores.filter((s) => s >= 40 && s < 60).length,
      "60-80": scores.filter((s) => s >= 60 && s < 80).length,
      "80-100": scores.filter((s) => s >= 80).length,
    };

    // Average score
    const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    // Pillar averages
    const pillarSums = { S: 0, A: 0, F: 0, E: 0 };
    let pillarCount = 0;
    validSetups.forEach((s) => {
      if (s.combined_score.S) {
        pillarSums.S += s.combined_score.S;
        pillarSums.A += s.combined_score.A || 0;
        pillarSums.F += s.combined_score.F || 0;
        pillarSums.E += s.combined_score.E || 0;
        pillarCount++;
      }
    });

    const pillarAverages = pillarCount > 0
      ? {
          S: Math.round(pillarSums.S / pillarCount),
          A: Math.round(pillarSums.A / pillarCount),
          F: Math.round(pillarSums.F / pillarCount),
          E: Math.round(pillarSums.E / pillarCount),
        }
      : { S: 0, A: 0, F: 0, E: 0 };

    // Most popular products
    const productFrequency = {};
    validSetups.forEach((s) => {
      (s.products || []).forEach((p) => {
        const pid = typeof p === "object" ? p.id || p.product_id : p;
        if (pid) productFrequency[pid] = (productFrequency[pid] || 0) + 1;
      });
    });

    const topProductIds = Object.entries(productFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([id, count]) => ({ id: parseInt(id), count }));

    // Get product names
    let popularProducts = [];
    if (topProductIds.length > 0) {
      const { data: products } = await supabaseAdmin
        .from("products")
        .select("id, name, slug")
        .in("id", topProductIds.map((p) => p.id));

      const productMap = {};
      (products || []).forEach((p) => {
        productMap[p.id] = p;
      });

      popularProducts = topProductIds.map((tp) => ({
        name: productMap[tp.id]?.name || "Unknown",
        slug: productMap[tp.id]?.slug || "",
        usage_count: tp.count,
        usage_pct: Math.round((tp.count / validSetups.length) * 100),
      }));
    }

    return NextResponse.json({
      totalSetups: validSetups.length,
      averageScore,
      distribution,
      pillarAverages,
      popularProducts,
    });
  } catch (error) {
    console.error("Community stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
