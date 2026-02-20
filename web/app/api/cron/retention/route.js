import { NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";
import { processDunningSequences } from "@/libs/dunning";
import { processWinbackCampaigns } from "@/libs/winback-campaigns";
import { batchUpdateHealthScores } from "@/libs/health-score";

/**
 * GET /api/cron/retention
 * Process all retention-related tasks:
 * - Dunning emails for failed payments
 * - Win-back campaigns for churned users
 * - Health score updates for all users
 *
 * Should be called daily via cron job
 */
export async function GET(req) {
  try {
    // Verify cron authentication
    const authResult = verifyCronAuth(req);
    if (!authResult.authorized) {
      console.warn("[SECURITY] Unauthorized cron access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[CRON] Starting retention processing...");

    const results = {
      timestamp: new Date().toISOString(),
      dunning: null,
      winback: null,
      healthScores: null,
      errors: [],
    };

    // Process dunning sequences
    try {
      console.log("[CRON] Processing dunning sequences...");
      results.dunning = await processDunningSequences();
      console.log(`[CRON] Dunning: ${results.dunning.processed} processed, ${results.dunning.emailsSent} emails sent`);
    } catch (error) {
      console.error("[CRON] Dunning error:", error);
      results.errors.push({ task: "dunning", error: error.message });
    }

    // Process win-back campaigns
    try {
      console.log("[CRON] Processing win-back campaigns...");
      results.winback = await processWinbackCampaigns();
      console.log(`[CRON] Win-back: ${results.winback.processed} processed, ${results.winback.emailsSent} emails sent`);
    } catch (error) {
      console.error("[CRON] Win-back error:", error);
      results.errors.push({ task: "winback", error: error.message });
    }

    // Update health scores
    try {
      console.log("[CRON] Updating health scores...");
      results.healthScores = await batchUpdateHealthScores();
      console.log(`[CRON] Health scores: ${results.healthScores.updated} updated`);
    } catch (error) {
      console.error("[CRON] Health scores error:", error);
      results.errors.push({ task: "healthScores", error: error.message });
    }

    console.log("[CRON] Retention processing complete");

    return NextResponse.json({
      success: results.errors.length === 0,
      results,
    });
  } catch (error) {
    console.error("[CRON] Retention cron error:", error);
    return NextResponse.json(
      { error: "Retention cron failed", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Verify cron authentication
 * Supports Bearer token or HMAC signature
 */
function verifyCronAuth(req) {
  const headersList = headers();
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn("[SECURITY] CRON_SECRET not configured");
    // In development, allow without auth
    if (process.env.NODE_ENV === "development") {
      return { authorized: true, method: "development" };
    }
    return { authorized: false };
  }

  // Method 1: Bearer token
  const authHeader = headersList.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token === cronSecret) {
      return { authorized: true, method: "bearer" };
    }
  }

  // Method 2: HMAC signature
  const signature = headersList.get("x-cron-signature");
  const timestamp = headersList.get("x-cron-timestamp");

  if (signature && timestamp) {
    // Validate timestamp (within 5 minutes)
    const timestampDate = new Date(parseInt(timestamp));
    const now = new Date();
    const diff = Math.abs(now - timestampDate);

    if (diff > 5 * 60 * 1000) {
      console.warn("[SECURITY] Cron timestamp too old");
      return { authorized: false };
    }

    // Verify signature
    const url = new URL(req.url);
    const message = `${timestamp}:${url.pathname}`;
    const expectedSignature = crypto
      .createHmac("sha256", cronSecret)
      .update(message)
      .digest("hex");

    if (crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )) {
      return { authorized: true, method: "hmac" };
    }
  }

  return { authorized: false };
}
