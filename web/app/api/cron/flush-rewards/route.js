// ============================================================
// Flush Pending Rewards Cron Job
// Runs every minute to batch-process queued token rewards
//
// Configure in Vercel: Settings > Cron Jobs
// Schedule: every minute (Vercel minimum)
// Or call from external cron at higher frequency (e.g. every 10s)
//
// Architecture:
// - Votes INSERT into vote_pending_rewards (fast, no lock)
// - This cron aggregates per-user and applies to token_rewards in batch
// - 1M votes = ~100K batched UPDATEs instead of 1M individual ones
// ============================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // 30s max for Vercel

/**
 * SECURITY: Constant-time comparison for cron secret
 */
function verifyCronSecret(providedSecret) {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || !providedSecret) return false;

  try {
    const provided = Buffer.from(providedSecret);
    const expected = Buffer.from(expectedSecret);
    if (provided.length !== expected.length) return false;
    return crypto.timingSafeEqual(provided, expected);
  } catch {
    return false;
  }
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(request) {
  try {
    // Verify cron secret (Vercel sends it as Authorization header)
    const authHeader = request.headers.get("authorization");
    const secret = authHeader?.replace("Bearer ", "") || new URL(request.url).searchParams.get("secret");

    if (!verifyCronSecret(secret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    // Call the batch flush function
    const { data, error } = await supabase.rpc("flush_pending_rewards", {
      p_batch_size: 10000,
    });

    if (error) {
      // If function doesn't exist yet, just report it
      if (error.code === "42883") {
        return NextResponse.json({
          status: "skipped",
          reason: "flush_pending_rewards function not deployed yet",
        });
      }
      console.error("[CRON] flush_pending_rewards error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      status: "ok",
      ...data,
    });
  } catch (error) {
    console.error("[CRON] flush-rewards error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST endpoint for external cron services (e.g. cron-job.org, Upstash)
 * that prefer POST requests
 */
export async function POST(request) {
  return GET(request);
}
