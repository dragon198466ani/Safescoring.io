import { NextResponse } from "next/server";
import { getClientId, logSuspiciousActivity } from "@/libs/rate-limit";

/**
 * HONEYPOT ENDPOINT - /api/export
 *
 * Scrapers often look for export/download endpoints.
 * Any request here is 100% suspicious.
 */

export async function GET(request) {
  const clientId = getClientId(request);
  const ua = request.headers.get("user-agent") || "unknown";
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "unknown";

  // Log as high-priority scraper attempt
  logSuspiciousActivity(clientId, "/api/export", `honeypot-export-${format}`);

  console.warn(`[HONEYPOT-EXPORT] Scraper detected:`, {
    clientId,
    userAgent: ua,
    format,
    timestamp: new Date().toISOString(),
  });

  // Return a response that looks like they need to authenticate
  return NextResponse.json(
    {
      error: "Export requires Enterprise subscription",
      code: "SUBSCRIPTION_REQUIRED",
      upgrade_url: "/pricing",
      formats_available: ["csv", "json", "xlsx"],
      _note: "Contact sales@safescoring.io for bulk data access",
    },
    {
      status: 403,
      headers: {
        "X-Robots-Tag": "noindex, nofollow",
      },
    }
  );
}
