import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { quickProtect, getClientId } from "@/libs/api-protection";
import { auth } from "@/libs/auth";
import {
  protectAuthenticatedRequest,
  sleep,
  calculatePublicDelay,
} from "@/libs/user-protection";

export const dynamic = "force-dynamic";

// GET /api/products/[slug]/incidents - Get security incidents for a product
export async function GET(request, { params }) {
  try {
    const { slug } = await params;

    // Check authentication first
    let session = null;
    let isAuthenticated = false;
    let isPaid = false;

    try {
      session = await auth();
      if (session?.user?.id) {
        isAuthenticated = true;
        isPaid = session.user.hasAccess || false;

        // Check user-level rate limiting
        const userProtection = await protectAuthenticatedRequest(
          session.user.id,
          `/api/products/${slug}/incidents`,
          { isPaid, productSlug: slug }
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
              headers: { "Retry-After": String(userProtection.retryAfter || 60) },
            }
          );
        }

        // Apply artificial delay for authenticated users
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

      // Apply artificial delay for unauthenticated users
      const publicDelay = calculatePublicDelay(protection.clientId, false);
      await sleep(publicDelay);
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    // Get the product
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name")
      .eq("slug", slug)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Fetch incidents from security_incidents via incident_product_impact junction table
    // UNIFIED: Utiliser la même source de données que /api/incidents
    const { data: impactData, error: impactError } = await supabase
      .from("incident_product_impact")
      .select(`
        incident_id,
        impact_level,
        funds_lost_usd,
        users_affected,
        security_incidents (
          id,
          incident_id,
          title,
          description,
          incident_type,
          severity,
          incident_date,
          funds_lost_usd,
          status,
          response_quality,
          source_urls,
          date_is_estimated,
          is_published
        )
      `)
      .eq("product_id", product.id);

    // Filter only published incidents and transform
    const incidentsData = (impactData || [])
      .filter(item => item.security_incidents?.is_published)
      .map(item => ({
        id: item.security_incidents.id,
        title: item.security_incidents.title,
        description: item.security_incidents.description,
        type: item.security_incidents.incident_type,
        severity: item.security_incidents.severity,
        date: item.security_incidents.incident_date,
        date_is_estimated: item.security_incidents.date_is_estimated || false,
        funds_lost: item.funds_lost_usd || item.security_incidents.funds_lost_usd || 0,
        funds_recovered: 0, // Not tracked in security_incidents
        status: item.security_incidents.status,
        response_quality: item.security_incidents.response_quality,
        source_url: item.security_incidents.source_urls?.[0] || null,
        impact_level: item.impact_level,
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const _incidentsError = impactError;

    // Transform incidents data
    const incidents = (incidentsData || []).map((incident) => {
      const fundsLost = parseFloat(incident.funds_lost) || 0;
      const fundsRecovered = parseFloat(incident.funds_recovered) || 0;
      const type = incident.type || '';

      // Calculate resolution details dynamically
      let resolutionDetails = incident.resolution_details || '';
      let responseQuality = incident.response_quality || 'none';

      if (!resolutionDetails) {
        if (fundsRecovered > 0 && fundsLost > 0) {
          const rate = (fundsRecovered / fundsLost * 100).toFixed(0);
          if (rate >= 90) {
            resolutionDetails = `Funds fully recovered (${rate}%)`;
            responseQuality = 'excellent';
          } else if (rate >= 50) {
            resolutionDetails = `Partial recovery: $${(fundsRecovered/1_000_000).toFixed(1)}M (${rate}%)`;
            responseQuality = 'good';
          } else {
            resolutionDetails = `Minor recovery: $${(fundsRecovered/1_000_000).toFixed(1)}M (${rate}%)`;
            responseQuality = 'partial';
          }
        } else if (type.includes('rug') || type.includes('exit')) {
          resolutionDetails = 'Exit scam - funds unrecoverable';
          responseQuality = 'unrecoverable';
        } else if (type.includes('flash_loan')) {
          resolutionDetails = 'Flash loan attack - no recovery possible';
          responseQuality = 'none';
        } else {
          resolutionDetails = 'Exploit patched - funds not recovered';
          responseQuality = 'none';
        }
      }

      return {
        id: incident.id,
        title: incident.title,
        description: incident.description,
        type: incident.type,
        severity: incident.severity,
        date: incident.date,
        dateIsEstimated: incident.date_is_estimated || false, // Flag pour dates inconnues
        fundsLost,
        fundsRecovered,
        status: incident.status,
        responseQuality,
        resolutionDetails,
        sourceUrl: incident.source_url,
        impactLevel: incident.impact_level || "direct",
      };
    });

    // Always calculate stats from actual incidents for consistency
    const totalFundsLost = incidents.reduce((sum, i) => sum + (i.fundsLost || 0), 0);
    const bySeverity = {
      critical: incidents.filter((i) => i.severity === "critical").length,
      high: incidents.filter((i) => i.severity === "high").length,
      medium: incidents.filter((i) => i.severity === "medium").length,
      low: incidents.filter((i) => i.severity === "low").length,
    };

    const stats = {
      totalIncidents: incidents.length,
      totalFundsLost,
      bySeverity,
      lastIncident: incidents[0]?.date || null,
      hasActiveIncidents: incidents.some((i) => i.status === "active"),
      riskLevel: calculateRiskLevel(incidents),
    };

    // Generate watermark for tracking
    const clientId = getClientId(request);
    const watermark = {
      _ss: Buffer.from(JSON.stringify({
        t: Date.now(),
        c: clientId.substring(0, 12),
        p: slug,
      })).toString("base64"),
    };

    return NextResponse.json(
      {
        product: {
          id: product.id,
          name: product.name,
          slug: slug,
        },
        incidents,
        stats,
        ...watermark,
      },
      {
        headers: {
          "Cache-Control": isAuthenticated
            ? "private, max-age=30"
            : "public, s-maxage=60, stale-while-revalidate=300",
          "X-Robots-Tag": "noindex, nofollow",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching product incidents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function calculateRiskLevel(incidents) {
  const critical = incidents.filter((i) => i.severity === "critical").length;
  const high = incidents.filter((i) => i.severity === "high").length;
  const totalLost = incidents.reduce((sum, i) => sum + (i.fundsLost || 0), 0);

  if (critical > 0 || totalLost > 100_000_000) return "critical";
  if (high > 0 || totalLost > 10_000_000) return "high";
  if (incidents.length > 2 || totalLost > 1_000_000) return "medium";
  return "low";
}
