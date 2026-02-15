import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/libs/supabase";
import { sendEmail } from "@/libs/resend";
import { setupNudgeEmail, compareNudgeEmail } from "@/libs/email-templates";
import { quickProtect } from "@/libs/api-protection";
import crypto from "crypto";
import config from "@/config";

// Build unsubscribe URL for email sequences (CAN-SPAM / RGPD compliance)
function getUnsubscribeUrl(email) {
  const secret = process.env.UNSUBSCRIBE_SECRET || process.env.NEXTAUTH_SECRET || "";
  const token = secret ? crypto.createHmac("sha256", secret).update(email.toLowerCase()).digest("hex") : "";
  const base = `https://${config.domainName}/api/newsletter?email=${encodeURIComponent(email)}`;
  return token ? `${base}&token=${token}` : base;
}

export const dynamic = "force-dynamic";

// Cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

// POST /api/cron/email-sequences — Process email sequences (called by cron)
export async function POST(request) {
  const protection = await quickProtect(request, "sensitive");
  if (protection.blocked) return protection.response;

  try {
    // Verify cron secret
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret") || request.headers.get("x-cron-secret");
    if (!CRON_SECRET || secret !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin || !process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
    }

    const now = new Date();
    const results = { sent: 0, skipped: 0, errors: 0 };

    // Sequence definitions: { type, delayDays, templateFn }
    const sequences = [
      { type: "setup_nudge", delayDays: 2, templateFn: setupNudgeEmail },
      { type: "compare_nudge", delayDays: 5, templateFn: compareNudgeEmail },
    ];

    for (const seq of sequences) {
      // Find users who signed up N days ago and haven't received this email yet
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - seq.delayDays);
      const targetStart = targetDate.toISOString().slice(0, 10) + "T00:00:00Z";
      const targetEnd = targetDate.toISOString().slice(0, 10) + "T23:59:59Z";

      // Get users created on that day
      const { data: users } = await supabaseAdmin
        .from("users")
        .select("id, email, name")
        .gte("created_at", targetStart)
        .lte("created_at", targetEnd)
        .not("email", "is", null);

      if (!users || users.length === 0) continue;

      // Get unsubscribed or pending (not confirmed) emails to skip (GDPR/CAN-SPAM compliance)
      const userEmails = users.map((u) => u.email).filter(Boolean);
      const { data: nonActive } = await supabaseAdmin
        .from("newsletter_subscribers")
        .select("email")
        .in("email", userEmails)
        .in("status", ["unsubscribed", "pending"]);
      const unsubEmails = new Set((nonActive || []).map((u) => u.email?.toLowerCase()));

      for (const user of users) {
        // Skip users who have unsubscribed from emails
        if (unsubEmails.has(user.email?.toLowerCase())) {
          results.skipped++;
          continue;
        }

        // Check if email already sent (idempotency)
        const { data: existing } = await supabaseAdmin
          .from("email_log")
          .select("id")
          .eq("user_id", user.id)
          .eq("email_type", seq.type)
          .maybeSingle();

        if (existing) {
          results.skipped++;
          continue;
        }

        try {
          const template = seq.templateFn({ name: user.name, unsubscribeUrl: getUnsubscribeUrl(user.email) });
          await sendEmail({
            to: user.email,
            subject: template.subject,
            text: template.text,
            html: template.html,
          });

          // Log the email
          await supabaseAdmin.from("email_log").insert({
            user_id: user.id,
            email_type: seq.type,
            sent_at: now.toISOString(),
          });

          results.sent++;
        } catch (err) {
          console.error(`Failed to send ${seq.type} to ${user.email}:`, err.message);
          results.errors++;
        }
      }
    }

    return NextResponse.json({ ok: true, ...results });
  } catch (error) {
    console.error("Email sequences cron error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
