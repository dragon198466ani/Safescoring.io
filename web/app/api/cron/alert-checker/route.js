import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import crypto from "crypto";

/**
 * Alert Rules Checker — Cron Endpoint
 *
 * POST /api/cron/alert-checker
 *
 * Evaluates all enabled alert rules against current scores and recent incidents.
 * Conditions within a rule use AND logic: all conditions must be met to trigger.
 * Respects cooldown_minutes to avoid duplicate notifications.
 *
 * Notification channels:
 *   - email: via Resend
 *   - webhook: HTTP POST to user-provided URL
 *   - telegram: (placeholder — requires bot token configuration)
 *
 * Security: Requires CRON_SECRET header (constant-time comparison)
 */

// ============================================
// CRON AUTH
// ============================================

/**
 * SECURITY: Constant-time comparison for cron secret
 */
function verifyCronSecret(providedSecret) {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || !providedSecret) {
    return false;
  }

  try {
    const provided = Buffer.from(providedSecret);
    const expected = Buffer.from(expectedSecret);

    if (provided.length !== expected.length) {
      // Consume similar time to prevent timing attacks
      crypto.timingSafeEqual(expected, expected);
      return false;
    }

    return crypto.timingSafeEqual(provided, expected);
  } catch {
    return false;
  }
}

// ============================================
// SCORE HELPERS
// ============================================

const PILLAR_COLUMN_MAP = {
  S: "score_s",
  A: "score_a",
  F: "score_f",
  E: "score_e",
};

/**
 * Build a map of product_slug -> latest score data
 */
async function buildScoreMap(productSlugs) {
  if (productSlugs.length === 0) return {};

  // Resolve slugs to product IDs
  const { data: products } = await supabase
    .from("products")
    .select("id, slug")
    .in("slug", productSlugs);

  if (!products || products.length === 0) return {};

  const slugToId = {};
  const idToSlug = {};
  for (const p of products) {
    slugToId[p.slug] = p.id;
    idToSlug[p.id] = p.slug;
  }

  const productIds = products.map((p) => p.id);

  // Get latest scores for each product
  const { data: scores } = await supabase
    .from("safe_scoring_results")
    .select("product_id, note_finale, score_s, score_a, score_f, score_e, calculated_at")
    .in("product_id", productIds)
    .order("calculated_at", { ascending: false });

  const scoreMap = {};
  for (const s of scores || []) {
    const slug = idToSlug[s.product_id];
    if (slug && !scoreMap[slug]) {
      scoreMap[slug] = {
        productId: s.product_id,
        score: Math.round(s.note_finale || 0),
        score_s: Math.round(s.score_s || 0),
        score_a: Math.round(s.score_a || 0),
        score_f: Math.round(s.score_f || 0),
        score_e: Math.round(s.score_e || 0),
        calculatedAt: s.calculated_at,
      };
    }
  }

  return scoreMap;
}

/**
 * Build a map of product_slug -> previous score data (second most recent)
 * Used for score_change detection
 */
async function buildPreviousScoreMap(productSlugs) {
  if (productSlugs.length === 0) return {};

  const { data: products } = await supabase
    .from("products")
    .select("id, slug")
    .in("slug", productSlugs);

  if (!products || products.length === 0) return {};

  const idToSlug = {};
  for (const p of products) {
    idToSlug[p.id] = p.slug;
  }

  const productIds = products.map((p) => p.id);

  // Get the 2 most recent scores per product — we pick the 2nd one
  const { data: scores } = await supabase
    .from("safe_scoring_results")
    .select("product_id, note_finale, calculated_at")
    .in("product_id", productIds)
    .order("calculated_at", { ascending: false });

  // Group by product_id and take the second entry
  const grouped = {};
  for (const s of scores || []) {
    const slug = idToSlug[s.product_id];
    if (!slug) continue;
    if (!grouped[slug]) grouped[slug] = [];
    if (grouped[slug].length < 2) {
      grouped[slug].push(Math.round(s.note_finale || 0));
    }
  }

  const prevMap = {};
  for (const [slug, entries] of Object.entries(grouped)) {
    if (entries.length >= 2) {
      prevMap[slug] = entries[1]; // second most recent score
    }
  }

  return prevMap;
}

