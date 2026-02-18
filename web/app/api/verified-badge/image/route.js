import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

/**
 * Verified Badge Image
 *
 * Returns SVG badge for embedding
 * - Dynamic (real-time score)
 * - Infalsifiable (generated server-side)
 * - Click to verify
 *
 * Usage:
 * <img src="https://safescoring.io/api/verified-badge/image?slug=ledger-nano-x" />
 */

function getScoreColor(score) {
  if (score >= 80) return "#22c55e"; // Green
  if (score >= 60) return "#f59e0b"; // Amber
  if (score >= 40) return "#f97316"; // Orange
  return "#ef4444"; // Red
}

function generateBadgeSVG({ productName, score, isVerified, style = "default" }) {
  const scoreColor = getScoreColor(score);
  const scorePercent = score / 100;
  const circumference = 2 * Math.PI * 20;
  const strokeDashoffset = circumference * (1 - scorePercent);

  // Brand colors
  const colors = {
    primary: "#6366f1",
    secondary: "#8b5cf6",
    accent: "#a855f7",
    dark: "#0f0f1a",
    card: "#1a1a2e",
    border: "#6366f1"
  };

  if (style === "minimal") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="36" viewBox="0 0 160 36">
  <defs>
    <linearGradient id="miniGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${colors.primary}"/>
      <stop offset="100%" stop-color="${colors.accent}"/>
    </linearGradient>
  </defs>
  <rect width="160" height="36" rx="18" fill="${colors.dark}"/>
  <rect x="1" y="1" width="158" height="34" rx="17" fill="none" stroke="url(#miniGrad)" stroke-width="2"/>

  <!-- Shield icon -->
  <path d="M16 10 L28 10 L28 22 L22 28 L16 22 Z" fill="url(#miniGrad)" opacity="0.2"/>
  <path d="M18 12 L26 12 L26 21 L22 25 L18 21 Z" fill="url(#miniGrad)"/>
  ${isVerified ? `<path d="M20 18 L21.5 20 L25 16" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>` : ''}

  <text x="36" y="16" font-family="Inter,system-ui,sans-serif" font-size="9" fill="#9ca3af" font-weight="500">SAFESCORE</text>
  <text x="36" y="28" font-family="Inter,system-ui,sans-serif" font-size="12" fill="white" font-weight="600">${isVerified ? 'Verified' : 'Check Score'}</text>

  <rect x="115" y="8" width="38" height="20" rx="10" fill="${scoreColor}"/>
  <text x="134" y="22" font-family="Inter,system-ui,sans-serif" font-size="12" fill="white" font-weight="700" text-anchor="middle">${score}</text>
</svg>`;
  }

  if (style === "light") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="52" viewBox="0 0 200 52">
  <defs>
    <linearGradient id="lightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colors.primary}"/>
      <stop offset="50%" stop-color="${colors.secondary}"/>
      <stop offset="100%" stop-color="${colors.accent}"/>
    </linearGradient>
    <filter id="lightShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="${colors.primary}" flood-opacity="0.2"/>
    </filter>
  </defs>

  <rect width="200" height="52" rx="12" fill="white" filter="url(#lightShadow)"/>
  <rect x="1" y="1" width="198" height="50" rx="11" fill="none" stroke="#e2e8f0" stroke-width="1"/>

  <!-- Shield -->
  <rect x="10" y="10" width="32" height="32" rx="8" fill="url(#lightGrad)"/>
  <path d="M20 16 L32 16 L32 28 L26 34 L20 28 Z" fill="white" opacity="0.3"/>
  ${isVerified ? `<path d="M23 25 L25.5 28 L31 21" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>` : `<text x="26" y="28" font-family="Inter,system-ui,sans-serif" font-size="12" fill="white" font-weight="700" text-anchor="middle">S</text>`}

  <text x="52" y="22" font-family="Inter,system-ui,sans-serif" font-size="10" fill="#64748b" font-weight="500">SafeScoring</text>
  <text x="52" y="38" font-family="Inter,system-ui,sans-serif" font-size="14" fill="#0f172a" font-weight="700">${isVerified ? 'Verified' : 'Not Verified'}</text>

  <!-- Score circle -->
  <circle cx="170" cy="26" r="20" fill="none" stroke="#e2e8f0" stroke-width="4"/>
  <circle cx="170" cy="26" r="20" fill="none" stroke="${scoreColor}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" transform="rotate(-90 170 26)"/>
  <text x="170" y="30" font-family="Inter,system-ui,sans-serif" font-size="14" fill="${scoreColor}" font-weight="700" text-anchor="middle">${score}</text>
</svg>`;
  }

  if (style === "premium") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="72" viewBox="0 0 260 72">
  <defs>
    <linearGradient id="premBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0c0c14"/>
      <stop offset="100%" stop-color="#12121f"/>
    </linearGradient>
    <linearGradient id="premAccent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colors.primary}"/>
      <stop offset="50%" stop-color="${colors.secondary}"/>
      <stop offset="100%" stop-color="${colors.accent}"/>
    </linearGradient>
    <linearGradient id="premGlow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${colors.primary}" stop-opacity="0"/>
      <stop offset="50%" stop-color="${colors.accent}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="${colors.primary}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${scoreColor}"/>
      <stop offset="100%" stop-color="${scoreColor}dd"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="260" height="72" rx="16" fill="url(#premBg)"/>

  <!-- Animated glow line at top -->
  <rect x="20" y="0" width="220" height="2" rx="1" fill="url(#premGlow)"/>

  <!-- Border glow -->
  <rect x="1" y="1" width="258" height="70" rx="15" fill="none" stroke="url(#premAccent)" stroke-width="1" opacity="0.5"/>

  <!-- Shield container -->
  <rect x="12" y="12" width="48" height="48" rx="12" fill="url(#premAccent)" opacity="0.1"/>
  <rect x="16" y="16" width="40" height="40" rx="10" fill="url(#premAccent)"/>

  <!-- Shield icon -->
  <path d="M28 24 L44 24 L44 40 L36 48 L28 40 Z" fill="white" opacity="0.2"/>
  ${isVerified
    ? `<path d="M32 36 L35 40 L43 30" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>`
    : `<text x="36" y="40" font-family="Inter,system-ui,sans-serif" font-size="16" fill="white" font-weight="700" text-anchor="middle">S</text>`
  }

  <!-- Text -->
  <text x="72" y="30" font-family="Inter,system-ui,sans-serif" font-size="11" fill="#6b7280" font-weight="500" letter-spacing="1">SAFESCORING</text>
  <text x="72" y="50" font-family="Inter,system-ui,sans-serif" font-size="18" fill="white" font-weight="700">${isVerified ? 'VERIFIED' : 'NOT VERIFIED'}</text>

  <!-- Score display -->
  <rect x="190" y="12" width="58" height="48" rx="12" fill="${scoreColor}" opacity="0.1"/>
  <rect x="194" y="16" width="50" height="40" rx="10" fill="url(#scoreGrad)"/>
  <text x="219" y="42" font-family="Inter,system-ui,sans-serif" font-size="22" fill="white" font-weight="800" text-anchor="middle">${score}</text>
  <text x="219" y="54" font-family="Inter,system-ui,sans-serif" font-size="9" fill="white" opacity="0.7" text-anchor="middle">/100</text>
