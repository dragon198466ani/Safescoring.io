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

  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Get user's setup
    const { data: setup, error: setupError } = await supabaseAdmin
      .from("user_setups")
      .select("id, combined_score, products")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

    if (setupError || !setup) {
      return NextResponse.json({ error: "Setup not found" }, { status: 404 });
    }

    const userScore = setup.combined_score?.total || 0;
    const userPillars = {
      S: setup.combined_score?.S || 0,
      A: setup.combined_score?.A || 0,
      F: setup.combined_score?.F || 0,
      E: setup.combined_score?.E || 0,
    };

    // Get all setups for comparison (anonymized)
    const { data: allSetups } = await supabaseAdmin
      .from("user_setups")
      .select("id, combined_score, products")
      .not("products", "eq", "[]");

    const validSetups = (allSetups || []).filter((s) => s.combined_score?.total);
    const totalSetups = validSetups.length;

    if (totalSetups === 0) {
      return NextResponse.json({
        userScore,
        communityAverage: 0,
        percentile: 100,
        rank: 1,
        totalSetups: 0,
        pillarComparison: {},
        strengths: [],
        weaknesses: [],
        similarSetups: 0,
      });
    }

    // Community averages
    const communityScores = validSetups.map((s) => s.combined_score.total);
    const communityAverage = Math.round(communityScores.reduce((a, b) => a + b, 0) / totalSetups);

    // Percentile rank
    const belowUser = communityScores.filter((s) => s < userScore).length;
    const percentile = Math.round((belowUser / totalSetups) * 100);
    const rank = communityScores.filter((s) => s > userScore).length + 1;

    // Pillar comparison
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

    const communityPillars = pillarCount > 0
      ? {
          S: Math.round(pillarSums.S / pillarCount),
          A: Math.round(pillarSums.A / pillarCount),
          F: Math.round(pillarSums.F / pillarCount),
          E: Math.round(pillarSums.E / pillarCount),
        }
      : { S: 0, A: 0, F: 0, E: 0 };

    const pillarComparison = {};
    const strengths = [];
    const weaknesses = [];

    ["S", "A", "F", "E"].forEach((key) => {
      const diff = (userPillars[key] || 0) - (communityPillars[key] || 0);
      pillarComparison[key] = {
        user: userPillars[key] || 0,
        community: communityPillars[key] || 0,
        diff,
      };
      if (diff > 5) strengths.push(key);
      if (diff < -5) weaknesses.push(key);
    });

    // Count similar setups (2+ overlapping products)
    const userProductIds = (setup.products || [])
      .map((p) => (typeof p === "object" ? p.id || p.product_id : p))
      .filter(Boolean);

    let similarSetups = 0;
    validSetups.forEach((s) => {
      if (s.id === setup.id) return;
      const otherIds = (s.products || [])
        .map((p) => (typeof p === "object" ? p.id || p.product_id : p))
        .filter(Boolean);
      const overlap = userProductIds.filter((id) => otherIds.includes(id)).length;
      if (overlap >= 2) similarSetups++;
    });

    return NextResponse.json({
      userScore,
      communityAverage,
      percentile,
      rank,
      totalSetups,
      pillarComparison,
      strengths,
      weaknesses,
      similarSetups,
    });
  } catch (error) {
    console.error("Setup comparison error:", error);
    return NextResponse.json({ error: "Failed to compare setup" }, { status: 500 });
  }
}
