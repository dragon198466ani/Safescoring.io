import { NextResponse } from "next/server";
import { supabase } from "@/libs/supabase";
import { auth } from "@/libs/auth";

/**
 * GET /api/setups/[id]/snapshots
 * Returns score evolution data for charts
 */
export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const setupId = params.id;
    const { searchParams } = new URL(request.url);
    const days = Math.min(parseInt(searchParams.get("days") || "30"), 365);

    // Verify setup belongs to user
    const { data: setup, error: setupError } = await supabase
      .from("user_setups")
      .select("id, user_id")
      .eq("id", setupId)
      .single();

    if (setupError || !setup) {
      return NextResponse.json({ error: "Setup not found" }, { status: 404 });
    }

    if (setup.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch snapshots
    const { data: snapshotsRaw, error: snapshotsError } = await supabase
      .from("setup_score_snapshots")
      .select("*")
      .eq("setup_id", setupId)
      .gte("snapshot_date", startDate.toISOString().split("T")[0])
      .order("snapshot_date", { ascending: true });

    if (snapshotsError) {
      console.error("Error fetching snapshots:", snapshotsError);
      return NextResponse.json({ error: "Failed to fetch snapshots" }, { status: 500 });
    }

    // Transform snapshots for charting
    const snapshots = (snapshotsRaw || []).map((s) => ({
      date: s.snapshot_date,
      scores: {
        total: s.note_finale,
        S: s.score_s,
        A: s.score_a,
        F: s.score_f,
        E: s.score_e,
      },
      productsCount: s.products_count,
      weakestPillar: s.weakest_pillar,
    }));

    // Calculate stats
    const stats = calculateStats(snapshots);
    const trend = determineTrend(snapshots);

    return NextResponse.json({
      snapshots,
      stats,
      trend,
      period: {
        start: startDate.toISOString().split("T")[0],
        end: endDate.toISOString().split("T")[0],
        days,
      },
    });
  } catch (error) {
    console.error("Snapshots API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * POST /api/setups/[id]/snapshots
 * Creates a new score snapshot (called by cron or on-demand)
 */
export async function POST(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const setupId = params.id;

    // Verify setup belongs to user and get current products
    const { data: setup, error: setupError } = await supabase
      .from("user_setups")
      .select("id, user_id, products")
      .eq("id", setupId)
      .single();

    if (setupError || !setup) {
      return NextResponse.json({ error: "Setup not found" }, { status: 404 });
    }

    if (setup.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get product IDs
    const productIds = (setup.products || []).map(p => p.product_id);

    // Fetch product scores
    const { data: products } = await supabase
      .from("products")
      .select("id, score_s, score_a, score_f, score_e, note_finale")
      .in("id", productIds.length > 0 ? productIds : [-1]);

    // Calculate combined scores
    const scores = calculateCombinedScores(products || []);

    // Upsert snapshot (one per day)
    const today = new Date().toISOString().split("T")[0];
    const { data: snapshot, error: insertError } = await supabase
      .from("setup_score_snapshots")
      .upsert({
        setup_id: setupId,
        snapshot_date: today,
        score_s: scores.score_s,
        score_a: scores.score_a,
        score_f: scores.score_f,
        score_e: scores.score_e,
        note_finale: scores.note_finale,
        products_count: productIds.length,
        weakest_pillar: scores.weakest_pillar,
      }, {
        onConflict: "setup_id,snapshot_date",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating snapshot:", insertError);
      return NextResponse.json({ error: "Failed to create snapshot" }, { status: 500 });
    }

    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error("Create snapshot error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

function calculateCombinedScores(products) {
  if (!products || products.length === 0) {
    return { score_s: 0, score_a: 0, score_f: 0, score_e: 0, note_finale: 0, weakest_pillar: null };
  }

  const scores = { score_s: 0, score_a: 0, score_f: 0, score_e: 0 };
  products.forEach((p) => {
    scores.score_s += p.score_s || 0;
    scores.score_a += p.score_a || 0;
    scores.score_f += p.score_f || 0;
    scores.score_e += p.score_e || 0;
  });

  const count = products.length;
  scores.score_s = Math.round(scores.score_s / count);
  scores.score_a = Math.round(scores.score_a / count);
  scores.score_f = Math.round(scores.score_f / count);
  scores.score_e = Math.round(scores.score_e / count);
  scores.note_finale = Math.round((scores.score_s + scores.score_a + scores.score_f + scores.score_e) / 4);

  const pillars = [
    { key: "S", value: scores.score_s },
    { key: "A", value: scores.score_a },
    { key: "F", value: scores.score_f },
    { key: "E", value: scores.score_e },
  ];
  scores.weakest_pillar = pillars.reduce((min, p) => p.value < min.value ? p : min).key;

  return scores;
}

function calculateStats(snapshots) {
  if (!snapshots || snapshots.length === 0) return null;

  const totals = snapshots.map((s) => s.scores.total);
  const current = totals[totals.length - 1];
  const first = totals[0];

  return {
    current,
    highest: Math.max(...totals),
    lowest: Math.min(...totals),
    average: Math.round(totals.reduce((a, b) => a + b, 0) / totals.length),
    change: current - first,
  };
}

function determineTrend(snapshots) {
  if (!snapshots || snapshots.length < 2) return "stable";

  const recentCount = Math.min(7, Math.floor(snapshots.length / 2));
  const recent = snapshots.slice(-recentCount);
  const previous = snapshots.slice(-recentCount * 2, -recentCount);

  if (previous.length === 0) return "stable";

  const recentAvg = recent.reduce((sum, s) => sum + s.scores.total, 0) / recent.length;
  const previousAvg = previous.reduce((sum, s) => sum + s.scores.total, 0) / previous.length;
  const diff = recentAvg - previousAvg;

  if (diff > 3) return "improving";
  if (diff < -3) return "declining";
  return "stable";
}
