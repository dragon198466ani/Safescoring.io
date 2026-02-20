/**
 * API: /api/shop
 * Boutique $SAFE - Liste et achats
 */

import { supabase } from "@/libs/supabase";
import { auth } from "@/libs/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET: Liste des items de la boutique
export async function GET(request) {
  try {
    const session = await auth();

    // Items disponibles
    const { data: items } = await supabase
      .from("shop_items")
      .select("*")
      .eq("is_active", true)
      .order("price_safe", { ascending: true });

    // Si connecté, récupérer ses achats et badges
    let userItems = [];
    let userBadges = [];
    let balance = 0;

    if (session?.user?.id) {
      const userId = session.user.id;

      const [itemsRes, badgesRes, pointsRes] = await Promise.all([
        supabase
          .from("user_active_items")
          .select("*")
          .eq("user_id", userId),
        supabase
          .from("user_badges")
          .select("*")
          .eq("user_id", userId),
        supabase
          .from("user_points")
          .select("balance")
          .eq("user_id", userId)
          .single(),
      ]);

      userItems = itemsRes.data || [];
      userBadges = badgesRes.data || [];
      balance = pointsRes.data?.balance || 0;
    }

    // Grouper par catégorie
    const grouped = {
      premium: items?.filter(i => i.category === "premium") || [],
      badge: items?.filter(i => i.category === "badge") || [],
      feature: items?.filter(i => i.category === "feature") || [],
    };

    return NextResponse.json({
      items: grouped,
      userItems,
      userBadges,
      balance,
    });
  } catch (error) {
    console.error("Error fetching shop:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Acheter un item
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { itemId } = await request.json();
    if (!itemId) {
      return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
    }

    // Appeler la fonction d'achat
    const { data, error } = await supabase.rpc("purchase_item", {
      p_user_id: session.user.id,
      p_item_id: itemId,
    });

    if (error) {
      console.error("Purchase error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error purchasing:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
