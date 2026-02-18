import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin, isSupabaseConfigured } from "@/libs/supabase";
import { validateRequestOrigin } from "@/libs/security";
import crypto from "crypto";

/**
 * SECURITY: Validate origin for state-changing requests
 */
function requireValidOrigin(request) {
  const check = validateRequestOrigin(request);
  if (!check.valid) {
    console.warn(`[SECURITY] CSRF attempt blocked on community votes: ${check.reason}`);
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  return null;
}

/**
 * Generate anonymous voter hash from user ID or email
 * RGPD: Hash is one-way and cannot be reversed
 */
function generateVoterHash(userId, email) {
  const input = userId || email || `anon_${Date.now()}`;
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 32);
}

/**
 * Get client IP from request headers
 */
function getClientIP(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/**
 * POST /api/community/votes
 * Submit a vote on an AI evaluation (AGREE or DISAGREE)
 */
export async function POST(request) {
  try {
    // SECURITY: Validate origin to prevent CSRF
    const originError = requireValidOrigin(request);
    if (originError) return originError;

    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required to vote" },
        { status: 401 }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const {
      evaluationId,
      voteAgrees,
      justification,
      evidenceUrl,
      evidenceType,
      readingTimeMs, // Time user spent viewing before voting
      deviceFingerprint, // Browser fingerprint for fraud detection
    } = body;

    // Validation
    if (!evaluationId || typeof evaluationId !== "number") {
      return NextResponse.json(
        { error: "Valid evaluation ID is required" },
        { status: 400 }
      );
    }

    if (typeof voteAgrees !== "boolean") {
      return NextResponse.json(
        { error: "voteAgrees must be true or false" },
        { status: 400 }
      );
    }

    // If disagreeing, justification is required
    if (!voteAgrees) {
      if (!justification || justification.length < 10) {
        return NextResponse.json(
          { error: "Justification (min 10 chars) required when disagreeing" },
          { status: 400 }
        );
      }
      if (justification.length > 2000) {
        return NextResponse.json(
          { error: "Justification too long (max 2000 characters)" },
          { status: 400 }
        );
      }
    }

    // Validate evidence type if provided
    const validEvidenceTypes = ["official_doc", "github", "whitepaper", "article", "other"];
    if (evidenceType && !validEvidenceTypes.includes(evidenceType)) {
      return NextResponse.json(
        { error: `Invalid evidence type. Must be one of: ${validEvidenceTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate evidence URL if provided
    if (evidenceUrl) {
      try {
        new URL(evidenceUrl);
      } catch {
        return NextResponse.json(
          { error: "Invalid evidence URL" },
          { status: 400 }
        );
      }
      if (evidenceUrl.length > 500) {
        return NextResponse.json(
          { error: "Evidence URL too long (max 500 characters)" },
          { status: 400 }
        );
      }
    }

    if (!isSupabaseConfigured() || !supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Generate voter hash (anonymous)
    const voterHash = generateVoterHash(session.user.id, session.user.email);

    // ANTI-FRAUD: Check if user can vote
    const { data: canVoteResult } = await supabaseAdmin
      .rpc("can_user_vote", { p_user_hash: voterHash })
      .catch(() => ({ data: { can_vote: true } })); // Fallback if function doesn't exist

    if (canVoteResult && !canVoteResult.can_vote) {
      return NextResponse.json(
        {
          error: canVoteResult.reason || "Voting temporarily suspended",
          trustScore: canVoteResult.trust_score,
          cooldownMinutes: canVoteResult.cooldown_minutes,
        },
        { status: 429 }
      );
    }

    // Get client metadata for fraud detection
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get("user-agent") || "";

    // Call the RPC function to process the vote (with fraud detection metadata)
    const { data: result, error: rpcError } = await supabaseAdmin.rpc(
      "process_evaluation_vote",
      {
        p_evaluation_id: evaluationId,
        p_voter_hash: voterHash,
        p_vote_agrees: voteAgrees,
        p_justification: justification || null,
        p_evidence_url: evidenceUrl || null,
        p_evidence_type: evidenceType || null,
        p_client_ip: clientIP,
        p_device_fingerprint: deviceFingerprint || null,
        p_reading_time_ms: readingTimeMs || 0,
        p_user_agent: userAgent,
      }
    );

    if (rpcError) {
      console.error("Error processing vote:", rpcError);
      return NextResponse.json(
        { error: "Failed to process vote" },
        { status: 500 }
      );
    }

    // Check for error in result
    if (result?.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error.includes("Already voted") ? 409 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      voteId: result.vote_id,
      tokensEarned: result.tokens_earned,
      voteWeight: result.vote_weight,
      trustScore: canVoteResult?.trust_score || 50,
      isFlagged: result.is_flagged || false,
      message: voteAgrees
        ? `Thanks! You earned ${result.tokens_earned} $SAFE token(s).`
        : `Challenge submitted! You earned ${result.tokens_earned} $SAFE tokens. If validated, you'll earn 10 more!`,
    });

  } catch (error) {
    console.error("Vote submission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/community/votes
 * Get user's voting history
 */
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status"); // pending, validated, rejected

    if (!isSupabaseConfigured() || !supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const voterHash = generateVoterHash(session.user.id, session.user.email);

    // Get user's votes
    let query = supabaseAdmin
      .from("evaluation_votes")
      .select(`
        id,
        evaluation_id,
        product_id,
        products(name, slug),
        norm_id,
        norms(code, title, pillar),
        vote_agrees,
        justification,
        evidence_url,
        vote_weight,
        status,
        tokens_earned,
        created_at,
        validated_at
      `)
      .eq("voter_hash", voterHash)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: votes, error, count } = await query;

    if (error) {
      console.error("Error fetching votes:", error);
      return NextResponse.json(
        { error: "Failed to fetch votes" },
        { status: 500 }
      );
    }

    // Get user's token rewards
    const { data: rewards } = await supabaseAdmin
      .from("token_rewards")
      .select("*")
      .eq("user_hash", voterHash)
      .single();

    return NextResponse.json({
      votes: votes || [],
      rewards: rewards || {
        total_earned: 0,
        total_claimed: 0,
        total_pending: 0,
        votes_submitted: 0,
        challenges_won: 0,
        daily_streak: 0,
      },
      pagination: {
        limit,
        offset,
        hasMore: (votes?.length || 0) === limit,
      },
    });

  } catch (error) {
    console.error("Error fetching votes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
