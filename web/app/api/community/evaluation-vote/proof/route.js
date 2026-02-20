import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TOKENS_SOURCE_BONUS = 2;

/**
 * POST /api/community/evaluation-vote/proof
 * Ajouter une source/preuve après un vote pour +2 $SAFE bonus
 *
 * Body:
 * - evaluationId: number (required)
 * - evidenceUrl: string (required)
 * - evidenceType: string (optional: official_doc, github, whitepaper, article, other)
 */
export async function POST(req) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Connectez-vous pour ajouter une source" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { evaluationId, evidenceUrl, evidenceType } = body;

    // Validation
    if (!evaluationId || !evidenceUrl) {
      return NextResponse.json(
        { error: "evaluationId et evidenceUrl requis" },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(evidenceUrl);
    } catch {
      return NextResponse.json(
        { error: "URL invalide" },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const voterHash = generateVoterHash(userId);

    // Vérifier que l'utilisateur a voté sur cette évaluation
    const { data: existingVote, error: voteError } = await supabase
      .from("evaluation_votes")
      .select("id, evidence_url")
      .eq("evaluation_id", evaluationId)
      .eq("voter_hash", voterHash)
      .neq("status", "honeypot")
      .single();

    if (voteError || !existingVote) {
      return NextResponse.json(
        { error: "Vous devez d'abord voter sur cette évaluation" },
        { status: 404 }
      );
    }

    // Vérifier si une source a déjà été ajoutée
    if (existingVote.evidence_url) {
      return NextResponse.json(
        { error: "Une source a déjà été ajoutée pour ce vote" },
        { status: 409 }
      );
    }

    // Mettre à jour le vote avec la source
    const { error: updateError } = await supabase
      .from("evaluation_votes")
      .update({
        evidence_url: evidenceUrl,
        evidence_type: evidenceType || "other",
        evidence_added_at: new Date().toISOString(),
      })
      .eq("id", existingVote.id);

    if (updateError) {
      console.error("[POST proof] Update error:", updateError);
      return NextResponse.json(
        { error: "Erreur lors de l'ajout de la source" },
        { status: 500 }
      );
    }

    // Récupérer les stats actuelles
    const { data: userRewards } = await supabase
      .from("token_rewards")
      .select("total_earned")
      .eq("user_hash", voterHash)
      .single();

    // Attribuer le bonus
    await supabase
      .from("token_rewards")
      .upsert({
        user_hash: voterHash,
        total_earned: (userRewards?.total_earned || 0) + TOKENS_SOURCE_BONUS,
      });

    // Enregistrer la transaction
    await supabase.from("token_transactions").insert({
      user_hash: voterHash,
      action_type: "source_bonus",
      tokens_amount: TOKENS_SOURCE_BONUS,
      evaluation_vote_id: existingVote.id,
      description: `Source ajoutée: ${evidenceUrl}`,
    });

    // Récupérer les stats mises à jour
    const { data: updatedRewards } = await supabase
      .from("token_rewards")
      .select("total_earned, daily_streak, votes_submitted")
      .eq("user_hash", voterHash)
      .single();

    return NextResponse.json({
      success: true,
      bonusTokens: TOKENS_SOURCE_BONUS,
      userStats: updatedRewards,
    });

  } catch (error) {
    console.error("[POST proof] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Génère un hash anonyme de l'utilisateur (RGPD compliant)
 */
function generateVoterHash(userId) {
  const salt = process.env.VOTER_HASH_SALT || "safescoring-voter-salt-2024";
  return crypto
    .createHash("sha256")
    .update(`${userId}:${salt}`)
    .digest("hex")
    .slice(0, 32);
}
