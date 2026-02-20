import { NextResponse } from "next/server";

import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { applyUserRateLimit } from "@/libs/rate-limiters";

/**
 * API Usage Statistics
 *
 * GET - Get usage stats for the current user's API keys
 */

export async function GET(req) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(req);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    // Get user's API key IDs
    const { data: keys } = await supabase
      .from("api_keys")
      .select("id")
      .eq("user_id", session.user.id);

    if (!keys || keys.length === 0) {
      return NextResponse.json({
        totalRequests: 0,
        todayRequests: 0,
        byEndpoint: {},
        byDay: [],
      });
    }

    const keyIds = keys.map(k => k.id);

    // Get total requests (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: totalRequests } = await supabase
      .from("api_usage")
      .select("*", { count: "exact", head: true })
      .in("api_key_id", keyIds)
      .gte("created_at", thirtyDaysAgo.toISOString());

    // Get today's requests
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const { count: todayRequests } = await supabase
      .from("api_usage")
      .select("*", { count: "exact", head: true })
      .in("api_key_id", keyIds)
      .gte("created_at", todayStart.toISOString());

    // Get usage by endpoint
    const { data: endpointUsage } = await supabase
      .from("api_usage")
      .select("endpoint")
      .in("api_key_id", keyIds)
      .gte("created_at", thirtyDaysAgo.toISOString());

    const byEndpoint = {};
    for (const row of endpointUsage || []) {
      byEndpoint[row.endpoint] = (byEndpoint[row.endpoint] || 0) + 1;
    }

    // Get usage by day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: dailyUsage } = await supabase
      .from("api_usage")
      .select("created_at")
      .in("api_key_id", keyIds)
      .gte("created_at", sevenDaysAgo.toISOString());

    const byDay = {};
    for (const row of dailyUsage || []) {
      const day = new Date(row.created_at).toISOString().split('T')[0];
      byDay[day] = (byDay[day] || 0) + 1;
    }

    // Format by day as array
    const byDayArray = Object.entries(byDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Get average response time
    const { data: avgTimeData } = await supabase
      .from("api_usage")
      .select("response_time_ms")
      .in("api_key_id", keyIds)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .not("response_time_ms", "is", null)
      .limit(1000);

    const avgResponseTime = avgTimeData && avgTimeData.length > 0
      ? Math.round(avgTimeData.reduce((sum, r) => sum + r.response_time_ms, 0) / avgTimeData.length)
      : 0;

    // Get error rate
    const { count: errorCount } = await supabase
      .from("api_usage")
      .select("*", { count: "exact", head: true })
      .in("api_key_id", keyIds)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .gte("status_code", 400);

    const errorRate = totalRequests > 0
      ? ((errorCount || 0) / totalRequests * 100).toFixed(2)
      : 0;

    return NextResponse.json({
      totalRequests: totalRequests || 0,
      todayRequests: todayRequests || 0,
      byEndpoint,
      byDay: byDayArray,
      avgResponseTime,
      errorRate: parseFloat(errorRate),
    });

  } catch (error) {
    console.error("Error fetching API usage:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
