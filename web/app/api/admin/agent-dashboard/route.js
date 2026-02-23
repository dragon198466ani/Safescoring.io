import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

/**
 * Agent Economy Dashboard API — Admin only
 *
 * GET /api/admin/agent-dashboard
 *
 * Returns aggregated stats on agent economy:
 * - Total agent wallets registered
 * - Total USDC deposited / spent
 * - Top agents by query volume
 * - Revenue breakdown by endpoint
 * - Active streams count
 * - Daily/weekly/monthly trends
 */

export async function GET(request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin (basic check — should use isAdminEmail in production)
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());
  if (!adminEmails.includes(session.user.email?.toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    // 1. Aggregate agent credits stats
    const { data: creditStats } = await supabase
      .from("agent_credits")
      .select("wallet_address, balance_usdc, total_deposited, total_spent, total_queries, has_active_stream, created_at");

    const agents = creditStats || [];
    const totalWallets = agents.length;
    const totalDeposited = agents.reduce((sum, a) => sum + (parseFloat(a.total_deposited) || 0), 0);
    const totalSpent = agents.reduce((sum, a) => sum + (parseFloat(a.total_spent) || 0), 0);
    const totalQueries = agents.reduce((sum, a) => sum + (a.total_queries || 0), 0);
    const activeStreams = agents.filter((a) => a.has_active_stream).length;
    const totalBalance = agents.reduce((sum, a) => sum + (parseFloat(a.balance_usdc) || 0), 0);

    // 2. Top agents by queries
    const topAgents = [...agents]
      .sort((a, b) => (b.total_queries || 0) - (a.total_queries || 0))
      .slice(0, 10)
      .map((a) => ({
        wallet: `${a.wallet_address.slice(0, 6)}...${a.wallet_address.slice(-4)}`,
        queries: a.total_queries || 0,
        spent: parseFloat(a.total_spent) || 0,
        hasStream: a.has_active_stream || false,
        since: a.created_at,
      }));

    // 3. Recent activity (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentTxs, count: recentCount } = await supabase
      .from("agent_transactions")
      .select("amount, type, endpoint, created_at", { count: "exact" })
      .gte("created_at", weekAgo)
      .order("created_at", { ascending: false })
      .limit(100);

    // Revenue by endpoint
    const revenueByEndpoint = {};
    (recentTxs || []).forEach((tx) => {
      const ep = tx.endpoint || "unknown";
      if (!revenueByEndpoint[ep]) {
        revenueByEndpoint[ep] = { queries: 0, revenue: 0 };
      }
      revenueByEndpoint[ep].queries++;
      revenueByEndpoint[ep].revenue += parseFloat(tx.amount) || 0;
    });

    return NextResponse.json({
      overview: {
        totalWallets,
        totalDeposited: Math.round(totalDeposited * 100) / 100,
        totalSpent: Math.round(totalSpent * 100) / 100,
        totalBalance: Math.round(totalBalance * 100) / 100,
        totalQueries,
        activeStreams,
        averageSpendPerAgent: totalWallets > 0 ? Math.round((totalSpent / totalWallets) * 100) / 100 : 0,
      },
      weeklyActivity: {
        transactions: recentCount || 0,
        revenueByEndpoint,
      },
      topAgents,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Agent dashboard error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
