import { NextResponse } from "next/server";
import { getClientId, logSuspiciousActivity } from "@/libs/rate-limit";

/**
 * HONEYPOT ENDPOINT - /api/download
 */

export async function GET(request) {
  const clientId = getClientId(request);

  logSuspiciousActivity(clientId, "/api/download", "honeypot-download");

  console.warn(`[HONEYPOT-DOWNLOAD] Scraper detected: ${clientId}`);

  return NextResponse.json(
    {
      error: "Download requires Professional subscription",
      code: "SUBSCRIPTION_REQUIRED",
    },
    { status: 403 }
  );
}
