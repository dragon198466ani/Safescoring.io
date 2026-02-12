import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "30d";

  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Verify setup ownership
    const { data: setup, error: setupError } = await supabaseAdmin
      .from("user_setups")
      .select("id, products")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

    if (setupError || !setup) {
      return NextResponse.json({ error: "Setup not found" }, { status: 404 });
    }

    // Extract product IDs
    const productIds = (setup.products || [])
      .map((p) => (typeof p === "object" ? p.id || p.product_id : p))
      .filter(Boolean);

    if (productIds.length === 0) {
      return NextResponse.json({ history: [], stats: {} });
    }

    // Calculate date filter
    const now = new Date();
    let dateFilter = null;
    if (range === "7d") dateFilter = new Date(now - 7 * 24 * 60 * 60 * 1000);
    else if (range === "30d") dateFilter = new Date(now - 30 * 24 * 60 * 60 * 1000);
    else if (range === "90d") dateFilter = new Date(now - 90 * 24 * 60 * 60 * 1000);

    // Fetch score history for all products
    let query = supabaseAdmin
      .from("score_history")
      .select("product_id, safe_score, score_s, score_a, score_f, score_e, recorded_at, score_change")
      .in("product_id", productIds)
      .order("recorded_at", { ascending: true });

    if (dateFilter) {
      query = query.gte("recorded_at", dateFilter.toISOString());
    }

    const { data: historyRaw, error: histError } = await query;

    if (histError) throw histError;

    if (!historyRaw || historyRaw.length === 0) {
      return NextResponse.json({ history: [], stats: {} });
    }

    // Get product roles for weighting
    const productRoles = {};
    (setup.products || []).forEach((p) => {
      const pid = typeof p === "object" ? p.id || p.product_id : p;
      const role = typeof p === "object" ? p.role : "other";
      if (pid) productRoles[pid] = role;
    });

    // Group by date and compute weighted averages
    const byDate = {};
    historyRaw.forEach((entry) => {
      const date = new Date(entry.recorded_at).toISOString().split("T")[0];
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(entry);
    });

    const history = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, entries]) => {
        let totalWeight = 0;
        let weighted = { score: 0, score_s: 0, score_a: 0, score_f: 0, score_e: 0 };

        entries.forEach((e) => {
          const role = productRoles[e.product_id] || "other";
          const weight = role === "wallet" ? 2 : 1;
          totalWeight += weight;
          weighted.score += (e.safe_score || 0) * weight;
          weighted.score_s += (e.score_s || 0) * weight;
          weighted.score_a += (e.score_a || 0) * weight;
          weighted.score_f += (e.score_f || 0) * weight;
          weighted.score_e += (e.score_e || 0) * weight;
        });

        if (totalWeight === 0) totalWeight = 1;

        return {
          date,
          score: Math.round(weighted.score / totalWeight),
          score_s: Math.round(weighted.score_s / totalWeight),
          score_a: Math.round(weighted.score_a / totalWeight),
          score_f: Math.round(weighted.score_f / totalWeight),
          score_e: Math.round(weighted.score_e / totalWeight),
          products_tracked: entries.length,
        };
      });

    // Stats
    const scores = history.map((h) => h.score);
    const stats = {
      dataPoints: history.length,
      highest: Math.max(...scores),
      lowest: Math.min(...scores),
      average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      trend:
        history.length >= 2
          ? history[history.length - 1].score > history[0].score
            ? "improving"
            : history[history.length - 1].score < history[0].score
            ? "declining"
            : "stable"
          : "stable",
    };

    return NextResponse.json({ history, stats, range });
  } catch (error) {
    console.error("Score history error:", error);
    return NextResponse.json({ error: "Failed to fetch score history" }, { status: 500 });
  }
}
