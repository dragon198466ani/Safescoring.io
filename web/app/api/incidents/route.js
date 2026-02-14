import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { quickProtect, getClientId } from "@/libs/api-protection";
import { auth } from "@/libs/auth";
import {
  protectAuthenticatedRequest,
  getDataLimitForUser,
  sleep,
  calculatePublicDelay,
} from "@/libs/user-protection";

export const dynamic = "force-dynamic";

// GET /api/incidents - Get all security incidents
export async function GET(request) {
  try {
    // Check authentication first
    let session = null;
    let userLimits = { incidents: 3 }; // Default for unauthenticated
    let isAuthenticated = false;
    let isPaid = false;

    try {
      session = await auth();
      if (session?.user?.id) {
        isAuthenticated = true;
        isPaid = session.user.hasAccess || false;

        // Check user-level rate limiting and scraping detection
        const userProtection = await protectAuthenticatedRequest(
          session.user.id,
          "/api/incidents",
          { isPaid }
        );

        if (!userProtection.allowed) {
          return NextResponse.json(
            {
              error: userProtection.message,
              reason: userProtection.reason,
              retryAfter: userProtection.retryAfter,
            },
            {
              status: userProtection.status,
              headers: {
                "Retry-After": String(userProtection.retryAfter || 60),
              },
            }
          );
        }

        // Get limits based on user trust score
        userLimits = getDataLimitForUser(session.user);

        // Apply artificial delay for authenticated users (based on trust score)
        if (userProtection.delay > 0) {
          await sleep(userProtection.delay);
        }
      }
    } catch (_e) {
      // Auth failed, continue as unauthenticated
    }

    // IP-level protection for unauthenticated requests
    if (!isAuthenticated) {
      const protection = await quickProtect(request, "sensitive");
      if (protection.blocked) {
        return protection.response;
      }

      // Apply artificial delay for unauthenticated users (slows scrapers)
      const publicDelay = calculatePublicDelay(protection.clientId, false);
      await sleep(publicDelay);
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const requestedLimit = parseInt(searchParams.get("limit")) || 50;

    // PROTECTION: Apply limits based on authentication and trust
    const maxLimit = userLimits.incidents;
    const limit = Math.min(Math.max(requestedLimit, 1), maxLimit);

    const severity = searchParams.get("severity");
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    // Build query
    let query = supabase
      .from("security_incidents")
      .select(`
        id,
        incident_id,
        title,
        description,
        incident_type,
        severity,
        incident_date,
        funds_lost_usd,
        users_affected,
        status,
        response_quality,
        source_urls,
        affected_product_ids,
        is_published
      `)
      .eq("is_published", true)
      .order("incident_date", { ascending: false })
      .limit(limit);

    // Apply filters
    if (severity) {
      query = query.eq("severity", severity);
    }
    if (type) {
      query = query.eq("incident_type", type);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data: incidents, error } = await query;

    if (error) {
      console.error("Error fetching incidents:", error);
      return NextResponse.json(
        { error: "Failed to fetch incidents" },
        { status: 500 }
      );
    }

    // Get product names for affected products
    const allProductIds = [
      ...new Set(incidents.flatMap((i) => i.affected_product_ids || [])),
    ];

    let productMap = {};
    if (allProductIds.length > 0) {
      const { data: products } = await supabase
        .from("products")
        .select("id, name, slug")
        .in("id", allProductIds);

      if (products) {
        productMap = products.reduce((map, p) => {
          map[p.id] = { name: p.name, slug: p.slug };
          return map;
        }, {});
      }
    }

    // Transform incidents
    const transformedIncidents = incidents.map((incident) => ({
      id: incident.id,
      incidentId: incident.incident_id,
      title: incident.title,
      description: incident.description,
      type: incident.incident_type,
      severity: incident.severity,
      date: incident.incident_date,
      fundsLost: incident.funds_lost_usd,
      usersAffected: incident.users_affected,
      status: incident.status,
      responseQuality: incident.response_quality,
      sources: incident.source_urls || [],
      affectedProducts: (incident.affected_product_ids || []).map((id) => ({
        id,
        name: productMap[id]?.name || "Unknown",
        slug: productMap[id]?.slug || null,
      })),
    }));

    // Calculate global stats
    const stats = {
      total: incidents.length,
      totalFundsLost: incidents.reduce(
        (sum, i) => sum + (i.funds_lost_usd || 0),
        0
      ),
      bySeverity: {
        critical: incidents.filter((i) => i.severity === "critical").length,
        high: incidents.filter((i) => i.severity === "high").length,
        medium: incidents.filter((i) => i.severity === "medium").length,
        low: incidents.filter((i) => i.severity === "low").length,
      },
      byType: incidents.reduce((acc, i) => {
        acc[i.incident_type] = (acc[i.incident_type] || 0) + 1;
        return acc;
      }, {}),
      activeIncidents: incidents.filter(
        (i) => i.status === "active" || i.status === "investigating"
      ).length,
    };

    // Generate watermark for tracking copied data
    const clientId = getClientId(request);
    const watermark = {
      _ss: Buffer.from(JSON.stringify({
        t: Date.now(),
        c: clientId.substring(0, 12),
        u: isAuthenticated ? session.user.id.substring(0, 8) : null,
      })).toString("base64"),
    };

    // Build response
    const responseData = {
      incidents: transformedIncidents,
      stats,
      _limited: transformedIncidents.length >= limit,
      _maxAllowed: maxLimit,
      ...watermark,
    };

    // Add upgrade message for non-paid users
    if (!isPaid) {
      responseData._note = isAuthenticated
        ? "Upgrade to Professional for full incident database access"
        : "Full incident database requires Professional subscription";
      responseData._totalIncidents = "100+ incidents tracked";
    }

    return NextResponse.json(responseData, {
      headers: {
        "Cache-Control": isAuthenticated
          ? "private, max-age=30"
          : "public, s-maxage=60",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (error) {
    console.error("Error fetching incidents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