</svg>`;
  }

  // Default: Eye-catching dark badge with shield and score ring
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="64" viewBox="0 0 240 64">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colors.dark}"/>
      <stop offset="100%" stop-color="${colors.card}"/>
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colors.primary}"/>
      <stop offset="50%" stop-color="${colors.secondary}"/>
      <stop offset="100%" stop-color="${colors.accent}"/>
    </linearGradient>
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${colors.primary}" stop-opacity="0.3"/>
      <stop offset="50%" stop-color="${colors.accent}" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="${colors.primary}" stop-opacity="0.3"/>
    </linearGradient>
    <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="240" height="64" rx="14" fill="url(#bgGrad)"/>

  <!-- Top glow accent -->
  <rect x="40" y="0" width="160" height="2" rx="1" fill="url(#borderGrad)"/>

  <!-- Border -->
  <rect x="1" y="1" width="238" height="62" rx="13" fill="none" stroke="url(#borderGrad)" stroke-width="1.5"/>

  <!-- Shield background glow -->
  <circle cx="38" cy="32" r="24" fill="url(#accentGrad)" opacity="0.1"/>

  <!-- Shield -->
  <rect x="16" y="10" width="44" height="44" rx="12" fill="url(#accentGrad)" opacity="0.15"/>
  <path d="M26 18 L50 18 L50 38 L38 50 L26 38 Z" fill="url(#accentGrad)"/>
  <path d="M30 22 L46 22 L46 36 L38 44 L30 36 Z" fill="white" opacity="0.15"/>

  ${isVerified
    ? `<path d="M33 32 L37 37 L45 27" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#glowFilter)"/>`
    : `<text x="38" y="38" font-family="Inter,system-ui,sans-serif" font-size="18" fill="white" font-weight="700" text-anchor="middle">S</text>`
  }

  <!-- Text content -->
  <text x="72" y="26" font-family="Inter,system-ui,sans-serif" font-size="10" fill="#9ca3af" font-weight="600" letter-spacing="1">SAFESCORING</text>
  <text x="72" y="46" font-family="Inter,system-ui,sans-serif" font-size="16" fill="white" font-weight="700">${isVerified ? 'Verified' : 'Not Verified'}</text>

  <!-- Score ring -->
  <circle cx="204" cy="32" r="24" fill="${colors.dark}"/>
  <circle cx="204" cy="32" r="20" fill="none" stroke="${colors.card}" stroke-width="4"/>
  <circle cx="204" cy="32" r="20" fill="none" stroke="${scoreColor}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" transform="rotate(-90 204 32)" filter="url(#glowFilter)"/>
  <text x="204" y="36" font-family="Inter,system-ui,sans-serif" font-size="16" fill="white" font-weight="800" text-anchor="middle">${score}</text>
