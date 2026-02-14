import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { quickProtect, getClientId } from "@/libs/api-protection";
import { auth } from "@/libs/auth";
import {
  protectAuthenticatedRequest,
  getDataLimitForUser,
  sleep,
  calculatePublicDelay,
} from "@/libs/user-protection";

// Cache pendant 60 secondes, revalide en arrière-plan
export const revalidate = 60;

// GET /api/products - Get all products with scores (Full, Consumer, Essential)
export async function GET(request) {
  try {
    // Check authentication first
    let session = null;
    let userLimits = { products: 5 }; // Default for unauthenticated
    let isAuthenticated = false;
    let isPaid = false;

    try {
      session = await auth();
      if (session?.user?.id) {
        isAuthenticated = true;
        isPaid = session.user.hasAccess || false;

        // Check user-level rate limiting and scraping detection
        const userProtection = await protectAuthenticatedRequest(
          session.user.id,
          "/api/products",
          { isPaid }
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
              headers: {
                "Retry-After": String(userProtection.retryAfter || 60),
              },
            }
          );
        }

        // Get limits based on user trust score
        userLimits = getDataLimitForUser(session.user);

        // Apply artificial delay for authenticated users (based on trust score)
        if (userProtection.delay > 0) {
          await sleep(userProtection.delay);
        }
      }
    } catch (_e) {
      // Auth failed, continue as unauthenticated
    }

    // IP-level protection for unauthenticated requests
    if (!isAuthenticated) {
      const protection = await quickProtect(request, "public");
      if (protection.blocked) {
        return protection.response;
      }

      // Apply artificial delay for unauthenticated users (slows scrapers)
      const publicDelay = calculatePublicDelay(protection.clientId, false);
      await sleep(publicDelay);
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const typeCode = searchParams.get("type");
    const search = searchParams.get("search")?.trim();
    const sort = searchParams.get("sort") || "score-desc";
    const scoreType = searchParams.get("scoreType") || "full";

    // PROTECTION: Apply limits based on authentication and trust
    const requestedLimit = parseInt(searchParams.get("limit")) || 100;
    const maxLimit = userLimits.products;
    const limit = Math.min(requestedLimit, maxLimit);

    // Offset also limited to prevent pagination scraping
    const maxOffset = isAuthenticated ? (isPaid ? 500 : 50) : 5;
    const offset = Math.min(parseInt(searchParams.get("offset")) || 0, maxOffset);

    // Optimisation: Utiliser une vue matérialisée ou une requête plus efficace
    // Sélectionner uniquement les colonnes nécessaires
    let query = supabase
      .from("products")
      .select(`
        id,
        name,
        slug,
        url,
        type_id,
        media,
        product_types!inner (
          code,
          name,
          category,
          is_hardware,
          is_custodial
        ),
        product_type_mapping (
          is_primary,
          product_types (
            code,
            name,
            category,
            is_hardware
          )
        ),
        safe_scoring_results (
          note_finale,
          score_s,
          score_a,
          score_f,
          score_e,
          note_consumer,
          s_consumer,
          a_consumer,
          f_consumer,
          e_consumer,
          note_essential,
          s_essential,
          a_essential,
          f_essential,
          e_essential,
          total_norms_evaluated,
          total_yes,
          total_no,
          total_na,
          calculated_at
        )
      `, { count: "exact" });

    // Filtrage côté serveur (plus efficace)
    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    // Filtrer par catégorie via la relation (inner join permet ça)
    if (category && category !== "all") {
      query = query.eq("product_types.category", category);
    }

    // Filtrer par type de produit
    if (typeCode && typeCode !== "all") {
      query = query.eq("product_types.code", typeCode);
    }

    // Tri de base par nom (le tri par score sera fait après transformation)
    if (sort === "name-asc") {
      query = query.order("name", { ascending: true });
    } else if (sort === "name-desc") {
      query = query.order("name", { ascending: false });
    } else {
      query = query.order("name", { ascending: true });
    }

    // Apply database-level pagination for name-based sorts (no post-processing needed)
    const useDbPagination = sort === "name-asc" || sort === "name-desc";
    if (useDbPagination) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data: products, error, count: dbCount } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch products" },
        { status: 500 }
      );
    }

    if (!products) {
      return NextResponse.json({ products: [], total: 0 });
    }

    // Helper pour extraire le domaine et générer l'URL du logo HD
    const getLogoUrl = (url) => {
      if (!url) return null;
      try {
        const domain = new URL(url).hostname.replace('www.', '');
        return `https://logo.clearbit.com/${domain}`;
      } catch {
        return null;
      }
    };

    // Fallback: Google Favicon (marche pour tous les sites)
    const getFaviconUrl = (url) => {
      if (!url) return null;
      try {
        const domain = new URL(url).hostname;
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      } catch {
        return null;
      }
    };

    // Transformation optimisée avec gestion null sécurisée
    const transformedProducts = products.map((product) => {
      const ssr = product.safe_scoring_results;
      const pt = product.product_types;
      const ptm = product.product_type_mapping || [];

      // Logo: Google Favicon (fiable) en priorité, Clearbit en bonus
      const faviconUrl = getFaviconUrl(product.url);
      const clearbitUrl = getLogoUrl(product.url);

      // Get all types from product_type_mapping, sorted by is_primary
      const allTypes = ptm
        .filter((m) => m.product_types)
        .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
        .map((m) => ({
          code: m.product_types.code,
          name: m.product_types.name,
          category: m.product_types.category,
          isHardware: m.product_types.is_hardware,
          isPrimary: m.is_primary,
        }));

      // Use primary type from mapping if available, fallback to product_types
      const primaryType = allTypes.find((t) => t.isPrimary) || allTypes[0];

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        logoUrl: faviconUrl,
        fallbackUrl: clearbitUrl,
        media: product.media || [],
        type: primaryType?.name || pt?.name || "Unknown",
        typeCode: primaryType?.code || pt?.code || "unknown",
        types: allTypes.length > 0 ? allTypes : (pt ? [{
          code: pt.code,
          name: pt.name,
          category: pt.category,
          isHardware: pt.is_hardware,
          isPrimary: true,
        }] : []),
        category: primaryType?.category || pt?.category || "other",
        isHardware: primaryType?.isHardware ?? pt?.is_hardware ?? null,
        isCustodial: pt?.is_custodial ?? null,
        scores: {
          total: ssr?.note_finale ?? null,
          s: ssr?.score_s ?? null,
          a: ssr?.score_a ?? null,
          f: ssr?.score_f ?? null,
          e: ssr?.score_e ?? null,
        },
        consumerScores: {
          total: ssr?.note_consumer ?? null,
          s: ssr?.s_consumer ?? null,
          a: ssr?.a_consumer ?? null,
          f: ssr?.f_consumer ?? null,
          e: ssr?.e_consumer ?? null,
        },
        essentialScores: {
          total: ssr?.note_essential ?? null,
          s: ssr?.s_essential ?? null,
          a: ssr?.a_essential ?? null,
          f: ssr?.f_essential ?? null,
          e: ssr?.e_essential ?? null,
        },
        stats: {
          totalNorms: ssr?.total_norms_evaluated ?? 0,
          yes: ssr?.total_yes ?? 0,
          no: ssr?.total_no ?? 0,
          na: ssr?.total_na ?? 0,
        },
        verified: ssr?.note_finale != null,
        lastUpdate: ssr?.calculated_at || null,
      };
    });

    // Tri par score (optimisé)
    if (sort === "score-desc" || sort === "score-asc" || sort === "recent") {
      const ascending = sort === "score-asc";

      transformedProducts.sort((a, b) => {
        if (sort === "recent") {
          const dateA = a.lastUpdate ? new Date(a.lastUpdate).getTime() : 0;
          const dateB = b.lastUpdate ? new Date(b.lastUpdate).getTime() : 0;
          return dateB - dateA;
        }

        let scoreA, scoreB;
        if (scoreType === "consumer") {
          scoreA = a.consumerScores?.total ?? -1;
          scoreB = b.consumerScores?.total ?? -1;
        } else if (scoreType === "essential") {
          scoreA = a.essentialScores?.total ?? -1;
          scoreB = b.essentialScores?.total ?? -1;
        } else {
          scoreA = a.scores?.total ?? -1;
          scoreB = b.scores?.total ?? -1;
        }

        // Produits sans score à la fin
        if (scoreA === null || scoreA === -1) return 1;
        if (scoreB === null || scoreB === -1) return -1;

        return ascending ? scoreA - scoreB : scoreB - scoreA;
      });
    }

    // Pagination: use DB-level result if available, otherwise fallback to in-memory
    const total = useDbPagination ? (dbCount ?? transformedProducts.length) : transformedProducts.length;
    const paginatedProducts = useDbPagination
      ? transformedProducts
      : transformedProducts.slice(offset, offset + limit);

    // Generate watermark for tracking copied data
    const clientId = getClientId(request);
    const watermark = {
      _ss: Buffer.from(JSON.stringify({
        t: Date.now(),
        c: clientId.substring(0, 12),
      })).toString("base64"),
    };

    // Build response metadata
    const responseData = {
      products: paginatedProducts,
      total,
      _limited: paginatedProducts.length >= limit,
      _maxAllowed: maxLimit,
      ...watermark,
    };

    // Add upgrade message for non-paid users
    if (!isPaid) {
      responseData._upgrade = isAuthenticated
        ? "Upgrade to Professional for unlimited access"
        : "Create a free account to see more products";
    }

    // Headers de cache pour le navigateur + anti-scraping
    return NextResponse.json(responseData, {
      headers: {
        "Cache-Control": isAuthenticated
          ? "private, max-age=30"
          : "public, s-maxage=60, stale-while-revalidate=300",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
