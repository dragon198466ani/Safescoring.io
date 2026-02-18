/**
 * API: /api/leaderboard/points
 * Leaderboard des points $SAFE
 */

import { createClient } from "@/libs/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    const supabase = createClient();

    const { data, error } = await supabase
      .from("points_leaderboard")
      .select("*")
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ leaderboard: data || [] });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