/**
 * Get recent incidents (last 24 hours) as a Set of product slugs
 */
async function getRecentIncidentSlugs() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: incidents } = await supabase
    .from("security_incidents")
    .select("product_id, products(slug)")
    .gte("created_at", oneDayAgo);

  const slugs = new Set();
  for (const i of incidents || []) {
    if (i.products?.slug) {
      slugs.add(i.products.slug);
    }
  }
  return slugs;
}

/**
 * Get all product slugs from a user's watchlist
 */
async function getUserWatchlistSlugs(userId) {
  const { data: watchlist } = await supabase
    .from("user_watchlist")
    .select("products(slug)")
    .eq("user_id", userId);

  return (watchlist || []).map((w) => w.products?.slug).filter(Boolean);
}

// ============================================
// CONDITION EVALUATOR
// ============================================

/**
 * Evaluate a single condition.
 * Returns { met: boolean, detail: string }
 */
function evaluateCondition(condition, scoreMap, prevScoreMap, incidentSlugs, watchlistSlugs) {
  const slug = condition.product_slug;
  const threshold = condition.threshold;

  // Determine which slugs to check (specific product or all watchlist)
  const slugsToCheck = slug ? [slug] : watchlistSlugs;

  if (slugsToCheck.length === 0) {
    return { met: false, detail: "No products to check (empty watchlist)" };
  }

  switch (condition.type) {
    case "score_below": {
      for (const s of slugsToCheck) {
        const data = scoreMap[s];
        if (data && data.score < threshold) {
          return { met: true, detail: `${s} score ${data.score} < ${threshold}` };
        }
      }
      return { met: false, detail: `No product score below ${threshold}` };
    }

    case "score_above": {
      for (const s of slugsToCheck) {
        const data = scoreMap[s];
        if (data && data.score > threshold) {
          return { met: true, detail: `${s} score ${data.score} > ${threshold}` };
        }
      }
      return { met: false, detail: `No product score above ${threshold}` };
    }

    case "score_change": {
      for (const s of slugsToCheck) {
        const current = scoreMap[s];
        const prev = prevScoreMap[s];
        if (current && prev !== undefined) {
          const change = Math.abs(current.score - prev);
          if (change >= threshold) {
            return {
              met: true,
              detail: `${s} score changed by ${change} (${prev} -> ${current.score})`,
            };
          }
        }
      }
      return { met: false, detail: `No score change >= ${threshold}` };
    }

    case "pillar_below": {
      const pillarKey = PILLAR_COLUMN_MAP[condition.pillar];
      if (!pillarKey) {
        return { met: false, detail: `Invalid pillar: ${condition.pillar}` };
      }
      for (const s of slugsToCheck) {
        const data = scoreMap[s];
        if (data && data[pillarKey] < threshold) {
          return {
            met: true,
            detail: `${s} pillar ${condition.pillar} score ${data[pillarKey]} < ${threshold}`,
          };
        }
      }
      return { met: false, detail: `No pillar ${condition.pillar} score below ${threshold}` };
    }

    case "incident_detected": {
      for (const s of slugsToCheck) {
        if (incidentSlugs.has(s)) {
          return { met: true, detail: `Incident detected for ${s}` };
        }
      }
      return { met: false, detail: "No recent incidents for monitored products" };
    }

    default:
      return { met: false, detail: `Unknown condition type: ${condition.type}` };
  }
}

// ============================================
// NOTIFICATION DISPATCH
// ============================================

/**
 * Send email notification via Resend
 */
