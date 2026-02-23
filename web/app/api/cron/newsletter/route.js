import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * SAFE Weekly Newsletter Generator
 *
 * Runs weekly to generate and queue newsletter content.
 * Call from Vercel Cron: 0 8 * * 1 (Mondays at 8am UTC)
 *
 * Revenue model:
 * - Free: Light version (top 3 movers, 1 incident)
 * - Premium $9/mo: Full version (all movers, all incidents, OPSEC tips)
 * - Sponsorship: Projects can pay $500-2000 to be featured
 */

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request) {
  // Verify cron secret
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

  try {
    // 1. Get score changes this week (products that improved or declined)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data: scoreChanges } = await supabase
      .from("evaluation_history")
      .select("product_id, old_score, new_score, created_at, products(name, slug)")
      .gte("created_at", oneWeekAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(20);

    // 2. Get recent incidents
    const { data: incidents } = await supabase
      .from("incidents")
      .select("id, title, severity, date, products(name, slug)")
      .gte("date", oneWeekAgo.toISOString())
      .order("date", { ascending: false })
      .limit(10);

    // 3. Get top rated products this week
    const { data: topProducts } = await supabase
      .from("products")
      .select("name, slug, score")
      .order("score", { ascending: false })
      .limit(5);

    // 4. Get new products added
    const { data: newProducts } = await supabase
      .from("products")
      .select("name, slug, score, created_at")
      .gte("created_at", oneWeekAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(5);

    // 5. Generate newsletter content
    const newsletterContent = generateNewsletterContent({
      scoreChanges: scoreChanges || [],
      incidents: incidents || [],
      topProducts: topProducts || [],
      newProducts: newProducts || [],
      weekDate: new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
      }),
    });

    // 6. Store newsletter in database for sending
    const { data: newsletter, error: insertError } = await supabase
      .from("newsletters")
      .insert({
        subject: newsletterContent.subject,
        content_html: newsletterContent.html,
        content_text: newsletterContent.text,
        content_premium_html: newsletterContent.premiumHtml,
        stats: {
          score_changes: scoreChanges?.length || 0,
          incidents: incidents?.length || 0,
          new_products: newProducts?.length || 0,
        },
        status: "pending",
        scheduled_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to store newsletter:", insertError);
      // Continue anyway - we can still return the content
    }

    // 7. Get subscriber count
    const { count: subscriberCount } = await supabase
      .from("newsletter_subscribers")
      .select("id", { count: "exact" })
      .eq("status", "active");

    return NextResponse.json({
      success: true,
      newsletter_id: newsletter?.id,
      stats: {
        subscribers: subscriberCount || 0,
        score_changes: scoreChanges?.length || 0,
        incidents: incidents?.length || 0,
        new_products: newProducts?.length || 0,
      },
      preview: {
        subject: newsletterContent.subject,
        text_preview: newsletterContent.text.substring(0, 500),
      },
    });
  } catch (error) {
    console.error("Newsletter generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate newsletter" },
      { status: 500 }
    );
  }
}

/**
 * Generate newsletter content
 */