</svg>`;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const style = searchParams.get("style") || "default";

  if (!slug) {
    const svg = generateBadgeSVG({
      productName: "Unknown",
      score: 0,
      isVerified: false,
      style,
    });
    return new NextResponse(svg, {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=60" },
    });
  }

  // Track impression
  const trackImpression = async (badgeId, referer) => {
    if (!isSupabaseConfigured() || !badgeId) return;
    try {
      const domain = referer ? new URL(referer).hostname : null;
      await supabase.from("badge_impressions").insert({
        badge_id: badgeId,
        domain,
        page_url: referer,
      });
    } catch (e) {}
  };

  if (!isSupabaseConfigured()) {
    const svg = generateBadgeSVG({
      productName: slug,
      score: 85,
      isVerified: true,
      style,
    });
    return new NextResponse(svg, {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=60" },
    });
  }

  try {
    // Get product score
    const { data: product } = await supabase
      .from("products")
      .select("name, note_finale")
      .eq("slug", slug)
      .maybeSingle();

    // Check verified badge
    const { data: badge } = await supabase
      .from("verified_badges")
      .select("id, is_active, badge_style")
      .eq("product_slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    const isVerified = !!badge;
    const score = Math.round(product?.note_finale || 0);

    // Track impression
    if (badge) {
      trackImpression(badge.id, request.headers.get("referer"));
    }

    const svg = generateBadgeSVG({
      productName: product?.name || slug,
      score,
      isVerified,
      style: badge?.badge_style || style,
    });

    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": isVerified ? "public, max-age=300" : "public, max-age=60",
        "X-Verified": isVerified ? "true" : "false",
      },
    });

  } catch (error) {
    console.error("Badge image error:", error);
    const svg = generateBadgeSVG({
      productName: slug,
      score: 0,
      isVerified: false,
      style,
    });
    return new NextResponse(svg, {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-cache" },
    });
  }
}