async function sendEmailNotification(userEmail, userName, rule, triggerDetails) {
  if (!process.env.RESEND_API_KEY || !userEmail) return false;

  try {
    const Resend = (await import("resend")).Resend;
    const resend = new Resend(process.env.RESEND_API_KEY);

    const detailsHtml = triggerDetails
      .map((d) => `<li style="margin-bottom: 4px;">${d}</li>`)
      .join("");

    await resend.emails.send({
      from: "SafeScoring <noreply@safescoring.io>",
      to: userEmail,
      subject: `Alert triggered: ${rule.name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Alert Rule Triggered</h2>
          <p>Hi ${userName || "there"},</p>
          <p>Your alert rule <strong>${rule.name}</strong> has been triggered:</p>

          <div style="background: #1f2937; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <h3 style="color: white; margin: 0 0 12px 0;">${rule.name}</h3>
            <ul style="color: #d1d5db; margin: 0; padding-left: 20px;">
              ${detailsHtml}
            </ul>
          </div>

          <a href="https://safescoring.io/dashboard"
             style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
            View Dashboard
          </a>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            You're receiving this because you set up an alert rule on SafeScoring.
            <a href="https://safescoring.io/dashboard" style="color: #6366f1;">Manage your alerts</a>
          </p>
        </div>
      `,
    });
    return true;
  } catch (e) {
    console.error("[alert-checker] Email send failed:", e.message);
    return false;
  }
}

/**
 * Send webhook notification
 */
