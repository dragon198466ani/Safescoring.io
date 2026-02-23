import { NextResponse } from 'next/server';
import { supabase } from '@/libs/supabase';
import { auth } from '@/libs/auth';

/**
 * GET /api/setups/[id]/narrative-analysis
 * Returns AI-generated narrative analysis for a setup (product combination).
 *
 * Data sources:
 * - setup_pillar_narratives: per-pillar narrative (S, A, F, E)
 * - setup_risk_analysis: global cross-product risk synthesis
 *
 * Access: Owner of the setup OR shared setup (via share_token)
 */
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const setupId = parseInt(id);

    if (!setupId || isNaN(setupId)) {
      return NextResponse.json({ error: 'Invalid setup ID' }, { status: 400 });
    }

    // Check authentication
    const session = await auth();

    // Fetch the setup to verify access
    const { data: setup, error: setupError } = await supabase
      .from('user_setups')
      .select('id, user_id, name, share_token')
      .eq('id', setupId)
      .single();

    if (setupError || !setup) {
      return NextResponse.json({ error: 'Setup not found' }, { status: 404 });
    }

    // Access control: must be owner OR setup must be shared
    const isOwner = session?.user?.id === setup.user_id;
    const isShared = !!setup.share_token;
    if (!isOwner && !isShared) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch pillar narratives
    const { data: narratives, error: narrativesError } = await supabase
      .from('setup_pillar_narratives')
      .select('*')
      .eq('setup_id', setupId);

    if (narrativesError) {
      console.error('Error fetching setup narratives:', narrativesError);
    }

    // Fetch risk analysis
    const { data: riskAnalysis, error: riskError } = await supabase
      .from('setup_risk_analysis')
      .select('*')
      .eq('setup_id', setupId)
      .single();

    if (riskError && riskError.code !== 'PGRST116') {
      // PGRST116 = no rows (not an error, just no data yet)
      console.error('Error fetching setup risk analysis:', riskError);
    }

    // Format pillar narratives
    const pillarAnalysis = {};
    const pillarNames = { S: 'Security', A: 'Adversity', F: 'Fidelity', E: 'Efficiency' };

    for (const pillar of ['S', 'A', 'F', 'E']) {
      const narrative = narratives?.find(n => n.pillar === pillar);

      pillarAnalysis[pillar] = {
        name: pillarNames[pillar],
        score: narrative?.pillar_score || 0,

        // Narrative content
        summary: narrative?.narrative_summary || null,
        strengths: narrative?.key_strengths || null,
        weaknesses: narrative?.key_weaknesses || null,
        securityStrategy: narrative?.security_strategy || null,

        // Risk analysis
        worstCase: narrative?.worst_case_scenario || null,
        riskLevel: narrative?.risk_level || 'unknown',
        mitigation: narrative?.mitigation_advice || null,

        // Setup-specific
        productsCount: narrative?.products_count || 0,
        weakestProduct: narrative?.weakest_product_name || null,
        weakestProductScore: narrative?.weakest_product_score || null,

        // Metadata
        lastUpdated: narrative?.last_updated_at || null,
        aiModel: narrative?.ai_model || null,
      };
    }

    // Check if any narrative data actually exists
    const hasNarratives = narratives && narratives.length > 0 &&
      narratives.some(n => n.narrative_summary && n.narrative_summary !== '');

    // Format response
    const response = {
      success: true,
      setupId,
      setupName: setup.name,
      hasNarratives,

      pillarAnalysis,

      riskAnalysis: riskAnalysis ? {
        overallRisk: riskAnalysis.overall_risk_level,
        narrative: riskAnalysis.overall_risk_narrative,
        combinedWorstCase: riskAnalysis.combined_worst_case,
        attackVectors: riskAnalysis.attack_vectors || [],
        priorityMitigations: riskAnalysis.priority_mitigations || [],
        interactionRisks: riskAnalysis.interaction_risks || [],
        gapAnalysis: riskAnalysis.gap_analysis || [],
        harmonyScore: riskAnalysis.harmony_score,
        productsCount: riskAnalysis.products_count,
        totalScore: riskAnalysis.total_score,
        weakestPillar: riskAnalysis.weakest_pillar,
        strongestPillar: riskAnalysis.strongest_pillar,
        executiveSummary: riskAnalysis.executive_summary,
        lastUpdated: riskAnalysis.last_updated_at,
      } : null,

      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
      },
    });

  } catch (error) {
    console.error('Setup narrative analysis API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch setup narrative analysis' },
      { status: 500 }
    );
  }
}
