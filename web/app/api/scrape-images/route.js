import { NextResponse } from "next/server";
import { validateUrl } from "@/libs/url-validator";
import { quickProtect } from "@/libs/api-protection";
import { auth } from "@/libs/auth";

/**
 * API to scrape images from a product website
 * GET /api/scrape-images?url=https://example.com
 *
 * Restricted to authenticated users to prevent open proxy abuse.
 */
export async function GET(request) {
  // Rate limit: this endpoint makes external requests, protect against abuse
  const protection = await quickProtect(request, "sensitive");
  if (protection.blocked) return protection.response;

  // Require authentication — this endpoint acts as a proxy and must not be open
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL required" }, { status: 400 });
  }

  // SSRF Protection: Validate URL before making external request
  const validation = validateUrl(url, {
    allowHttp: true, // Allow HTTP for some older sites
    blockedDomains: ["internal", "corp", "local"], // Block internal domains
  });

  if (!validation.valid) {
    return NextResponse.json(
      { error: `Invalid URL: ${validation.error}` },
      { status: 400 }
    );
  }

  // Additional SSRF protection: only allow HTTP(S) schemes
  const parsedUrl = validation.url;
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return NextResponse.json(
      { error: "Only HTTP and HTTPS URLs are allowed" },
      { status: 400 }
    );
  }

  try {
    // Use Microlink to extract metadata and images
    const microlinkUrl = `https://api.microlink.io/?url=${encodeURIComponent(parsedUrl.toString())}&screenshots=true&video=true`;
    const response = await fetch(microlinkUrl, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error("Failed to fetch from Microlink");
    }

    const data = await response.json();

    if (data.status !== "success") {
      throw new Error("Microlink error");
    }

    const images = [];

    // OG image (main site image)
    if (data.data?.image?.url) {
      images.push({
        url: data.data.image.url,
        type: "og_image",
        label: "Main image (OG)",
        width: data.data.image.width,
        height: data.data.image.height,
      });
    }

    // Logo
    if (data.data?.logo?.url) {
      images.push({
        url: data.data.logo.url,
        type: "logo",
        label: "Logo",
      });
    }

    // Screenshot
    if (data.data?.screenshot?.url) {
      images.push({
        url: data.data.screenshot.url,
        type: "screenshot",
        label: "Site screenshot",
      });
    }

    // Video if available
    if (data.data?.video?.url) {
      images.push({
        url: data.data.video.url,
        type: "video",
        label: "Video",
      });
    }

    return NextResponse.json({
      success: true,
      title: data.data?.title,
      description: data.data?.description,
      images,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      images: [],
    }, { status: 200 });
  }
}
