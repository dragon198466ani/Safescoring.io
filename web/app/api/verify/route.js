/**
 * API: /api/verify
 * Soumettre une vérification de norme
 */

import { supabase } from "@/libs/supabase";
import { auth } from "@/libs/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST: Soumettre une vérification
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { productId, normId, agrees, suggestedValue, reason, evidenceUrl } = body;

    if (!productId || !normId || agrees === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const userId = session.user.id;

    // Appeler la fonction SQL
    const { data, error } = await supabase.rpc("submit_verification", {
      p_user_id: userId,
      p_product_id: productId,
      p_norm_id: normId,
      p_agrees: agrees,
      p_suggested_value: suggestedValue || null,
      p_reason: reason || null,
      p_evidence_url: evidenceUrl || null,
    });

    if (error) {
      console.error("Verification error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error submitting verification:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET: Stats de vérification d'un produit
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({ error: "Missing productId" }, { status: 400 });
    }

    // Stats du produit
    const { data: stats } = await supabase
      .from("product_verification_stats")
      .select("*")
      .eq("product_id", productId)
      .single();

    // Dernières vérifications
    const { data: recent } = await supabase
      .from("norm_verifications")
      .select(`
        agrees,
        created_at,
        user:profiles(name, avatar_url)
      `)
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(5);

    return NextResponse.json({
      stats: stats || { total_verifications: 0, unique_verifiers: 0, agreement_rate: 0 },
      recent: recent || [],
    });
  } catch (error) {
    console.error("Error fetching verification stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
