import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { generateMoonPayURL } from "@/libs/moonpay-commerce";
import { createClient } from "@/libs/supabase";

/**
 * Create a MoonPay transaction for crypto payment
 * POST /api/moonpay/create-transaction
 *
 * This is used for:
 * - Non-EU customers (no VAT)
 * - EU B2B customers with valid VAT number (reverse charge)
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

    const {
      plan,
      billingPeriod = "monthly",
      countryCode,
      isBusinessCustomer,
      vatNumber,
    } = await request.json();

    // Validate plan
    const PLAN_PRICES = {
      explorer: { monthly: 19, yearly: 182 },
      professional: { monthly: 49, yearly: 470 },
      enterprise: { monthly: 299, yearly: 2870 },
    };

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

    // Get or create wallet address for receiving payments
    // This should be YOUR SafeScoring wallet address
    const walletAddress = process.env.MOONPAY_RECEIVER_WALLET_ADDRESS;
    if (!walletAddress) {
      return NextResponse.json(
        { error: "Payment wallet not configured" },
        { status: 500 }
      );
    }

    // Create unique transaction ID
    const externalTransactionId = `ss_${session.user.id}_${plan}_${billingPeriod}_${Date.now()}`;

    // Store pending transaction in database
    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("crypto_transactions")
      .insert({
        user_id: session.user.id,
        external_id: externalTransactionId,
        plan,
        billing_period: billingPeriod,
        amount_usd: amount,
        country_code: countryCode,
        is_business: isBusinessCustomer || false,
        vat_number: vatNumber || null,
        status: "pending",
        provider: "moonpay",
      });

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: "Failed to create transaction" },
        { status: 500 }
      );
    }

    // Generate MoonPay widget URL
    const moonpayUrl = generateMoonPayURL({
      walletAddress,
      currencyCode: "usdc", // Default to USDC
      baseCurrencyAmount: amount,
      externalTransactionId,
      email: session.user.email,
      redirectURL: `${process.env.NEXTAUTH_URL}/dashboard?payment=success&provider=moonpay`,
    });

    return NextResponse.json({
      success: true,
      url: moonpayUrl,
      transactionId: externalTransactionId,
      amount,
      plan,
      billingPeriod,
    });
  } catch (error) {
    console.error("MoonPay transaction error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create transaction" },
      { status: 500 }
    );
  }
}
