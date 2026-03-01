import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// Lazy Supabase admin client (service role for RLS bypass)
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
  VOTES_TO_VALIDATE: 3,        // Alias for MIN_VOTES_UNANIMOUS (used in GET consensus calc)
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
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
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
 * ARCHITECTURE: Appel unique à une fonction RPC PostgreSQL atomique.
 * Toute la logique (duplicate check, quota, insert, tokens, consensus)
 * est exécutée dans une seule transaction SQL avec FOR UPDATE locks.
 * Cela élimine toutes les race conditions (1000+ votes simultanés).
 *
 * Body:
 * - evaluationId: number (required)
 * - voteAgrees: boolean (required) - true=VRAI, false=FAUX
 * - deviceFingerprint: string (optional)
 */
export async function POST(req) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Sign in to vote" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { evaluationId, voteAgrees, deviceFingerprint } = body;

    // Validation simple - pas de justification requise pour vote instant
    if (!evaluationId || typeof voteAgrees !== "boolean") {
      return NextResponse.json(
        { error: "evaluationId (number) and voteAgrees (boolean) required" },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const voterHash = generateVoterHash(userId);

    // ========================================
    // 2-PHASE ARCHITECTURE (100K-1M votes simultanés)
    //
    // Phase 1 (HOT PATH <10ms): fast_vote_insert()
    //   → INSERT vote + queue reward (NO locks)
    //   → UNIQUE constraint prevents duplicates
    //   → Covering indexes for quota check
    //
    // Phase 2 (TRIGGER — same transaction):
    //   → trg_after_vote_consensus fires AFTER INSERT
    //   → Advisory lock per evaluation (lightweight)
    //   → Updates evaluation_vote_counts
    //   → Checks consensus, locks evaluation if reached
    //   → Queues aligned bonus (no token_rewards lock)
    //
    // Phase 3 (BATCH — async):
    //   → flush_pending_rewards() via cron/API
    //   → Aggregates tokens per user in batch
    // ========================================
    const { data: result, error: rpcError } = await supabase.rpc(
      "process_community_vote_atomic",
      {
        p_voter_hash: voterHash,
        p_evaluation_id: evaluationId,
        p_vote_agrees: voteAgrees,
        p_device_fingerprint: deviceFingerprint || null,
        p_max_votes_per_day: VOTE_CONFIG.MAX_VOTES_PER_DAY,
        p_min_votes_unanimous: VOTE_CONFIG.MIN_VOTES_UNANIMOUS,
        p_max_votes_majority: VOTE_CONFIG.MAX_VOTES_MAJORITY,
        p_tokens_vote_instant: VOTE_CONFIG.TOKENS_VOTE_INSTANT,
        p_tokens_aligned_bonus: VOTE_CONFIG.TOKENS_ALIGNED_BONUS,
      }
    );

    // Handle RPC-level errors (DB down, function missing, etc.)
    if (rpcError) {
      console.error("[POST] RPC error:", rpcError);

      // Fallback: if the atomic function doesn't exist yet, use legacy flow
      if (rpcError.message?.includes("function") || rpcError.code === "42883") {
        console.warn("[POST] Atomic RPC not available, falling back to legacy flow");
        return await legacyVoteFlow(supabase, voterHash, evaluationId, voteAgrees, deviceFingerprint);
      }

      return NextResponse.json(
        { error: "Failed to process vote" },
        { status: 500 }
      );
    }

    // Handle application-level errors returned by the RPC
    if (result?.error) {
      const code = result.code || "UNKNOWN";
      const statusMap = {
        NOT_FOUND: 404,
        ALREADY_LOCKED: 410,
        ALREADY_VOTED: 409,
        DAILY_LIMIT: 429,
      };
      return NextResponse.json(
        { error: result.error, ...(result.communityStatus && { communityStatus: result.communityStatus }) },
        { status: statusMap[code] || 400 }
      );
    }

    // ========================================
    // ENRICH RESPONSE with consensus data
    // The trigger has already fired (same TX), so
    // evaluation_vote_counts has fresh data.
    // These are non-blocking SELECT queries (no locks).
    // ========================================
    const [countsRes, evalRes] = await Promise.all([
      supabase
        .from("evaluation_vote_counts")
        .select("agree_count, disagree_count, total_count, community_decision, validation_result, is_locked")
        .eq("evaluation_id", evaluationId)
        .single(),
      supabase
        .from("evaluations")
        .select("result")
        .eq("id", evaluationId)
        .single(),
    ]);

    const counts = countsRes.data;
    const aiResult = evalRes.data?.result || null;

    // Return enriched response matching SwipeVoting component expectations
    return NextResponse.json({
      success: true,
      voteId: result.voteId,
      voteAgrees,
      tokensEarned: result.tokensEarned || VOTE_CONFIG.TOKENS_VOTE_INSTANT,

      // Consensus state (from denormalized counters)
      votes: {
        oui: counts?.agree_count || 0,
        non: counts?.disagree_count || 0,
        total: counts?.total_count || 0,
        neededUnanimous: VOTE_CONFIG.MIN_VOTES_UNANIMOUS,
        maxVotes: VOTE_CONFIG.MAX_VOTES_MAJORITY,
      },
      communityDecision: counts?.community_decision || null,
      aiResult,
      validationResult: counts?.validation_result || null,
      isLocked: counts?.is_locked || false,

      // Daily quota
      dailyQuota: result.dailyQuota,

      // User stats (pending rewards — tokens not yet flushed)
      userStats: {
        total_earned: null,   // Available after flush_pending_rewards
        daily_streak: null,   // Available after flush_pending_rewards
        votes_submitted: null,
      },
    });

  } catch (error) {
    console.error("[POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Legacy vote flow (fallback if atomic RPC is not yet deployed)
 * WARNING: This has race conditions under high concurrency.
 * Only used temporarily until migration 216 is applied.
 */
async function legacyVoteFlow(supabase, voterHash, evaluationId, voteAgrees, deviceFingerprint) {
  // Check daily quota
  const today = new Date().toISOString().split("T")[0];
  const { count: votesToday } = await supabase
    .from("evaluation_votes")
    .select("id", { count: "exact", head: true })
    .eq("voter_hash", voterHash)
    .gte("created_at", `${today}T00:00:00Z`);

  if ((votesToday || 0) >= VOTE_CONFIG.MAX_VOTES_PER_DAY) {
    return NextResponse.json(
      { error: `Limite atteinte: ${VOTE_CONFIG.MAX_VOTES_PER_DAY} votes/jour maximum` },
      { status: 429 }
    );
  }

  // Check duplicate vote
  const { data: existingVote } = await supabase
    .from("evaluation_votes")
    .select("id, vote_agrees")
    .eq("evaluation_id", evaluationId)
    .eq("voter_hash", voterHash)
    .single();

  if (existingVote) {
    return NextResponse.json(
      { error: "You have already voted on this evaluation" },
      { status: 409 }
    );
  }

  // Get evaluation
  const { data: evaluation, error: evalError } = await supabase
    .from("evaluations")
    .select("id, product_id, norm_id, result, community_status")
    .eq("id", evaluationId)
    .single();

  if (evalError || !evaluation) {
    return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
  }

  if (evaluation.community_status === "confirmed" || evaluation.community_status === "challenged") {
    return NextResponse.json(
      { error: "This evaluation has already been validated by the community" },
      { status: 410 }
    );
  }

  // Insert vote
  const { data: newVote, error: voteError } = await supabase
    .from("evaluation_votes")
    .insert({
      evaluation_id: evaluationId,
      product_id: evaluation.product_id,
      norm_id: evaluation.norm_id,
      vote_agrees: voteAgrees,
      voter_hash: voterHash,
      vote_weight: 1.0,
      device_fingerprint: deviceFingerprint || null,
      status: "pending",
    })
    .select("id")
    .single();

  if (voteError) {
    // Handle unique_violation gracefully (concurrent duplicate)
    if (voteError.code === "23505") {
      return NextResponse.json(
        { error: "You have already voted on this evaluation" },
        { status: 409 }
      );
    }
    console.error("[POST] Legacy vote insert error:", voteError);
    return NextResponse.json({ error: "Failed to save vote" }, { status: 500 });
  }

  // Award tokens atomically via RPC (not read-then-write)
  await supabase.rpc("increment_tokens", {
    p_user_hash: voterHash,
    p_amount: VOTE_CONFIG.TOKENS_VOTE_INSTANT,
  });

  // Record transaction
  await supabase.from("token_transactions").insert({
    user_hash: voterHash,
    action_type: "vote_instant",
    tokens_amount: VOTE_CONFIG.TOKENS_VOTE_INSTANT,
    evaluation_vote_id: newVote.id,
    description: `Vote ${voteAgrees ? "VRAI" : "FAUX"} instant (legacy)`,
  });

  // Get vote counts for consensus check
  const { data: votes } = await supabase
    .from("evaluation_votes")
    .select("vote_agrees")
    .eq("evaluation_id", evaluationId);

  const newAgree = (votes || []).filter((v) => v.vote_agrees).length;
  const newDisagree = (votes || []).filter((v) => !v.vote_agrees).length;
  const newTotal = newAgree + newDisagree;

  // Check consensus
  let validationTriggered = false;
  let communityDecision = null;
  let validationResult = null;

  if (newAgree >= VOTE_CONFIG.MIN_VOTES_UNANIMOUS && newDisagree === 0) {
    validationTriggered = true;
    communityDecision = "yes";
  } else if (newDisagree >= VOTE_CONFIG.MIN_VOTES_UNANIMOUS && newAgree === 0) {
    validationTriggered = true;
    communityDecision = "no";
  } else if (newTotal >= VOTE_CONFIG.MAX_VOTES_MAJORITY) {
    validationTriggered = true;
    communityDecision = newAgree > newDisagree ? "yes" : newDisagree > newAgree ? "no" : "tie";
  }

  if (validationTriggered && communityDecision !== "tie") {
    const aiSaysYes = evaluation.result === "YES" || evaluation.result === "YESp";
    const communityAgreesWithAI =
      (aiSaysYes && communityDecision === "yes") ||
      (!aiSaysYes && communityDecision === "no");

    validationResult = communityAgreesWithAI ? "confirmed" : "challenged";

    await supabase.from("evaluations").update({
      community_status: validationResult,
      community_decision: communityDecision,
      community_decided_at: new Date().toISOString(),
    }).eq("id", evaluationId);

    await supabase.from("evaluation_votes")
      .update({ status: "validated", validated_at: new Date().toISOString() })
      .eq("evaluation_id", evaluationId);

    // Award aligned bonus
    const winningVote = communityDecision === "yes";
    const { data: winners } = await supabase
      .from("evaluation_votes")
      .select("voter_hash")
      .eq("evaluation_id", evaluationId)
      .eq("vote_agrees", winningVote);

    for (const winner of winners || []) {
      await supabase.rpc("increment_tokens", {
        p_user_hash: winner.voter_hash,
        p_amount: VOTE_CONFIG.TOKENS_ALIGNED_BONUS,
      });
      await supabase.from("token_transactions").insert({
        user_hash: winner.voter_hash,
        action_type: "vote_aligned",
        tokens_amount: VOTE_CONFIG.TOKENS_ALIGNED_BONUS,
        description: `Vote aligné (${communityDecision.toUpperCase()}) [legacy]`,
      });
    }
  }

  return NextResponse.json({
    success: true,
    voteId: newVote.id,
    voteAgrees,
    tokensEarned: VOTE_CONFIG.TOKENS_VOTE_INSTANT,
    votes: { oui: newAgree, non: newDisagree, total: newTotal },
    validationTriggered,
    communityDecision,
    aiResult: evaluation.result,
    validationResult,
    isLocked: validationTriggered && validationResult !== null,
    dailyQuota: {
      used: (votesToday || 0) + 1,
      max: VOTE_CONFIG.MAX_VOTES_PER_DAY,
      remaining: VOTE_CONFIG.MAX_VOTES_PER_DAY - (votesToday || 0) - 1,
    },
  });
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
