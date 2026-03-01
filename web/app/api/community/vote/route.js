import { NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';
import { auth } from '@/libs/auth';
import crypto from 'crypto';

/**
 * Generate anonymous voter hash from user ID
 * MUST match the hash in evaluation-vote/route.js and community/votes/route.js
 */
function generateVoterHash(userId) {
  const salt = process.env.VOTER_HASH_SALT || 'safescoring-voter-salt-2024';
  return crypto
    .createHash('sha256')
    .update(`${userId}:${salt}`)
    .digest('hex')
    .slice(0, 32);
}

export async function POST(req) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { evaluation_id, vote_agrees, justification, evidence_url } = body;

    if (!evaluation_id || typeof vote_agrees !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (!vote_agrees && (!justification || justification.length < 10)) {
      return NextResponse.json(
        { error: 'Justification required' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const { data: result, error } = await supabase.rpc('process_evaluation_vote', {
      p_evaluation_id: evaluation_id,
      p_voter_hash: generateVoterHash(session.user.id),
      p_vote_agrees: vote_agrees,
      p_justification: justification || null,
      p_evidence_url: evidence_url || null
    });

    if (error || result?.error) {
      return NextResponse.json({ error: error?.message || result?.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      vote_id: result.vote_id,
      tokens_earned: result.tokens_earned
    });
  } catch (error) {
    console.error('Vote error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
