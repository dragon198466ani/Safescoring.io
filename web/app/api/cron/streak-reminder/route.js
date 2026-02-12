import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendEmail } from "@/libs/resend";
import { streakReminderEmail } from "@/libs/email-templates";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Vercel cron: daily at 8pm UTC
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    // Find users who visited yesterday but have a streak >= 3
    // They need a reminder if they haven't visited today
    const today = new Date().toISOString().split("T")[0];

    const { data: atRiskUsers, error } = await supabase
      .from("user_streaks")
      .select("user_id, current_streak, streak_points_earned, last_visit_date")
      .eq("last_visit_date", yesterdayStr)
      .gte("current_streak", 3);

    if (error) throw error;

    if (!atRiskUsers || atRiskUsers.length === 0) {
      return NextResponse.json({
        message: "No at-risk streaks found",
        processed: 0,
        emailsSent: 0,
      });
    }

    let emailsSent = 0;
    let notificationsCreated = 0;

    for (const user of atRiskUsers) {
      try {
        // Get user email and preferences
        const [userResult, prefsResult] = await Promise.all([
          supabase
            .from("users")
            .select("id, name, email")
            .eq("id", user.user_id)
            .single(),
          supabase
            .from("notification_preferences")
            .select("email_streak_reminder")
            .eq("user_id", user.user_id)
            .single(),
        ]);

        const userData = userResult.data;
        const prefs = prefsResult.data;

        if (!userData?.email) continue;

        // Check if streak reminder is enabled (default: true)
        const reminderEnabled = prefs?.email_streak_reminder !== false;

        // Create in-app notification
        await supabase.from("notifications").insert({
          user_id: user.user_id,
          type: "streak",
          title: `Don't break your ${user.current_streak}-day streak! 🔥`,
          message: `You've been on a ${user.current_streak}-day streak with ${user.streak_points_earned} points earned. Visit today to keep it going!`,
          data: { streak: user.current_streak, points: user.streak_points_earned },
        });
        notificationsCreated++;

        // Send email if enabled
        if (reminderEnabled) {
          const html = streakReminderEmail({
            userName: userData.name || "Crypto Guardian",
            currentStreak: user.current_streak,
            streakPoints: user.streak_points_earned || 0,
          });

          await sendEmail({
            to: userData.email,
            subject: `🔥 Don't break your ${user.current_streak}-day streak!`,
            html,
          });
          emailsSent++;
        }
      } catch (userError) {
        console.error(`Failed to process streak reminder for user ${user.user_id}:`, userError);
      }
    }

    return NextResponse.json({
      message: "Streak reminders sent",
      atRiskUsers: atRiskUsers.length,
      emailsSent,
      notificationsCreated,
    });
  } catch (error) {
    console.error("Streak reminder cron error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
