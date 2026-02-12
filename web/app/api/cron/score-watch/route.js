import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendEmail } from "@/libs/resend";
import { scoreAlertEmail } from "@/libs/email-templates";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Vercel cron: every 6 hours
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Get all user setups with their products
    const { data: setups, error: setupError } = await supabase
      .from("user_setups")
      .select("id, user_id, name, products, combined_score")
      .not("products", "eq", "[]");

    if (setupError) throw setupError;
    if (!setups || setups.length === 0) {
      return NextResponse.json({ message: "No setups to check", processed: 0 });
    }

    // 2. Get all product IDs from setups
    const allProductIds = new Set();
    for (const setup of setups) {
      const products = setup.products || [];
      for (const p of products) {
        const pid = typeof p === "object" ? p.id || p.product_id : p;
        if (pid) allProductIds.add(pid);
      }
    }

    if (allProductIds.size === 0) {
      return NextResponse.json({ message: "No products in setups", processed: 0 });
    }

    // 3. Get current scores for these products
    const { data: currentScores } = await supabase
      .from("safe_scoring_results")
      .select("product_id, note_finale, score_s, score_a, score_f, score_e")
      .in("product_id", [...allProductIds]);

    const scoreMap = Object.fromEntries(
      (currentScores || []).map((s) => [s.product_id, s])
    );

    // 4. Get the most recent score_history for comparison (last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentHistory } = await supabase
      .from("score_history")
      .select("product_id, safe_score, score_change, change_reason, recorded_at")
      .in("product_id", [...allProductIds])
      .gte("recorded_at", oneDayAgo)
      .not("score_change", "eq", 0)
      .order("recorded_at", { ascending: false });

    // Group changes by product
    const changesMap = {};
    for (const h of recentHistory || []) {
      if (!changesMap[h.product_id]) {
        changesMap[h.product_id] = h;
      }
    }

    if (Object.keys(changesMap).length === 0) {
      return NextResponse.json({ message: "No score changes detected", processed: 0 });
    }

    // 5. Get product names
    const changedProductIds = Object.keys(changesMap).map(Number);
    const { data: products } = await supabase
      .from("products")
      .select("id, name, slug")
      .in("id", changedProductIds);

    const productMap = Object.fromEntries(
      (products || []).map((p) => [p.id, p])
    );

    // 6. Get notification preferences for all users with setups
    const userIds = [...new Set(setups.map((s) => s.user_id))];
    const { data: preferences } = await supabase
      .from("notification_preferences")
      .select("*")
      .in("user_id", userIds);

    const prefMap = Object.fromEntries(
      (preferences || []).map((p) => [p.user_id, p])
    );

    // 7. Get user emails
    const { data: users } = await supabase
      .from("users")
      .select("id, email, name")
      .in("id", userIds);

    const userMap = Object.fromEntries(
      (users || []).map((u) => [u.id, u])
    );

    // 8. Process each user's setups and send notifications
    let notificationsCreated = 0;
    let emailsSent = 0;

    for (const userId of userIds) {
      const userPrefs = prefMap[userId] || { email_score_changes: true, min_score_change: 5 };
      const user = userMap[userId];
      if (!user) continue;

      const userSetups = setups.filter((s) => s.user_id === userId);
      const userChanges = [];

      for (const setup of userSetups) {
        const setupProducts = setup.products || [];
        for (const p of setupProducts) {
          const pid = typeof p === "object" ? p.id || p.product_id : p;
          const change = changesMap[pid];
          if (!change) continue;

          const absChange = Math.abs(change.score_change || 0);
          if (absChange < (userPrefs.min_score_change || 5)) continue;

          const product = productMap[pid];
          if (!product) continue;

          userChanges.push({
            product,
            setup,
            change: change.score_change,
            newScore: scoreMap[pid]?.note_finale,
            reason: change.change_reason,
          });
        }
      }

      if (userChanges.length === 0) continue;

      // Create in-app notifications
      const notifRows = userChanges.map((c) => ({
        user_id: userId,
        type: "score_change",
        title: `${c.product.name}: ${c.change > 0 ? "+" : ""}${Math.round(c.change)} points`,
        message: `Score changed to ${Math.round(c.newScore || 0)}/100 in setup "${c.setup.name}". ${c.reason || ""}`.trim(),
        data: { link: `/products/${c.product.slug}`, product_id: c.product.id, change: c.change },
      }));

      const { error: notifError } = await supabase
        .from("notifications")
        .insert(notifRows);

      if (!notifError) notificationsCreated += notifRows.length;

      // Send email if enabled
      if (userPrefs.email_score_changes !== false && user.email) {
        try {
          const html = scoreAlertEmail({
            userName: user.name || "there",
            changes: userChanges.map((c) => ({
              productName: c.product.name,
              productSlug: c.product.slug,
              setupName: c.setup.name,
              change: c.change,
              newScore: c.newScore,
              reason: c.reason,
            })),
          });

          await sendEmail({
            to: user.email,
            subject: `SafeScoring: ${userChanges.length} score change${userChanges.length > 1 ? "s" : ""} detected`,
            html,
            text: `Score changes detected in your setups. Check your dashboard for details.`,
          });
          emailsSent++;
        } catch (emailErr) {
          console.error(`Failed to send email to ${user.email}:`, emailErr);
        }
      }
    }

    return NextResponse.json({
      message: "Score watch complete",
      changesDetected: Object.keys(changesMap).length,
      notificationsCreated,
      emailsSent,
    });
  } catch (error) {
    console.error("Score watch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
