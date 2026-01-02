import { ImageResponse } from 'next/og';
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

/**
 * Dynamic OG Image Generator
 * Automatically generates social sharing images for any page.
 *
 * Usage:
 * - /api/og/products/ledger-nano-x -> Product OG image
 * - /api/og/compare/ledger-nano-x/trezor-model-t -> Comparison OG image
 * - /api/og/leaderboard -> Leaderboard OG image
 */

export const runtime = 'edge';

// Image dimensions
const WIDTH = 1200;
const HEIGHT = 630;

// Brand colors
const COLORS = {
  bg: '#0f172a',
  card: '#1e293b',
  text: '#f8fafc',
  muted: '#94a3b8',
  primary: '#00d4aa',
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#22c55e',
};

export async function GET(request, { params }) {
  const slugParts = params.slug || [];
  const type = slugParts[0]; // 'products', 'compare', 'leaderboard', etc.

  try {
    if (type === 'products' && slugParts[1]) {
      return await generateProductOG(slugParts[1]);
    }

    if (type === 'compare' && slugParts[1] && slugParts[2]) {
      return await generateComparisonOG(slugParts[1], slugParts[2]);
    }

    if (type === 'leaderboard') {
      return await generateLeaderboardOG();
    }

    // Default OG image
    return generateDefaultOG();
  } catch (error) {
    console.error('OG generation error:', error);
    return generateDefaultOG();
  }
}

