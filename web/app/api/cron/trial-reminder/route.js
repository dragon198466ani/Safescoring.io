import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/libs/supabase";
import { sendEmail } from "@/libs/resend";
import { trialEndingReminderEmail } from "@/libs/email-templates";
import { quickProtect } from "@/libs/api-protection";
import crypto from "crypto";
import config from "@/config";

// Build unsubscribe URL (same logic as email-sequences)
function getUnsubscribeUrl(email) {
  const secret =
    process.env.UNSUBSCRIBE_SECRET || process.env.NEXTAUTH_SECRET || "";
  const token = secret
    ? crypto
        .createHmac("sha256", secret)
        .update(email.toLowerCase())
        .digest("hex")
    : "";
  const base = `https://${config.domainName}/api/newsletter?email=${encodeURIComponent(email)}`;
  return token ? `${base}&token=${token}` : base;
}

export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * POST /api/cron/trial-reminder
 *
 * Sends a reminder email 3 days before a user's trial ends.
 * Required by:
 *   - California Auto-Renewal Law (ARL) — Bus. & Prof. Code §17600-17606
 *   - FTC Negative Option Rule — 16 CFR Part 425 (2024 update)
 *   - EU Consumer Rights Directive 2011/83/EU Art. 8(2)
 *
 * Should be called daily by a cron scheduler.
 */
export async function POST(request) {
  const protection = await quickProtect(request, "sensitive");
  if (protection.blocked) return protection.response;

  try {
    // Verify cron secret
    const { searchParams } = new URL(request.url);
    const secret =
      searchParams.get("secret") || request.headers.get("x-cron-secret");
    if (!CRON_SECRET || secret !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin || !process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 500 }
      );
    }

    const results = { sent: 0, skipped: 0, errors: 0 };

    // Get all plans with trial days from config
    const trialPlans = (config?.lemonsqueezy?.plans || []).filter(
      (p) => p.trialDays && p.variantId !== "free"
    );

    if (trialPlans.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No trial plans configured",
        ...results,
      });
    }

    // Calculate the date 3 days from now (target trial_end date)
    const now = new Date();
    const reminderTarget = new Date(now);
    reminderTarget.setDate(reminderTarget.getDate() + 3);
    const targetDateStr = reminderTarget.toISOString().slice(0, 10);

    // Find users whose trial ends in 3 days
    // trial_end = created_at + trialDays
    // So we look for users created (trialDays - 3) days ago
    for (const plan of trialPlans) {
      const daysAgo = plan.trialDays - 3;
      if (daysAgo < 0) continue; // Trial shorter than 3 days — can't send J-3

      const createdTarget = new Date(now);
      createdTarget.setDate(createdTarget.getDate() - daysAgo);
      const targetStart = createdTarget.toISOString().slice(0, 10) + "T00:00:00Z";
      const targetEnd = createdTarget.toISOString().slice(0, 10) + "T23:59:59Z";

      // Find users on this plan created on the target date
      const { data: users } = await supabaseAdmin
        .from("users")
        .select("id, email, name, plan_variant_id, has_cancelled")
        .gte("created_at", targetStart)
        .lte("created_at", targetEnd)
        .eq("plan_variant_id", plan.variantId)
        .not("email", "is", null);

      if (!users || users.length === 0) continue;

      for (const user of users) {
        // Skip users who already cancelled
        if (user.has_cancelled) {
          results.skipped++;
          continue;
        }

        // Idempotency: check if reminder already sent
        const { data: existing } = await supabaseAdmin
          .from("email_log")
          .select("id")
          .eq("user_id", user.id)
          .eq("email_type", "trial_ending_reminder")
          .maybeSingle();

        if (existing) {
          results.skipped++;
          continue;
        }

        // Calculate trial end date
        const userCreated = new Date(targetStart);
        const trialEnd = new Date(userCreated);
        trialEnd.setDate(trialEnd.getDate() + plan.trialDays);

        try {
          const template = trialEndingReminderEmail({
            name: user.name,
            planName: plan.name,
            price: plan.price,
            trialEndDate: trialEnd.toISOString(),
            unsubscribeUrl: getUnsubscribeUrl(user.email),
          });

          await sendEmail({
            to: user.email,
            subject: template.subject,
            text: template.text,
            html: template.html,
          });

          // Log the email
          await supabaseAdmin.from("email_log").insert({
            user_id: user.id,
            email_type: "trial_ending_reminder",
            sent_at: now.toISOString(),
          });

          results.sent++;
        } catch (err) {
          console.error(
            `Failed to send trial reminder to ${user.email}:`,
            err.message
          );
          results.errors++;
        }
      }
    }

    return NextResponse.json({ ok: true, ...results });
  } catch (error) {
    console.error("Trial reminder cron error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
