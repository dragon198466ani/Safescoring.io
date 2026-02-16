import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";

/**
 * SafeScore Badge API
 * Returns an SVG badge that can be embedded on any website.
 *
 * Usage:
 * <img src="https://safescoring.io/api/badge/ledger-nano-x" alt="SafeScore" />
 *
 * Options (query params):
 * - style: "flat" | "rounded" | "minimal" (default: "rounded")
 * - theme: "dark" | "light" (default: "dark")
 */

export async function GET(request, { params }) {
  // Rate limit: public embeddable endpoint, protect against abuse
  const protection = await quickProtect(request, "public");
  if (protection.blocked) return protection.response;
  const { slug } = await params;
  const { searchParams } = new URL(request.url);

  const style = searchParams.get("style") || "rounded";
  const theme = searchParams.get("theme") || "dark";

  // Default badge for unconfigured or not found
  let productName = "Unknown";
  let score = 0;
  let verified = false;

  if (isSupabaseConfigured()) {
    // Fetch product
    const { data: product } = await supabase
      .from("products")
      .select("id, name")
      .eq("slug", slug)
      .maybeSingle();

    if (product) {
      productName = product.name;

      // Fetch score
      const { data: scoreData } = await supabase
        .from("safe_scoring_results")
        .select("note_finale")
        .eq("product_id", product.id)
        .order("calculated_at", { ascending: false })
        .limit(1);

      if (scoreData?.[0]?.note_finale) {
        score = Math.round(scoreData[0].note_finale);
        verified = true;
      }
    }
  }

  // Generate SVG
  const svg = generateBadgeSVG({
    productName,
    score,
    verified,
    style,
    theme,
  });

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

function generateBadgeSVG({ productName, score, verified, style, theme }) {
  // Colors based on score
  const getScoreColor = (s) => {
    if (s >= 80) return "#22c55e"; // green
    if (s >= 60) return "#f59e0b"; // amber
    return "#ef4444"; // red
  };

  const scoreColor = getScoreColor(score);

  // Theme colors
  const colors = theme === "light"
    ? { bg: "#f8fafc", text: "#1e293b", muted: "#64748b", border: "#e2e8f0" }
    : { bg: "#1e293b", text: "#f8fafc", muted: "#94a3b8", border: "#334155" };

  // Badge dimensions
  const width = style === "minimal" ? 100 : 200;
  const height = style === "minimal" ? 30 : 50;
  const borderRadius = style === "flat" ? 0 : style === "minimal" ? 4 : 8;

  // Attribution comment included in all SVG badges
  const attribution = `
  <!-- SafeScoring Badge — https://safescoring.io -->
  <!-- Score reflects SafeScoring's evaluation methodology. Not financial or security advice. -->
  <!-- Terms of use: https://safescoring.io/tos — Do not alter or misrepresent this badge. -->`;

  if (style === "minimal") {
    // Minimal style: just score
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${attribution}
  <rect width="100%" height="100%" fill="${colors.bg}" rx="${borderRadius}" stroke="${colors.border}" stroke-width="1"/>
  <text x="10" y="20" font-family="system-ui, sans-serif" font-size="12" fill="${colors.muted}">SafeScore</text>
  <text x="75" y="21" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" fill="${scoreColor}">${score}</text>
</svg>`;
  }

  // Standard badge
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${attribution}
  <defs>
    <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.bg};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${theme === 'light' ? '#e2e8f0' : '#0f172a'};stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="100%" height="100%" fill="url(#bg-gradient)" rx="${borderRadius}" stroke="${colors.border}" stroke-width="1"/>

  <!-- Logo area -->
  <rect x="6" y="6" width="38" height="38" rx="6" fill="${colors.border}" />
  <text x="25" y="30" font-family="system-ui, sans-serif" font-size="10" font-weight="bold" fill="${colors.text}" text-anchor="middle">SAFE</text>

  <!-- Product name -->
  <text x="52" y="18" font-family="system-ui, sans-serif" font-size="11" fill="${colors.muted}">
    ${productName.length > 18 ? productName.substring(0, 16) + "..." : productName}
  </text>

  <!-- Score -->
  <text x="52" y="36" font-family="system-ui, sans-serif" font-size="18" font-weight="bold" fill="${scoreColor}">
    ${score}
    <tspan font-size="10" fill="${colors.muted}">/100</tspan>
  </text>

  <!-- Verified badge -->
  ${verified ? `
  <circle cx="185" cy="25" r="10" fill="${scoreColor}" fill-opacity="0.2"/>
  <text x="185" y="29" font-family="system-ui, sans-serif" font-size="12" fill="${scoreColor}" text-anchor="middle">✓</text>
  ` : ''}

  <!-- Link hint -->
  <text x="${width - 10}" y="${height - 6}" font-family="system-ui, sans-serif" font-size="7" fill="${colors.muted}" text-anchor="end">safescoring.io</text>
</svg>`;
}
