import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";
import { auth } from "@/libs/auth";
import {
  protectAuthenticatedRequest,
  sleep,
  calculatePublicDelay,
} from "@/libs/user-protection";

// Cache pendant 5 minutes (les types de produits changent rarement)
export const revalidate = 300;

// GET /api/product-types - Get all product types with product counts
export async function GET(request) {
  try {
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
          "/api/product-types",
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
              headers: { "Retry-After": String(userProtection.retryAfter || 60) },
            }
          );
        }

        // Apply artificial delay for authenticated users
        if (userProtection.delay > 0) {
          await sleep(userProtection.delay);
        }
      }
    } catch (_e) {
      // Auth failed, continue as unauthenticated
    }

    // Rate limiting for unauthenticated requests
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
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const { data: types, error } = await supabase
      .from("product_types")
      .select(`
        id,
        code,
        name,
        category,
        definition,
        is_hardware,
        is_custodial,
        products (count)
      `)
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch product types" },
        { status: 500 }
      );
    }

    if (!types) {
      return NextResponse.json({ types: [], categories: [], total: 0 });
    }

    const typesByCategory = {};
    const allTypes = [];

    for (const type of types) {
      const productCount = type.products?.[0]?.count || 0;

      const typeData = {
        id: type.id,
        code: type.code,
        name: type.name,
        category: type.category || "Other",
        definition: type.definition || null,
        isHardware: type.is_hardware,
        isCustodial: type.is_custodial,
        productCount,
      };

      allTypes.push(typeData);

      const cat = type.category || "Other";
      if (!typesByCategory[cat]) {
        typesByCategory[cat] = [];
      }
      typesByCategory[cat].push(typeData);
    }

    const categories = Object.keys(typesByCategory).sort();

    return NextResponse.json(
      { types: allTypes, typesByCategory, categories, total: allTypes.length },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
