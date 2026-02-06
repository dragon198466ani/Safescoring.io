import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";
import { auth } from "@/libs/auth";
import {
  protectAuthenticatedRequest,
  sleep,
  calculatePublicDelay,
} from "@/libs/user-protection";

/**
 * Community Stats API
 *
 * Fetches community data from legal sources:
 * - DefiLlama (FREE API) for TVL and protocol stats
 * - GitHub API (FREE) for development activity
 *
 * @see https://defillama.com/docs/api
 */

// Cache for 1 hour
export const revalidate = 3600;

export async function GET(request, { params }) {
  try {
    const { slug } = await params;

    // Check authentication first
    let isAuthenticated = false;
    let isPaid = false;

    try {
      const session = await auth();
      if (session?.user?.id) {
        isAuthenticated = true;
        isPaid = session.user.hasAccess || false;

        // Check user-level rate limiting
        const userProtection = await protectAuthenticatedRequest(
          session.user.id,
          `/api/community-stats/${slug}`,
          { isPaid, productSlug: slug }
        );

        if (!userProtection.allowed) {
          return NextResponse.json(
            {
              error: userProtection.message,
              reason: userProtection.reason,
              retryAfter: userProtection.retryAfter,
            },
            {
              status: userProtection.status,
              headers: { "Retry-After": String(userProtection.retryAfter || 60) },
            }
          );
        }

        // Apply artificial delay for authenticated users
        if (userProtection.delay > 0) {
          await sleep(userProtection.delay);
        }
      }
    } catch (e) {
      // Auth failed, continue as unauthenticated
    }

    // IP-level protection for unauthenticated requests
    if (!isAuthenticated) {
      const protection = await quickProtect(request, "public");
      if (protection.blocked) {
        return protection.response;
      }

      // Apply artificial delay for unauthenticated users
      const publicDelay = calculatePublicDelay(protection.clientId, false);
      await sleep(publicDelay);
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Get product info
    const { data: product } = await supabase
      .from("products")
      .select("id, name, url, social_links, verified")
      .eq("slug", slug)
      .maybeSingle();

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const stats = {
      productName: product.name,
      defillama: null,
      github: null,
      links: {},
    };

    // Extract social_links from product
    const socialLinks = product.social_links || {};

    // 1. Try to fetch DefiLlama data
    const defillamaData = await fetchDefiLlamaData(product.name, slug);
    if (defillamaData) {
      stats.defillama = defillamaData;
    }

    // 2. Try to fetch GitHub stats if we have a GitHub URL
    const githubUrl = socialLinks.github || findGitHubUrl(product.url, product.name);
    if (githubUrl) {
      const githubData = await fetchGitHubStats(githubUrl);
      if (githubData) {
        stats.github = githubData;
        stats.links.github = githubUrl;
      }
    }

    // 3. Add community links
    if (socialLinks.twitter) stats.links.twitter = socialLinks.twitter;
    if (socialLinks.discord) stats.links.discord = socialLinks.discord;
    if (socialLinks.telegram) stats.links.telegram = socialLinks.telegram;
    if (socialLinks.docs) stats.links.docs = socialLinks.docs;

    // Add website
    if (product.url) {
      stats.links.website = product.url;
    }

    return NextResponse.json({
      ...stats,
      verified: product.verified || false,
      source: "DefiLlama, GitHub",
      attribution: "Data from DefiLlama (defillama.com) and GitHub",
    });

  } catch (error) {
    console.error("Community Stats API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Fetch data from DefiLlama API (FREE)
async function fetchDefiLlamaData(productName, slug) {
  try {
    // Try to find protocol by name/slug
    const searchTerms = [
      slug,
      slug.replace(/-/g, ""),
      productName.toLowerCase().replace(/\s+/g, "-"),
      productName.toLowerCase().replace(/\s+/g, ""),
    ];

    // First, get list of all protocols
    const protocolsResponse = await fetch("https://api.llama.fi/protocols", {
      next: { revalidate: 3600 },
    });

    if (!protocolsResponse.ok) return null;

    const protocols = await protocolsResponse.json();

    // Find matching protocol
    const protocol = protocols.find(p => {
      const pSlug = p.slug?.toLowerCase();
      const pName = p.name?.toLowerCase().replace(/\s+/g, "");
      return searchTerms.some(term =>
        pSlug === term ||
        pName === term ||
        pSlug?.includes(term) ||
        pName?.includes(term)
      );
    });

    if (!protocol) return null;

    // Format TVL
    const formatTVL = (value) => {
      if (!value) return "N/A";
      if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
      if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
      if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
      return `$${value.toFixed(2)}`;
    };

    return {
      name: protocol.name,
      tvl: formatTVL(protocol.tvl),
      tvlRaw: protocol.tvl,
      change24h: protocol.change_1d?.toFixed(2),
      change7d: protocol.change_7d?.toFixed(2),
      category: protocol.category,
      chains: protocol.chains?.slice(0, 5) || [],
      logo: protocol.logo,
      url: `https://defillama.com/protocol/${protocol.slug}`,
    };
  } catch (error) {
    console.error("DefiLlama fetch error:", error);
    return null;
  }
}

// Fetch GitHub stats (FREE API)
async function fetchGitHubStats(githubUrl) {
  try {
    // Extract owner/repo from GitHub URL
    const match = githubUrl.match(/github\.com\/([^/]+)(?:\/([^/]+))?/);
    if (!match) return null;

    const owner = match[1];
    const repo = match[2];

    // Validate owner/repo to prevent path traversal
    const safePattern = /^[a-zA-Z0-9\-_.]+$/;
    if (!safePattern.test(owner) || (repo && !safePattern.test(repo))) return null;

    let repoData = null;

    if (repo) {
      // Fetch specific repo
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "SafeScoring",
        },
        next: { revalidate: 3600 },
      });

      if (response.ok) {
        repoData = await response.json();
      }
    } else {
      // Fetch user/org's top repo
      const response = await fetch(`https://api.github.com/users/${owner}/repos?sort=stars&per_page=1`, {
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "SafeScoring",
        },
        next: { revalidate: 3600 },
      });

      if (response.ok) {
        const repos = await response.json();
        if (repos.length > 0) {
          repoData = repos[0];
        }
      }
    }

    if (!repoData) return null;

    // Calculate activity level
    const lastPush = new Date(repoData.pushed_at);
    const daysSinceUpdate = Math.floor((Date.now() - lastPush) / (1000 * 60 * 60 * 24));

    let activityLevel = "inactive";
    if (daysSinceUpdate <= 7) activityLevel = "very active";
    else if (daysSinceUpdate <= 30) activityLevel = "active";
    else if (daysSinceUpdate <= 90) activityLevel = "moderate";

    return {
      name: repoData.full_name,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      watchers: repoData.watchers_count,
      openIssues: repoData.open_issues_count,
      language: repoData.language,
      lastUpdate: repoData.pushed_at,
      daysSinceUpdate,
      activityLevel,
      url: repoData.html_url,
    };
  } catch (error) {
    console.error("GitHub fetch error:", error);
    return null;
  }
}

// Try to find GitHub URL from product info
function findGitHubUrl(productUrl, productName) {
  // Common GitHub URL patterns for crypto projects
  const cleanName = productName.toLowerCase().replace(/\s+/g, "");
  return `https://github.com/${cleanName}`;
}
