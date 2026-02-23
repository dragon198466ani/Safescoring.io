import { NextResponse } from "next/server";
import { verifyWebhookSignature, getTransactionStatus } from "@/libs/moonpay-commerce";
import { supabaseAdmin } from "@/libs/supabase";

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
  try {
    // Find transaction in database
    const { data: dbTransaction, error: findError } = await supabaseAdmin
      .from("crypto_transactions")
      .select("*")
      .eq("external_id", transaction.externalTransactionId)
      .single();

    if (findError || !dbTransaction) {
      console.error("Transaction not found:", transaction.externalTransactionId);
      return;
    }

    // Update transaction status
    const { error: updateError } = await supabaseAdmin
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

    const { error: subError } = await supabaseAdmin
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

    console.log("Subscription activated:", {
      userId: dbTransaction.user_id,
      plan: dbTransaction.plan,
      expiresAt,
    });

    // Send confirmation email
    await sendTransactionEmail(dbTransaction.user_id, "completed", {
      plan: dbTransaction.plan,
      expiresAt: expiresAt.toISOString(),
      amount: transaction.baseCurrencyAmount,
      currency: transaction.baseCurrency?.toUpperCase() || "USD",
      cryptoAmount: transaction.cryptoAmount,
      cryptoCurrency: transaction.cryptoCurrency?.toUpperCase(),
    });

    // Log in audit trail
    await logAudit(dbTransaction.user_id, "subscription_activated", {
      plan: dbTransaction.plan,
      provider: "moonpay",
      transaction_id: transaction.id,
      external_id: transaction.externalTransactionId,
      expires_at: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Error handling completed transaction:", error);
  }
}

/**
 * Handle failed transaction
 */
async function handleTransactionFailed(transaction) {
  try {
    await supabaseAdmin
      .from("crypto_transactions")
      .update({
        status: "failed",
        moonpay_transaction_id: transaction.id,
        failed_at: new Date().toISOString(),
      })
      .eq("external_id", transaction.externalTransactionId);

    console.log("Transaction failed:", transaction.externalTransactionId);

    // Find user for email notification
    const { data: dbTx } = await supabaseAdmin
      .from("crypto_transactions")
      .select("user_id")
      .eq("external_id", transaction.externalTransactionId)
      .single();

    if (dbTx?.user_id) {
      await sendTransactionEmail(dbTx.user_id, "failed", {
        reason: transaction.failureReason || "Unknown error",
        external_id: transaction.externalTransactionId,
      });

      await logAudit(dbTx.user_id, "payment_failed", {
        provider: "moonpay",
        transaction_id: transaction.id,
        external_id: transaction.externalTransactionId,
        reason: transaction.failureReason,
      });
    }
  } catch (error) {
    console.error("Error handling failed transaction:", error);
  }
}

/**
 * Handle pending transaction
 */
async function handleTransactionPending(transaction) {
  try {
    await supabaseAdmin
      .from("crypto_transactions")
      .update({
        status: "pending",
        moonpay_transaction_id: transaction.id,
      })
      .eq("external_id", transaction.externalTransactionId);

    console.log("Transaction pending:", transaction.externalTransactionId);
  } catch (error) {
    console.error("Error handling pending transaction:", error);
  }
}

/**
 * Send transaction email notification via Resend
 */
async function sendTransactionEmail(userId, status, details) {
  try {
    if (!process.env.RESEND_API_KEY) return;

    // Get user email
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("email, name")
      .eq("id", userId)
      .single();

    if (!user?.email) return;

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const userName = user.name || "there";

    if (status === "completed") {
      await resend.emails.send({
        from: "SafeScoring <noreply@safescoring.io>",
        to: user.email,
        subject: "Payment confirmed - Your subscription is active!",
        html: `
          <h2>Payment confirmed</h2>
          <p>Hi ${userName},</p>
          <p>Your crypto payment has been confirmed and your <strong>${details.plan}</strong> subscription is now active!</p>
          <ul>
            <li><strong>Amount:</strong> ${details.cryptoAmount} ${details.cryptoCurrency} (~${details.amount} ${details.currency})</li>
            <li><strong>Plan:</strong> ${details.plan}</li>
            <li><strong>Valid until:</strong> ${new Date(details.expiresAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</li>
          </ul>
          <p>Thank you for supporting SafeScoring!</p>
          <p><a href="https://safescoring.io/dashboard">Go to your dashboard</a></p>
        `,
      });
    } else if (status === "failed") {
      await resend.emails.send({
        from: "SafeScoring <noreply@safescoring.io>",
        to: user.email,
        subject: "Payment issue - Action required",
        html: `
          <h2>Payment issue</h2>
          <p>Hi ${userName},</p>
          <p>Unfortunately, your crypto payment could not be completed.</p>
          <p><strong>Reason:</strong> ${details.reason}</p>
          <p>You can try again from your dashboard or contact us if you need help.</p>
          <p><a href="https://safescoring.io/pricing">Try again</a></p>
        `,
      });
    }
  } catch (error) {
    console.error("Failed to send transaction email:", error);
  }
}

/**
 * Log event in audit trail
 */
async function logAudit(userId, action, metadata) {
  try {
    await supabaseAdmin.from("audit_log").insert({
      user_id: userId,
      action,
      metadata,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to log audit:", error);
  }
}