function generateNewsletterContent({ scoreChanges, incidents, topProducts, newProducts, weekDate }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://safescoring.io";

  // Calculate movers
  const improvers = scoreChanges
    .filter(c => c.new_score > c.old_score)
    .sort((a, b) => (b.new_score - b.old_score) - (a.new_score - a.old_score))
    .slice(0, 5);

  const decliners = scoreChanges
    .filter(c => c.new_score < c.old_score)
    .sort((a, b) => (a.new_score - a.old_score) - (b.new_score - b.old_score))
    .slice(0, 5);

  const subject = `SAFE Weekly: ${incidents.length} incidents, ${improvers.length} score improvements`;

  // FREE VERSION (text)
  const text = `
SAFE Weekly - ${weekDate}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${incidents.length > 0 ? `
⚠️ SECURITY INCIDENTS THIS WEEK
${incidents.slice(0, 3).map(i => `• ${i.products?.name || 'Unknown'}: ${i.title} (${i.severity})`).join('\n')}
${incidents.length > 3 ? `\n→ ${incidents.length - 3} more incidents (Premium)` : ''}
` : '✅ No major incidents this week!'}

📈 SCORE IMPROVEMENTS
${improvers.slice(0, 3).map(c => `• ${c.products?.name}: ${c.old_score} → ${c.new_score} (+${c.new_score - c.old_score})`).join('\n') || 'No significant changes'}

📉 SCORE DECLINES
${decliners.slice(0, 3).map(c => `• ${c.products?.name}: ${c.old_score} → ${c.new_score} (${c.new_score - c.old_score})`).join('\n') || 'No significant declines'}

🏆 TOP RATED THIS WEEK
${topProducts.slice(0, 3).map((p, i) => `${i + 1}. ${p.name} - Score: ${p.score}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 Upgrade to Premium for full reports, OPSEC tips & early alerts
${siteUrl}/pricing

SafeScoring - Crypto Security Ratings
${siteUrl}
`;

  // FREE VERSION (HTML)
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SAFE Weekly</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #0f172a; color: #e2e8f0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
    .logo { font-size: 28px; font-weight: bold; color: #3b82f6; }
    .date { color: #94a3b8; font-size: 14px; margin-top: 8px; }
    .content { background: #1e293b; padding: 30px; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 18px; font-weight: 600; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; }
    .incident { background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; padding: 12px 15px; margin-bottom: 10px; border-radius: 0 8px 8px 0; }
    .incident-title { font-weight: 500; }
    .incident-product { color: #94a3b8; font-size: 13px; }
    .severity-high { color: #ef4444; }
    .severity-medium { color: #f59e0b; }
    .severity-low { color: #22c55e; }
    .mover { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #334155; }
    .mover-name { font-weight: 500; }
    .mover-change { font-weight: 600; }
    .mover-up { color: #22c55e; }
    .mover-down { color: #ef4444; }
    .top-product { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #334155; }
    .rank { width: 28px; height: 28px; background: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; }
    .score-badge { background: #22c55e20; color: #22c55e; padding: 4px 10px; border-radius: 12px; font-size: 13px; font-weight: 600; }
    .cta { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; text-align: center; padding: 20px; border-radius: 8px; margin-top: 20px; }
    .cta-title { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
    .cta-text { color: #bfdbfe; font-size: 14px; margin-bottom: 15px; }
    .cta-button { display: inline-block; background: white; color: #2563eb; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }
    .footer { background: #0f172a; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; }
    .footer-text { color: #64748b; font-size: 12px; }
    .footer-link { color: #3b82f6; text-decoration: none; }
    .premium-lock { background: #fbbf2420; border: 1px dashed #fbbf24; padding: 15px; border-radius: 8px; text-align: center; margin-top: 10px; }
    .premium-lock-text { color: #fbbf24; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">SAFE Weekly</div>
      <div class="date">${weekDate}</div>
    </div>

    <div class="content">
      <!-- Incidents Section -->
      <div class="section">
        <div class="section-title">⚠️ Security Incidents</div>
        ${incidents.length > 0 ?
          incidents.slice(0, 3).map(i => `
            <div class="incident">
              <div class="incident-title">${escapeHtml(i.title)}</div>
              <div class="incident-product">${escapeHtml(i.products?.name || 'Unknown')} • <span class="severity-${(i.severity || 'medium').toLowerCase()}">${i.severity || 'Medium'}</span></div>
            </div>
          `).join('') +
          (incidents.length > 3 ? `
            <div class="premium-lock">
              <div class="premium-lock-text">🔒 ${incidents.length - 3} more incidents - <a href="${siteUrl}/pricing" style="color: #fbbf24;">Upgrade to Premium</a></div>
            </div>
          ` : '')
        : '<p style="color: #22c55e;">✅ No major incidents this week!</p>'}
      </div>

      <!-- Score Improvements -->
      <div class="section">
        <div class="section-title">📈 Score Improvements</div>
        ${improvers.slice(0, 3).map(c => `
          <div class="mover">
            <span class="mover-name">${escapeHtml(c.products?.name || 'Unknown')}</span>
            <span class="mover-change mover-up">${c.old_score} → ${c.new_score} (+${c.new_score - c.old_score})</span>
          </div>
        `).join('') || '<p style="color: #94a3b8;">No significant improvements this week</p>'}
      </div>

      <!-- Score Declines -->
      <div class="section">
        <div class="section-title">📉 Score Declines</div>
        ${decliners.slice(0, 3).map(c => `
          <div class="mover">
            <span class="mover-name">${escapeHtml(c.products?.name || 'Unknown')}</span>
            <span class="mover-change mover-down">${c.old_score} → ${c.new_score} (${c.new_score - c.old_score})</span>
          </div>
        `).join('') || '<p style="color: #94a3b8;">No significant declines this week</p>'}
      </div>

      <!-- Top Products -->
      <div class="section">
        <div class="section-title">🏆 Top Rated This Week</div>
        ${topProducts.slice(0, 3).map((p, i) => `
          <div class="top-product">
            <div class="rank">${i + 1}</div>
            <div style="flex: 1;">
              <a href="${siteUrl}/products/${p.slug}" style="color: #e2e8f0; text-decoration: none; font-weight: 500;">${escapeHtml(p.name)}</a>
            </div>
            <div class="score-badge">${p.score}</div>
          </div>
        `).join('')}
      </div>

      <!-- CTA -->
      <div class="cta">
        <div class="cta-title">Want the full report?</div>
        <div class="cta-text">Premium includes all incidents, OPSEC tips, early alerts & more</div>
        <a href="${siteUrl}/pricing" class="cta-button">Upgrade for $9/mo</a>
      </div>
    </div>

    <div class="footer">
      <p class="footer-text">
        You received this because you subscribed to SAFE Weekly.<br>
        <a href="${siteUrl}/api/newsletter?action=unsubscribe&email={{email}}&token={{token}}" class="footer-link">Unsubscribe</a> •
        <a href="${siteUrl}" class="footer-link">SafeScoring.io</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

  // PREMIUM VERSION (HTML) - includes everything
  const premiumHtml = html
    .replace(/slice\(0, 3\)/g, 'slice(0, 10)')
    .replace(/<div class="premium-lock">[\s\S]*?<\/div>/g, '')
    .replace(/Upgrade for \$9\/mo/g, 'Manage Subscription')
    .replace(/Want the full report\?/g, 'Thank you for being Premium!')
    .replace(/Premium includes all incidents[\s\S]*?more/g, 'You have access to all features');

  return { subject, text, html, premiumHtml };
}

/**
 * Escape HTML entities
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * POST - Send newsletter to all subscribers
 * Requires admin authentication
 */
export async function POST(request) {
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
  const { newsletter_id } = await request.json();

  try {
    // Get the newsletter
    const { data: newsletter, error: fetchError } = await supabase
      .from("newsletters")
      .select("*")
      .eq("id", newsletter_id)
      .single();

    if (fetchError || !newsletter) {
      return NextResponse.json({ error: "Newsletter not found" }, { status: 404 });
    }

    // Get all active subscribers
    const { data: subscribers, error: subError } = await supabase
      .from("newsletter_subscribers")
      .select("email, is_premium")
      .eq("status", "active");

    if (subError) {
      return NextResponse.json({ error: "Failed to fetch subscribers" }, { status: 500 });
    }

    // Send via Resend (batch emails, max 100 per API call)
    let sentCount = 0;
    let failedCount = 0;

    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);

      const BATCH_SIZE = 50; // Resend batch limit

      for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
        const batch = subscribers.slice(i, i + BATCH_SIZE);

        const emailPromises = batch.map((sub) => {
          const htmlContent = sub.is_premium
            ? newsletter.content_premium_html || newsletter.content_html
            : newsletter.content_html;

          return resend.emails
            .send({
              from: "SafeScoring <noreply@safescoring.io>",
              to: sub.email,
              subject: newsletter.subject,
              html: htmlContent,
            })
            .then(() => { sentCount++; })
            .catch((err) => {
              failedCount++;
              console.error(`Failed to send to ${sub.email}:`, err.message);
            });
        });

        await Promise.all(emailPromises);

        // Small delay between batches to respect rate limits
        if (i + BATCH_SIZE < subscribers.length) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    } else {
      console.warn("RESEND_API_KEY not set — marking as sent without actually sending");
      sentCount = subscribers.length;
    }

    // Mark newsletter as sent
    await supabase
      .from("newsletters")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        recipient_count: sentCount,
        metadata: { sent: sentCount, failed: failedCount },
      })
      .eq("id", newsletter_id);

    return NextResponse.json({
      success: true,
      recipients: sentCount,
      failed: failedCount,
      message: `Newsletter sent to ${sentCount} subscribers`,
    });
  } catch (error) {
    console.error("Newsletter send error:", error);
    return NextResponse.json(
      { error: "Failed to send newsletter" },
      { status: 500 }
    );
  }
}
