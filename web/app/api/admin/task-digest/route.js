/**
 * Admin Task Digest — Email Alert System
 *
 * GET /api/admin/task-digest
 *
 * Checks for failed/stuck tasks and sends an email digest to admins.
 * Can be called by a cron job (GitHub Actions, Vercel Cron, etc.)
 *
 * Query params:
 *   ?key=CRON_SECRET  — Simple auth for cron calls (matches CRON_SECRET env var)
 */

import { supabaseAdmin } from "@/libs/supabase";
import { sendEmail } from "@/libs/resend";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "admin@safescoring.io")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export async function GET(req) {
  try {
    // Simple auth: either admin session or cron secret
    const { searchParams } = new URL(req.url);
    const cronKey = searchParams.get("key");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && cronKey !== cronSecret) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return Response.json({ error: "Supabase not configured" }, { status: 500 });
    }

    // Get failed tasks (permanently failed, retries >= 3)
    const { data: failedTasks } = await supabaseAdmin
      .from("task_queue")
      .select("id, task_type, target_id, error, retries, created_at, updated_at")
      .eq("status", "failed")
      .order("updated_at", { ascending: false })
      .limit(50);

    // Get stuck tasks (processing for more than 30 minutes)
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: stuckTasks } = await supabaseAdmin
      .from("task_queue")
      .select("id, task_type, target_id, started_at, created_at")
      .eq("status", "processing")
      .lt("started_at", thirtyMinAgo)
      .limit(20);

    // Get pending count
    const { count: pendingCount } = await supabaseAdmin
      .from("task_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    // Get completed in last 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: completedCount } = await supabaseAdmin
      .from("task_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("completed_at", oneDayAgo);

    const summary = {
      failed: failedTasks?.length || 0,
      stuck: stuckTasks?.length || 0,
      pending: pendingCount || 0,
      completed24h: completedCount || 0,
    };

    // Only send email if there are issues
    const hasIssues = summary.failed > 0 || summary.stuck > 0;

    if (hasIssues && ADMIN_EMAILS.length > 0) {
      const failedRows = (failedTasks || [])
        .slice(0, 10)
        .map(
          (t) =>
            `<tr><td>${t.task_type}</td><td>#${t.target_id}</td><td style="color:red">${t.error?.slice(0, 100)}</td><td>${t.retries}</td></tr>`
        )
        .join("");

      const stuckRows = (stuckTasks || [])
        .slice(0, 10)
        .map(
          (t) =>
            `<tr><td>${t.task_type}</td><td>#${t.target_id}</td><td>${t.started_at}</td></tr>`
        )
        .join("");

      const html = `
        <h2>SafeScoring Task Digest</h2>
        <p><strong>Date:</strong> ${new Date().toISOString().split("T")[0]}</p>

        <h3>Summary</h3>
        <ul>
          <li>Failed tasks: <strong style="color:${summary.failed > 0 ? "red" : "green"}">${summary.failed}</strong></li>
          <li>Stuck tasks: <strong style="color:${summary.stuck > 0 ? "orange" : "green"}">${summary.stuck}</strong></li>
          <li>Pending: ${summary.pending}</li>
          <li>Completed (24h): ${summary.completed24h}</li>
        </ul>

        ${
          failedRows
            ? `<h3>Failed Tasks (last 10)</h3>
               <table border="1" cellpadding="4" style="border-collapse:collapse">
                 <tr><th>Type</th><th>Target</th><th>Error</th><th>Retries</th></tr>
                 ${failedRows}
               </table>`
            : ""
        }

        ${
          stuckRows
            ? `<h3>Stuck Tasks (processing > 30 min)</h3>
               <table border="1" cellpadding="4" style="border-collapse:collapse">
                 <tr><th>Type</th><th>Target</th><th>Started</th></tr>
                 ${stuckRows}
               </table>`
            : ""
        }

        <p style="color:gray;font-size:12px">Sent by SafeScoring Task Digest</p>
      `;

      await sendEmail({
        to: ADMIN_EMAILS,
        subject: `[SafeScoring] ${summary.failed} failed, ${summary.stuck} stuck tasks`,
        html,
        text: `SafeScoring Task Digest: ${summary.failed} failed, ${summary.stuck} stuck, ${summary.pending} pending, ${summary.completed24h} completed (24h)`,
      }).catch((err) => {
        console.error("[TASK-DIGEST] Email failed:", err.message);
      });
    }

    return Response.json({
      ...summary,
      emailSent: hasIssues,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[TASK-DIGEST] Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
