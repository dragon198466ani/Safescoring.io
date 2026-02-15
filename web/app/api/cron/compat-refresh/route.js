import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Vercel cron: every 30 minutes
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Generate SAFE warnings with templates (FREE - no API)
function generateSafeWarnings(pa, pb) {
  const scoreS = Math.round(((pa.pilier_s || 0) + (pb.pilier_s || 0)) / 2);
  const scoreA = Math.round(((pa.pilier_a || 0) + (pb.pilier_a || 0)) / 2);
  const scoreF = Math.round(((pa.pilier_f || 0) + (pb.pilier_f || 0)) / 2);
  const scoreE = Math.round(((pa.pilier_e || 0) + (pb.pilier_e || 0)) / 2);

  const secLevel = scoreS >= 70 ? 'HIGH' : scoreS >= 50 ? 'MEDIUM' : 'LOW';

  return {
    safe_warning_s: `SECURITE (${scoreS}/100) - SITUATION: Vous utilisez ${pa.name} avec ${pb.name} et une fausse pop-up demande confirmation. CAS EXTREME: Hacker vide votre wallet. SOLUTION: 1) Fermez sans signer 2) revoke.cash 3) Pour eviter: bookmarkez sites officiels.`,
    safe_warning_a: `ADVERSITE (${scoreA}/100) - SITUATION: On vous agresse pendant utilisation de ${pa.name} + ${pb.name}. CAS EXTREME: Menace physique pour transferer. SOLUTION: 1) Wallet LEURRE (100 EUR) 2) Passphrase 25eme mot 3) Pour eviter: ne parlez jamais de crypto.`,
    safe_warning_f: `FIABILITE (${scoreF}/100) - SITUATION: ${pa.name} ou ${pb.name} en panne/maintenance. CAS EXTREME: Service ferme. SOLUTION: 1) Vos cryptos sont sur blockchain 2) Recovery BIP39 24 mots 3) Pour eviter: testez restauration, seed sur metal.`,
    safe_warning_e: `EFFICACITE (${scoreE}/100) - SITUATION: Usage quotidien ${pa.name} + ${pb.name}. OPTIMISATION: 1) Groupez transactions 2) L2 = -90% frais 3) Dimanche soir = frais bas 4) Testez petit montant.`,
    security_level: secLevel,
    ai_method: `Utilisez ${pa.name} avec ${pb.name} pour une experience crypto optimisee.`
  };
}

export async function GET(request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  try {
    // Get pending products from queue
    const { data: queue, error: queueError } = await supabase
      .from('compat_refresh_queue')
      .select('product_id')
      .is('processed_at', null)
      .limit(20); // Limit for API rate

    if (queueError) throw queueError;

    if (!queue || queue.length === 0) {
      return NextResponse.json({ message: 'No pending updates', processed: 0 });
    }

    const productIds = [...new Set(queue.map(q => q.product_id))];
    console.log(`Processing ${productIds.length} products with Claude`);

    // Get products with scores
    const { data: products } = await supabase
      .from('products')
      .select('id, name, slug, pilier_s, pilier_a, pilier_f, pilier_e, url')
      .in('id', productIds);

    const _productMap = Object.fromEntries(products.map(p => [p.id, p]));

    // Get ALL products for pair analysis
    const { data: allProducts } = await supabase
      .from('products')
      .select('id, name, slug, pilier_s, pilier_a, pilier_f, pilier_e, url');

    const allProductMap = Object.fromEntries(allProducts.map(p => [p.id, p]));

    // Get affected pairs
    const { data: pairsA } = await supabase
      .from('product_compatibility')
      .select('product_a_id, product_b_id')
      .in('product_a_id', productIds);

    const { data: pairsB } = await supabase
      .from('product_compatibility')
      .select('product_a_id, product_b_id')
      .in('product_b_id', productIds);

    const allPairs = [...(pairsA || []), ...(pairsB || [])];
    const uniquePairs = [...new Map(allPairs.map(p =>
      [`${Math.min(p.product_a_id, p.product_b_id)}-${Math.max(p.product_a_id, p.product_b_id)}`, p]
    )).values()];

    console.log(`Found ${uniquePairs.length} pairs to regenerate with Claude`);

    // Process pairs with Claude (limit to 10 per run for rate limits)
    let updated = 0;
    for (const pair of uniquePairs.slice(0, 10)) {
      const pa = allProductMap[pair.product_a_id];
      const pb = allProductMap[pair.product_b_id];

      if (!pa || !pb) continue;

      // Call Claude for SAFE warnings
      const warnings = await generateSafeWarnings(pa, pb);

      if (warnings) {
        const scoreS = Math.round(((pa.pilier_s || 0) + (pb.pilier_s || 0)) / 2);
        const scoreA = Math.round(((pa.pilier_a || 0) + (pb.pilier_a || 0)) / 2);
        const scoreF = Math.round(((pa.pilier_f || 0) + (pb.pilier_f || 0)) / 2);
        const scoreE = Math.round(((pa.pilier_e || 0) + (pb.pilier_e || 0)) / 2);

        const { error: updateError } = await supabase
          .from('product_compatibility')
          .update({
            safe_warning_s: warnings.safe_warning_s?.slice(0, 500),
            safe_warning_a: warnings.safe_warning_a?.slice(0, 500),
            safe_warning_f: warnings.safe_warning_f?.slice(0, 500),
            safe_warning_e: warnings.safe_warning_e?.slice(0, 500),
            security_level: warnings.security_level || 'MEDIUM',
            ai_method: warnings.ai_method?.slice(0, 500),
            ai_justification: `Claude auto-refresh: S${scoreS} A${scoreA} F${scoreF} E${scoreE}`,
            analyzed_at: new Date().toISOString(),
            analyzed_by: 'claude_cron_vercel'
          })
          .eq('product_a_id', Math.min(pair.product_a_id, pair.product_b_id))
          .eq('product_b_id', Math.max(pair.product_a_id, pair.product_b_id));

        if (!updateError) {
          updated++;
          console.log(`OK: ${pa.name} x ${pb.name}`);
        }
      }

      // Rate limit: 1 request per 2 seconds
      await new Promise(r => setTimeout(r, 2000));
    }

    // Mark queue items as processed
    await supabase
      .from('compat_refresh_queue')
      .update({ processed_at: new Date().toISOString() })
      .in('product_id', productIds)
      .is('processed_at', null);

    return NextResponse.json({
      message: 'Claude compatibility refresh complete',
      products: productIds.length,
      pairs: uniquePairs.length,
      updated_with_claude: updated
    });

  } catch (error) {
    console.error('Compat refresh error:', error);
    return NextResponse.json({ error: "Compatibility refresh failed" }, { status: 500 });
  }
}
