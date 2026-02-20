import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Personalized Newsletter per Setup
 *
 * Envoie une newsletter personnalisée à chaque utilisateur basée sur son setup:
 * - Changements de score des produits dans son setup
 * - Nouvelles évaluations communautaires
 * - Corrections validées
 * - Incidents sur ses produits
 *
 * Cron: 0 8 * * 1 (Lundi 8h UTC)
 */

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Missing Supabase config" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://safescoring.io";
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  try {
    // 1. Get all users with setups who have email notifications enabled
    const { data: usersWithSetups, error: usersError } = await supabase
      .from("setups")
      .select(`
        user_id,
        name,
        products,
        users:user_id (
          id,
          email,
          name,
          plan,
          has_access
        )
      `)
      .not("products", "is", null);

    if (usersError) {
      console.error("Error fetching setups:", usersError);
      return NextResponse.json({ error: "Failed to fetch setups" }, { status: 500 });
    }

    // Group setups by user
    const userSetups = {};
    for (const setup of usersWithSetups || []) {
      if (!setup.user_id || !setup.users?.email) continue;

      if (!userSetups[setup.user_id]) {
        userSetups[setup.user_id] = {
          user: setup.users,
          plan: setup.users.plan || "free", // Current user plan
          setups: [],
          productIds: new Set(),
        };
      }

      userSetups[setup.user_id].setups.push({
        name: setup.name,
        products: setup.products || [],
      });

      // Collect all product IDs from all setups
      (setup.products || []).forEach(p => {
        if (p.id) userSetups[setup.user_id].productIds.add(p.id);
      });
    }

    // 2. Get all changes this week (score changes, corrections, incidents, warnings)
    const { data: allScoreChanges } = await supabase
      .from("evaluation_history")
      .select("product_id, old_score, new_score, pillar, created_at")
      .gte("created_at", oneWeekAgo.toISOString());

    const { data: allCorrections } = await supabase
      .from("correction_proposals")
      .select("product_id, field_type, proposed_value, status, validated_at")
      .eq("status", "validated")
      .gte("validated_at", oneWeekAgo.toISOString());

    const { data: allIncidents } = await supabase
      .from("incidents")
      .select("product_id, title, severity, date, description, loss_amount")
      .gte("date", oneWeekAgo.toISOString());

    // Get global crypto hacks this week (for awareness)
    const { data: globalHacks } = await supabase
      .from("incidents")
      .select("product_id, title, severity, date, loss_amount, products(name, slug)")
      .gte("date", oneWeekAgo.toISOString())
      .in("severity", ["critical", "high"])
      .order("date", { ascending: false })
      .limit(5);

    // Get physical incidents / crypto seizures
    const { data: physicalIncidents } = await supabase
      .from("physical_incidents")
      .select("id, title, description, country, date")
      .gte("date", oneWeekAgo.toISOString())
      .limit(3);

    // 3. Get product details for all affected products
    const allAffectedProductIds = new Set([
      ...(allScoreChanges || []).map(c => c.product_id),
      ...(allCorrections || []).map(c => c.product_id),
      ...(allIncidents || []).map(i => i.product_id),
    ]);

    const { data: products } = await supabase
      .from("products")
      .select("id, name, slug, score, realtime_warnings, safe_warnings")
      .in("id", Array.from(allAffectedProductIds));

    const productMap = {};
    (products || []).forEach(p => productMap[p.id] = p);

    // 4. Generate personalized content for each user
    const newsletters = [];
    let sentCount = 0;
    let skippedCount = 0;

    for (const [userId, userData] of Object.entries(userSetups)) {
      const userProductIds = Array.from(userData.productIds);

      if (userProductIds.length === 0) {
        skippedCount++;
        continue;
      }

      // Filter changes for this user's products only
      const userScoreChanges = (allScoreChanges || [])
        .filter(c => userProductIds.includes(c.product_id))
        .map(c => ({ ...c, product: productMap[c.product_id] }));

      const userCorrections = (allCorrections || [])
        .filter(c => userProductIds.includes(c.product_id))
        .map(c => ({ ...c, product: productMap[c.product_id] }));

      const userIncidents = (allIncidents || [])
        .filter(i => userProductIds.includes(i.product_id))
        .map(i => ({ ...i, product: productMap[i.product_id] }));

      // Get SAFE warnings for user's products
      const userWarnings = [];
      for (const productId of userProductIds) {
        const product = productMap[productId];
        if (product?.realtime_warnings) {
          userWarnings.push(...(product.realtime_warnings || []).map(w => ({
            ...w,
            product: product,
          })));
        }
        if (product?.safe_warnings) {
          userWarnings.push(...(product.safe_warnings || []).map(w => ({
            ...w,
            product: product,
          })));
        }
      }

      // Always include content - even if no changes, show warnings and global hacks
      const hasUpdates = userScoreChanges.length > 0 || userCorrections.length > 0 || userIncidents.length > 0;
      const hasWarnings = userWarnings.length > 0;
      const hasGlobalHacks = (globalHacks || []).length > 0;

      // Skip only if absolutely nothing to report
      if (!hasUpdates && !hasWarnings && !hasGlobalHacks) {
        skippedCount++;
        continue;
      }

      // Generate personalized content
      const content = generatePersonalizedNewsletter({
        user: userData.user,
        plan: userData.plan,
        setups: userData.setups,
        scoreChanges: userScoreChanges,
        corrections: userCorrections,
        incidents: userIncidents,
        warnings: userWarnings,
        globalHacks: globalHacks || [],
        physicalIncidents: physicalIncidents || [],
        siteUrl,
      });

      // Store newsletter for this user
      const { error: insertError } = await supabase
        .from("user_newsletters")
        .insert({
          user_id: userId,
          subject: content.subject,
          content_html: content.html,
          content_text: content.text,
          stats: {
            score_changes: userScoreChanges.length,
            corrections: userCorrections.length,
            incidents: userIncidents.length,
            warnings: userWarnings.length,
            global_hacks: (globalHacks || []).length,
            products_tracked: userProductIds.length,
          },
          status: "pending",
          created_at: new Date().toISOString(),
        });

      if (!insertError) {
        newsletters.push({
          user_id: userId,
          email: userData.user.email,
          products_tracked: userProductIds.length,
          updates: userScoreChanges.length + userCorrections.length + userIncidents.length,
        });
        sentCount++;
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        total_users_with_setups: Object.keys(userSetups).length,
        newsletters_generated: sentCount,
        users_skipped_no_updates: skippedCount,
      },
      newsletters: newsletters.slice(0, 10), // Preview first 10
    });

  } catch (error) {
    console.error("Personalized newsletter error:", error);
    return NextResponse.json({ error: "Failed to generate newsletters" }, { status: 500 });
  }
}

