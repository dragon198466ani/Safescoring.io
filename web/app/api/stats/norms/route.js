import { NextResponse } from "next/server";
import { getNormStats } from "@/libs/getNormStats";

export const revalidate = 3600; // Cache 1 hour

// GET /api/stats/norms - Dynamic norm counts from Supabase
export async function GET() {
  try {
    const stats = await getNormStats();

    if (!stats) {
      return NextResponse.json(
        { error: "Failed to load norm statistics" },
        { status: 500 }
      );
    }

    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("Norms stats error:", error);
    return NextResponse.json(
      { error: "Failed to load norm statistics" },
      { status: 500 }
    );
  }
}
