import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/libs/supabase";
import { verifyWebhookSignature } from "@/libs/lemonsqueezy";
import config from "@/config";

/**
 * POST /api/webhook/lemonsqueezy
 * Handle Lemon Squeezy webhook events
 *
 * Events handled:
 * - subscription_created: New subscription created
 * - subscription_updated: Subscription updated (plan change, renewal)
 * - subscription_cancelled: Subscription cancelled
 * - subscription_resumed: Subscription resumed after cancellation
 * - subscription_expired: Subscription expired
 * - subscription_paused: Subscription paused
 * - subscription_unpaused: Subscription unpaused
 * - subscription_payment_success: Payment successful
 * - subscription_payment_failed: Payment failed
 * - order_created: One-time order created
 */
export async function POST(req) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-signature");

    // Verify webhook signature
    if (process.env.LEMON_SQUEEZY_WEBHOOK_SECRET) {
      if (!signature || !verifyWebhookSignature(rawBody, signature)) {
        console.error("Invalid webhook signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const event = JSON.parse(rawBody);
    const eventName = event.meta?.event_name;
    const customData = event.meta?.custom_data || {};
    const data = event.data?.attributes;

    console.log(`Lemon Squeezy webhook: ${eventName}`);

    if (!supabaseAdmin) {
      console.error("Supabase not configured");
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    switch (eventName) {
      case "subscription_created":
      case "order_created": {
        // New subscription or order created - Grant access
        const userId = customData.user_id;
        const customerEmail = data.user_email;
        const customerId = event.data?.relationships?.customer?.data?.id;
        const variantId = data.variant_id?.toString();
        const subscriptionId = event.data?.id;

        // Find the plan by variant ID
        const plan = config.lemonsqueezy?.plans?.find(
          (p) => p.variantId === variantId
        );
        const planType = plan?.name?.toLowerCase() || "explorer";

        // Get trial end date if applicable
        let trialEndsAt = null;
        if (data.trial_ends_at) {
          trialEndsAt = data.trial_ends_at;
        }

        // Find or create user
        let user = null;
        if (userId) {
          const { data: userData } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("id", userId)
            .single();
          user = userData;
        } else if (customerEmail) {
          const { data: userData } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("email", customerEmail)
            .single();

          if (!userData) {
            // Create new user
            const { data: newUser, error } = await supabaseAdmin
              .from("users")
              .insert({
                email: customerEmail,
                name: data.user_name || null,
              })
              .select()
              .single();

            if (error) {
              console.error("Error creating user:", error);
              throw error;
            }
            user = newUser;
          } else {
            user = userData;
          }
        }

        if (!user) {
          console.error("No user found for subscription");
          break;
        }

        // Update user with subscription info
        const { error: updateError } = await supabaseAdmin
          .from("users")
          .update({
            has_access: true,
            plan_type: planType,
            price_id: variantId,
            lemon_squeezy_customer_id: customerId,
            lemon_squeezy_subscription_id: subscriptionId,
            trial_ends_at: trialEndsAt,
          })
          .eq("id", user.id);

        if (updateError) {
          console.error("Error updating user:", updateError);
          throw updateError;
        }

        console.log(`Granted access to user ${user.id} with plan ${planType}`);
        break;
      }

      case "subscription_updated": {
        // Subscription updated - might be a plan change
        const customerId = event.data?.relationships?.customer?.data?.id;
        const variantId = data.variant_id?.toString();
        const status = data.status;

        const plan = config.lemonsqueezy?.plans?.find(
          (p) => p.variantId === variantId
        );
        const planType = plan?.name?.toLowerCase() || "explorer";

        // Update based on status
        const hasAccess = ["active", "on_trial"].includes(status);

        const { error } = await supabaseAdmin
          .from("users")
          .update({
            has_access: hasAccess,
            plan_type: hasAccess ? planType : "free",
            price_id: hasAccess ? variantId : "free",
          })
          .eq("lemon_squeezy_customer_id", customerId);

        if (error) {
          console.error("Error updating subscription:", error);
          throw error;
        }
        break;
      }

      case "subscription_cancelled":
      case "subscription_expired": {
        // Subscription ended - Revoke access
        const customerId = event.data?.relationships?.customer?.data?.id;

        const { error } = await supabaseAdmin
          .from("users")
          .update({
            has_access: false,
            plan_type: "free",
            price_id: "free",
            trial_ends_at: null,
          })
          .eq("lemon_squeezy_customer_id", customerId);

        if (error) {
          console.error("Error revoking access:", error);
          throw error;
        }

        console.log(`Revoked access for customer ${customerId}`);
        break;
      }

      case "subscription_resumed":
      case "subscription_unpaused": {
        // Subscription resumed - Grant access again
        const customerId = event.data?.relationships?.customer?.data?.id;
        const variantId = data.variant_id?.toString();

        const plan = config.lemonsqueezy?.plans?.find(
          (p) => p.variantId === variantId
        );
        const planType = plan?.name?.toLowerCase() || "explorer";

        const { error } = await supabaseAdmin
          .from("users")
          .update({
            has_access: true,
            plan_type: planType,
            price_id: variantId,
          })
          .eq("lemon_squeezy_customer_id", customerId);

        if (error) {
          console.error("Error resuming subscription:", error);
          throw error;
        }
        break;
      }

      case "subscription_paused": {
        // Subscription paused - Could revoke or keep access based on business logic
        const customerId = event.data?.relationships?.customer?.data?.id;

        const { error } = await supabaseAdmin
          .from("users")
          .update({
            has_access: false,
          })
          .eq("lemon_squeezy_customer_id", customerId);

        if (error) {
          console.error("Error pausing subscription:", error);
          throw error;
        }
        break;
      }

      case "subscription_payment_success": {
        // Payment successful - Ensure access is granted
        const customerId = event.data?.relationships?.customer?.data?.id;

        const { error } = await supabaseAdmin
          .from("users")
          .update({
            has_access: true,
          })
          .eq("lemon_squeezy_customer_id", customerId);

        if (error) {
          console.error("Error updating payment success:", error);
          throw error;
        }
        break;
      }

      case "subscription_payment_failed": {
        // Payment failed - Could send notification or revoke after X failures
        const customerId = event.data?.relationships?.customer?.data?.id;
        console.warn(`Payment failed for customer ${customerId}`);
        // For now, don't revoke access immediately - Lemon Squeezy handles retries
        break;
      }

      default:
        console.log(`Unhandled Lemon Squeezy event: ${eventName}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Lemon Squeezy webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
