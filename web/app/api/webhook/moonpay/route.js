import { NextResponse } from "next/server";
import { verifyWebhookSignature, getTransactionStatus } from "@/libs/moonpay-commerce";
import { createClient } from "@/libs/supabase";

/**
 * MoonPay Webhook Handler
 * Receives notifications when crypto payments are completed
 *
 * Documentation: https://docs.moonpay.com/commerce/webhooks
 */
export async function POST(request) {
  try {
    // Get webhook signature
    const signature = request.headers.get("moonpay-signature");
    if (!signature) {
      console.error("Missing MoonPay signature");
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 401 }
      );
    }

    // Get raw body
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);

    // Verify webhook signature
    if (!verifyWebhookSignature(payload, signature)) {
      console.error("Invalid MoonPay signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    console.log("MoonPay webhook received:", payload.type);

    // Handle different event types
    switch (payload.type) {
      case "transaction.completed":
        await handleTransactionCompleted(payload.data);
        break;

      case "transaction.failed":
        await handleTransactionFailed(payload.data);
        break;

      case "transaction.pending":
        await handleTransactionPending(payload.data);
        break;

      default:
        console.log("Unhandled MoonPay event type:", payload.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("MoonPay webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Handle completed transaction
 */
async function handleTransactionCompleted(transaction) {
  const supabase = createClient();

  try {
    // Find transaction in database
    const { data: dbTransaction, error: findError } = await supabase
      .from("crypto_transactions")
      .select("*")
      .eq("external_id", transaction.externalTransactionId)
      .single();

    if (findError || !dbTransaction) {
      console.error("Transaction not found:", transaction.externalTransactionId);
      return;
    }

    // Update transaction status
    const { error: updateError } = await supabase
      .from("crypto_transactions")
      .update({
        status: "completed",
        moonpay_transaction_id: transaction.id,
        crypto_currency: transaction.cryptoCurrency,
        crypto_amount: transaction.cryptoAmount,
        completed_at: new Date().toISOString(),
      })
      .eq("external_id", transaction.externalTransactionId);

    if (updateError) {
      console.error("Failed to update transaction:", updateError);
      return;
    }

    // Activate user subscription
    const expiresAt = dbTransaction.billing_period === "yearly"
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const { error: subError } = await supabase
      .from("users")
      .update({
        subscription_plan: dbTransaction.plan,
        subscription_status: "active",
        subscription_expires_at: expiresAt.toISOString(),
        subscription_provider: "moonpay",
      })
      .eq("id", dbTransaction.user_id);

    if (subError) {
      console.error("Failed to activate subscription:", subError);
      return;
    }

    console.log("✅ Subscription activated:", {
      userId: dbTransaction.user_id,
      plan: dbTransaction.plan,
      expiresAt,
    });

    // TODO: Send confirmation email
    // TODO: Log in audit trail
  } catch (error) {
    console.error("Error handling completed transaction:", error);
  }
}

/**
 * Handle failed transaction
 */
async function handleTransactionFailed(transaction) {
  const supabase = createClient();

  try {
    await supabase
      .from("crypto_transactions")
      .update({
        status: "failed",
        moonpay_transaction_id: transaction.id,
        failed_at: new Date().toISOString(),
      })
      .eq("external_id", transaction.externalTransactionId);

    console.log("❌ Transaction failed:", transaction.externalTransactionId);

    // TODO: Send failure notification email
  } catch (error) {
    console.error("Error handling failed transaction:", error);
  }
}

/**
 * Handle pending transaction
 */
async function handleTransactionPending(transaction) {
  const supabase = createClient();

  try {
    await supabase
      .from("crypto_transactions")
      .update({
        status: "pending",
        moonpay_transaction_id: transaction.id,
      })
      .eq("external_id", transaction.externalTransactionId);

    console.log("⏳ Transaction pending:", transaction.externalTransactionId);
  } catch (error) {
    console.error("Error handling pending transaction:", error);
  }
}
