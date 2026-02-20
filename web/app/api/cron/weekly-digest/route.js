import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendEmail } from "@/libs/resend";
import { weeklyDigestEmail } from "@/libs/email-templates";

const _sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const _sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = _sbUrl && _sbKey ? createClient(_sbUrl, _sbKey) : null;

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get users who opted in for weekly digest
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("user_id")
      .eq("email_weekly_digest", true);

    // Also include users with no preferences (default = true)
    const { data: allUsersWithSetups } = await supabase
      .from("user_setups")
      .select("user_id")
      .not("products", "eq", "[]");

    const optedInUserIds = new Set((prefs || []).map((p) => p.user_id));
    const { data: optedOutUsers } = await supabase
      .from("notification_preferences")
      .select("user_id")
      .eq("email_weekly_digest", false);
    const optedOutIds = new Set((optedOutUsers || []).map((p) => p.user_id));

    // Users with setups who haven't opted out
    const targetUserIds = [...new Set((allUsersWithSetups || []).map((s) => s.user_id))]
      .filter((id) => !optedOutIds.has(id));

    if (targetUserIds.length === 0) {
      return NextResponse.json({ message: "No users to notify", sent: 0 });
    }

    // Get user info
    const { data: users } = await supabase
      .from("users")
      .select("id, email, name")
      .in("id", targetUserIds);

    const userMap = Object.fromEntries((users || []).map((u) => [u.id, u]));

    // Get all setups
    const { data: setups } = await supabase
      .from("user_setups")
      .select("*")
      .in("user_id", targetUserIds)
      .not("products", "eq", "[]");

    // Get all product IDs
    const allProductIds = new Set();
    for (const setup of setups || []) {
      for (const p of setup.products || []) {
        const pid = typeof p === "object" ? p.id || p.product_id : p;
        if (pid) allProductIds.add(pid);
      }
    }

    // Get score changes from the week
    const { data: scoreChanges } = await supabase
      .from("score_history")
      .select("product_id, safe_score, previous_safe_score, score_change, change_reason, recorded_at")
      .in("product_id", [...allProductIds])
      .gte("recorded_at", oneWeekAgo)
      .not("score_change", "eq", 0)
      .order("recorded_at", { ascending: false });

    // Get product names
    const { data: products } = await supabase
      .from("products")
      .select("id, name, slug")
      .in("id", [...allProductIds]);

    const productMap = Object.fromEntries((products || []).map((p) => [p.id, p]));

    // Get incidents from the week
    const { data: incidents } = await supabase
      .from("security_incidents")
      .select("*")
      .gte("created_at", oneWeekAgo)
      .eq("is_published", true)
      .order("severity", { ascending: true })
      .limit(10);

    // Send digest to each user
    let emailsSent = 0;

    for (const userId of targetUserIds) {
      const user = userMap[userId];
      if (!user?.email) continue;

      const userSetups = (setups || []).filter((s) => s.user_id === userId);
      const userProductIds = new Set();
      for (const setup of userSetups) {
        for (const p of setup.products || []) {
          const pid = typeof p === "object" ? p.id || p.product_id : p;
          if (pid) userProductIds.add(pid);
        }
      }

      // Filter score changes relevant to this user
      const userScoreChanges = (scoreChanges || [])
        .filter((sc) => userProductIds.has(sc.product_id))
        .map((sc) => ({
          productName: productMap[sc.product_id]?.name || "Unknown",
          change: sc.score_change || 0,
          newScore: sc.safe_score,
        }));

      // Calculate overall trend
      const totalChange = userScoreChanges.reduce((sum, c) => sum + (c.change || 0), 0);
      const overallTrend = userScoreChanges.length > 0 ? totalChange / userScoreChanges.length : 0;

      // Filter incidents affecting user's products
      const userIncidents = (incidents || []).filter((inc) => {
        const affected = inc.affected_product_ids || [];
        return affected.some((id) => userProductIds.has(id));
      });

      // Generate recommendation
      let topRecommendation = "";
      if (userScoreChanges.some((c) => c.change < -5)) {
        topRecommendation = "Some of your products lost points this week. Review your setup and consider alternatives for low-scoring products.";
      } else if (userIncidents.length > 0) {
        topRecommendation = "Security incidents were reported this week. Verify your funds and check affected products.";
      } else if (userScoreChanges.length === 0) {
        topRecommendation = "Your setup has been stable! Consider adding more products to improve coverage.";
      }

      try {
        const html = weeklyDigestEmail({
          userName: user.name || "there",
          weekData: {
            scoreChanges: userScoreChanges,
            incidents: userIncidents.map((i) => ({ severity: i.severity, title: i.title })),
            overallTrend,
            setupCount: userSetups.length,
            topRecommendation,
          },
        });

        await sendEmail({
          to: user.email,
          subject: `SafeScoring Weekly: ${userScoreChanges.length} changes, ${userIncidents.length} incidents`,
          html,
          text: `Your weekly crypto security digest. ${userScoreChanges.length} score changes and ${userIncidents.length} incidents this week.`,
        });
        emailsSent++;
      } catch (emailErr) {
        console.error(`Weekly digest failed for ${user.email}:`, emailErr);
      }

      // Small delay to avoid rate limits
      if (emailsSent % 10 === 0) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    return NextResponse.json({
      message: "Weekly digest sent",
      targetUsers: targetUserIds.length,
      emailsSent,
    });
  } catch (error) {
    console.error("Weekly digest error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
