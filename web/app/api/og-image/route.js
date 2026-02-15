import { NextResponse } from "next/server";
import { quickProtect } from "@/libs/api-protection";

// Blocked hosts for SSRF prevention
const BLOCKED_HOSTS = new Set([
  "localhost", "127.0.0.1", "0.0.0.0", "::1",
  "metadata.google.internal", "metadata.google",
]);

/**
 * Validate URL to prevent SSRF attacks
 */
function isSafeUrl(url) {
  try {
    const parsed = new URL(url);

    // Only allow http/https
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block known dangerous hosts
    if (BLOCKED_HOSTS.has(hostname)) return false;

    // Block AWS/GCP/Azure metadata endpoints
    if (hostname.startsWith("169.254.")) return false;

    // Block private IP ranges
    const parts = hostname.split(".");
    if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
      const [a, b] = parts.map(Number);
      if (a === 10) return false; // 10.0.0.0/8
      if (a === 172 && b >= 16 && b <= 31) return false; // 172.16.0.0/12
      if (a === 192 && b === 168) return false; // 192.168.0.0/16
      if (a === 127) return false; // 127.0.0.0/8
      if (a === 0) return false; // 0.0.0.0/8
    }

    return true;
  } catch {
    return false;
  }
}

// API to fetch Open Graph images from a website
// GET /api/og-image?url=https://example.com
export async function GET(request) {
  // Rate limiting
  const protection = await quickProtect(request, "public");
  if (protection.blocked) return protection.response;

  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL required" }, { status: 400 });
  }

  // SSRF protection
  if (!isSafeUrl(url)) {
    return NextResponse.json(
      { error: "Invalid or blocked URL" },
      { status: 400 }
    );
  }

  try {
    const microlinkUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}`;
    const response = await fetch(microlinkUrl, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 }, // Cache 24h
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      throw new Error("Failed to fetch metadata");
    }

    const data = await response.json();

    if (data.status !== "success") {
      throw new Error("Microlink error");
    }

    // Priority: og:image > logo > screenshot
    const ogImage = data.data?.image?.url;
    const logo = data.data?.logo?.url;
    const screenshot = data.data?.screenshot?.url;

    return NextResponse.json(
      {
        ogImage,
        logo,
        screenshot,
        title: data.data?.title,
        description: data.data?.description,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch OG data",
        ogImage: null,
        screenshot: null,
      },
      { status: 200 }
    ); // Return 200 to not break the UI
  }
}
