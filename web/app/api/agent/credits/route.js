import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import {
  authenticateAgent,
  registerAgentWallet,
  AGENT_CORS_HEADERS,
} from "@/libs/agent-auth";
import { createInvoice } from "@/libs/nowpayments";
import { API_TIERS } from "@/libs/config-constants";

/**
 * Agent Credits API
 *
 * GET /api/agent/credits - Get balance and transaction history
 * POST /api/agent/credits - Deposit USDC (creates NowPayments invoice)
 */

export async function GET(request) {
  const auth = await authenticateAgent(request);

  if (!auth.authenticated) {
    return NextResponse.json(
      { error: auth.error },
      { status: 401, headers: AGENT_CORS_HEADERS }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503, headers: AGENT_CORS_HEADERS }
    );
  }

  try {
    // Get balance
    const { data: credits } = await supabase
      .from("agent_credits")
      .select(
        "balance_usdc, total_deposited, total_spent, total_queries, has_active_stream, stream_flow_rate, created_at"
      )
      .eq("wallet_address", auth.wallet)
      .maybeSingle();

    if (!credits) {
      // Auto-register wallet on first query
      await registerAgentWallet(auth.wallet);
      return NextResponse.json(
        {
          success: true,
          data: {
            wallet: auth.wallet,
            balance: 0,
            totalDeposited: 0,
            totalSpent: 0,
            totalQueries: 0,
            hasActiveStream: false,
            pricing: {
              scoreQuery: API_TIERS.agent.queryPriceUSDC,
              deepAnalysis: API_TIERS.agent.analysisPriceUSDC,
              batchPerProduct: API_TIERS.agent.batchPriceUSDC,
            },
            transactions: [],
          },
        },
        { headers: AGENT_CORS_HEADERS }
      );
    }

    // Get recent transactions
    const { data: transactions } = await supabase
      .from("agent_transactions")
      .select(
        "id, type, amount_usdc, endpoint, product_slug, products_count, tx_hash, payment_method, created_at"
      )
      .eq("wallet_address", auth.wallet)
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json(
      {
        success: true,
        data: {
          wallet: auth.wallet,
          balance: parseFloat(credits.balance_usdc) || 0,
          totalDeposited: parseFloat(credits.total_deposited) || 0,
          totalSpent: parseFloat(credits.total_spent) || 0,
          totalQueries: credits.total_queries || 0,
          hasActiveStream: credits.has_active_stream || false,
          streamFlowRate: credits.stream_flow_rate,
          memberSince: credits.created_at,
          pricing: {
            scoreQuery: API_TIERS.agent.queryPriceUSDC,
            deepAnalysis: API_TIERS.agent.analysisPriceUSDC,
            batchPerProduct: API_TIERS.agent.batchPriceUSDC,
          },
          transactions: (transactions || []).map((t) => ({
            id: t.id,
            type: t.type,
            amount: parseFloat(t.amount_usdc),
            endpoint: t.endpoint,
            productSlug: t.product_slug,
            productsCount: t.products_count,
            txHash: t.tx_hash,
            method: t.payment_method,
            date: t.created_at,
          })),
        },
      },
      { headers: AGENT_CORS_HEADERS }
    );
  } catch (error) {
    console.error("Agent credits GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: AGENT_CORS_HEADERS }
    );
  }
}

export async function POST(request) {
  const auth = await authenticateAgent(request);

  if (!auth.authenticated) {
    return NextResponse.json(
      { error: auth.error },
      { status: 401, headers: AGENT_CORS_HEADERS }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", example: { amount: 10 } },
      { status: 400, headers: AGENT_CORS_HEADERS }
    );
  }

  const amount = parseFloat(body?.amount);
  if (!amount || amount < 1 || amount > 10000) {
    return NextResponse.json(
      {
        error: "Amount must be between 1 and 10,000 USDC",
        example: { amount: 10 },
      },
      { status: 400, headers: AGENT_CORS_HEADERS }
    );
  }

  try {
    // Ensure wallet is registered
    await registerAgentWallet(auth.wallet, body?.label);

    // Create NowPayments invoice for USDC deposit
    const orderId = `agent_${auth.wallet}_${Date.now()}`;

    const invoice = await createInvoice({
      priceAmount: amount,
      priceCurrency: "usd",
      payCurrency: "usdcmatic", // USDC on Polygon
      orderId,
      orderDescription: `SafeScoring Agent Credits: ${amount} USDC for wallet ${auth.wallet}`,
      successUrl: "https://safescoring.io/agents?deposit=success",
      cancelUrl: "https://safescoring.io/agents?deposit=cancelled",
    });

    if (!invoice?.id) {
      return NextResponse.json(
        { error: "Failed to create payment invoice" },
        { status: 500, headers: AGENT_CORS_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          invoiceId: invoice.id,
          invoiceUrl: invoice.invoice_url,
          amount,
          currency: "USDC",
          network: "Polygon",
          wallet: auth.wallet,
          orderId,
          expiresAt: invoice.expiration_estimate_date,
          note: "Credits will be added automatically once payment is confirmed.",
        },
      },
      { headers: AGENT_CORS_HEADERS }
    );
  } catch (error) {
    console.error("Agent credits POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: AGENT_CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: AGENT_CORS_HEADERS });
}
