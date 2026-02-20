import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";

export const dynamic = "force-dynamic";

/**
 * GET /api/incidents/physical
 * Returns physical security incidents (kidnappings, robberies, etc.)
 * Query params:
 *   - country: ISO 2-letter country code
 *   - type: incident_type filter
 *   - minSeverity: minimum severity score (1-10)
 *   - verified: only verified incidents (true/false)
 *   - year: filter by year
 *   - limit: max results (default 100)
 */
export async function GET(request) {
  try {
    // Rate limiting
    const protection = await quickProtect(request, "public");
    if (protection.blocked) {
      return protection.response;
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country");
    const type = searchParams.get("type");
    const minSeverity = parseInt(searchParams.get("minSeverity")) || 1;
    const verifiedOnly = searchParams.get("verified") === "true";
    const year = searchParams.get("year");
    const limit = Math.min(parseInt(searchParams.get("limit")) || 100, 500);

    // Build query
    let query = supabase
      .from("physical_incidents")
      .select(`
        id,
        title,
        slug,
        incident_type,
        description,
        date,
        location_city,
        location_country,
        location_coordinates,
        victim_type,
        victim_had_public_profile,
        victim_disclosed_holdings,
        amount_stolen_usd,
        opsec_failures,
        status,
        media_coverage_level,
        severity_score,
        opsec_risk_level,
        confidence_level,
        verified,
        lessons_learned,
        created_at
      `)
      .gte("severity_score", minSeverity)
      .in("status", ["confirmed", "resolved", "unresolved"])
      .order("date", { ascending: false })
      .limit(limit);

    // Apply filters
    if (country) {
      query = query.eq("location_country", country.toUpperCase());
    }

    if (type) {
      query = query.eq("incident_type", type);
    }

    if (verifiedOnly) {
      query = query.eq("verified", true);
    }

    if (year) {
      const yearInt = parseInt(year);
      query = query
        .gte("date", `${yearInt}-01-01`)
        .lte("date", `${yearInt}-12-31`);
    }

    const { data: incidents, error } = await query;

    if (error) {
      console.error("Error fetching physical incidents:", error);
      return NextResponse.json(
        { error: "Failed to fetch incidents" },
        { status: 500 }
      );
    }

    // Calculate stats
    const stats = {
      total: incidents.length,
      by_type: {},
      by_country: {},
      by_year: {},
      total_stolen_usd: 0,
      victims_with_public_profile: 0,
      victims_disclosed_holdings: 0,
      avg_severity: 0,
    };

    incidents.forEach((incident) => {
      // By type
      stats.by_type[incident.incident_type] =
        (stats.by_type[incident.incident_type] || 0) + 1;

      // By country
      if (incident.location_country) {
        stats.by_country[incident.location_country] =
          (stats.by_country[incident.location_country] || 0) + 1;
      }

      // By year
      if (incident.date) {
        const incidentYear = new Date(incident.date).getFullYear();
        stats.by_year[incidentYear] = (stats.by_year[incidentYear] || 0) + 1;
      }

      // Financial
      if (incident.amount_stolen_usd) {
        stats.total_stolen_usd += incident.amount_stolen_usd;
      }

      // OPSEC failures
      if (incident.victim_had_public_profile) {
        stats.victims_with_public_profile += 1;
      }
      if (incident.victim_disclosed_holdings) {
        stats.victims_disclosed_holdings += 1;
      }

      // Severity
      stats.avg_severity += incident.severity_score || 0;
    });

    if (incidents.length > 0) {
      stats.avg_severity = Math.round(stats.avg_severity / incidents.length);
    }

    // Format for map (lightweight for performance)
    const mapData = incidents.map((i) => ({
      id: i.id,
      slug: i.slug,
      title: i.title,
      type: i.incident_type,
      date: i.date,
      city: i.location_city,
      country: i.location_country,
      coords: i.location_coordinates
        ? {
            lat: i.location_coordinates.split(",")[0],
            lng: i.location_coordinates.split(",")[1],
          }
        : null,
      severity: i.severity_score,
      verified: i.verified,
    }));

    return NextResponse.json({
      success: true,
      data: incidents,
      mapData,
      stats,
      meta: {
        count: incidents.length,
        filters: {
          country,
          type,
          minSeverity,
          verifiedOnly,
          year,
        },
      },
    });
  } catch (error) {
    console.error("Unexpected error in /api/incidents/physical:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
