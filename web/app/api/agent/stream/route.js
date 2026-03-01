import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { polygon } from "viem/chains";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { authenticateAgent, AGENT_CORS_HEADERS } from "@/libs/agent-auth";
import { SUPERFLUID_ADDRESSES, CFA_V1_ABI } from "@/libs/superfluid";

/**
 * Agent Superfluid Stream Verification
 *
 * POST /api/agent/stream
 *
 * Checks if the agent wallet has an active Superfluid USDC stream
 * to the SafeScoring treasury. If so, grants unlimited API access.
 *
 * Minimum stream rate: $0.001/sec (~$86.40/month)
 */

const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_SUPERFLUID_TREASURY;
const MIN_FLOW_RATE = "1000000000000"; // ~$0.001/sec in wei (18 decimals for USDCx)

// Polygon public client for on-chain reads
const publicClient = createPublicClient({
  chain: polygon,
  transport: http(process.env.POLYGON_RPC_URL || "https://polygon-rpc.com"),
});

export async function POST(request) {
  const auth = await authenticateAgent(request);

  if (!auth.authenticated) {
    return NextResponse.json(
      { error: auth.error },
      { status: 401, headers: AGENT_CORS_HEADERS }
    );
  }

  if (!TREASURY_ADDRESS) {
    return NextResponse.json(
      { error: "Superfluid streaming not configured" },
      { status: 503, headers: AGENT_CORS_HEADERS }
    );
  }

  const cfaAddress = SUPERFLUID_ADDRESSES?.[137]?.cfa;
  const usdcxAddress = SUPERFLUID_ADDRESSES?.[137]?.usdcx;

  if (!cfaAddress || !usdcxAddress) {
    return NextResponse.json(
      { error: "Superfluid contract addresses not configured" },
      { status: 503, headers: AGENT_CORS_HEADERS }
    );
  }

  try {
    // Query on-chain flow from agent wallet to treasury
    const flowData = await publicClient.readContract({
      address: cfaAddress,
      abi: CFA_V1_ABI,
      functionName: "getFlow",
      args: [usdcxAddress, auth.wallet, TREASURY_ADDRESS],
    });

    // flowData returns [timestamp, flowRate, deposit, owedDeposit]
    const flowRate = flowData?.[1]?.toString() || "0";
    const isActive = BigInt(flowRate) >= BigInt(MIN_FLOW_RATE);

    // Update database
    if (isSupabaseConfigured()) {
      await supabase
        .from("agent_credits")
        .upsert(
          {
            wallet_address: auth.wallet,
            has_active_stream: isActive,
            stream_flow_rate: flowRate,
            stream_checked_at: new Date().toISOString(),
          },
          { onConflict: "wallet_address" }
        );

      // Log stream access
      if (isActive) {
        await supabase.from("agent_transactions").insert({
          wallet_address: auth.wallet,
          type: "stream_access",
          amount_usdc: 0,
          endpoint: "/api/agent/stream",
          payment_method: "superfluid",
        });
      }
    }

    // Calculate monthly cost
    const monthlyRate = (parseFloat(flowRate) / 1e18) * 2592000; // 30 days in seconds

    return NextResponse.json(
      {
        success: true,
        data: {
          wallet: auth.wallet,
          treasury: TREASURY_ADDRESS,
          stream: {
            active: isActive,
            flowRate,
            flowRatePerSecond: (parseFloat(flowRate) / 1e18).toFixed(8),
            monthlyUSDC: monthlyRate.toFixed(2),
            minimumRequired: (parseFloat(MIN_FLOW_RATE) / 1e18).toFixed(8),
            minimumMonthly: ((parseFloat(MIN_FLOW_RATE) / 1e18) * 2592000).toFixed(2),
          },
          access: isActive ? "unlimited" : "pay-per-query",
          message: isActive
            ? "Stream active. You have unlimited API access."
            : "No active stream detected. Use pay-per-query or start a Superfluid stream to the treasury.",
          howToStream: !isActive ? {
            superToken: usdcxAddress,
            receiver: TREASURY_ADDRESS,
            minimumFlowRate: MIN_FLOW_RATE,
            network: "Polygon (chainId: 137)",
            docs: "https://docs.superfluid.finance/",
          } : undefined,
        },
      },
      { headers: AGENT_CORS_HEADERS }
    );
  } catch (error) {
    console.error("Agent stream check error:", error);
    return NextResponse.json(
      {
        error: "Failed to check stream status",
        details: error.message,
      },
      { status: 500, headers: AGENT_CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: AGENT_CORS_HEADERS });
}
