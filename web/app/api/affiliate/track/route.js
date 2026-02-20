import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import crypto from "crypto";

/**
 * Affiliate Click Tracking
 *
 * POST - Track a referral click
 *
 * Called when a visitor arrives with ?ref=CODE
 */

// Hash visitor identifier for privacy
function hashVisitor(ip, userAgent) {
  const data = `${ip}:${userAgent}`;
  return crypto.createHash("sha256").update(data).digest("hex").substring(0, 16);
}

// Parse user agent for device/browser
function parseUserAgent(ua) {
  const device = /mobile/i.test(ua) ? "mobile" : /tablet/i.test(ua) ? "tablet" : "desktop";

  let browser = "other";
  if (/chrome/i.test(ua) && !/edge/i.test(ua)) browser = "chrome";
  else if (/firefox/i.test(ua)) browser = "firefox";
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = "safari";
  else if (/edge/i.test(ua)) browser = "edge";
  else if (/opera|opr/i.test(ua)) browser = "opera";

  return { device, browser };
}

export async function POST(request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const { code, landingPage, referrer, utmSource, utmMedium, utmCampaign } = await request.json();

    if (!code) {
      return NextResponse.json({ error: "Affiliate code required" }, { status: 400 });
    }

    // Find affiliate by code
    const { data: affiliate, error: affiliateError } = await supabase
      .from("affiliates")
      .select("id, status")
      .eq("code", code.toUpperCase())
      .maybeSingle();

    if (affiliateError || !affiliate) {
      return NextResponse.json({ error: "Invalid affiliate code" }, { status: 404 });
    }

    if (affiliate.status !== "approved") {
      return NextResponse.json({ error: "Affiliate not active" }, { status: 400 });
    }

    // Get visitor info
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ||
               request.headers.get("x-real-ip") ||
               "unknown";
    const userAgent = request.headers.get("user-agent") || "";
    const { device, browser } = parseUserAgent(userAgent);
    const visitorId = hashVisitor(ip, userAgent);

    // Get country from Cloudflare header or default
    const country = request.headers.get("cf-ipcountry") || "XX";

    // Check for duplicate click (same visitor in last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { count: recentClicks } = await supabase
      .from("affiliate_clicks")
      .select("*", { count: "exact", head: true })
      .eq("affiliate_id", affiliate.id)
      .eq("visitor_id", visitorId)
      .gte("created_at", oneDayAgo.toISOString());

    if (recentClicks > 0) {
      // Already tracked this visitor recently
      return NextResponse.json({
        tracked: false,
        reason: "duplicate",
        affiliateId: affiliate.id,
      });
    }

    // Record click
    const { data: click, error: clickError } = await supabase
      .from("affiliate_clicks")
      .insert({
        affiliate_id: affiliate.id,
        visitor_id: visitorId,
        referrer_url: referrer,
        landing_page: landingPage || "/",
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        country,
        device,
        browser,
      })
      .select("id")
      .single();

    if (clickError) {
      console.error("Error tracking click:", clickError);
      return NextResponse.json({ error: "Failed to track click" }, { status: 500 });
    }

    return NextResponse.json({
      tracked: true,
      clickId: click.id,
      affiliateId: affiliate.id,
    });

  } catch (error) {
    console.error("Track click error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