/**
 * Get upgrade promotion based on current plan
 */
function getUpgradePromotion(currentPlan, siteUrl) {
  const plans = {
    free: {
      nextPlan: "Explorer",
      nextPrice: "$19/mo",
      highlight: "Unlock 5 setups, 50 AI messages/day, and PDF exports",
      cta: "Try Explorer Free for 14 Days",
      link: `${siteUrl}/pricing?plan=explorer`,
    },
    explorer: {
      nextPlan: "Professional",
      nextPrice: "$39/mo",
      highlight: "Get 20 setups, API access, and historical tracking",
      cta: "Upgrade to Professional",
      link: `${siteUrl}/pricing?plan=pro`,
    },
    pro: {
      nextPlan: "Enterprise",
      nextPrice: "$499/mo",
      highlight: "Unlimited setups, team sharing, and priority support",
      cta: "Scale with Enterprise",
      link: `${siteUrl}/pricing?plan=enterprise`,
    },
    professional: {
      nextPlan: "Enterprise",
      nextPrice: "$499/mo",
      highlight: "Unlimited setups, team sharing, and priority support",
      cta: "Scale with Enterprise",
      link: `${siteUrl}/pricing?plan=enterprise`,
    },
    enterprise: null, // No upsell for enterprise
  };

  return plans[currentPlan?.toLowerCase()] || plans.free;
}

/**
 * Generate personalized newsletter content
 */
