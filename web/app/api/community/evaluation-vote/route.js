import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Lazy init to avoid build-time crash when env vars are missing
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Mapping des résultats d'évaluation IA vers scores numériques
 * Table evaluations utilise: YES, NO, N/A, TBD
 */
const RESULT_TO_SCORE = {
  YES: 100,
  NO: 0,
  PARTIAL: 50,
  "N/A": null,
  TBD: null,
};

/**
 * Configuration du système de vote communautaire
 *
 * PRINCIPE:
 * - L'IA évalue: "Ce produit respecte-t-il cette norme?" → YES/NO/PARTIAL
 * - La communauté donne SON AVIS: "Selon vous, OUI ou NON?"
 * - On COMPARE: si communauté = IA → CONFIRMÉ, sinon → ERREUR POSSIBLE
 *
 * Règles de consensus:
 * - 3 votes unanimes → décision prise
 * - Votes mixtes → continuer jusqu'à 5 votes, puis majorité
 */
const VOTE_CONFIG = {
  MIN_VOTES_UNANIMOUS: 3,      // Votes unanimes pour valider direct
  MAX_VOTES_MAJORITY: 5,       // Si mixte, on va jusqu'à 5 puis majorité
  MAX_VOTES_PER_DAY: 10,       // Cap quotidien par utilisateur
  TOKENS_VOTE_INSTANT: 1,      // Tokens pour vote instant
  TOKENS_ALIGNED_BONUS: 5,     // Bonus si ton vote = décision finale
  TOKENS_SOURCE_BONUS: 2,      // Bonus pour source fournie après vote
};

/**
 * GET /api/community/evaluation-vote
 * Récupère les évaluations disponibles pour vote communautaire
 */
