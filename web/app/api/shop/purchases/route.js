/**
 * API: /api/shop/purchases
 * Get user's purchased content items
 */

import { supabase } from "@/libs/supabase";
import { auth } from "@/libs/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!supabase) {
      return NextResponse.json({ purchases: [] });
    }

    const { data, error } = await supabase
      .from("user_active_items")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching purchases:", error);
      return NextResponse.json({ purchases: [] });
    }

    return NextResponse.json({ purchases: data || [] });
  } catch (error) {
    console.error("Error fetching purchases:", error);
    return NextResponse.json({ purchases: [] });
  }
}