function generatePersonalizedNewsletter({ user, plan, setups, scoreChanges, corrections, incidents, warnings, globalHacks, physicalIncidents, siteUrl }) {
  const weekDate = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const userName = user.name || "there";
  const setupNames = setups.map(s => s.name).join(", ");

  // Separate score improvements and declines
  const improvements = scoreChanges.filter(c => c.new_score > c.old_score);
  const declines = scoreChanges.filter(c => c.new_score < c.old_score);

  // Priority subject based on severity
  let subject;
  if (incidents.length > 0) {
    subject = `ALERT: ${incidents.length} incident(s) affecting your setup this week`;
  } else if (warnings?.length > 0) {
    subject = `${warnings.length} SAFE warning(s) on your products`;
  } else if (globalHacks?.length > 0) {
    subject = `Crypto Security Alert: ${globalHacks.length} major hack(s) this week`;
  } else if (scoreChanges.length > 0) {
    subject = `Your setup update: ${improvements.length} improvements, ${declines.length} declines`;
  } else {
    subject = `Weekly SAFE Security Digest`;
  }

  // TEXT VERSION - Professional format
  const productCount = setups.reduce((acc, s) => acc + (s.products?.length || 0), 0);

  // Count for summary
  const totalAlerts = incidents.length + (warnings?.length || 0);
  const totalChanges = improvements.length + declines.length;

  // Get upgrade promotion based on plan
  const upgradePromo = getUpgradePromotion(plan, siteUrl);

  const text = `
SAFESCORING WEEKLY REPORT
${weekDate}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hi ${userName},

Setup: ${setupNames}
Products monitored: ${productCount}

SUMMARY
• Alerts: ${totalAlerts}
• Score improvements: ${improvements.length}
• Score declines: ${declines.length}

${incidents.length > 0 ? `
━━━ SECURITY INCIDENTS ━━━
${incidents.map(i => `
▸ ${i.product?.name}
  ${i.title}
  Severity: ${i.severity}${i.loss_amount ? ` | Loss: $${i.loss_amount}` : ''}
`).join('')}
` : ''}
${warnings?.length > 0 ? `
━━━ SAFE WARNINGS ━━━
${warnings.slice(0, 5).map(w => `
▸ ${w.product?.name}
  ${w.message || w.warning || w}
`).join('')}
` : ''}
${globalHacks?.length > 0 ? `
━━━ INDUSTRY INCIDENTS ━━━
For your awareness - these do not affect your setup directly.
${globalHacks.map(h => `
▸ ${h.products?.name || 'Unknown'}
  ${h.title}${h.loss_amount ? ` ($${h.loss_amount} lost)` : ''}
`).join('')}
` : ''}
${improvements.length > 0 ? `
━━━ SCORE IMPROVEMENTS ━━━
${improvements.map(c => `▸ ${c.product?.name}: ${c.old_score} → ${c.new_score} (+${c.new_score - c.old_score})`).join('\n')}
` : ''}
${declines.length > 0 ? `
━━━ SCORE DECLINES ━━━
Review recommended for these products:
${declines.map(c => `▸ ${c.product?.name}: ${c.old_score} → ${c.new_score} (${c.new_score - c.old_score})`).join('\n')}
` : ''}
${corrections.length > 0 ? `
━━━ COMMUNITY UPDATES ━━━
${corrections.map(c => `▸ ${c.product?.name}: ${c.field_type} verified by community`).join('\n')}
` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

View full report: ${siteUrl}/dashboard/setups

━━━ HOW COMMUNITY VOTING WORKS ━━━

Our scores combine expert methodology + community validation:

1. Base Score: AI evaluates each product against 2,354 norms
2. Community Input: Users vote on corrections and evaluations
3. Weighted Voting: Your vote power depends on:
   • Reputation level (earned through accurate contributions)
   • Staking level (stake $SAFE tokens for 1.5x-2.5x boost)
   • Historical accuracy (correct predictions = higher weight)

Result: Balanced, crowd-verified security intelligence.

Learn more: ${siteUrl}/methodology

━━━ EARN $SAFE TOKENS ━━━

Participate in the community and earn rewards:

⭐ Evaluate Products     +10 points per evaluation
✓  Vote on Corrections   +5 points per vote
🔒 Stake & Boost         Up to 2.5x vote power

The more you contribute, the higher your reputation.
Higher reputation = more voting power = more rewards.

Start earning: ${siteUrl}/dashboard/rewards
${upgradePromo ? `
━━━ UNLOCK MORE ━━━

You're on the ${plan?.charAt(0).toUpperCase() + plan?.slice(1) || 'Free'} plan.

${upgradePromo.highlight}

→ ${upgradePromo.cta}: ${upgradePromo.link}
` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SafeScoring
Crypto Security Intelligence
${siteUrl}
`;

  // HTML VERSION - Professional & Clean
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SAFE Weekly Report - ${weekDate}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; background: #f8fafc; color: #1e293b; line-height: 1.6; }
    .wrapper { max-width: 640px; margin: 0 auto; padding: 24px 16px; }

    /* Header */
    .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 32px 24px; border-radius: 16px 16px 0 0; }
    .header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .logo { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
    .logo span { color: #60a5fa; }
    .date { font-size: 12px; color: #94a3b8; }
    .greeting { font-size: 24px; font-weight: 600; margin-bottom: 8px; }
    .setup-info { font-size: 14px; color: #cbd5e1; }
    .setup-name { display: inline-block; background: rgba(255,255,255,0.1); padding: 4px 12px; border-radius: 100px; font-size: 13px; margin-top: 8px; }

    /* Summary bar */
    .summary { display: flex; background: #f1f5f9; border-left: 4px solid #3b82f6; }
    .summary-item { flex: 1; padding: 16px 20px; text-align: center; border-right: 1px solid #e2e8f0; }
    .summary-item:last-child { border-right: none; }
    .summary-value { font-size: 28px; font-weight: 700; color: #1e293b; }
    .summary-value.alert { color: #dc2626; }
    .summary-value.success { color: #16a34a; }
    .summary-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-top: 4px; }

    /* Content */
    .content { background: white; padding: 0; }
    .section { padding: 24px; border-bottom: 1px solid #f1f5f9; }
    .section:last-of-type { border-bottom: none; }
    .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
    .section-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; }
    .section-icon.red { background: #fef2f2; }
    .section-icon.yellow { background: #fefce8; }
    .section-icon.purple { background: #faf5ff; }
    .section-icon.green { background: #f0fdf4; }
    .section-icon.blue { background: #eff6ff; }
    .section-title { font-size: 15px; font-weight: 600; color: #1e293b; }
    .section-count { font-size: 12px; color: #64748b; margin-left: auto; }

    /* Cards */
    .card { background: #f8fafc; border-radius: 8px; padding: 14px 16px; margin-bottom: 10px; }
    .card:last-child { margin-bottom: 0; }
    .card-incident { border-left: 3px solid #dc2626; background: #fef2f2; }
    .card-warning { border-left: 3px solid #f59e0b; background: #fffbeb; }
    .card-hack { border-left: 3px solid #7c3aed; background: #faf5ff; }
    .card-title { font-size: 14px; font-weight: 500; color: #1e293b; margin-bottom: 4px; }
    .card-meta { font-size: 12px; color: #64748b; }
    .card-meta strong { color: #dc2626; font-weight: 600; }

    /* Score changes */
    .score-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
    .score-row:last-child { border-bottom: none; }
    .score-product { font-size: 14px; font-weight: 500; }
    .score-change { font-size: 13px; font-weight: 600; padding: 4px 10px; border-radius: 6px; }
    .score-up { background: #dcfce7; color: #166534; }
    .score-down { background: #fee2e2; color: #991b1b; }

    /* CTA */
    .cta { padding: 24px; text-align: center; background: #f8fafc; }
    .cta-button { display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }

    /* Footer */
    .footer { padding: 24px; text-align: center; background: #1e293b; border-radius: 0 0 16px 16px; }
    .footer-text { font-size: 12px; color: #94a3b8; }
    .footer-link { color: #60a5fa; text-decoration: none; }

    /* Empty state */
    .empty-state { text-align: center; padding: 40px 20px; color: #64748b; }
    .empty-icon { font-size: 48px; margin-bottom: 16px; }

    /* Promo section */
    .promo { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); padding: 24px; }
    .promo-title { color: white; font-size: 16px; font-weight: 600; margin-bottom: 16px; text-align: center; }
    .promo-grid { display: flex; gap: 12px; }
    .promo-card { flex: 1; background: rgba(255,255,255,0.1); border-radius: 12px; padding: 16px; text-align: center; }
    .promo-icon { font-size: 24px; margin-bottom: 8px; }
    .promo-label { color: white; font-size: 13px; font-weight: 500; margin-bottom: 4px; }
    .promo-desc { color: #a5b4fc; font-size: 11px; }
    .promo-cta { display: block; background: #6366f1; color: white; text-align: center; padding: 12px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 13px; margin-top: 16px; }

    /* Voting methodology */
    .methodology { background: #f8fafc; padding: 24px; border-top: 1px solid #e2e8f0; }
    .methodology-title { font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .methodology-steps { display: flex; gap: 16px; }
    .methodology-step { flex: 1; text-align: center; }
    .methodology-num { width: 24px; height: 24px; background: #3b82f6; color: white; border-radius: 50%; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 8px; }
    .methodology-label { font-size: 12px; font-weight: 500; color: #1e293b; margin-bottom: 4px; }
    .methodology-desc { font-size: 11px; color: #64748b; line-height: 1.4; }
    .methodology-link { display: inline-block; margin-top: 12px; font-size: 12px; color: #3b82f6; text-decoration: none; }

    /* Upgrade section */
    .upgrade { background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 20px 24px; }
    .upgrade-inner { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
    .upgrade-text { color: white; }
    .upgrade-plan { font-size: 11px; opacity: 0.9; margin-bottom: 4px; }
    .upgrade-highlight { font-size: 14px; font-weight: 500; }
    .upgrade-cta { background: white; color: #059669; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 13px; white-space: nowrap; }
  </style>
</head>
<body>
  <div class="wrapper">
    <!-- Header -->
    <div class="header">
      <div class="header-top">
        <div class="logo">Safe<span>Scoring</span></div>
        <div class="date">${weekDate}</div>
      </div>
      <div class="greeting">Weekly Security Report</div>
      <div class="setup-info">Monitoring ${setups.reduce((acc, s) => acc + (s.products?.length || 0), 0)} products in your setup</div>
      <div class="setup-name">${escapeHtml(setupNames)}</div>
    </div>

    <!-- Summary -->
    <div class="summary">
      <div class="summary-item">
        <div class="summary-value${totalAlerts > 0 ? ' alert' : ''}">${totalAlerts}</div>
        <div class="summary-label">Alerts</div>
      </div>
      <div class="summary-item">
        <div class="summary-value${improvements.length > 0 ? ' success' : ''}">${improvements.length}</div>
        <div class="summary-label">Improvements</div>
      </div>
      <div class="summary-item">
        <div class="summary-value${declines.length > 0 ? ' alert' : ''}">${declines.length}</div>
        <div class="summary-label">Declines</div>
      </div>
    </div>

    <div class="content">
      ${incidents.length > 0 ? `
      <!-- Incidents -->
      <div class="section">
        <div class="section-header">
          <div class="section-icon red">⚠️</div>
          <div class="section-title">Security Incidents</div>
          <div class="section-count">${incidents.length} affecting your setup</div>
        </div>
        ${incidents.map(i => `
        <div class="card card-incident">
          <div class="card-title">${escapeHtml(i.title)}</div>
          <div class="card-meta">
            ${escapeHtml(i.product?.name || 'Unknown')} · ${escapeHtml(i.severity || 'Unknown')}${i.loss_amount ? ` · <strong>$${formatNumber(i.loss_amount)} lost</strong>` : ''}
          </div>
        </div>
        `).join('')}
      </div>
      ` : ''}

      ${warnings?.length > 0 ? `
      <!-- Warnings -->
      <div class="section">
        <div class="section-header">
          <div class="section-icon yellow">⚡</div>
          <div class="section-title">SAFE Warnings</div>
          <div class="section-count">${warnings.length} on your products</div>
        </div>
        ${warnings.slice(0, 5).map(w => `
        <div class="card card-warning">
          <div class="card-title">${escapeHtml(w.message || w.warning || String(w))}</div>
          <div class="card-meta">${escapeHtml(w.product?.name || 'Unknown')}</div>
        </div>
        `).join('')}
      </div>
      ` : ''}

      ${globalHacks?.length > 0 ? `
      <!-- Global Hacks -->
      <div class="section">
        <div class="section-header">
          <div class="section-icon purple">🔓</div>
          <div class="section-title">Industry Incidents</div>
          <div class="section-count">For your awareness</div>
        </div>
        ${globalHacks.map(h => `
        <div class="card card-hack">
          <div class="card-title">${escapeHtml(h.title)}</div>
          <div class="card-meta">${escapeHtml(h.products?.name || 'Unknown')}${h.loss_amount ? ` · $${formatNumber(h.loss_amount)} lost` : ''}</div>
        </div>
        `).join('')}
      </div>
      ` : ''}

      ${improvements.length > 0 ? `
      <!-- Improvements -->
      <div class="section">
        <div class="section-header">
          <div class="section-icon green">📈</div>
          <div class="section-title">Score Improvements</div>
        </div>
        ${improvements.map(c => `
        <div class="score-row">
          <span class="score-product">${escapeHtml(c.product?.name || 'Unknown')}</span>
          <span class="score-change score-up">${c.old_score} → ${c.new_score} (+${c.new_score - c.old_score})</span>
        </div>
        `).join('')}
      </div>
      ` : ''}

      ${declines.length > 0 ? `
      <!-- Declines -->
      <div class="section">
        <div class="section-header">
          <div class="section-icon red">📉</div>
          <div class="section-title">Score Declines</div>
          <div class="section-count">Review recommended</div>
        </div>
        ${declines.map(c => `
        <div class="score-row">
          <span class="score-product">${escapeHtml(c.product?.name || 'Unknown')}</span>
          <span class="score-change score-down">${c.old_score} → ${c.new_score} (${c.new_score - c.old_score})</span>
        </div>
        `).join('')}
      </div>
      ` : ''}

      ${corrections.length > 0 ? `
      <!-- Community -->
      <div class="section">
        <div class="section-header">
          <div class="section-icon blue">👥</div>
          <div class="section-title">Community Updates</div>
        </div>
        ${corrections.map(c => `
        <div class="card">
          <div class="card-title">${escapeHtml(c.product?.name || 'Unknown')}</div>
          <div class="card-meta">${escapeHtml(c.field_type)} updated via community verification</div>
        </div>
        `).join('')}
      </div>
      ` : ''}

      ${totalAlerts === 0 && totalChanges === 0 && corrections.length === 0 ? `
      <!-- Empty State -->
      <div class="empty-state">
        <div class="empty-icon">✅</div>
        <div class="card-title">All Clear This Week</div>
        <div class="card-meta">No incidents or score changes on your products. Your setup is stable.</div>
      </div>
      ` : ''}
    </div>

    <!-- CTA -->
    <div class="cta">
      <a href="${siteUrl}/dashboard/setups" class="cta-button">View Full Report →</a>
    </div>

    <!-- Voting Methodology -->
    <div class="methodology">
      <div class="methodology-title">📊 How Community Voting Works</div>
      <div class="methodology-steps">
        <div class="methodology-step">
          <div class="methodology-num">1</div>
          <div class="methodology-label">AI Evaluation</div>
          <div class="methodology-desc">Products scored against 2,354 security norms</div>
        </div>
        <div class="methodology-step">
          <div class="methodology-num">2</div>
          <div class="methodology-label">Community Votes</div>
          <div class="methodology-desc">Users validate or correct evaluations</div>
        </div>
        <div class="methodology-step">
          <div class="methodology-num">3</div>
          <div class="methodology-label">Weighted Consensus</div>
          <div class="methodology-desc">Reputation + staking = vote power</div>
        </div>
      </div>
      <a href="${siteUrl}/methodology" class="methodology-link">Learn about our methodology →</a>
    </div>

    ${upgradePromo ? `
    <!-- Upgrade Promotion -->
    <div class="upgrade">
      <div class="upgrade-inner">
        <div class="upgrade-text">
          <div class="upgrade-plan">You're on the ${escapeHtml((plan || 'free').charAt(0).toUpperCase() + (plan || 'free').slice(1))} plan</div>
          <div class="upgrade-highlight">${escapeHtml(upgradePromo.highlight)}</div>
        </div>
        <a href="${upgradePromo.link}" class="upgrade-cta">${escapeHtml(upgradePromo.cta)} →</a>
      </div>
    </div>
    ` : ''}

    <!-- Promo Section -->
    <div class="promo">
      <div class="promo-title">Earn $SAFE Tokens This Week</div>
      <div class="promo-grid">
        <div class="promo-card">
          <div class="promo-icon">⭐</div>
          <div class="promo-label">Evaluate Products</div>
          <div class="promo-desc">+10 pts per evaluation</div>
        </div>
        <div class="promo-card">
          <div class="promo-icon">✓</div>
          <div class="promo-label">Vote on Corrections</div>
          <div class="promo-desc">+5 pts per vote</div>
        </div>
        <div class="promo-card">
          <div class="promo-icon">🔒</div>
          <div class="promo-label">Stake & Boost</div>
          <div class="promo-desc">Up to 2.5x vote power</div>
        </div>
      </div>
      <a href="${siteUrl}/dashboard/rewards" class="promo-cta">Start Earning Points →</a>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p class="footer-text">
        You receive this because you have an active SafeScoring setup.<br>
        <a href="${siteUrl}/dashboard/settings" class="footer-link">Manage preferences</a> · <a href="${siteUrl}" class="footer-link">SafeScoring.io</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

  return { subject, text, html };
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatNumber(num) {
  if (!num) return '0';
  if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
}
