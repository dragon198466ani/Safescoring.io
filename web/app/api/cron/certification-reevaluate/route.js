/**
 * Certification Reevaluation Cron Endpoint
 *
 * Triggered by Vercel Cron or external scheduler.
 * Evaluates certifications based on their tier schedule.
 *
 * Security: Requires CRON_SECRET header
 */

import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

// Tier intervals (days)
const TIER_INTERVALS = {
  starter: 90,
  verified: 30,
  enterprise: 7,
};

// Minimum scores by tier
const TIER_MIN_SCORES = {
  starter: 50,
  verified: 60,
  enterprise: 70,
};

export async function GET(request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const stats = {
    evaluated: 0,
    passed: 0,
    warned: 0,
    revoked: 0,
    errors: 0,
  };

  try {
    const now = new Date();

    // Find certifications due for each tier
    for (const [tier, intervalDays] of Object.entries(TIER_INTERVALS)) {
      const cutoff = new Date(now.getTime() - intervalDays * 24 * 60 * 60 * 1000);

      // Get due certifications
      const { data: dueCerts, error } = await supabase
        .from("certification_applications")
        .select(`
          id,
          product_id,
          tier,
          final_score,
          company_name,
          contact_email,
          products (id, name, slug)
        `)
        .eq("status", "approved")
        .eq("tier", tier)
        .lt("last_evaluated_at", cutoff.toISOString())
        .gt("certificate_expires_at", now.toISOString());

      if (error) {
        console.error(`Error fetching ${tier} certs:`, error);
        continue;
      }

      // Also get never-evaluated certifications
      const { data: neverEvaluated } = await supabase
        .from("certification_applications")
        .select(`
          id,
          product_id,
          tier,
          final_score,
          company_name,
          contact_email,
          products (id, name, slug)
        `)
        .eq("status", "approved")
        .eq("tier", tier)
        .is("last_evaluated_at", null)
        .gt("certificate_expires_at", now.toISOString());

      const allDue = [...(dueCerts || []), ...(neverEvaluated || [])];

      // Evaluate each
      for (const cert of allDue) {
        try {
          const result = await evaluateCertification(cert, tier);
          stats.evaluated++;

          if (result.action === "revoke") {
            stats.revoked++;
          } else if (result.action === "warn") {
            stats.warned++;
          } else {
            stats.passed++;
          }
        } catch (e) {
          console.error(`Error evaluating cert ${cert.id}:`, e);
          stats.errors++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      stats,
      timestamp: now.toISOString(),
    });

  } catch (error) {
    console.error("Reevaluation error:", error);
    return NextResponse.json(
      { error: "Internal server error", stats },
      { status: 500 }
    );
  }
}

async function evaluateCertification(cert, tier) {
  const { id: certId, product_id: productId, final_score: previousScore } = cert;

  // Get current score
  const { data: scoreData } = await supabase
    .from("safe_scoring_results")
    .select("note_finale, score_s, score_a, score_f, score_e")
    .eq("product_id", productId)
    .order("calculated_at", { ascending: false })
    .limit(1)
    .single();

  if (!scoreData) {
    return { action: "error", message: "No score found" };
  }

  const newScore = scoreData.note_finale;
  const minScore = TIER_MIN_SCORES[tier] || 50;
  const scoreChange = newScore - (previousScore || 0);

  let action = "pass";
  let message = `Score: ${newScore}`;

  // Check minimum threshold
  if (newScore < minScore) {
    action = "revoke";
    message = `Score ${newScore} below minimum ${minScore}`;

    // Revoke certification
    await supabase
      .from("certification_applications")
      .update({
        status: "revoked",
        final_score: newScore,
        revoked_at: new Date().toISOString(),
        revocation_reason: "Score below minimum threshold",
      })
      .eq("id", certId);

    // Deactivate badges
    await supabase
      .from("certification_badges")
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
      })
      .eq("certification_id", certId);

  } else if (scoreChange <= -5) {
    action = "warn";
    message = `Score dropped by ${Math.abs(scoreChange).toFixed(1)}`;
  }

  // Update evaluation data
  await supabase
    .from("certification_applications")
    .update({
      final_score: newScore,
      pillar_scores: {
        S: scoreData.score_s,
        A: scoreData.score_a,
        F: scoreData.score_f,
        E: scoreData.score_e,
      },
      last_evaluated_at: new Date().toISOString(),
    })
    .eq("id", certId);

  // Record evaluation history
  await supabase.from("certification_evaluations").insert({
    certification_id: certId,
    score: newScore,
    pillar_scores: {
      S: scoreData.score_s,
      A: scoreData.score_a,
      F: scoreData.score_f,
      E: scoreData.score_e,
    },
    evaluation_type: "cron",
  });

  return { action, message, newScore };
}

// Vercel cron config
export const dynamic = "force-dynamic";
export const maxDuration = 60;
