import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import crypto from "crypto";

/**
 * Auto-Process Affiliate Payouts — Cron Endpoint
 *
 * POST /api/cron/process-payouts
 *
 * Automatically processes pending affiliate/creator payouts:
 * - Validates payout amounts against earned commissions
 * - Marks as "processing" then "completed" after settlement
 * - Sends confirmation email via Resend
 *
 * Schedule: Daily at 11:00 UTC
 * Security: Requires CRON_SECRET header
 */

function verifyCronSecret(provided) {
  const expected = process.env.CRON_SECRET;
  if (!expected || !provided) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(provided),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

export async function POST(request) {
  // Auth
  const authHeader = request.headers.get("authorization") || "";
  const secret = authHeader.replace("Bearer ", "");
  if (!verifyCronSecret(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const results = { processed: 0, approved: 0, rejected: 0, errors: [] };

  try {
    // Fetch pending payouts
    const { data: payouts, error } = await supabase
      .from("affiliate_payouts")
      .select("*, profiles(email, name)")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) {
      console.error("[CRON:payouts] Fetch error:", error.message);
      return NextResponse.json({ error: "Failed to fetch payouts" }, { status: 500 });
    }

    if (!payouts?.length) {
      return NextResponse.json({ message: "No pending payouts", ...results });
    }

    for (const payout of payouts) {
      try {
        results.processed++;

        // Validate: check earned commission balance
        const { data: earnings } = await supabase
          .from("affiliate_earnings")
          .select("amount")
          .eq("user_id", payout.user_id)
          .eq("status", "confirmed");

        const totalEarned = (earnings || []).reduce((sum, e) => sum + (e.amount || 0), 0);

        // Get already paid out amount
        const { data: pastPayouts } = await supabase
          .from("affiliate_payouts")
          .select("amount")
          .eq("user_id", payout.user_id)
          .eq("status", "completed");

        const totalPaid = (pastPayouts || []).reduce((sum, p) => sum + (p.amount || 0), 0);
        const availableBalance = totalEarned - totalPaid;

        if (payout.amount > availableBalance) {
          // Reject — insufficient balance
          await supabase
            .from("affiliate_payouts")
            .update({
              status: "rejected",
              rejection_reason: `Insufficient balance: requested $${payout.amount}, available $${availableBalance.toFixed(2)}`,
              processed_at: new Date().toISOString(),
            })
            .eq("id", payout.id);

          results.rejected++;
          continue;
        }

        // Auto-approve payouts under $100 (larger ones need manual review)
        if (payout.amount <= 100) {
          await supabase
            .from("affiliate_payouts")
            .update({
              status: "completed",
              processed_at: new Date().toISOString(),
            })
            .eq("id", payout.id);

          results.approved++;

          // Send confirmation email
          if (process.env.RESEND_API_KEY && payout.profiles?.email) {
            try {
              const { Resend } = await import("resend");
              const resend = new Resend(process.env.RESEND_API_KEY);
              await resend.emails.send({
                from: "SafeScoring <noreply@safescoring.io>",
                to: payout.profiles.email,
                subject: `Payout of $${payout.amount} processed`,
                html: `<p>Hi ${payout.profiles.name || "there"},</p>
                  <p>Your payout of <strong>$${payout.amount}</strong> has been processed.</p>
                  <p>Thank you for being a SafeScoring partner!</p>`,
              });
            } catch (emailErr) {
              console.warn("[CRON:payouts] Email failed:", emailErr.message);
            }
          }
        } else {
          // Mark for manual review
          await supabase
            .from("affiliate_payouts")
            .update({
              status: "pending_review",
              processed_at: new Date().toISOString(),
            })
            .eq("id", payout.id);
        }
      } catch (err) {
        results.errors.push({ payout_id: payout.id, error: err.message });
      }
    }

    return NextResponse.json({
      message: `Processed ${results.processed} payouts`,
      ...results,
    });
  } catch (err) {
    console.error("[CRON:payouts] Fatal:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