async function generateProductOG(slug) {
  let productName = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  let score = 0;
  let scores = { s: 0, a: 0, f: 0, e: 0 };
  let productType = 'Crypto Product';

  if (isSupabaseConfigured()) {
    const { data: product } = await supabase
      .from('products')
      .select('id, name, type_id')
      .eq('slug', slug)
      .maybeSingle();

    if (product) {
      productName = product.name;

      if (product.type_id) {
        const { data: typeData } = await supabase
          .from('product_types')
          .select('name')
          .eq('id', product.type_id)
          .maybeSingle();
        if (typeData) productType = typeData.name;
      }

      const { data: scoreData } = await supabase
        .from('safe_scoring_results')
        .select('note_finale, score_s, score_a, score_f, score_e')
        .eq('product_id', product.id)
        .order('calculated_at', { ascending: false })
        .limit(1);

      if (scoreData?.[0]) {
        score = Math.round(scoreData[0].note_finale || 0);
        scores = {
          s: Math.round(scoreData[0].score_s || 0),
          a: Math.round(scoreData[0].score_a || 0),
          f: Math.round(scoreData[0].score_f || 0),
          e: Math.round(scoreData[0].score_e || 0),
        };
      }
    }
  }

  const scoreColor = score >= 80 ? COLORS.success : score >= 60 ? COLORS.warning : COLORS.danger;

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          background: `linear-gradient(135deg, ${COLORS.bg} 0%, #1a1a3e 100%)`,
          display: 'flex',
          flexDirection: 'column',
          padding: 60,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: COLORS.text }}>
            <span style={{ color: COLORS.primary }}>Safe</span>Scoring
          </div>
          <div style={{ fontSize: 20, color: COLORS.muted }}>{productType}</div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 80 }}>
          {/* Score circle */}
          <div
            style={{
              width: 280,
              height: 280,
              borderRadius: '50%',
              background: COLORS.card,
              border: `8px solid ${scoreColor}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ fontSize: 120, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
              {score}
            </div>
            <div style={{ fontSize: 24, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 2 }}>
              SafeScore
            </div>
          </div>

          {/* Product info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ fontSize: 56, fontWeight: 700, color: COLORS.text, maxWidth: 500 }}>
              {productName}
            </div>

            {/* SAFE pillars */}
            <div style={{ display: 'flex', gap: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: COLORS.primary }}>S</div>
                <div style={{ fontSize: 24, color: COLORS.muted }}>{scores.s}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#8b5cf6' }}>A</div>
                <div style={{ fontSize: 24, color: COLORS.muted }}>{scores.a}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: COLORS.warning }}>F</div>
                <div style={{ fontSize: 24, color: COLORS.muted }}>{scores.f}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#06b6d4' }}>E</div>
                <div style={{ fontSize: 24, color: COLORS.muted }}>{scores.e}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'center', color: COLORS.muted, fontSize: 20 }}>
          safescoring.io/products/{slug}
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );
}

async function generateComparisonOG(slugA, slugB) {
  // Fetch both products
  let productA = { name: slugA.replace(/-/g, ' '), score: 0 };
  let productB = { name: slugB.replace(/-/g, ' '), score: 0 };

  if (isSupabaseConfigured()) {
    for (const [slug, target] of [[slugA, productA], [slugB, productB]]) {
      const { data: product } = await supabase
        .from('products')
        .select('id, name')
        .eq('slug', slug)
        .maybeSingle();

      if (product) {
        target.name = product.name;

        const { data: scoreData } = await supabase
          .from('safe_scoring_results')
          .select('note_finale')
          .eq('product_id', product.id)
          .order('calculated_at', { ascending: false })
          .limit(1);

        if (scoreData?.[0]) {
          target.score = Math.round(scoreData[0].note_finale || 0);
        }
      }
    }
  }

  const winnerColor = productA.score >= productB.score ? COLORS.success : COLORS.danger;
  const loserColor = productA.score < productB.score ? COLORS.success : COLORS.danger;

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          background: `linear-gradient(135deg, ${COLORS.bg} 0%, #1a1a3e 100%)`,
          display: 'flex',
          flexDirection: 'column',
          padding: 60,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: COLORS.text }}>
            <span style={{ color: COLORS.primary }}>Safe</span>Scoring
          </div>
          <div style={{ fontSize: 24, color: COLORS.muted }}>Security Comparison</div>
        </div>

        {/* Comparison */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
          {/* Product A */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: COLORS.card,
                border: `6px solid ${winnerColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 72,
                fontWeight: 700,
                color: winnerColor,
              }}
            >
              {productA.score}
            </div>
            <div style={{ fontSize: 28, fontWeight: 600, color: COLORS.text, textAlign: 'center', maxWidth: 250 }}>
              {productA.name}
            </div>
          </div>

          {/* VS */}
          <div style={{ fontSize: 48, fontWeight: 700, color: COLORS.muted }}>VS</div>

          {/* Product B */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: COLORS.card,
                border: `6px solid ${loserColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 72,
                fontWeight: 700,
                color: loserColor,
              }}
            >
              {productB.score}
            </div>
            <div style={{ fontSize: 28, fontWeight: 600, color: COLORS.text, textAlign: 'center', maxWidth: 250 }}>
              {productB.name}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'center', color: COLORS.muted, fontSize: 20 }}>
          safescoring.io/compare/{slugA}/{slugB}
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );
}

async function generateLeaderboardOG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          background: `linear-gradient(135deg, ${COLORS.bg} 0%, #1a1a3e 100%)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 32,
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 700, color: COLORS.text }}>
          <span style={{ color: COLORS.primary }}>Safe</span>Scoring
        </div>
        <div style={{ fontSize: 72, fontWeight: 700, color: COLORS.text }}>
          🏆 Security Leaderboard
        </div>
        <div style={{ fontSize: 28, color: COLORS.muted }}>
          Top-rated crypto products by security score
        </div>
        <div style={{ fontSize: 24, color: COLORS.primary, marginTop: 32 }}>
          safescoring.io/leaderboard
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );
}

function generateDefaultOG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          background: `linear-gradient(135deg, ${COLORS.bg} 0%, #1a1a3e 100%)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 700, color: COLORS.text }}>
          <span style={{ color: COLORS.primary }}>Safe</span>Scoring
        </div>
        <div style={{ fontSize: 32, color: COLORS.muted }}>
          Crypto Security Ratings You Can Trust
        </div>
        <div style={{ fontSize: 24, color: COLORS.text, marginTop: 24 }}>
          916 norms • 500+ products • Objective scores
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );
}
