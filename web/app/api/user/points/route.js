/**
 * API: /api/user/points
 * Gestion des points $SAFE
 */

import { createClient } from "@/libs/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { NextResponse } from "next/server";
import { applyUserRateLimit } from "@/libs/rate-limiters";

export const dynamic = "force-dynamic";

// GET: Récupérer ses points et stats
export async function GET(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = createClient();
    const userId = session.user.id;

    // Points et stats
    const { data: points } = await supabase
      .from("user_points")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Historique récent
    const { data: transactions } = await supabase
      .from("points_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    // Rang dans le leaderboard
    const { data: rank } = await supabase
      .from("points_leaderboard")
      .select("rank")
      .eq("user_id", userId)
      .single();

    // Vérifications récentes
    const { data: verifications } = await supabase
      .from("norm_verifications")
      .select(`
        id,
        agrees,
        points_earned,
        created_at,
        product:products(slug, name)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      points: points || { balance: 0, total_earned: 0, level: 1, verifications_count: 0 },
      rank: rank?.rank || null,
      transactions: transactions || [],
      verifications: verifications || [],
    });
  } catch (error) {
    console.error("Error fetching points:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
