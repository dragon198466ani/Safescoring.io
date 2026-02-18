import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { checkRateLimit, getClientId } from "@/libs/rate-limit";

/**
 * SafeScoring Public API v1 - Security Incidents
 *
 * GET /api/v1/incidents
 *
 * Query params:
 * - severity: Filter by severity (critical, high, medium, low)
 * - type: Filter by incident type
 * - product: Filter by product slug
 * - limit: Max results (default: 20, max: 100)
 * - offset: Pagination offset
 * - since: ISO date, only incidents after this date
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};

export async function GET(request) {
  const clientId = getClientId(request);
  const apiKey = request.headers.get("x-api-key");

  const limitType = apiKey ? "authenticated" : "public";
  const rateCheck = checkRateLimit(clientId, limitType);

  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfter: Math.ceil(rateCheck.resetIn / 1000) },
      { status: 429, headers: { ...CORS_HEADERS, "Retry-After": Math.ceil(rateCheck.resetIn / 1000).toString() } }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503, headers: CORS_HEADERS });
  }

  try {
    const { searchParams } = new URL(request.url);

    const severity = searchParams.get("severity");
    const type = searchParams.get("type");
    const productSlug = searchParams.get("product");
    const limit = Math.min(parseInt(searchParams.get("limit")) || 20, 100);
    const offset = parseInt(searchParams.get("offset")) || 0;
    const since = searchParams.get("since");

    // Build query
    let query = supabase
      .from("security_incidents")
      .select("*", { count: "exact" })
      .eq("is_published", true)
      .order("incident_date", { ascending: false });

    if (severity) {
      query = query.eq("severity", severity);
    }

    if (type) {
      query = query.eq("incident_type", type);
    }

    if (since) {
      query = query.gte("incident_date", since);
    }

    // Get incidents
    const { data: incidents, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("API v1 incidents error:", error);
      return NextResponse.json(
        { error: "Failed to fetch incidents" },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    // If filtering by product, get product ID first
    let filteredIncidents = incidents || [];
    if (productSlug) {
      const { data: product } = await supabase
        .from("products")
        .select("id")
        .eq("slug", productSlug)
        .maybeSingle();

      if (product) {
        const { data: impacts } = await supabase
          .from("incident_product_impact")
          .select("incident_id")
          .eq("product_id", product.id);

        const incidentIds = (impacts || []).map(i => i.incident_id);
        filteredIncidents = filteredIncidents.filter(i => incidentIds.includes(i.id));
      } else {
        filteredIncidents = [];
      }
    }

    // Format response
    const results = filteredIncidents.map(i => ({
      id: i.incident_id,
      title: i.title,
      description: i.description?.substring(0, 500) || null,
      type: i.incident_type,
      severity: i.severity,
      date: i.incident_date,
      fundsLost: i.funds_lost_usd,
      status: i.status,
      sources: i.source_urls || [],
      detailsUrl: `https://safescoring.io/incidents/${i.incident_id}`,
    }));

    // Calculate stats
    const stats = {
      totalFundsLost: results.reduce((sum, i) => sum + (i.fundsLost || 0), 0),
      bySeverity: {
        critical: results.filter(i => i.severity === "critical").length,
        high: results.filter(i => i.severity === "high").length,
        medium: results.filter(i => i.severity === "medium").length,
        low: results.filter(i => i.severity === "low").length,
      }
    };

    return NextResponse.json(
      {
        success: true,
        data: results,
        stats,
        pagination: {
          total: count,
          limit,
          offset,
          hasMore: offset + limit < count,
        },
        meta: {
          apiVersion: "1.0",
          timestamp: new Date().toISOString(),
        }
      },
      {
        headers: {
          ...CORS_HEADERS,
          "Cache-Control": "public, max-age=600, s-maxage=600",
          "X-RateLimit-Remaining": rateCheck.remaining.toString(),
        }
      }
    );

  } catch (error) {
    console.error("API v1 incidents error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS });
}
