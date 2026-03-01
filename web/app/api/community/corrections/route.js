/**
 * API: /api/community/corrections
 *
 * GET - Liste les corrections d'un produit
 * POST - Soumet une nouvelle correction
 *
 * RGPD: Aucune donnée personnelle stockée (hash uniquement)
 */

import { supabase } from "@/libs/supabase";
import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import {
  hashEmail,
  hashIP,
  getClientIP,
  checkRateLimit
} from "@/libs/privacy-utils";

export const dynamic = "force-dynamic";

// GET - Liste des corrections d'un produit
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const status = searchParams.get("status") || "pending";

    let query = supabase
      .from("correction_proposals")
      .select(`
        id,
        product_id,
        norm_code,
        field_type,
        current_value,
        proposed_value,
        justification,
        evidence_urls,
        status,
        vote_score,
        votes_count,
        created_at
      `)
      .order("created_at", { ascending: false });

    if (productId) {
      query = query.eq("product_id", productId);
    }

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query.limit(50);

    if (error) {
      console.error("Error fetching corrections:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({
      corrections: data || [],
      count: data?.length || 0
    });

  } catch (error) {
    console.error("Corrections GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST - Soumettre une correction
export async function POST(request) {
  try {
    // Vérifier session
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Sign in to submit a correction" },
        { status: 401 }
      );
    }

    // Hash de l'email (RGPD)
    const userHash = hashEmail(session.user.email);

    // Rate limiting
    const rateLimit = checkRateLimit(userHash, "submit_correction", 5); // 5/heure
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many submissions. Try again in ${rateLimit.resetIn} minutes.`,
          resetIn: rateLimit.resetIn
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      productId,
      normId,
      normCode,
      fieldType,
      currentValue,
      proposedValue,
      justification,
      evidenceUrls
    } = body;

    // Validation
    if (!productId || !fieldType || !proposedValue) {
      return NextResponse.json(
        { error: "Required fields: productId, fieldType, proposedValue" },
        { status: 400 }
      );
    }

    // Vérifier que le produit existe
    const { data: product } = await supabase
      .from("products")
      .select("id, name")
      .eq("id", productId)
      .single();

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Hash IP (sera supprimé après 24h)
    const ipHash = hashIP(getClientIP(request));

    // Vérifier si l'utilisateur a un wallet connecté
    const { data: userRep } = await supabase
      .from("user_reputation")
      .select("wallet_verified_at")
      .eq("user_hash", userHash)
      .single();

    const submitterType = userRep?.wallet_verified_at ? "wallet" : "email";

    // Insérer la correction
    const { data, error } = await supabase
      .from("correction_proposals")
      .insert({
        product_id: productId,
        norm_id: normId || null,
        norm_code: normCode || null,
        field_type: fieldType,
        current_value: currentValue || null,
        proposed_value: proposedValue,
        justification: justification || null,
        evidence_urls: evidenceUrls || [],
        submitter_hash: userHash,
        submitter_type: submitterType,
        status: "pending"
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating correction:", error);
      return NextResponse.json(
        { error: "Failed to create correction" },
        { status: 500 }
      );
    }

    // Mettre à jour les stats utilisateur
    await supabase.rpc("increment_user_stat", {
      p_user_hash: userHash,
      p_stat: "corrections_submitted"
    }).catch(() => {
      // Créer l'entrée si elle n'existe pas
      supabase.from("user_reputation").upsert({
        user_hash: userHash,
        user_type: submitterType,
        corrections_submitted: 1
      }, { onConflict: "user_hash" });
    });

    return NextResponse.json({
      success: true,
      correction: {
        id: data.id,
        status: data.status,
        message: "Correction submitted! It will be validated after 3 positive votes."
      }
    });

  } catch (error) {
    console.error("Corrections POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