export async function GET(req) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ evaluations: [], pagination: { offset: 0, limit: 20, total: 0, hasMore: false }, userStats: null, dailyQuota: null, config: {} });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const productSlug = searchParams.get("productSlug");
    const pillar = searchParams.get("pillar");
    const filter = searchParams.get("filter") || "all";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Session pour données utilisateur
    const session = await auth();
    const userId = session?.user?.id;
    const voterHash = userId ? generateVoterHash(userId) : null;

    // Récupérer le product_id depuis le slug si nécessaire
    let targetProductId = productId;
    if (!targetProductId && productSlug) {
      const { data: product } = await supabase
        .from("products")
        .select("id")
        .eq("slug", productSlug)
        .single();
      targetProductId = product?.id;
    }

    // Requête évaluations avec votes agrégés
    let query = supabase
      .from("evaluations")
      .select(`
        id,
        product_id,
        norm_id,
        result,
        why_this_result,
        confidence_score,
        evaluated_at,
        products:product_id (
          id,
          name,
          slug
        ),
        norms:norm_id (
          id,
          code,
          title,
          pillar
        )
      `)
      .in("result", ["YES", "NO", "PARTIAL"])
      .order("evaluated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (targetProductId) {
      query = query.eq("product_id", targetProductId);
    }
    if (pillar) {
      query = query.eq("norms.pillar", pillar);
    }

    const { data: evaluations, error } = await query;

    if (error) {
      console.error("[GET] Evaluations error:", error);
      return NextResponse.json({ error: "Failed to fetch evaluations" }, { status: 500 });
    }

    // Récupérer les votes pour ces évaluations
    const evalIds = evaluations.map((e) => e.id);

    const { data: allVotes } = await supabase
      .from("evaluation_votes")
      .select("evaluation_id, vote_agrees, vote_weight, voter_hash, status")
      .in("evaluation_id", evalIds);

    // Agréger les votes par évaluation
    const votesByEval = {};
    (allVotes || []).forEach((v) => {
      if (!votesByEval[v.evaluation_id]) {
        votesByEval[v.evaluation_id] = {
          agree: 0,
          disagree: 0,
          totalWeight: 0,
          userVote: null,
          status: null,
        };
      }
      const stats = votesByEval[v.evaluation_id];
      if (v.vote_agrees) {
        stats.agree++;
      } else {
        stats.disagree++;
      }
      stats.totalWeight += v.vote_weight || 0.3;

      // Vote de l'utilisateur actuel
      if (voterHash && v.voter_hash === voterHash) {
        stats.userVote = v.vote_agrees;
      }

      // Statut de validation
      if (v.status === "validated" || v.status === "rejected") {
        stats.status = v.status;
      }
    });

    // Transformer pour le frontend
    const result = evaluations
      .filter((e) => e.norms) // Exclure si norme supprimée
      .map((e) => {
        const stats = votesByEval[e.id] || { agree: 0, disagree: 0, totalWeight: 0, userVote: null, status: null };
        const totalVotes = stats.agree + stats.disagree;
        const aiScore = RESULT_TO_SCORE[e.result] ?? 50;

        // Calcul du consensus communautaire
        let communityConsensus = null;
        let consensusStrength = null;

        if (stats.agree >= VOTE_CONFIG.VOTES_TO_VALIDATE && stats.disagree === 0) {
          communityConsensus = "confirmed";
          consensusStrength = 1.0;
        } else if (stats.disagree >= VOTE_CONFIG.VOTES_TO_VALIDATE && stats.agree === 0) {
          communityConsensus = "challenged";
          consensusStrength = 1.0;
        } else if (totalVotes >= VOTE_CONFIG.VOTES_TO_VALIDATE) {
          const agreeRatio = stats.agree / totalVotes;
          if (agreeRatio >= 0.7) {
            communityConsensus = "likely_confirmed";
            consensusStrength = agreeRatio;
          } else if (agreeRatio <= 0.3) {
            communityConsensus = "likely_challenged";
            consensusStrength = 1 - agreeRatio;
          } else {
            communityConsensus = "contested";
            consensusStrength = 0.5;
          }
        }

        return {
          id: e.id,
          product_id: e.product_id,
          product_name: e.products?.name,
          product_slug: e.products?.slug,
          norm_id: e.norm_id,
          norm_code: e.norms?.code,
          norm_title: e.norms?.title,
          pillar: e.norms?.pillar,

          // Évaluation IA
          ai_result: e.result, // YES, NO, PARTIAL
          ai_score: aiScore,
          ai_justification: e.why_this_result,
          ai_confidence: e.confidence_score,
          evaluated_at: e.evaluated_at,

          // Votes communautaires
          votes_agree: stats.agree,
          votes_disagree: stats.disagree,
          total_votes: totalVotes,
          vote_weight: stats.totalWeight,

          // Consensus
          community_consensus: communityConsensus,
          consensus_strength: consensusStrength,
          validation_status: stats.status,

          // État utilisateur
          user_voted: stats.userVote !== null,
          user_vote: stats.userVote,
        };
      });

    // Appliquer les filtres
    let filtered = result;
    switch (filter) {
      case "needs_votes":
        filtered = result.filter((e) => !e.user_voted && e.total_votes < 3);
        break;
      case "challenged":
        filtered = result.filter((e) => e.community_consensus?.includes("challenged"));
        break;
      case "confirmed":
        filtered = result.filter((e) => e.community_consensus?.includes("confirmed"));
        break;
      case "contested":
        filtered = result.filter((e) => e.community_consensus === "contested");
        break;
      case "not_voted":
        filtered = result.filter((e) => !e.user_voted);
        break;
    }

    // Statistiques utilisateur et quota quotidien
    let userStats = null;
    let dailyQuota = null;

    if (voterHash) {
      const { data: rewards } = await supabase
        .from("token_rewards")
        .select("total_earned, daily_streak, votes_submitted, challenges_won")
        .eq("user_hash", voterHash)
        .single();
      userStats = rewards;

      // Compter les votes du jour
      const today = new Date().toISOString().split("T")[0];
      const { count: votesToday } = await supabase
        .from("evaluation_votes")
        .select("id", { count: "exact", head: true })
        .eq("voter_hash", voterHash)
        .gte("created_at", `${today}T00:00:00Z`);

      dailyQuota = {
        used: votesToday || 0,
        max: VOTE_CONFIG.MAX_VOTES_PER_DAY,
        remaining: VOTE_CONFIG.MAX_VOTES_PER_DAY - (votesToday || 0),
      };
    }

    return NextResponse.json({
      evaluations: filtered,
      pagination: {
        offset,
        limit,
        total: filtered.length,
        hasMore: evaluations.length === limit,
      },
      userStats,
      dailyQuota,
      config: {
        votesToValidate: VOTE_CONFIG.VOTES_TO_VALIDATE,
        maxVotesPerDay: VOTE_CONFIG.MAX_VOTES_PER_DAY,
      },
    });
  } catch (error) {
    console.error("[GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/community/evaluation-vote
 * Soumettre un vote VRAI/FAUX sur une évaluation IA (INSTANT - pas de modal)
 *
 * Body:
 * - evaluationId: number (required)
 * - voteAgrees: boolean (required) - true=VRAI, false=FAUX
 */
export async function POST(req) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Connectez-vous pour voter" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { evaluationId, voteAgrees, deviceFingerprint } = body;

    // Validation simple - pas de justification requise pour vote instant
    if (!evaluationId || typeof voteAgrees !== "boolean") {
      return NextResponse.json(
        { error: "evaluationId (number) et voteAgrees (boolean) requis" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const userId = session.user.id;
    const voterHash = generateVoterHash(userId);

    // Récupérer les stats utilisateur
    const { data: userRewards } = await supabase
      .from("token_rewards")
      .select("total_earned, daily_streak, last_vote_date, votes_submitted")
      .eq("user_hash", voterHash)
      .single();

    // Vérifier le cap quotidien de votes
    const today = new Date().toISOString().split("T")[0];
    const { count: votesToday } = await supabase
      .from("evaluation_votes")
      .select("id", { count: "exact", head: true })
      .eq("voter_hash", voterHash)
      .gte("created_at", `${today}T00:00:00Z`);

    if ((votesToday || 0) >= VOTE_CONFIG.MAX_VOTES_PER_DAY) {
      return NextResponse.json(
        {
          error: `Limite atteinte: ${VOTE_CONFIG.MAX_VOTES_PER_DAY} votes/jour maximum`,
          votesToday: votesToday,
          resetAt: `${today}T23:59:59Z`,
        },
        { status: 429 }
      );
    }

    // Vérifier si déjà voté
    const { data: existingVote } = await supabase
      .from("evaluation_votes")
      .select("id, vote_agrees")
      .eq("evaluation_id", evaluationId)
      .eq("voter_hash", voterHash)
      .single();

    if (existingVote) {
      return NextResponse.json(
        { error: "Vous avez déjà voté sur cette évaluation", existingVote: existingVote.vote_agrees },
        { status: 409 }
      );
    }

    // Récupérer l'évaluation avec son statut communautaire
    const { data: evaluation, error: evalError } = await supabase
      .from("evaluations")
      .select("id, product_id, norm_id, result, community_status")
      .eq("id", evaluationId)
      .single();

    if (evalError || !evaluation) {
      return NextResponse.json(
        { error: "Évaluation non trouvée" },
        { status: 404 }
      );
    }

    // Vérifier si l'évaluation est déjà verrouillée (consensus atteint)
    if (evaluation.community_status === "confirmed" || evaluation.community_status === "challenged") {
      return NextResponse.json(
        {
          error: "Cette évaluation a déjà été validée par la communauté",
          communityStatus: evaluation.community_status
        },
        { status: 410 } // Gone - no longer accepting votes
      );
    }

    // Récupérer votes existants pour calculer le consensus
    const { data: existingVotes } = await supabase
      .from("evaluation_votes")
      .select("vote_agrees, vote_weight, status")
      .eq("evaluation_id", evaluationId);

    const currentAgree = (existingVotes || []).filter((v) => v.vote_agrees).length;
    const currentDisagree = (existingVotes || []).filter((v) => !v.vote_agrees).length;
    const totalVotes = currentAgree + currentDisagree;

    // Vote weight is always 1.0 - neutral scoring (1 person = 1 vote)
    // No advantage based on tokens, staking, or reputation
    const voteWeight = 1.0;

    // Insérer le vote (simplifié - pas de justification)
    const { data: newVote, error: voteError } = await supabase
      .from("evaluation_votes")
      .insert({
        evaluation_id: evaluationId,
        product_id: evaluation.product_id,
        norm_id: evaluation.norm_id,
        vote_agrees: voteAgrees,
        voter_hash: voterHash,
        vote_weight: voteWeight,
        device_fingerprint: deviceFingerprint || null,
        status: "pending",
      })
      .select("id")
      .single();

    if (voteError) {
      console.error("[POST] Vote insert error:", voteError);
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement du vote" },
        { status: 500 }
      );
    }

    // Award instant tokens (same for VRAI and FAUX)
    const instantTokens = VOTE_CONFIG.TOKENS_VOTE_INSTANT;
    await supabase
      .from("token_rewards")
      .upsert({
        user_hash: voterHash,
        total_earned: (userRewards?.total_earned || 0) + instantTokens,
        votes_submitted: (userRewards?.votes_submitted || 0) + 1,
      });

    // Record token transaction
    await supabase.from("token_transactions").insert({
      user_hash: voterHash,
      action_type: "vote_instant",
      tokens_amount: instantTokens,
      evaluation_vote_id: newVote.id,
      description: `Vote ${voteAgrees ? "VRAI" : "FAUX"} instant`,
    });

    // Vérifier si le consensus est atteint (3 votes unanimes)
    const newAgree = voteAgrees ? currentAgree + 1 : currentAgree;
    const newDisagree = !voteAgrees ? currentDisagree + 1 : currentDisagree;

    let validationTriggered = false;
    let validationResult = null;
    const newTotalVotes = newAgree + newDisagree;

    // ========== RÈGLES DE CONSENSUS ==========
    // La communauté vote OUI/NON (leur avis), puis on compare avec l'IA
    // newAgree = votes OUI, newDisagree = votes NON
    //
    // 1. 3 votes unanimes OUI ou NON → décision prise
    // 2. Votes mixtes → continuer jusqu'à 5
    // 3. À 5 votes → majorité gagne

    let communityDecision = null; // "yes" | "no" | null

    // Cas 1: 3+ OUI unanimes
    if (newAgree >= VOTE_CONFIG.MIN_VOTES_UNANIMOUS && newDisagree === 0) {
      validationTriggered = true;
      communityDecision = "yes";
    }
    // Cas 2: 3+ NON unanimes
    else if (newDisagree >= VOTE_CONFIG.MIN_VOTES_UNANIMOUS && newAgree === 0) {
      validationTriggered = true;
      communityDecision = "no";
    }
    // Cas 3: À 5 votes avec majorité
    else if (newTotalVotes >= VOTE_CONFIG.MAX_VOTES_MAJORITY) {
      validationTriggered = true;
      if (newAgree > newDisagree) {
        communityDecision = "yes";
      } else if (newDisagree > newAgree) {
        communityDecision = "no";
      } else {
        communityDecision = "tie";
      }
    }

    // Si consensus atteint, comparer avec l'IA
    if (validationTriggered && communityDecision !== "tie") {
      // Comparer la décision communautaire avec l'évaluation IA
      const aiSaysYes = evaluation.result === "YES";
      const aiSaysNo = evaluation.result === "NO";
      const communityAgreesWithAI =
        (aiSaysYes && communityDecision === "yes") ||
        (aiSaysNo && communityDecision === "no");

      // Déterminer le statut final
      if (communityAgreesWithAI) {
        validationResult = "confirmed"; // Communauté = IA → OK
      } else {
        validationResult = "challenged"; // Communauté ≠ IA → Erreur possible
      }

      // Mettre à jour l'évaluation
      await supabase
        .from("evaluations")
        .update({
          community_status: validationResult,
          community_decision: communityDecision, // Ce que la communauté pense
          community_decided_at: new Date().toISOString(),
        })
        .eq("id", evaluationId);

      // Marquer tous les votes comme validés
      await supabase
        .from("evaluation_votes")
        .update({ status: "validated", validated_at: new Date().toISOString() })
        .eq("evaluation_id", evaluationId);

      // Bonus aux voteurs qui ont voté comme la majorité
      const winningVote = communityDecision === "yes";
      const { data: winners } = await supabase
        .from("evaluation_votes")
        .select("voter_hash")
        .eq("evaluation_id", evaluationId)
        .eq("vote_agrees", winningVote);

      for (const winner of winners || []) {
        await supabase.from("token_transactions").insert({
          user_hash: winner.voter_hash,
          action_type: "vote_aligned",
          tokens_amount: VOTE_CONFIG.TOKENS_ALIGNED_BONUS,
          evaluation_vote_id: null,
          description: `Vote aligné avec la décision communautaire (${communityDecision.toUpperCase()})`,
        });
        await supabase.rpc("increment_tokens", {
          p_user_hash: winner.voter_hash,
          p_amount: VOTE_CONFIG.TOKENS_ALIGNED_BONUS,
        });
      }
    }

    // Récupérer les stats mises à jour
    const { data: updatedRewards } = await supabase
      .from("token_rewards")
      .select("total_earned, daily_streak, votes_submitted")
      .eq("user_hash", voterHash)
      .single();

    return NextResponse.json({
      success: true,
      voteId: newVote.id,
      voteAgrees,
      tokensEarned: instantTokens,
      voteWeight,

      // État du consensus
      votes: {
        oui: newAgree,        // Votes "OUI, ce produit respecte cette norme"
        non: newDisagree,     // Votes "NON, ce produit ne respecte pas"
        total: newTotalVotes,
        neededUnanimous: VOTE_CONFIG.MIN_VOTES_UNANIMOUS,
        maxVotes: VOTE_CONFIG.MAX_VOTES_MAJORITY,
      },
      // Résultat
      validationTriggered,
      communityDecision: validationTriggered ? (newAgree > newDisagree ? "yes" : "no") : null,
      aiResult: evaluation.result,  // Ce que l'IA avait dit
      validationResult,             // "confirmed" (communauté = IA) | "challenged" (communauté ≠ IA)
      isLocked: validationTriggered && validationResult !== "tie",

      // Quota quotidien
      dailyQuota: {
        used: (votesToday || 0) + 1,
        max: VOTE_CONFIG.MAX_VOTES_PER_DAY,
        remaining: VOTE_CONFIG.MAX_VOTES_PER_DAY - (votesToday || 0) - 1,
      },

      // Stats utilisateur mises à jour
      userStats: updatedRewards,
    });

  } catch (error) {
    console.error("[POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Génère un hash anonyme de l'utilisateur (RGPD compliant)
 * Le même utilisateur génère toujours le même hash
 */
function generateVoterHash(userId) {
  const salt = process.env.VOTER_HASH_SALT || "safescoring-voter-salt-2024";
  return crypto
    .createHash("sha256")
    .update(`${userId}:${salt}`)
    .digest("hex")
    .slice(0, 32);
}
