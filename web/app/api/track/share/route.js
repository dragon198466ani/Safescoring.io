import { NextResponse } from "next/server";
import { supabase } from "@/libs/supabase";
import { headers } from "next/headers";
import crypto from "crypto";

// Rate limiting: max 20 shares per minute per IP
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 20;

function checkRateLimit(ipHash) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  if (!rateLimitMap.has(ipHash)) {
    rateLimitMap.set(ipHash, [now]);
    return true;
  }

  const timestamps = rateLimitMap.get(ipHash).filter(t => t > windowStart);

  if (timestamps.length >= RATE_LIMIT_MAX) {
    return false;
  }

  timestamps.push(now);
  rateLimitMap.set(ipHash, timestamps);
  return true;
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  for (const [key, timestamps] of rateLimitMap.entries()) {
    const valid = timestamps.filter(t => t > windowStart);
    if (valid.length === 0) {
      rateLimitMap.delete(key);
    } else {
      rateLimitMap.set(key, valid);
    }
  }
}, 60000);

export async function POST(req) {
  try {
    const headersList = await headers();
    const body = await req.json();

    const { share_type, target_id, platform, locale = "en" } = body;

    // Validate required fields
    if (!share_type || !target_id || !platform) {
      return NextResponse.json(
        { error: "Missing required fields: share_type, target_id, platform" },
        { status: 400 }
      );
    }

    // Validate share_type
    const validShareTypes = ["product", "comparison", "setup", "leaderboard", "badge"];
    if (!validShareTypes.includes(share_type)) {
      return NextResponse.json(
        { error: `Invalid share_type. Must be one of: ${validShareTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate platform
    const validPlatforms = ["twitter", "linkedin", "telegram", "whatsapp", "copy", "embed", "native", "email"];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${validPlatforms.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate locale
    const validLocales = ["en", "fr", "de", "es", "pt", "ja"];
    const safeLocale = validLocales.includes(locale) ? locale : "en";

    // Get client info
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ip = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";
    const userAgent = headersList.get("user-agent") || "";
    const referrer = headersList.get("referer") || "";

    // Create privacy-preserving IP hash
    const ipHash = crypto.createHash("sha256").update(ip + userAgent).digest("hex").substring(0, 16);

    // Rate limiting
    if (!checkRateLimit(ipHash)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    // Detect country from headers (Vercel/Cloudflare provide this)
    const country = headersList.get("x-vercel-ip-country") ||
                   headersList.get("cf-ipcountry") ||
                   null;

    // Get user ID if authenticated (from session)
    const { auth } = await import("@/libs/auth");
    const session = await auth();
    const user = session?.user;

    // Insert share event
    const { error } = await supabase
      .from("share_events")
      .insert({
        user_id: user?.id || null,
        share_type,
        target_id: target_id.substring(0, 255), // Limit length
        platform,
        locale: safeLocale,
        referrer: referrer.substring(0, 500),
        user_agent: userAgent.substring(0, 500),
        ip_hash: ipHash,
        country,
      });

    if (error) {
      console.error("Error tracking share:", error);
      // Don't expose internal errors, but still return success
      // Tracking failures shouldn't break the user experience
      return NextResponse.json({ success: true, tracked: false });
    }

    return NextResponse.json({ success: true, tracked: true });

  } catch (error) {
    console.error("Share tracking error:", error);
    // Return success even on error - tracking shouldn't break UX
    return NextResponse.json({ success: true, tracked: false });
  }
}

// GET endpoint for share analytics (admin only)
export async function GET(req) {
  try {
    const { auth } = await import("@/libs/auth");
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30");
    const shareType = searchParams.get("type") || null;

    // Get analytics
    const { data: analytics, error: analyticsError } = await supabase
      .rpc("get_share_analytics", {
        p_days: days,
        p_share_type: shareType
      });

    // Get top shared products
    const { data: topProducts, error: topError } = await supabase
      .rpc("get_top_shared_products", {
        p_limit: 10,
        p_days: days
      });

    // Get totals
    const { count: totalShares } = await supabase
      .from("share_events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

    return NextResponse.json({
      success: true,
      data: {
        totalShares,
        analytics: analytics || [],
        topProducts: topProducts || [],
        period: `${days} days`,
      }
    });

  } catch (error) {
    console.error("Share analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
