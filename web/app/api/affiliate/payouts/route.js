import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

/**
 * Affiliate Payouts API
 *
 * GET - List payout history
 * POST - Request a payout
 */

const MINIMUM_PAYOUT = 50; // Minimum $50 to request payout

// SECURITY: Rate limiting for payout requests
const payoutRequestLimits = new Map();
const PAYOUT_RATE_WINDOW = 24 * 60 * 60 * 1000; // 24 hours
const MAX_PAYOUT_REQUESTS = 3; // Max 3 payout requests per day

function checkPayoutRateLimit(userId) {
  const now = Date.now();
  const record = payoutRequestLimits.get(userId);

  // Clean old entries periodically
  if (payoutRequestLimits.size > 1000) {
    for (const [key, val] of payoutRequestLimits.entries()) {
      if (now - val.timestamp > PAYOUT_RATE_WINDOW) {
        payoutRequestLimits.delete(key);
      }
    }
  }

  if (!record || now - record.timestamp > PAYOUT_RATE_WINDOW) {
    payoutRequestLimits.set(userId, { timestamp: now, count: 1 });
    return { allowed: true };
  }

  if (record.count >= MAX_PAYOUT_REQUESTS) {
    const retryAfter = Math.ceil((PAYOUT_RATE_WINDOW - (now - record.timestamp)) / 1000);
    return { allowed: false, retryAfter };
  }

  record.count++;
  return { allowed: true };
}

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    // Get affiliate account
    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("id, pending_payout, lifetime_payout, payout_method")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!affiliate) {
      return NextResponse.json({ error: "Affiliate account not found" }, { status: 404 });
    }

    // Get payout history
    const { data: payouts, error } = await supabase
      .from("affiliate_payouts")
      .select("id, amount, method, status, transaction_id, created_at, completed_at")
      .eq("affiliate_id", affiliate.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching payouts:", error);
      return NextResponse.json({ error: "Failed to fetch payouts" }, { status: 500 });
    }

    return NextResponse.json({
      balance: {
        pending: parseFloat(affiliate.pending_payout || 0),
        lifetime: parseFloat(affiliate.lifetime_payout || 0),
        minimumPayout: MINIMUM_PAYOUT,
        canRequestPayout: parseFloat(affiliate.pending_payout || 0) >= MINIMUM_PAYOUT,
      },
      payoutMethod: affiliate.payout_method,
      payouts: (payouts || []).map(p => ({
        id: p.id,
        amount: parseFloat(p.amount),
        method: p.method,
        status: p.status,
        transactionId: p.transaction_id,
        createdAt: p.created_at,
        completedAt: p.completed_at,
      })),
    });

  } catch (error) {
    console.error("Payouts GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // SECURITY: Rate limit payout requests
  const rateCheck = checkPayoutRateLimit(session.user.id);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: "Too many payout requests. Please try again later.",
        retryAfter: rateCheck.retryAfter,
      },
      { status: 429 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const { amount, method, payoutDetails } = await request.json();

    // Get affiliate account
    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("id, pending_payout, payout_method, payout_details, status")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!affiliate) {
      return NextResponse.json({ error: "Affiliate account not found" }, { status: 404 });
    }

    if (affiliate.status !== "approved") {
      return NextResponse.json({ error: "Affiliate account not approved" }, { status: 400 });
    }

    const pendingBalance = parseFloat(affiliate.pending_payout || 0);
    const requestedAmount = amount ? parseFloat(amount) : pendingBalance;

    if (requestedAmount < MINIMUM_PAYOUT) {
      return NextResponse.json(
        { error: `Minimum payout amount is $${MINIMUM_PAYOUT}` },
        { status: 400 }
      );
    }

    if (requestedAmount > pendingBalance) {
      return NextResponse.json(
        { error: "Requested amount exceeds available balance" },
        { status: 400 }
      );
    }

    // Check for pending payout requests
    const { count: pendingPayouts } = await supabase
      .from("affiliate_payouts")
      .select("*", { count: "exact", head: true })
      .eq("affiliate_id", affiliate.id)
      .in("status", ["pending", "processing"]);

    if (pendingPayouts > 0) {
      return NextResponse.json(
        { error: "You already have a pending payout request" },
        { status: 400 }
      );
    }

    // Update payout details if provided
    if (payoutDetails) {
      await supabase
        .from("affiliates")
        .update({
          payout_method: method || affiliate.payout_method,
          payout_details: payoutDetails,
        })
        .eq("id", affiliate.id);
    }

    // Create payout request
    const { data: payout, error } = await supabase
      .from("affiliate_payouts")
      .insert({
        affiliate_id: affiliate.id,
        amount: requestedAmount,
        method: method || affiliate.payout_method || "crypto",
        status: "pending",
        metadata: {
          requested_by: session.user.id,
          payout_details: payoutDetails || affiliate.payout_details,
        },
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating payout:", error);
      return NextResponse.json({ error: "Failed to create payout request" }, { status: 500 });
    }

    return NextResponse.json({
      message: "Payout request submitted successfully",
      payout: {
        id: payout.id,
        amount: requestedAmount,
        status: "pending",
      },
    }, { status: 201 });

  } catch (error) {
    console.error("Payouts POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
