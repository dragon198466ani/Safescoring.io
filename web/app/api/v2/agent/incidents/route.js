import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/libs/supabase";

export const dynamic = "force-dynamic";

/**
 * Agent-Friendly Incidents Endpoint
 * GET /api/v2/agent/incidents?severity=critical&limit=5
 *
 * Returns recent security incidents in a concise format.
 */
export async function GET(request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const severity = searchParams.get("severity");
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
  const days = Math.min(parseInt(searchParams.get("days") || "90"), 365);
  const product = searchParams.get("product");

  try {
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    let query = supabaseAdmin
      .from("security_incidents")
      .select("id, incident_id, title, incident_type, severity, funds_lost_usd, users_affected, incident_date, status, affected_product_ids")
      .eq("is_published", true)
      .gte("incident_date", sinceDate)
      .order("incident_date", { ascending: false })
      .limit(limit);

    if (severity) {
      const validSeverities = ["critical", "high", "medium", "low"];
      if (validSeverities.includes(severity)) {
        query = query.eq("severity", severity);
      }
    }

    const { data: incidents, error } = await query;
    if (error) throw error;

    // If filtering by product, get product id first
    let filteredIncidents = incidents || [];
    if (product) {
      const { data: productData } = await supabaseAdmin
        .from("products")
        .select("id")
        .eq("slug", product)
        .single();

      if (productData) {
        filteredIncidents = filteredIncidents.filter((inc) =>
          (inc.affected_product_ids || []).includes(productData.id)
        );
      }
    }

    // Get product names for affected IDs
    const allAffectedIds = new Set();
    for (const inc of filteredIncidents) {
      for (const id of inc.affected_product_ids || []) {
        allAffectedIds.add(id);
      }
    }

    let productMap = {};
    if (allAffectedIds.size > 0) {
      const { data: products } = await supabaseAdmin
        .from("products")
        .select("id, name, slug")
        .in("id", [...allAffectedIds]);
      productMap = Object.fromEntries((products || []).map((p) => [p.id, p]));
    }

    // Format response
    const response = filteredIncidents.map((inc) => ({
      id: inc.incident_id,
      title: inc.title,
      type: inc.incident_type,
      severity: inc.severity,
      date: inc.incident_date,
      status: inc.status,
      funds_lost_usd: inc.funds_lost_usd ? Number(inc.funds_lost_usd) : 0,
      users_affected: inc.users_affected || 0,
      affected_products: (inc.affected_product_ids || [])
        .map((id) => productMap[id]?.slug)
        .filter(Boolean),
    }));

    // Summary stats
    const totalFundsLost = response.reduce((sum, i) => sum + (i.funds_lost_usd || 0), 0);
    const criticalCount = response.filter((i) => i.severity === "critical").length;

    return NextResponse.json({
      incidents: response,
      total: response.length,
      period_days: days,
      summary: {
        total_funds_lost_usd: totalFundsLost,
        critical_count: criticalCount,
        high_count: response.filter((i) => i.severity === "high").length,
        types: [...new Set(response.map((i) => i.type))],
      },
      source: "SafeScoring.io",
    }, {
      headers: {
        "X-SafeScoring-Agent": "true",
        "Cache-Control": "public, max-age=1800",
      },
    });
  } catch (error) {
    console.error("Agent incidents error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
