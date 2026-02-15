import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/libs/supabase";
import { verifyMoonPayWebhook, parseTransactionId } from "@/libs/moonpay";
import { isDuplicateWebhookEvent } from "@/libs/webhook-idempotency";
import { captureServerError } from "@/libs/monitoring";

/**
 * POST /api/webhook/moonpay
 * Handle MoonPay webhook events for crypto payment completion
 *
 * MoonPay sends webhooks when:
 * - Transaction completed (payment received)
 * - Transaction failed
 * - Transaction pending
 *
 * Docs: https://docs.moonpay.com/docs/webhooks
 */
export async function POST(req) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("moonpay-signature-v2");

    // Verify webhook signature (fail-closed: reject if secret not configured)
    if (!process.env.MOONPAY_WEBHOOK_SECRET) {
      console.error("MOONPAY_WEBHOOK_SECRET not configured — rejecting webhook");
      return NextResponse.json(
        { error: "Webhook verification not configured" },
        { status: 401 }
      );
    }
    if (!signature || !verifyMoonPayWebhook(rawBody, signature)) {
      console.error("Invalid MoonPay webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const event = JSON.parse(rawBody);

    const {
      type,
      data: txData,
    } = event;

    const transactionId = txData?.id || txData?.externalTransactionId;

    console.log(`MoonPay webhook: ${type} — tx: ${transactionId}`);

    // Idempotency check
    if (transactionId) {
      const isDuplicate = await isDuplicateWebhookEvent(
        `mp_${transactionId}`,
        "moonpay",
        type
      );
      if (isDuplicate) {
        return NextResponse.json({ received: true, duplicate: true });
      }
    }

    if (!supabaseAdmin) {
      console.error("Supabase not configured");
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    switch (type) {
      case "transaction_completed": {
        // Crypto payment was successful — grant access
        const externalTxId = txData?.externalTransactionId;
        const parsed = parseTransactionId(externalTxId);

        if (!parsed) {
          console.error(
            "Could not parse transaction ID:",
            externalTxId
          );
          break;
        }

        const { planName, userId } = parsed;

        // Find the user
        let user = null;
        if (userId && userId !== "anonymous") {
          const { data: userData } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("id", userId)
            .single();
          user = userData;
        }

        // Fallback: find by email from MoonPay
        if (!user && txData?.email) {
          const { data: userData } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("email", txData.email)
            .single();
          user = userData;
        }

        if (!user) {
          console.error("No user found for MoonPay transaction:", externalTxId);
          break;
        }

        // Grant access — crypto payments are treated as monthly subscriptions
        // (user will need to pay again next month or upgrade to annual later)
        const { error: updateError } = await supabaseAdmin
          .from("users")
          .update({
            has_access: true,
            plan_type: planName,
            price_id: `moonpay_${planName}`,
            moonpay_transaction_id: transactionId,
          })
          .eq("id", user.id);

        if (updateError) {
          console.error("Error updating user:", updateError);
          throw updateError;
        }

        console.log(
          `MoonPay: Granted ${planName} access to user ${user.id}`
        );
        break;
      }

      case "transaction_failed": {
        // Payment failed — log for monitoring
        console.warn(
          `MoonPay transaction failed: ${txData?.externalTransactionId}`,
          txData?.failureReason
        );
        break;
      }

      case "transaction_pending": {
        // Transaction is pending confirmation (normal for on-chain payments)
        console.log(
          `MoonPay transaction pending: ${txData?.externalTransactionId}`
        );
        break;
      }

      default:
        console.log(`Unhandled MoonPay event: ${type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    captureServerError(error, {
      route: "/api/webhook/moonpay",
      tags: { source: "moonpay-webhook" },
    });
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
