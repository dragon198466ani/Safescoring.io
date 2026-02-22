import { NextResponse } from 'next/server';
import { supabase } from '@/libs/supabase';

/**
 * GET /api/products/[slug]/community-stats
 * Returns community voting statistics for a product
 */
export async function GET(req, { params }) {
  try {
    const { slug } = params;

    // Get product
    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Get all votes for this product
    const { data: votes } = await supabase
      .from('evaluation_votes')
      .select('vote_agrees, status, vote_weight')
      .eq('product_id', product.id);

    const stats = {
      total_votes: votes?.length || 0,
      total_agrees: votes?.filter(v => v.vote_agrees).length || 0,
      total_disagrees: votes?.filter(v => !v.vote_agrees).length || 0,
      validated_challenges: votes?.filter(v => !v.vote_agrees && v.status === 'validated').length || 0,
      rejected_challenges: votes?.filter(v => !v.vote_agrees && v.status === 'rejected').length || 0,
      pending_challenges: votes?.filter(v => !v.vote_agrees && v.status === 'pending').length || 0,
      total_weight: votes?.reduce((sum, v) => sum + (v.vote_weight || 0), 0) || 0,
      ai_accuracy: 0
    };

    // Calculate AI accuracy (percentage where community agrees with AI)
    if (stats.total_votes > 0) {
      stats.ai_accuracy = Math.round(
        ((stats.total_agrees + stats.rejected_challenges) / stats.total_votes) * 100
      );
    }

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Community stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
