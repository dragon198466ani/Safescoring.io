import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyIPN, isPaymentSuccessful, PAYMENT_STATUS } from "@/libs/nowpayments";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Maximum age for webhook requests (5 minutes)
const MAX_WEBHOOK_AGE_MS = 5 * 60 * 1000;

// In-memory cache for recently processed webhooks (prevents replay within same instance)
// In production, this should be stored in Redis or database
const processedWebhooks = new Map();
const WEBHOOK_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of processedWebhooks.entries()) {
    if (now - timestamp > WEBHOOK_CACHE_TTL) {
      processedWebhooks.delete(key);
    }
  }
}, 60 * 1000); // Clean every minute

/**
 * NowPayments IPN Webhook Handler
 * Receives payment notifications and updates subscription status
 * Includes replay attack prevention
 */
export async function POST(request) {
  try {
    // Get IPN signature from headers
    const signature = request.headers.get("x-nowpayments-sig");

    // Parse payload
    const payload = await request.json();

    // Verify signature using timing-safe comparison
    if (!verifyIPN(payload, signature)) {
      console.error("[NowPayments] Invalid IPN signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const {
      payment_id,
      payment_status,
      order_id,
      price_amount,
      pay_currency,
      actually_paid,
      outcome_amount,
      created_at, // NowPayments includes creation timestamp
    } = payload;

    // SECURITY: Prevent replay attacks
    // Create unique key for this webhook event
    const webhookKey = `${payment_id}_${payment_status}`;

    // Check if we've already processed this exact webhook
    if (processedWebhooks.has(webhookKey)) {
      console.warn(`[NowPayments] Duplicate webhook detected: ${webhookKey}`);
      return NextResponse.json({ success: true, message: "Already processed" });
    }

    // Check webhook age if timestamp is available
    if (created_at) {
      const webhookAge = Date.now() - new Date(created_at).getTime();
      if (webhookAge > MAX_WEBHOOK_AGE_MS) {
        console.warn(`[NowPayments] Stale webhook rejected: ${webhookKey}, age: ${webhookAge}ms`);
        return NextResponse.json(
          { error: "Webhook too old" },
          { status: 400 }
        );
      }
    }

    // Mark as processed (in-memory for this instance)
    processedWebhooks.set(webhookKey, Date.now());

    console.log(`[NowPayments] Payment ${payment_id} status: ${payment_status}`);

    // Parse order_id (format: userId_planType_billingPeriod_timestamp)
    const [userId, planType, billingPeriod] = order_id.split("_");

    if (!userId || !planType) {
      console.error("Invalid order_id format:", order_id);
      return NextResponse.json(
        { error: "Invalid order_id" },
        { status: 400 }
      );
    }

    // Connect to Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SECURITY: Database-level duplicate check (works across serverless instances)
    const { data: existingEvent } = await supabase
      .from("payment_events")
      .select("id")
      .eq("payment_id", String(payment_id))
      .eq("status", payment_status)
      .single();

    if (existingEvent) {
      console.warn(`[NowPayments] Duplicate webhook (DB check): ${webhookKey}`);
      return NextResponse.json({ success: true, message: "Already processed" });
    }

    // Log the payment event (with unique constraint on payment_id + status)
    const { error: insertError } = await supabase.from("payment_events").insert({
      payment_id: String(payment_id),
      provider: "nowpayments",
      status: payment_status,
      user_id: userId,
      plan_type: planType,
      amount: price_amount,
      currency: pay_currency,
      metadata: payload,
      created_at: new Date().toISOString(),
    });

    // If insert fails due to duplicate, another instance processed it first
    if (insertError?.code === '23505') { // Unique violation
      console.warn(`[NowPayments] Concurrent duplicate detected: ${webhookKey}`);
      return NextResponse.json({ success: true, message: "Already processed" });
    }

    // Handle successful payment
    if (isPaymentSuccessful(payment_status)) {
      // Calculate subscription period
      const now = new Date();
      const periodEnd = new Date(now);

      if (billingPeriod === "yearly") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      // Update or create subscription
      const { error: subError } = await supabase
        .from("subscriptions")
        .upsert({
          user_id: userId,
          plan_type: planType,
          status: "active",
          payment_method: "crypto",
          payment_provider: "nowpayments",
          payment_id: String(payment_id),
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: now.toISOString(),
        }, {
          onConflict: "user_id",
        });

      if (subError) {
        console.error("Error updating subscription:", subError);
        throw subError;
      }

      // Update user access
      await supabase
        .from("users")
        .update({
          plan_type: planType,
          has_access: true,
          price_id: `crypto_${planType}_${billingPeriod}`,
        })
        .eq("id", userId);

      console.log(`[NowPayments] Subscription activated for user ${userId}`);
    }

    // Handle failed/expired payments
    if ([PAYMENT_STATUS.FAILED, PAYMENT_STATUS.EXPIRED].includes(payment_status)) {
      // Log but don't deactivate - let cron handle expired subscriptions
      console.log(`[NowPayments] Payment ${payment_status} for user ${userId}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[NowPayments] Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
