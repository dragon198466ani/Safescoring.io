import { NextResponse } from 'next/server';
import { supabase } from '@/libs/supabase';

/**
 * GET /api/products/[slug]/strategic-analyses
 * Returns strategic analyses for all SAFE pillars with community adjustments
 */
export async function GET(req, { params }) {
  try {
    const { slug } = params;

    // Get product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, slug')
      .eq('slug', slug)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Get strategic analyses for all pillars
    const { data: analyses, error: analysesError } = await supabase
      .from('product_pillar_analyses')
      .select('*')
      .eq('product_id', product.id)
      .order('pillar');

    if (analysesError) {
      console.error('Error fetching analyses:', analysesError);
      return NextResponse.json(
        { error: 'Failed to fetch analyses' },
        { status: 500 }
      );
    }

    // Get community vote counts per pillar
    const { data: evaluations, error: evalsError } = await supabase
      .from('evaluations')
      .select(`
        id,
        norm_id,
        result,
        norms!inner(pillar)
      `)
      .eq('product_id', product.id);

    if (evalsError) {
      console.error('Error fetching evaluations:', evalsError);
    }

    // Get community votes
    const evalIds = evaluations?.map(e => e.id) || [];
    const { data: votes, error: votesError } = await supabase
      .from('evaluation_votes')
      .select('evaluation_id, vote_agrees, status')
      .in('evaluation_id', evalIds);

    if (votesError) {
      console.error('Error fetching votes:', votesError);
    }

    // Build vote map
    const votesByEval = {};
    votes?.forEach(v => {
      if (!votesByEval[v.evaluation_id]) {
        votesByEval[v.evaluation_id] = { agrees: 0, disagrees: 0, validated_challenges: 0 };
      }
      if (v.vote_agrees) {
        votesByEval[v.evaluation_id].agrees++;
      } else {
        votesByEval[v.evaluation_id].disagrees++;
        if (v.status === 'validated') {
          votesByEval[v.evaluation_id].validated_challenges++;
        }
      }
    });

    // Calculate scores per pillar with community adjustments
    const pillarStats = {};
    evaluations?.forEach(e => {
      const pillar = e.norms.pillar;
      if (!pillarStats[pillar]) {
        pillarStats[pillar] = {
          yes: 0,
          no: 0,
          tbd: 0,
          community_corrections: 0,
          total_votes: 0
        };
      }

      const evalVotes = votesByEval[e.id];
      let correctedResult = e.result;

      // If community validated a challenge, flip the result
      if (evalVotes?.validated_challenges > 0) {
        correctedResult = e.result === 'YES' ? 'NO' : 'YES';
        pillarStats[pillar].community_corrections++;
      }

      if (correctedResult === 'YES') pillarStats[pillar].yes++;
      else if (correctedResult === 'NO') pillarStats[pillar].no++;
      else if (correctedResult === 'TBD') pillarStats[pillar].tbd++;

      if (evalVotes) {
        pillarStats[pillar].total_votes += evalVotes.agrees + evalVotes.disagrees;
      }
    });

    // Format response
    const result = {};
    ['S', 'A', 'F', 'E'].forEach(pillar => {
      const analysis = analyses?.find(a => a.pillar === pillar);
      const stats = pillarStats[pillar] || { yes: 0, no: 0, tbd: 0, community_corrections: 0, total_votes: 0 };

      const aiScore = analysis?.pillar_score || 0;
      const total = stats.yes + stats.no;
      const communityScore = total > 0 ? Math.round((stats.yes / total) * 100 * 100) / 100 : 0;

      result[pillar] = {
        pillar,
        ai_score: aiScore,
        community_adjusted_score: communityScore,
        strategic_conclusion: analysis?.strategic_conclusion || '',
        key_strengths: analysis?.key_strengths || [],
        key_weaknesses: analysis?.key_weaknesses || [],
        critical_risks: analysis?.critical_risks || [],
        recommendations: analysis?.recommendations || [],
        passed_norms_count: stats.yes,
        failed_norms_count: stats.no,
        tbd_norms_count: stats.tbd,
        community_corrections: stats.community_corrections,
        community_vote_count: stats.total_votes,
        confidence_score: analysis?.confidence_score || 0,
        how_to_protect: analysis?.how_to_protect || null,
        generated_at: analysis?.generated_at
      };
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Strategic analyses error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
