import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

/**
 * GET /api/products/[slug]/sources
 * Fetches all sources and social links for a product
 */
export async function GET(request, { params }) {
  const { slug } = await params;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    // Get product with social_links
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, social_links, url, github_repo, defillama_slug, coingecko_id")
      .eq("slug", slug)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Fetch stored sources
    const { data: storedSources, error: sourcesError } = await supabase
      .from("product_sources")
      .select("*")
      .eq("product_id", product.id)
      .eq("is_active", true)
      .order("is_official", { ascending: false })
      .order("display_order");

    // Build sources list
    const sources = storedSources || [];

    // Add social_links if not already in sources
    if (product.social_links) {
      const socialLinks = product.social_links;
      const existingUrls = new Set(sources.map((s) => s.url));

      Object.entries(socialLinks).forEach(([key, url]) => {
        if (url && !existingUrls.has(url)) {
          const sourceType = mapSocialKeyToType(key);
          sources.push({
            source_type: sourceType,
            url,
            is_official: true,
            is_verified: true,
            title: null,
          });
        }
      });
    }

    // Add website if not in sources
    if (product.url && !sources.some((s) => s.url === product.url)) {
      sources.unshift({
        source_type: "official_website",
        url: product.url,
        is_official: true,
        is_verified: true,
        title: "Official Website",
      });
    }

    // Add GitHub if available
    if (product.github_repo && !sources.some((s) => s.source_type === "github")) {
      const githubUrl = product.github_repo.startsWith("http")
        ? product.github_repo
        : `https://github.com/${product.github_repo}`;
      sources.push({
        source_type: "github",
        url: githubUrl,
        is_official: true,
        is_verified: true,
        title: "GitHub Repository",
      });
    }

    // Add DefiLlama if available
    if (product.defillama_slug) {
      sources.push({
        source_type: "other",
        url: `https://defillama.com/protocol/${product.defillama_slug}`,
        is_official: false,
        is_verified: true,
        title: "DefiLlama",
        metadata: { provider: "defillama" },
      });
    }

    // Add CoinGecko if available
    if (product.coingecko_id) {
      sources.push({
        source_type: "other",
        url: `https://www.coingecko.com/en/coins/${product.coingecko_id}`,
        is_official: false,
        is_verified: true,
        title: "CoinGecko",
        metadata: { provider: "coingecko" },
      });
    }

    return NextResponse.json({
      sources,
      total: sources.length,
    });
  } catch (error) {
    console.error("[API] Sources error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Map social_links keys to source_type values
 */
function mapSocialKeyToType(key) {
  const mapping = {
    twitter: "twitter",
    x: "twitter",
    discord: "discord",
    telegram: "telegram",
    reddit: "reddit",
    github: "github",
    docs: "documentation",
    documentation: "documentation",
    blog: "blog",
    medium: "medium",
    youtube: "youtube",
    website: "official_website",
    forum: "forum",
  };
  return mapping[key.toLowerCase()] || "other";
}
