import { NextResponse } from "next/server";

// API pour récupérer l'image Open Graph d'un site web
// GET /api/og-image?url=https://example.com
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL required" }, { status: 400 });
  }

  try {
    // Utiliser Microlink pour récupérer les métadonnées (og:image, screenshot, etc.)
    const microlinkUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}`;
    const response = await fetch(microlinkUrl, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 86400 } // Cache 24h
    });

    if (!response.ok) {
      throw new Error("Failed to fetch metadata");
    }

    const data = await response.json();

    if (data.status !== "success") {
      throw new Error("Microlink error");
    }

    // Priorité: og:image > logo > screenshot
    const ogImage = data.data?.image?.url;
    const logo = data.data?.logo?.url;
    const screenshot = data.data?.screenshot?.url;

    return NextResponse.json({
      ogImage,
      logo,
      screenshot,
      title: data.data?.title,
      description: data.data?.description
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800"
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: "Failed to fetch OG data",
      ogImage: null,
      screenshot: null
    }, { status: 200 }); // Return 200 to not break the UI
  }
}
