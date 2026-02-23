import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import crypto from "crypto";

/**
 * Auto-Process Certification Claims — Cron Endpoint
 *
 * POST /api/cron/process-certifications
 *
 * Auto-approves standard certification claims for products with score >= 60
 * that were evaluated within the last 90 days.
 * Verified/premium claims remain as pending_review for human approval.
 *
 * Schedule: Daily at 12:00 UTC
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

  const results = { processed: 0, auto_approved: 0, pending_review: 0, rejected: 0, errors: [] };

  try {
    const { data: claims, error } = await supabase
      .from("certification_claims")
      .select("*, products(id, slug, name, score_overall, last_evaluated_at)")
      .eq("status", "pending")
      .limit(30);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!claims?.length) {
      return NextResponse.json({ message: "No pending claims", ...results });
    }

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    for (const claim of claims) {
      try {
        results.processed++;
        const product = claim.products;

        // Validate product score
        if (!product || (product.score_overall || 0) < 60) {
          await supabase
            .from("certification_claims")
            .update({
              status: "rejected",
              review_note: `Product score ${product?.score_overall || 0} below minimum (60)`,
              reviewed_at: new Date().toISOString(),
            })
            .eq("id", claim.id);
          results.rejected++;
          continue;
        }

        // Check evaluation freshness
        const lastEval = product.last_evaluated_at ? new Date(product.last_evaluated_at) : null;
        if (!lastEval || lastEval < ninetyDaysAgo) {
          await supabase
            .from("certification_claims")
            .update({
              status: "pending_review",
              review_note: "Evaluation too old — needs re-evaluation before certification",
              reviewed_at: new Date().toISOString(),
            })
            .eq("id", claim.id);
          results.pending_review++;
          continue;
        }

        // Standard tier = auto-approve
        if (claim.tier === "standard") {
          await supabase
            .from("certification_claims")
            .update({
              status: "approved",
              review_note: "Auto-approved: score >= 60 and recent evaluation",
              reviewed_at: new Date().toISOString(),
              approved_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq("id", claim.id);
          results.auto_approved++;

          // Send approval email
          if (process.env.RESEND_API_KEY && claim.contact_email) {
            try {
              const { Resend } = await import("resend");
              const resend = new Resend(process.env.RESEND_API_KEY);
              await resend.emails.send({
                from: "SafeScoring <noreply@safescoring.io>",
                to: claim.contact_email,
                subject: `Certification Approved: ${product.name}`,
                html: `<h2>Congratulations!</h2>
                  <p>Your <strong>${product.name}</strong> has been certified as <strong>SafeScoring Approved</strong> with a score of ${product.score_overall}/100.</p>
                  <p>Your certification badge is now active and valid for 1 year.</p>
                  <p>Visit your <a href="https://safescoring.io/certification">certification dashboard</a> to get your badge embed code.</p>`,
              });
            } catch (emailErr) {
              console.warn("[CRON:certs] Email failed:", emailErr.message);
            }
          }
        } else {
          // Verified/Premium = needs human review
          await supabase
            .from("certification_claims")
            .update({
              status: "pending_review",
              review_note: `${claim.tier} tier — awaiting manual review`,
              reviewed_at: new Date().toISOString(),
            })
            .eq("id", claim.id);
          results.pending_review++;
        }
      } catch (err) {
        results.errors.push({ id: claim.id, error: err.message });
      }
    }

    console.log(`[CRON:certs] Processed ${results.processed}: ${results.auto_approved} auto-approved, ${results.pending_review} pending review`);
    return NextResponse.json({ message: `Processed ${results.processed} claims`, ...results });
  } catch (err) {
    console.error("[CRON:certs] Fatal:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
