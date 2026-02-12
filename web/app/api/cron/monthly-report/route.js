import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendEmail } from "@/libs/resend";
import { monthlyReportEmail } from "@/libs/email-templates";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const monthName = now.toLocaleString("en-US", { month: "long", year: "numeric" });
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get users who haven't opted out
    const { data: optedOutUsers } = await supabase
      .from("notification_preferences")
      .select("user_id")
      .eq("email_monthly_report", false);

    const optedOutIds = new Set((optedOutUsers || []).map((p) => p.user_id));

    // Get users with setups
    const { data: allSetups } = await supabase
      .from("user_setups")
      .select("*")
      .not("products", "eq", "[]");

    const userSetupMap = {};
    const allProductIds = new Set();

    for (const setup of allSetups || []) {
      if (optedOutIds.has(setup.user_id)) continue;
      if (!userSetupMap[setup.user_id]) userSetupMap[setup.user_id] = [];
      userSetupMap[setup.user_id].push(setup);

      for (const p of setup.products || []) {
        const pid = typeof p === "object" ? p.id || p.product_id : p;
        if (pid) allProductIds.add(pid);
      }
    }

    const targetUserIds = Object.keys(userSetupMap);
    if (targetUserIds.length === 0) {
      return NextResponse.json({ message: "No users to notify", sent: 0 });
    }

    // Get user info
    const { data: users } = await supabase
      .from("users")
      .select("id, email, name")
      .in("id", targetUserIds);

    const userMap = Object.fromEntries((users || []).map((u) => [u.id, u]));

    // Get current scores
    const { data: currentScores } = await supabase
      .from("safe_scoring_results")
      .select("product_id, note_finale, score_s, score_a, score_f, score_e")
      .in("product_id", [...allProductIds]);

    const scoreMap = Object.fromEntries((currentScores || []).map((s) => [s.product_id, s]));

    // Get score history for the month
    const { data: monthHistory } = await supabase
      .from("score_history")
      .select("product_id, safe_score, score_change, recorded_at")
      .in("product_id", [...allProductIds])
      .gte("recorded_at", oneMonthAgo)
      .order("recorded_at", { ascending: true });

    // Get incidents
    const { data: incidents } = await supabase
      .from("security_incidents")
      .select("id, severity, title, affected_product_ids")
      .gte("created_at", oneMonthAgo)
      .eq("is_published", true);

    // Get streaks
    const { data: streaks } = await supabase
      .from("user_streaks")
      .select("user_id, current_streak")
      .in("user_id", targetUserIds);

    const streakMap = Object.fromEntries((streaks || []).map((s) => [s.user_id, s]));

    // Get product names
    const { data: products } = await supabase
      .from("products")
      .select("id, name, slug")
      .in("id", [...allProductIds]);

    const productMap = Object.fromEntries((products || []).map((p) => [p.id, p]));

    let emailsSent = 0;

    for (const userId of targetUserIds) {
      const user = userMap[userId];
      if (!user?.email) continue;

      const userSetups = userSetupMap[userId] || [];
      const userProductIds = new Set();
      for (const setup of userSetups) {
        for (const p of setup.products || []) {
          const pid = typeof p === "object" ? p.id || p.product_id : p;
          if (pid) userProductIds.add(pid);
        }
      }

      // Calculate average scores
      let totalScore = 0, totalS = 0, totalA = 0, totalF = 0, totalE = 0, count = 0;
      for (const pid of userProductIds) {
        const sc = scoreMap[pid];
        if (sc?.note_finale) {
          totalScore += sc.note_finale;
          totalS += sc.score_s || 0;
          totalA += sc.score_a || 0;
          totalF += sc.score_f || 0;
          totalE += sc.score_e || 0;
          count++;
        }
      }

      const overallScore = count > 0 ? totalScore / count : 0;
      const pillarScores = count > 0 ? {
        S: totalS / count,
        A: totalA / count,
        F: totalF / count,
        E: totalE / count,
      } : { S: 0, A: 0, F: 0, E: 0 };

      // Calculate previous month average from first history record
      const firstOfMonth = (monthHistory || []).filter((h) => userProductIds.has(h.product_id));
      const previousScore = firstOfMonth.length > 0
        ? firstOfMonth[0].safe_score - (firstOfMonth[0].score_change || 0)
        : overallScore;

      // Count changes and incidents
      const totalChanges = (monthHistory || []).filter((h) => userProductIds.has(h.product_id)).length;
      const totalIncidents = (incidents || []).filter((inc) =>
        (inc.affected_product_ids || []).some((id) => userProductIds.has(id))
      ).length;

      // Generate recommendations
      const recommendations = [];
      const weakest = Object.entries(pillarScores).sort((a, b) => a[1] - b[1])[0];
      if (weakest && weakest[1] < 60) {
        const pillarNames = { S: "Security", A: "Adversity", F: "Fidelity", E: "Efficiency" };
        recommendations.push(
          `Your weakest pillar is ${pillarNames[weakest[0]]} (${Math.round(weakest[1])}/100). Focus on improving products with low ${weakest[0]} scores.`
        );
      }
      if (totalIncidents > 0) {
        recommendations.push("Security incidents affected your products this month. Review and consider diversifying.");
      }
      if (count < 3) {
        recommendations.push("Add more products to your setup for a more comprehensive security picture.");
      }
      if (overallScore < 60) {
        recommendations.push("Your overall score is below 60. Consider replacing low-scoring products with higher-rated alternatives.");
      }

      const streakDays = streakMap[userId]?.current_streak || 0;

      try {
        const html = monthlyReportEmail({
          userName: user.name || "there",
          monthData: {
            month: monthName,
            overallScore,
            previousScore,
            pillarScores,
            totalChanges,
            totalIncidents,
            recommendations,
            streakDays,
          },
        });

        await sendEmail({
          to: user.email,
          subject: `SafeScoring ${monthName} Report: Score ${Math.round(overallScore)}/100`,
          html,
          text: `Your monthly security report for ${monthName}. Overall score: ${Math.round(overallScore)}/100.`,
        });
        emailsSent++;
      } catch (emailErr) {
        console.error(`Monthly report failed for ${user.email}:`, emailErr);
      }

      if (emailsSent % 10 === 0) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    return NextResponse.json({
      message: "Monthly report sent",
      month: monthName,
      targetUsers: targetUserIds.length,
      emailsSent,
    });
  } catch (error) {
    console.error("Monthly report error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