async function sendWebhookNotification(webhookUrl, rule, triggerDetails) {
  if (!webhookUrl) return false;

  try {
    const payload = {
      event: "alert_triggered",
      rule_id: rule.id,
      rule_name: rule.name,
      triggered_at: new Date().toISOString(),
      conditions_met: triggerDetails,
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    return response.ok;
  } catch (e) {
    console.error(`[alert-checker] Webhook failed for rule ${rule.id}:`, e.message);
    return false;
  }
}

// ============================================
// MAIN CRON HANDLER
// ============================================

export async function POST(request) {
  // Verify cron secret
  const cronSecret =
    request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (!verifyCronSecret(cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const startTime = Date.now();
  const results = {
    rulesChecked: 0,
    rulesTriggered: 0,
    notificationsSent: { email: 0, webhook: 0, telegram: 0 },
    errors: [],
  };

  try {
    // 1. Fetch all enabled alert rules
    const { data: rules, error: rulesError } = await supabase
      .from("alert_rules")
      .select("*")
      .eq("enabled", true);

    if (rulesError) {
      console.error("[alert-checker] Error fetching rules:", rulesError);
      return NextResponse.json({ error: "Failed to fetch alert rules" }, { status: 500 });
    }

    if (!rules || rules.length === 0) {
      return NextResponse.json({
        message: "No enabled alert rules",
        ...results,
        durationMs: Date.now() - startTime,
      });
    }

    // 2. Collect all unique product slugs needed across all rules
    const allSlugs = new Set();
    const userIds = new Set();

    for (const rule of rules) {
      userIds.add(rule.user_id);
      for (const c of rule.conditions || []) {
        if (c.product_slug) {
          allSlugs.add(c.product_slug);
        }
      }
    }

    // Also fetch watchlist slugs for rules with null product_slug conditions
    const rulesNeedingWatchlist = rules.filter((r) =>
      (r.conditions || []).some((c) => !c.product_slug)
    );
    const watchlistMap = {}; // userId -> [slugs]
    for (const rule of rulesNeedingWatchlist) {
      if (!watchlistMap[rule.user_id]) {
        watchlistMap[rule.user_id] = await getUserWatchlistSlugs(rule.user_id);
        // Add watchlist slugs to the global set for score fetching
        for (const s of watchlistMap[rule.user_id]) {
          allSlugs.add(s);
        }
      }
    }

    // 3. Build score data
    const allSlugsArr = [...allSlugs];
    const [scoreMap, prevScoreMap, incidentSlugs] = await Promise.all([
      buildScoreMap(allSlugsArr),
      buildPreviousScoreMap(allSlugsArr),
      getRecentIncidentSlugs(),
    ]);

    // 4. Fetch user emails for email notifications
    const userIdArr = [...userIds];
    const { data: users } = await supabase
      .from("users")
      .select("id, email, name")
      .in("id", userIdArr);

    const userMap = {};
    for (const u of users || []) {
      userMap[u.id] = u;
    }

    // 5. Evaluate each rule
    const now = new Date();

    for (const rule of rules) {
      results.rulesChecked++;

      try {
        // Check cooldown
        if (rule.last_triggered_at) {
          const lastTriggered = new Date(rule.last_triggered_at);
          const cooldownMs = (rule.cooldown_minutes || 60) * 60 * 1000;
          if (now.getTime() - lastTriggered.getTime() < cooldownMs) {
            continue; // Still in cooldown
          }
        }

        const watchlistSlugs = watchlistMap[rule.user_id] || [];
        const conditions = rule.conditions || [];
        const triggerDetails = [];
        let allMet = true;

        // Evaluate all conditions (AND logic)
        for (const condition of conditions) {
          const result = evaluateCondition(
            condition,
            scoreMap,
            prevScoreMap,
            incidentSlugs,
            watchlistSlugs
          );
          if (!result.met) {
            allMet = false;
            break;
          }
          triggerDetails.push(result.detail);
        }

        if (!allMet) continue;

        // Rule triggered!
        results.rulesTriggered++;

        // Send notifications via configured channels
        const channels = rule.channels || ["email"];
        const user = userMap[rule.user_id];

        for (const channel of channels) {
          try {
            switch (channel) {
              case "email": {
                const sent = await sendEmailNotification(
                  user?.email,
                  user?.name,
                  rule,
                  triggerDetails
                );
                if (sent) results.notificationsSent.email++;
                break;
              }
              case "webhook": {
                const sent = await sendWebhookNotification(
                  rule.webhook_url,
                  rule,
                  triggerDetails
                );
                if (sent) results.notificationsSent.webhook++;
                break;
              }
              case "telegram": {
                // Placeholder for Telegram integration
                // Requires TELEGRAM_BOT_TOKEN and user's chat_id
                console.log(`[alert-checker] Telegram channel not yet implemented for rule ${rule.id}`);
                break;
              }
            }
          } catch (channelErr) {
            console.error(`[alert-checker] Channel ${channel} error for rule ${rule.id}:`, channelErr.message);
            results.errors.push({
              ruleId: rule.id,
              channel,
              error: channelErr.message,
            });
          }
        }

        // Create in-app notification
        try {
          await supabase.from("user_notifications").insert({
            user_id: rule.user_id,
            type: "alert_rule_triggered",
            title: `Alert: ${rule.name}`,
            message: triggerDetails.join("; "),
            data: {
              rule_id: rule.id,
              conditions_met: triggerDetails,
            },
            is_read: false,
          });
        } catch (e) {
          // Table might not exist yet — continue
          console.log("[alert-checker] Notifications table not available:", e.message);
        }

        // Update rule: last_triggered_at + increment trigger_count
        await supabase
          .from("alert_rules")
          .update({
            last_triggered_at: now.toISOString(),
            trigger_count: (rule.trigger_count || 0) + 1,
          })
          .eq("id", rule.id);
      } catch (ruleErr) {
        console.error(`[alert-checker] Error processing rule ${rule.id}:`, ruleErr.message);
        results.errors.push({
          ruleId: rule.id,
          error: ruleErr.message,
        });
      }
    }

    return NextResponse.json({
      message: "Alert check complete",
      ...results,
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error("[alert-checker] Fatal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET - Status / health check (requires auth)
 */
export async function GET(request) {
  const cronSecret =
    request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (!verifyCronSecret(cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const { count: enabledCount } = await supabase
      .from("alert_rules")
      .select("*", { count: "exact", head: true })
      .eq("enabled", true);

    const { count: totalCount } = await supabase
      .from("alert_rules")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      status: "ready",
      enabledRules: enabledCount,
      totalRules: totalCount,
      message: "Use POST to trigger alert checking",
    });
  } catch (error) {
    console.error("[alert-checker] Health check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
