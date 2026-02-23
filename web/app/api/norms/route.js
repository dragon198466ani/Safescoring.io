import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/libs/supabase";

/**
 * GET /api/norms
 * Returns all norms with optional filtering.
 *
 * Query params:
 *   pillar: S|A|F|E - filter by pillar
 *   essential: true|false - filter by is_essential
 *   limit: number (default 100, max 2200)
 *   offset: number (default 0)
 *   search: text - search in code or title
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pillar = searchParams.get("pillar");
    const essential = searchParams.get("essential");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 2200);
    const offset = parseInt(searchParams.get("offset") || "0");
    const search = searchParams.get("search");

    const supabase = getSupabaseServer();

    let query = supabase
      .from("norms")
      .select("id, code, title, pillar, is_essential, consumer, access_type, official_link, official_doc_summary", { count: "exact" })
      .order("code", { ascending: true });

    if (pillar && ["S", "A", "F", "E"].includes(pillar)) {
      query = query.eq("pillar", pillar);
    }

    if (essential === "true") {
      query = query.eq("is_essential", true);
    } else if (essential === "false") {
      query = query.eq("is_essential", false);
    }

    if (search) {
      query = query.or(`code.ilike.%${search}%,title.ilike.%${search}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: norms, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: "Failed to fetch norms" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      total: count,
      offset,
      limit,
      norms: (norms || []).map(n => ({
        id: n.id,
        code: n.code,
        title: n.title,
        pillar: n.pillar,
        is_essential: n.is_essential || false,
        is_consumer: n.consumer || false,
        access_type: n.access_type,
        has_official_doc: !!n.official_doc_summary,
        official_link: n.official_link,
      }))
    }, {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200",
      },
    });

  } catch (error) {
    console.error("Norms list API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
