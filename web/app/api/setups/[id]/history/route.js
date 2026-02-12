import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Get setup with ownership check
    const { data: setup, error: setupError } = await supabaseAdmin
      .from("user_setups")
      .select("id, products")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

    if (setupError || !setup) {
      return NextResponse.json({ error: "Setup not found" }, { status: 404 });
    }

    // Extract product IDs
    const productIds = (setup.products || [])
      .map((p) => (typeof p === "object" ? p.id || p.product_id : p))
      .filter(Boolean);

    if (productIds.length === 0) {
      return NextResponse.json({ history: [] });
    }

    // Fetch recent score history for setup products
    const { data: history, error: histError } = await supabaseAdmin
      .from("score_history")
      .select("id, product_id, safe_score, score_s, score_a, score_f, score_e, score_change, change_reason, recorded_at")
      .in("product_id", productIds)
      .order("recorded_at", { ascending: false })
      .limit(100);

    if (histError) throw histError;

    // Get product names for display
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("id, name, slug")
      .in("id", productIds);

    const productMap = {};
    (products || []).forEach((p) => {
      productMap[p.id] = { name: p.name, slug: p.slug };
    });

    // Enrich history with product names
    const enriched = (history || []).map((h) => ({
      ...h,
      product_name: productMap[h.product_id]?.name || "Unknown",
      product_slug: productMap[h.product_id]?.slug || "",
    }));

    return NextResponse.json({ history: enriched });
  } catch (error) {
    console.error("Setup history error:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
