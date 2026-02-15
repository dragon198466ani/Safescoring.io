import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";

export const dynamic = "force-dynamic";

// GET /api/favorites - Get user's favorites
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ favorites: [] });
    }

    const { data: favorites, error } = await supabaseAdmin
      .from("user_favorites")
      .select("id, product_id, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      // Table might not exist yet — return empty
      console.error("Favorites fetch error:", error);
      return NextResponse.json({ favorites: [] });
    }

    if (!favorites || favorites.length === 0) {
      return NextResponse.json({ favorites: [] });
    }

    // Get product details for favorites
    const productIds = favorites.map((f) => f.product_id);
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("id, name, slug, url, type_id")
      .in("id", productIds);

    // Get scores
    const { data: scores } = await supabaseAdmin
      .from("safe_scoring_results")
      .select("product_id, note_finale")
      .in("product_id", productIds);

    // Get types
    const typeIds = [...new Set((products || []).map((p) => p.type_id).filter(Boolean))];
    const { data: types } = typeIds.length > 0
      ? await supabaseAdmin.from("product_types").select("id, name").in("id", typeIds)
      : { data: [] };

    const productsMap = {};
    (products || []).forEach((p) => { productsMap[p.id] = p; });
    const scoresMap = {};
    (scores || []).forEach((s) => { scoresMap[s.product_id] = Math.round(s.note_finale || 0); });
    const typesMap = {};
    (types || []).forEach((t) => { typesMap[t.id] = t.name; });

    const getLogoUrl = (url) => {
      if (!url) return null;
      try {
        const domain = new URL(url).hostname;
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      } catch { return null; }
    };

    const enrichedFavorites = favorites
      .map((f) => {
        const product = productsMap[f.product_id];
        if (!product) return null;
        return {
          id: f.id,
          productId: f.product_id,
          createdAt: f.created_at,
          name: product.name,
          slug: product.slug,
          logoUrl: getLogoUrl(product.url),
          type: typesMap[product.type_id] || "Product",
          score: scoresMap[f.product_id] || 0,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ favorites: enrichedFavorites });
  } catch (error) {
    console.error("Favorites GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/favorites - Add a product to favorites
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 });
    }

    // Upsert — ignore if already exists
    const { data, error } = await supabaseAdmin
      .from("user_favorites")
      .upsert(
        { user_id: session.user.id, product_id: productId },
        { onConflict: "user_id,product_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("Favorites POST error:", error);
      return NextResponse.json({ error: "Failed to add favorite" }, { status: 500 });
    }

    return NextResponse.json({ success: true, favorite: data });
  } catch (error) {
    console.error("Favorites POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/favorites - Remove a product from favorites
export async function DELETE(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("user_favorites")
      .delete()
      .eq("user_id", session.user.id)
      .eq("product_id", productId);

    if (error) {
      console.error("Favorites DELETE error:", error);
      return NextResponse.json({ error: "Failed to remove favorite" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Favorites DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
