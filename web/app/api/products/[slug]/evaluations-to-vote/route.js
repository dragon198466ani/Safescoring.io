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

/**
 * GET /api/products/[slug]/evaluations-to-vote
 * Returns evaluations that the user can vote on
 */
export async function GET(req, { params }) {
  try {
    const { slug } = params;
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const pillar = searchParams.get('pillar'); // Optional filter

    const supabase = createClient();
    const session = await auth();

    // Get product
    const { data: product } = await supabase
      .from('products')
      .select('id, name')
      .eq('slug', slug)
      .single();

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Build query for evaluations
    let query = supabase
      .from('evaluations')
      .select(`
        id,
        result,
        why_this_result,
        norms!inner(code, title, pillar, official_link, official_doc_summary)
      `)
      .eq('product_id', product.id)
      .in('result', ['YES', 'NO']) // Exclude TBD
      .order('id', { ascending: true });

    // Filter by pillar if specified
    if (pillar && ['S', 'A', 'F', 'E'].includes(pillar)) {
      query = query.eq('norms.pillar', pillar);
    }

    query = query.limit(limit);

    const { data: evaluations, error: evalsError } = await query;

    if (evalsError) {
      console.error('Error fetching evaluations:', evalsError);
      return NextResponse.json({ error: 'Failed to fetch evaluations' }, { status: 500 });
    }

    // Get user's votes if authenticated
    let userVotes = [];
    if (session?.user?.id) {
      const userHash = generateVoterHash(session.user.id);

      const { data: votes } = await supabase
        .from('evaluation_votes')
        .select('evaluation_id')
        .eq('voter_hash', userHash);

      userVotes = votes?.map(v => v.evaluation_id) || [];
    }

    // Get community vote counts for these evaluations
    const evalIds = evaluations?.map(e => e.id) || [];
    const { data: votes } = await supabase
      .from('evaluation_votes')
      .select('evaluation_id, vote_agrees')
      .in('evaluation_id', evalIds);

    const voteStats = {};
    votes?.forEach(v => {
      if (!voteStats[v.evaluation_id]) {
        voteStats[v.evaluation_id] = { agree: 0, disagree: 0 };
      }
      if (v.vote_agrees) {
        voteStats[v.evaluation_id].agree++;
      } else {
        voteStats[v.evaluation_id].disagree++;
      }
    });

    // Format response
    const result = evaluations
      ?.filter(e => !userVotes.includes(e.id)) // Exclude already voted
      .map(e => ({
        id: e.id,
        ai_result: e.result,
        why_this_result: e.why_this_result,
        norm_code: e.norms.code,
        norm_title: e.norms.title,
        pillar: e.norms.pillar,
        official_link: e.norms.official_link || null,
        official_doc_summary: e.norms.official_doc_summary || null,
        agree_count: voteStats[e.id]?.agree || 0,
        disagree_count: voteStats[e.id]?.disagree || 0,
        vote_count: (voteStats[e.id]?.agree || 0) + (voteStats[e.id]?.disagree || 0),
        user_has_voted: userVotes.includes(e.id)
      })) || [];

    return NextResponse.json(result);

  } catch (error) {
    console.error('Evaluations to vote error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
