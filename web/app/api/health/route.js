import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Comprehensive Health Check Endpoint
 *
 * GET /api/health
 *
 * Returns system status including:
 * - Supabase connectivity + product count
 * - Environment variable validation
 * - Build/runtime information
 * - Memory usage
 *
 * Used by: Vercel health checks, uptime monitors, post-deploy validation
 */
export async function GET() {
  const checks = {};
  let overallStatus = "ok";

  // 1. Supabase connectivity (actual DB query)
  if (isSupabaseConfigured()) {
    try {
      const start = Date.now();
      const { count, error } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true });
      const latency = Date.now() - start;

      if (error) {
        checks.supabase = { status: "error", error: error.message, latency_ms: latency };
        overallStatus = "degraded";
      } else {
        checks.supabase = { status: "connected", products: count || 0, latency_ms: latency };
      }
    } catch (err) {
      checks.supabase = { status: "unreachable", error: err.message };
      overallStatus = "degraded";
    }
  } else {
    checks.supabase = { status: "not_configured" };
    overallStatus = "degraded";
  }

  // 2. Environment validation
  const required = ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXTAUTH_SECRET"];
  const important = ["SUPABASE_SERVICE_ROLE_KEY", "CRON_SECRET", "RESEND_API_KEY"];
  const optional = ["STRIPE_SECRET_KEY", "GOOGLE_ID", "UPSTASH_REDIS_REST_URL", "NEXT_PUBLIC_SENTRY_DSN"];

  const envStatus = {
    required: required.reduce((acc, k) => ({ ...acc, [k]: !!process.env[k] }), {}),
    important: important.reduce((acc, k) => ({ ...acc, [k]: !!process.env[k] }), {}),
    optional_configured: optional.filter((k) => process.env[k]).length + "/" + optional.length,
  };

  if (required.some((k) => !process.env[k])) {
    overallStatus = "degraded";
  }

  checks.environment = envStatus;

  // 3. Runtime info
  const mem = process.memoryUsage();
  checks.runtime = {
    node: process.version,
    platform: process.platform,
    uptime_seconds: Math.round(process.uptime()),
    memory_mb: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heap_used: Math.round(mem.heapUsed / 1024 / 1024),
      heap_total: Math.round(mem.heapTotal / 1024 / 1024),
    },
  };

  // 4. Cron readiness
  checks.crons = {
    secret_configured: !!process.env.CRON_SECRET,
    endpoints: 19, // Total cron endpoints
  };

  return NextResponse.json(
    {
      status: overallStatus,
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: overallStatus === "ok" ? 200 : 503 }
  );
}
