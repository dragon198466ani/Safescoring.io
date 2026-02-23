import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import crypto from "crypto";

/**
 * Auto-Send Enterprise Team Invites — Cron Endpoint
 *
 * POST /api/cron/enterprise-invites
 *
 * Finds pending team member invitations and sends them via Resend.
 * Updates invite_sent status after each email.
 *
 * Schedule: Daily at 13:00 UTC
 */

function verifyCronSecret(provided) {
  const expected = process.env.CRON_SECRET;
  if (!expected || !provided) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch { return false; }
}

export async function POST(request) {
  const authHeader = request.headers.get("authorization") || "";
  if (!verifyCronSecret(authHeader.replace("Bearer ", ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const results = { sent: 0, failed: 0, skipped: 0 };

  try {
    // Get pending invites
    const { data: invites, error } = await supabase
      .from("enterprise_team_members")
      .select("*, enterprise_configs(company_name)")
      .eq("invite_sent", false)
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!invites?.length) {
      return NextResponse.json({ message: "No pending invites", ...results });
    }

    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      console.warn("[CRON:invites] RESEND_API_KEY not set — marking as sent without email");
      // Still mark as sent to prevent infinite retry
      for (const invite of invites) {
        await supabase
          .from("enterprise_team_members")
          .update({
            invite_sent: true,
            invite_sent_at: new Date().toISOString(),
            invite_note: "Email skipped — RESEND_API_KEY not configured",
          })
          .eq("id", invite.id);
        results.skipped++;
      }
      return NextResponse.json({ message: `Skipped ${results.skipped} invites (no email provider)`, ...results });
    }

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    for (const invite of invites) {
      try {
        const companyName = invite.enterprise_configs?.company_name || "your organization";

        // Generate invite token
        const token = crypto.randomBytes(32).toString("hex");

        await resend.emails.send({
          from: "SafeScoring <noreply@safescoring.io>",
          to: invite.email,
          subject: `You've been invited to ${companyName} on SafeScoring`,
          html: `
            <h2>You're invited!</h2>
            <p><strong>${companyName}</strong> has invited you to join their team on SafeScoring Enterprise.</p>
            <p>Role: <strong>${invite.role || "member"}</strong></p>
            <p><a href="https://safescoring.io/enterprise/join?token=${token}&email=${encodeURIComponent(invite.email)}"
                  style="background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">
              Accept Invitation
            </a></p>
            <p style="color:#666;font-size:12px;">If you didn't expect this invitation, you can safely ignore this email.</p>
          `,
        });

        await supabase
          .from("enterprise_team_members")
          .update({
            invite_sent: true,
            invite_sent_at: new Date().toISOString(),
            invite_token: token,
          })
          .eq("id", invite.id);

        results.sent++;
      } catch (emailErr) {
        console.error(`[CRON:invites] Failed for ${invite.email}:`, emailErr.message);
        results.failed++;
      }
    }

    console.log(`[CRON:invites] Sent ${results.sent}, failed ${results.failed}`);
    return NextResponse.json({ message: `Processed ${invites.length} invites`, ...results });
  } catch (err) {
    console.error("[CRON:invites] Fatal:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
