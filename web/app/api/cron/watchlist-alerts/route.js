import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import crypto from "crypto";

/**
 * Watchlist Alerts Cron Job
 *
 * POST /api/cron/watchlist-alerts
 *
 * Called periodically (e.g., daily) to check for score changes
 * and notify users via email or in-app notifications.
 *
 * Security: Requires CRON_SECRET header to prevent unauthorized access
 */

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

    // Constant-time comparison - handles different lengths safely
    if (provided.length !== expected.length) {
      // Compare against itself to consume similar time
      crypto.timingSafeEqual(expected, expected);
      return false;
    }

    return crypto.timingSafeEqual(provided, expected);
  } catch {
    return false;
  }
}

export async function POST(request) {
  // Verify cron secret with timing-safe comparison
  const cronSecret = request.headers.get("x-cron-secret") || request.headers.get("authorization")?.replace("Bearer ", "");

  if (!verifyCronSecret(cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    // Get all watchlist items with score changes
    const { data: watchlist, error: watchlistError } = await supabase
      .from("user_watchlist")
      .select(`
        id,
        user_id,
        product_id,
        alert_on_score_change,
        alert_threshold,
        alert_email,
        score_at_add,
        last_alert_at,
        products (id, name, slug),
        users (id, email, name)
      `)
      .eq("alert_on_score_change", true);

    if (watchlistError) {
      console.error("Error fetching watchlist:", watchlistError);
      return NextResponse.json({ error: "Failed to fetch watchlist" }, { status: 500 });
    }

    if (!watchlist || watchlist.length === 0) {
      return NextResponse.json({ message: "No watchlist items to check", alerts: 0 });
    }

    // Get current scores for all products in watchlist
    const productIds = [...new Set(watchlist.map(w => w.product_id))];

    const { data: scores, error: scoresError } = await supabase
      .from("safe_scoring_results")
      .select("product_id, note_finale, calculated_at")
      .in("product_id", productIds)
      .order("calculated_at", { ascending: false });

    if (scoresError) {
      console.error("Error fetching scores:", scoresError);
      return NextResponse.json({ error: "Failed to fetch scores" }, { status: 500 });
    }

    // Create score map (latest score per product)
    const scoreMap = {};
    for (const score of scores || []) {
      if (!scoreMap[score.product_id]) {
        scoreMap[score.product_id] = {
          score: Math.round(score.note_finale || 0),
          calculatedAt: score.calculated_at,
        };
      }
    }

    // Find items that need alerts
    const alertsToSend = [];
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    for (const item of watchlist) {
      // Skip if recently alerted
      if (item.last_alert_at && new Date(item.last_alert_at) > oneDayAgo) {
        continue;
      }

      const currentScore = scoreMap[item.product_id];
      if (!currentScore || item.score_at_add === null) {
        continue;
      }

      const scoreDiff = Math.abs(currentScore.score - item.score_at_add);

      if (scoreDiff >= item.alert_threshold) {
        alertsToSend.push({
          watchlistId: item.id,
          userId: item.user_id,
          userEmail: item.users?.email,
          userName: item.users?.name,
          productId: item.product_id,
          productName: item.products?.name,
          productSlug: item.products?.slug,
          oldScore: item.score_at_add,
          newScore: currentScore.score,
          change: currentScore.score - item.score_at_add,
          alertEmail: item.alert_email,
        });
      }
    }

    if (alertsToSend.length === 0) {
      return NextResponse.json({ message: "No alerts to send", alerts: 0 });
    }

    // Create in-app notifications
    const notifications = alertsToSend.map(alert => ({
      user_id: alert.userId,
      type: "watchlist_score_change",
      title: `${alert.productName} score changed`,
      message: `Score changed from ${alert.oldScore} to ${alert.newScore} (${alert.change > 0 ? "+" : ""}${alert.change})`,
      data: {
        productId: alert.productId,
        productSlug: alert.productSlug,
        oldScore: alert.oldScore,
        newScore: alert.newScore,
      },
      is_read: false,
    }));

    // Insert notifications (if table exists)
    try {
      await supabase.from("user_notifications").insert(notifications);
    } catch (e) {
      // Table might not exist, continue
      console.log("Notifications table not available:", e.message);
    }

    // Update last_alert_at for all alerted items
    const alertedIds = alertsToSend.map(a => a.watchlistId);
    await supabase
      .from("user_watchlist")
      .update({ last_alert_at: now.toISOString() })
      .in("id", alertedIds);

    // Update score_at_add to current score (so we don't alert again for same change)
    for (const alert of alertsToSend) {
      await supabase
        .from("user_watchlist")
        .update({ score_at_add: alert.newScore })
        .eq("id", alert.watchlistId);
    }

    // Send emails for users who opted in (if Resend is configured)
    const emailAlerts = alertsToSend.filter(a => a.alertEmail && a.userEmail);
    let emailsSent = 0;

    if (emailAlerts.length > 0 && process.env.RESEND_API_KEY) {
      const Resend = (await import("resend")).Resend;
      const resend = new Resend(process.env.RESEND_API_KEY);

      for (const alert of emailAlerts) {
        try {
          const changeDirection = alert.change > 0 ? "increased" : "decreased";
          const changeColor = alert.change > 0 ? "#22c55e" : "#ef4444";

          await resend.emails.send({
            from: "SafeScoring <noreply@safescoring.io>",
            to: alert.userEmail,
            subject: `${alert.productName} security score ${changeDirection}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Security Score Alert</h2>
                <p>Hi ${alert.userName || "there"},</p>
                <p>A product in your watchlist has changed:</p>

                <div style="background: #1f2937; padding: 20px; border-radius: 12px; margin: 20px 0;">
                  <h3 style="color: white; margin: 0 0 12px 0;">${alert.productName}</h3>
                  <div style="display: flex; align-items: center; gap: 20px;">
                    <div>
                      <span style="color: #9ca3af; font-size: 14px;">Old Score</span>
                      <div style="font-size: 32px; font-weight: bold; color: white;">${alert.oldScore}</div>
                    </div>
                    <div style="color: ${changeColor}; font-size: 24px;">
                      ${alert.change > 0 ? "+" : ""}${alert.change}
                    </div>
                    <div>
                      <span style="color: #9ca3af; font-size: 14px;">New Score</span>
                      <div style="font-size: 32px; font-weight: bold; color: white;">${alert.newScore}</div>
                    </div>
                  </div>
                </div>

                <a href="https://safescoring.io/products/${alert.productSlug}"
                   style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
                  View Details
                </a>

                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                  You're receiving this because you enabled email alerts for this product in your watchlist.
                  <a href="https://safescoring.io/dashboard/watchlist" style="color: #6366f1;">Manage your watchlist</a>
                </p>
              </div>
            `,
          });
          emailsSent++;
        } catch (emailError) {
          console.error("Failed to send email:", emailError);
        }
      }
    }

    return NextResponse.json({
      message: `Processed ${alertsToSend.length} alerts`,
      alerts: alertsToSend.length,
      emailsSent,
      processed: alertsToSend.map(a => ({
        product: a.productName,
        change: a.change,
      })),
    });

  } catch (error) {
    console.error("Error in watchlist alerts cron:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET method for testing (returns info, doesn't send alerts)
export async function GET(request) {
  // Verify cron secret with timing-safe comparison
  const cronSecret = request.headers.get("x-cron-secret") || request.headers.get("authorization")?.replace("Bearer ", "");

  if (!verifyCronSecret(cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    // Just count pending alerts without sending them
    const { count: watchlistCount } = await supabase
      .from("user_watchlist")
      .select("*", { count: "exact", head: true })
      .eq("alert_on_score_change", true);

    return NextResponse.json({
      status: "ready",
      watchlistItemsWithAlerts: watchlistCount,
      message: "Use POST to trigger alert processing",
    });

  } catch (error) {
    console.error("Error checking watchlist alerts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
