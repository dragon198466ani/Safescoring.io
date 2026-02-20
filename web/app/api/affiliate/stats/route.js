import { NextResponse } from "next/server";

import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

/**
 * Affiliate Statistics API
 *
 * GET - Get detailed stats for the current user's affiliate account
 */

export async function GET(request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    // Get affiliate account
    const { data: affiliate, error: affiliateError } = await supabase
      .from("affiliates")
      .select("id, status")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (affiliateError || !affiliate) {
      return NextResponse.json({ error: "Affiliate account not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30", 10);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get clicks by day
    const { data: clicks } = await supabase
      .from("affiliate_clicks")
      .select("created_at, country, device, browser")
      .eq("affiliate_id", affiliate.id)
      .gte("created_at", startDate.toISOString());

    // Get conversions
    const { data: conversions } = await supabase
      .from("affiliate_conversions")
      .select("created_at, type, value, commission, status")
      .eq("affiliate_id", affiliate.id)
      .gte("created_at", startDate.toISOString());

    // Aggregate clicks by day
    const clicksByDay = {};
    for (const click of clicks || []) {
      const day = click.created_at.split("T")[0];
      clicksByDay[day] = (clicksByDay[day] || 0) + 1;
    }

    // Aggregate conversions by day
    const conversionsByDay = {};
    for (const conv of conversions || []) {
      const day = conv.created_at.split("T")[0];
      conversionsByDay[day] = (conversionsByDay[day] || 0) + 1;
    }

    // Aggregate by country
    const byCountry = {};
    for (const click of clicks || []) {
      const country = click.country || "XX";
      byCountry[country] = (byCountry[country] || 0) + 1;
    }

    // Aggregate by device
    const byDevice = {};
    for (const click of clicks || []) {
      const device = click.device || "unknown";
      byDevice[device] = (byDevice[device] || 0) + 1;
    }

    // Aggregate by browser
    const byBrowser = {};
    for (const click of clicks || []) {
      const browser = click.browser || "other";
      byBrowser[browser] = (byBrowser[browser] || 0) + 1;
    }

    // Aggregate conversions by type
    const byType = {};
    for (const conv of conversions || []) {
      byType[conv.type] = (byType[conv.type] || 0) + 1;
    }

    // Calculate totals
    const totalClicks = clicks?.length || 0;
    const totalConversions = conversions?.length || 0;
    const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : 0;
    const totalEarnings = (conversions || []).reduce((sum, c) => sum + parseFloat(c.commission || 0), 0);
    const pendingEarnings = (conversions || [])
      .filter(c => c.status === "pending")
      .reduce((sum, c) => sum + parseFloat(c.commission || 0), 0);

    // Format daily data
    const dailyData = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const day = date.toISOString().split("T")[0];
      dailyData.push({
        date: day,
        clicks: clicksByDay[day] || 0,
        conversions: conversionsByDay[day] || 0,
      });
    }

    return NextResponse.json({
      period: {
        start: startDate.toISOString(),
        end: new Date().toISOString(),
        days,
      },
      summary: {
        totalClicks,
        totalConversions,
        conversionRate: parseFloat(conversionRate),
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        pendingEarnings: Math.round(pendingEarnings * 100) / 100,
      },
      daily: dailyData,
      breakdown: {
        byCountry,
        byDevice,
        byBrowser,
        byConversionType: byType,
      },
    });

  } catch (error) {
    console.error("Affiliate stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
