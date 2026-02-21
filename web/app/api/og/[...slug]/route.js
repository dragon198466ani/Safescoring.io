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

    if (type === 'hacks' && slugParts[1]) {
      return await generateHackOG(slugParts[1]);
    }

    if (type === 'scorecard' && slugParts[1]) {
      return await generateScoreCard(slugParts[1]);
    }

    if (type === 'blog' && slugParts[1]) {
      return await generateBlogOG(slugParts[1]);
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

async function generateHackOG(slug) {
  let hackTitle = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  let amount = '$???M';
  let scoreBefore = null;
  let category = 'HACK';

  if (isSupabaseConfigured()) {
    const { data: hack } = await supabase
      .from('incidents')
      .select('title, amount_usd, safescore_before, category')
      .eq('slug', slug)
      .maybeSingle();

    if (hack) {
      hackTitle = hack.title || hackTitle;
      category = hack.category || category;
      scoreBefore = hack.safescore_before;
      if (hack.amount_usd) {
        if (hack.amount_usd >= 1e9) amount = `$${(hack.amount_usd / 1e9).toFixed(1)}B`;
        else if (hack.amount_usd >= 1e6) amount = `$${Math.round(hack.amount_usd / 1e6)}M`;
        else amount = `$${Math.round(hack.amount_usd / 1e3)}K`;
      }
    }
  }

  const scoreColor = scoreBefore && scoreBefore >= 60 ? COLORS.warning : COLORS.danger;

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          background: `linear-gradient(135deg, #1a0a0a 0%, ${COLORS.bg} 50%, #1a0a0a 100%)`,
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
          <div style={{
            fontSize: 16,
            color: COLORS.danger,
            background: 'rgba(239,68,68,0.15)',
            padding: '6px 16px',
            borderRadius: 8,
            fontWeight: 600,
          }}>
            HACK ANALYSIS
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 60 }}>
          {/* Amount stolen */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 80, fontWeight: 700, color: COLORS.danger, lineHeight: 1 }}>
              {amount}
            </div>
            <div style={{ fontSize: 20, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 2 }}>
              Stolen
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 2, height: 150, background: 'rgba(255,255,255,0.1)' }} />

          {/* Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 450 }}>
            <div style={{ fontSize: 40, fontWeight: 700, color: COLORS.text, lineHeight: 1.2 }}>
              {hackTitle}
            </div>
            {scoreBefore && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 18, color: COLORS.muted }}>Pre-hack SafeScore:</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: scoreColor }}>
                  {scoreBefore}/100
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'center', color: COLORS.muted, fontSize: 20 }}>
          safescoring.io/hacks/{slug}
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );
}

async function generateScoreCard(slug) {
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
  const label = score >= 80 ? 'EXCELLENT' : score >= 60 ? 'GOOD' : 'AT RISK';

  // Square format optimized for Twitter sharing (1:1)
  return new ImageResponse(
    (
      <div
        style={{
          width: 800,
          height: 800,
          background: `linear-gradient(135deg, ${COLORS.bg} 0%, #1a1a3e 100%)`,
          display: 'flex',
          flexDirection: 'column',
          padding: 50,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.text }}>
            <span style={{ color: COLORS.primary }}>Safe</span>Scoring
          </div>
          <div style={{ fontSize: 16, color: COLORS.muted }}>{productType}</div>
        </div>

        {/* Product name */}
        <div style={{ fontSize: 44, fontWeight: 700, color: COLORS.text, marginBottom: 40, textAlign: 'center' }}>
          {productName}
        </div>

        {/* Score circle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
          <div
            style={{
              width: 240,
              height: 240,
              borderRadius: '50%',
              background: COLORS.card,
              border: `8px solid ${scoreColor}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ fontSize: 100, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
              {score}
            </div>
            <div style={{ fontSize: 18, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 3 }}>
              {label}
            </div>
          </div>
        </div>

        {/* SAFE pillars bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 32,
          background: COLORS.card,
          borderRadius: 16,
          padding: '24px 40px',
        }}>
          {[
            { code: 'S', label: 'Security', score: scores.s, color: COLORS.primary },
            { code: 'A', label: 'Adversity', score: scores.a, color: '#8b5cf6' },
            { code: 'F', label: 'Fidelity', score: scores.f, color: COLORS.warning },
            { code: 'E', label: 'Efficiency', score: scores.e, color: '#06b6d4' },
          ].map(p => (
            <div key={p.code} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: p.color }}>{p.code}</div>
              <div style={{ fontSize: 28, fontWeight: 600, color: COLORS.text }}>{p.score}</div>
              <div style={{ fontSize: 12, color: COLORS.muted }}>{p.label}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'auto', paddingTop: 24 }}>
          <div style={{ fontSize: 18, color: COLORS.muted }}>
            916 norms &bull; 0 opinion &bull; 1 score &bull; safescoring.io
          </div>
        </div>
      </div>
    ),
    { width: 800, height: 800 }
  );
}

async function generateBlogOG(slug) {
  // Map slug to article title for known articles
  const titles = {
    'what-is-safe-score': 'What Is a SAFE Score?',
    'crypto-security-checklist-2025': 'Crypto Security Checklist 2025',
    'why-audits-are-not-enough': 'Why Audits Are Not Enough',
    'how-to-compare-crypto-wallets': 'How to Compare Crypto Wallets',
  };

  const title = titles[slug] || slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          background: `linear-gradient(135deg, ${COLORS.bg} 0%, #1a1a3e 50%, #0f2027 100%)`,
          display: 'flex',
          flexDirection: 'column',
          padding: 60,
          justifyContent: 'space-between',
        }}
      >
        {/* Top: Category badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              background: `${COLORS.primary}20`,
              border: `1px solid ${COLORS.primary}40`,
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 18,
              color: COLORS.primary,
              fontWeight: 600,
            }}
          >
            SafeScoring Blog
          </div>
        </div>

        {/* Middle: Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            flex: 1,
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: 52,
              fontWeight: 800,
              color: COLORS.text,
              lineHeight: 1.2,
              maxWidth: '90%',
            }}
          >
            {title}
          </div>
        </div>

        {/* Bottom: Branding */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: COLORS.text,
              }}
            >
              <span style={{ color: COLORS.primary }}>Safe</span>Scoring
            </div>
          </div>
          <div style={{ fontSize: 18, color: COLORS.muted }}>
            safescoring.io
          </div>
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
