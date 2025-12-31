import { NextResponse } from "next/server";
import { getClientId, logSuspiciousActivity } from "@/libs/rate-limit";

/**
 * HONEYPOT ENDPOINT
 *
 * This endpoint looks like a "full API" but is actually a trap for scrapers.
 * Any request here is logged as suspicious activity.
 *
 * Scrapers often look for:
 * - /api/v2/... (newer API versions)
 * - /api/products/all
 * - /api/products/export
 * - /api/data/...
 */

export async function GET(request) {
  const clientId = getClientId(request);
  const ua = request.headers.get("user-agent") || "unknown";
  const referer = request.headers.get("referer") || "none";

  // Log this as a scraper attempt
  logSuspiciousActivity(clientId, "/api/v2/products", "honeypot-triggered");

  // Log detailed info for investigation
  console.warn(`[HONEYPOT] Scraper detected:`, {
    clientId,
    userAgent: ua,
    referer,
    url: request.url,
    timestamp: new Date().toISOString(),
  });

  // Return fake data that looks real but is useless
  // This wastes the scraper's time
  return NextResponse.json(
    {
      success: true,
      version: "2.0",
      products: [
        {
          id: "fake-001",
          name: "Example Product",
          score: 85,
          _note: "This is sample data. Full API access requires authentication.",
        },
      ],
      total: 1,
      _message: "API v2 is in beta. Please contact support for access.",
      _auth_required: true,
    },
    {
      status: 200,
      headers: {
        "X-Robots-Tag": "noindex, nofollow",
        // Slow down response to waste scraper time
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(request) {
  const clientId = getClientId(request);
  logSuspiciousActivity(clientId, "/api/v2/products", "honeypot-post-attempt");

  return NextResponse.json(
    { error: "Authentication required", code: "AUTH_REQUIRED" },
    { status: 401 }
  );
}
