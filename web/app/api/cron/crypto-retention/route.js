import { NextResponse } from "next/server";
import { processExpiringSubscriptions } from "@/libs/crypto-retention";

/**
 * Cron job to send crypto renewal reminders
 * Should be called daily via Vercel Cron or external service
 *
 * GET /api/cron/crypto-retention
 */
export async function GET(request) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[Cron] Starting crypto retention check...");

    const results = await processExpiringSubscriptions();

    console.log(`[Cron] Processed ${results.processed} reminders, ${results.errors.length} errors`);

    return NextResponse.json({
      success: true,
      processed: results.processed,
      errors: results.errors.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Crypto retention error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Vercel Cron config
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
