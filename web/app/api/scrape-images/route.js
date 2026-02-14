import { NextResponse } from "next/server";
import { validateUrl } from "@/libs/url-validator";

// API pour scraper les images d'un site web de produit
// GET /api/scrape-images?url=https://example.com
export async function GET(request) {
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

  try {
    // Utiliser Microlink pour extraire les métadonnées et images
    const microlinkUrl = `https://api.microlink.io/?url=${encodeURIComponent(validation.url.toString())}&screenshots=true&video=true`;
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

    // Image OG (principale du site)
    if (data.data?.image?.url) {
      images.push({
        url: data.data.image.url,
        type: "og_image",
        label: "Image principale (OG)",
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

    // Screenshot du site
    if (data.data?.screenshot?.url) {
      images.push({
        url: data.data.screenshot.url,
        type: "screenshot",
        label: "Screenshot du site",
      });
    }

    // Vidéo si disponible
    if (data.data?.video?.url) {
      images.push({
        url: data.data.video.url,
        type: "video",
        label: "Vidéo",
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
      error: "Failed to scrape images",
      images: [],
    }, { status: 500 });
  }
}
