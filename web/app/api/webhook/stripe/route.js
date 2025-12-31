import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { supabaseAdmin } from "@/libs/supabase";
import configFile from "@/config";
import { findCheckoutSession } from "@/libs/stripe";

// Initialize Stripe only if the secret key is available
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// This is where we receive Stripe webhook events
// It used to update the user data, send emails, etc...
// By default, it'll store the user in the database (Supabase)
// See more: https://shipfa.st/docs/features/payments
export async function POST(req) {
  // Check if Stripe is configured
  if (!stripe || !webhookSecret) {
    console.error("Stripe is not configured properly. Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Stripe configuration missing" }, { status: 500 });
  }

  if (!supabaseAdmin) {
    console.error("Supabase is not configured properly. Missing SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 });
  }

  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");

  let data;
  let eventType;
  let event;

  // verify Stripe event is legit
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed. ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  data = event.data;
  eventType = event.type;

  try {
    switch (eventType) {
      case "checkout.session.completed": {
        // First payment is successful and a subscription is created
        // Grant access to the product

        const session = await findCheckoutSession(data.object.id);

        const customerId = session?.customer;
        const priceId = session?.line_items?.data[0]?.price.id;
        const userId = data.object.client_reference_id;
        const plan = configFile.stripe.plans.find((p) => p.priceId === priceId);

        if (!plan) break;

        const customer = await stripe.customers.retrieve(customerId);

        let user;

        // Get or create the user
        if (userId) {
          const { data: userData } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("id", userId)
            .single();
          user = userData;
        } else if (customer.email) {
          const { data: userData } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("email", customer.email)
            .single();

          if (!userData) {
            const { data: newUser, error } = await supabaseAdmin
              .from("users")
              .insert({
                email: customer.email,
                name: customer.name,
              })
              .select()
              .single();

            if (error) throw error;
            user = newUser;
          } else {
            user = userData;
          }
        } else {
          console.error("No user found");
          throw new Error("No user found");
        }

        // Check if subscription has a trial
        let trialEndsAt = null;
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          if (subscription.trial_end) {
            trialEndsAt = new Date(subscription.trial_end * 1000).toISOString();
          }
        }

        // Update user data + Grant user access
        const { error: updateError } = await supabaseAdmin
          .from("users")
          .update({
            price_id: priceId,
            customer_id: customerId,
            has_access: true,
            plan_type: plan.name.toLowerCase(),
            trial_ends_at: trialEndsAt,
          })
          .eq("id", user.id);

        if (updateError) throw updateError;

        break;
      }

      case "checkout.session.expired": {
        // User didn't complete the transaction
        break;
      }

      case "customer.subscription.updated": {
        // The customer might have changed the plan
        break;
      }

      case "customer.subscription.deleted": {
        // The customer subscription stopped - Revoke access and reset to free plan
        const subscription = await stripe.subscriptions.retrieve(data.object.id);

        const { error } = await supabaseAdmin
          .from("users")
          .update({
            has_access: false,
            plan_type: "free",
            price_id: "free",
            trial_ends_at: null,
          })
          .eq("customer_id", subscription.customer);

        if (error) throw error;

        break;
      }

      case "invoice.paid": {
        // Customer just paid an invoice - Grant access
        const priceId = data.object.lines.data[0].price.id;
        const customerId = data.object.customer;

        const { data: user } = await supabaseAdmin
          .from("users")
          .select("*")
          .eq("customer_id", customerId)
          .single();

        if (user && user.price_id === priceId) {
          await supabaseAdmin
            .from("users")
            .update({ has_access: true })
            .eq("id", user.id);
        }

        break;
      }

      case "invoice.payment_failed":
        // A payment failed
        break;

      default:
      // Unhandled event type
    }
  } catch (e) {
    console.error("stripe error: " + e.message + " | EVENT TYPE: " + eventType);
    // Return 500 to signal Stripe to retry the webhook
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
