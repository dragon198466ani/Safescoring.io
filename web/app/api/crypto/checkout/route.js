import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { createInvoice, PLAN_PRICES } from "@/libs/nowpayments";

/**
 * Create a crypto checkout session
 * POST /api/crypto/checkout
 */
export async function POST(request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { plan, billingPeriod = "monthly" } = await request.json();

    // Validate plan
    if (!PLAN_PRICES[plan]) {
      return NextResponse.json(
        { error: "Invalid plan" },
        { status: 400 }
      );
    }

    const amount = PLAN_PRICES[plan][billingPeriod];
    if (!amount) {
      return NextResponse.json(
        { error: "Invalid billing period" },
        { status: 400 }
      );
    }

    // Create unique order ID
    const orderId = `${session.user.id}_${plan}_${billingPeriod}_${Date.now()}`;

    // Create NowPayments invoice
    const invoice = await createInvoice({
      priceAmount: amount,
      priceCurrency: "usd",
      orderId,
      orderDescription: `SafeScoring ${plan} (${billingPeriod})`,
      ipnCallbackUrl: `${process.env.NEXTAUTH_URL}/api/webhook/nowpayments`,
      successUrl: `${process.env.NEXTAUTH_URL}/dashboard?payment=success&provider=crypto`,
      cancelUrl: `${process.env.NEXTAUTH_URL}/checkout/crypto?plan=${plan}&cancelled=true`,
    });

    return NextResponse.json({
      success: true,
      invoiceUrl: invoice.invoice_url,
      invoiceId: invoice.id,
      amount,
      plan,
      billingPeriod,
    });
  } catch (error) {
    console.error("Crypto checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout" },
      { status: 500 }
    );
  }
}
