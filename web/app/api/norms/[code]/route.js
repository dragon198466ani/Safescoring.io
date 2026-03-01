import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/libs/supabase";

/**
 * GET /api/norms/[code]
 * Returns detailed information about a specific norm including official documentation.
 *
 * Example: /api/norms/S01 or /api/norms/A-ADD-001
 */
export async function GET(request, { params }) {
  try {
    const { code } = await params;

    if (!code) {
      return NextResponse.json({ error: "Norm code required" }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    const { data: norm, error } = await supabase
      .from("norms")
      .select(`
        id, code, title, pillar, description,
        is_essential, consumer, full,
        access_type, official_link, official_doc_summary
      `)
      .eq("code", code)
      .single();

    if (error || !norm) {
      return NextResponse.json({ error: "Norm not found" }, { status: 404 });
    }

    const pillarNames = {
      S: "Security",
      A: "Adversity",
      F: "Fidelity",
      E: "Efficiency"
    };

    return NextResponse.json({
      success: true,
      norm: {
        id: norm.id,
        code: norm.code,
        title: norm.title,
        pillar: norm.pillar,
        pillar_name: pillarNames[norm.pillar] || norm.pillar,
        description: norm.description,
        is_essential: norm.is_essential || false,
        is_consumer: norm.consumer || false,
        is_full: norm.full || false,
        access_type: norm.access_type,
        official_link: norm.official_link,
        official_doc_summary: norm.official_doc_summary,
      }
    }, {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200",
      },
    });

  } catch (error) {
    console.error("Norm detail API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
