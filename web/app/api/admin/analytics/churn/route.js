import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { requireAdmin } from "@/libs/admin-auth";
import { getHealthScoreStats, getUsersNeedingIntervention } from "@/libs/health-score";
import { getCancellationStats } from "@/libs/cancellation-flow";
import { getDunningStats } from "@/libs/dunning";
import { getUpsellStats } from "@/libs/upsell-automation";
import { getWinbackStats } from "@/libs/winback-campaigns";
import { supabaseAdmin } from "@/libs/supabase";

/**
 * GET /api/admin/analytics/churn
 * Get comprehensive anti-churn analytics dashboard data
 */
export async function GET(req) {
  try {
    // Verify admin access
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminCheck = await requireAdmin(session.user.id);
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days")) || 30;

    // Fetch all analytics in parallel
    const [
      healthStats,
      usersNeedingIntervention,
      cancellationStats,
      dunningStats,
      upsellStats,
      winbackStats,
      mrrData,
    ] = await Promise.all([
      getHealthScoreStats(),
      getUsersNeedingIntervention(),
      getCancellationStats(days),
      getDunningStats(days),
      getUpsellStats(days),
      getWinbackStats(days),
      getMRRData(days),
    ]);

    // Calculate key metrics
    const metrics = {
      // Health Score Distribution
      healthDistribution: healthStats.distribution,
      averageHealthScore: healthStats.averageScore,

      // Users needing attention
      usersAtRisk: usersNeedingIntervention.atRisk.length,
      usersInDanger: usersNeedingIntervention.danger.length,
      usersCritical: usersNeedingIntervention.critical.length,

      // Cancellation metrics
      cancellationTotal: cancellationStats.total,
      cancellationSaveRate: cancellationStats.saveRate,
      cancellationRevenueSaved: cancellationStats.revenueSaved,
      topCancelReasons: cancellationStats.topReasons,

      // Dunning metrics
      dunningTotal: dunningStats.total,
      dunningRecoveryRate: dunningStats.recoveryRate,
      dunningActive: dunningStats.active,

      // Upsell metrics
      upsellTotal: upsellStats.total,
      upsellConversionRate: upsellStats.conversionRate,
      upsellRevenueGenerated: upsellStats.revenueGenerated,
      topUpsellTriggers: upsellStats.topTriggers,

      // Win-back metrics
      winbackTotal: winbackStats.total,
      winbackConversionRate: winbackStats.conversionRate,
      winbackActive: winbackStats.active,

      // MRR metrics
      currentMRR: mrrData.currentMRR,
      mrrGrowth: mrrData.growth,
      churnRate: mrrData.churnRate,
      netRevenueRetention: mrrData.nrr,
    };

    // Build action items
    const actionItems = [];

    if (usersNeedingIntervention.critical.length > 0) {
      actionItems.push({
        priority: "critical",
        type: "retention",
        count: usersNeedingIntervention.critical.length,
        message: `${usersNeedingIntervention.critical.length} users need immediate retention offers`,
        action: "Send retention offers",
      });
    }

    if (usersNeedingIntervention.danger.length > 0) {
      actionItems.push({
        priority: "high",
        type: "outreach",
        count: usersNeedingIntervention.danger.length,
        message: `${usersNeedingIntervention.danger.length} users need personal outreach`,
        action: "Schedule outreach",
      });
    }

    if (dunningStats.active > 0) {
      actionItems.push({
        priority: "high",
        type: "dunning",
        count: dunningStats.active,
        message: `${dunningStats.active} users have failed payments`,
        action: "Review dunning sequences",
      });
    }

    if (usersNeedingIntervention.atRisk.length > 0) {
      actionItems.push({
        priority: "medium",
        type: "engagement",
        count: usersNeedingIntervention.atRisk.length,
        message: `${usersNeedingIntervention.atRisk.length} users need re-engagement emails`,
        action: "Send engagement sequence",
      });
    }

    return NextResponse.json({
      metrics,
      actionItems,
      usersNeedingIntervention: {
        critical: usersNeedingIntervention.critical.slice(0, 10),
        danger: usersNeedingIntervention.danger.slice(0, 10),
        atRisk: usersNeedingIntervention.atRisk.slice(0, 10),
      },
      period: {
        days,
        startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Churn analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch churn analytics" },
      { status: 500 }
    );
  }
}

/**
 * Get MRR data from database
 */
async function getMRRData(days) {
  if (!supabaseAdmin) {
    return {
      currentMRR: 0,
      growth: 0,
      churnRate: 0,
      nrr: 100,
    };
  }

  try {
    // Get current paying users
    const { data: payingUsers } = await supabaseAdmin
      .from("users")
      .select("plan_type, created_at")
      .eq("has_access", true)
      .neq("plan_type", "free");

    // Calculate MRR based on plan prices
    const planPrices = {
      explorer: 19,
      professional: 49,
      enterprise: 299,
    };

    let currentMRR = 0;
    payingUsers?.forEach(user => {
      const plan = user.plan_type?.toLowerCase();
      currentMRR += planPrices[plan] || 0;
    });

    // Get MRR from 30 days ago for growth calculation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: oldSnapshot } = await supabaseAdmin
      .from("mrr_snapshots")
      .select("total_mrr")
      .lte("snapshot_date", thirtyDaysAgo.toISOString().split("T")[0])
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .single();

    const previousMRR = oldSnapshot?.total_mrr || currentMRR;
    const growth = previousMRR > 0
      ? ((currentMRR - previousMRR) / previousMRR * 100).toFixed(1)
      : 0;

    // Estimate churn rate
    const { count: churnedLastMonth } = await supabaseAdmin
      .from("cancellation_flows")
      .select("*", { count: "exact", head: true })
      .eq("final_outcome", "churned")
      .gte("completed_at", thirtyDaysAgo.toISOString());

    const churnRate = payingUsers?.length > 0
      ? ((churnedLastMonth || 0) / payingUsers.length * 100).toFixed(1)
      : 0;

    // Net Revenue Retention (simplified)
    const nrr = 100 - parseFloat(churnRate) + parseFloat(growth);

    return {
      currentMRR,
      growth: parseFloat(growth),
      churnRate: parseFloat(churnRate),
      nrr: Math.round(nrr),
    };
  } catch (error) {
    console.error("Error fetching MRR data:", error);
    return {
      currentMRR: 0,
      growth: 0,
      churnRate: 0,
      nrr: 100,
    };
  }
}
