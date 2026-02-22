import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { quickProtect } from "@/libs/api-protection";

// Lazy initialization
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Cache donation stats for 5 minutes
export const revalidate = 300;

/**
 * GET /api/donations
 * Returns public donation statistics (no personal data)
 */
export async function GET(request) {
  const protection = await quickProtect(request, "public");
  if (protection.blocked) {
    return protection.response;
  }

  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    // Try to get stats from materialized view first
    let stats = null;
    const { data: viewStats, error: viewError } = await supabase
      .from("donation_stats")
      .select("*")
      .single();

    if (!viewError && viewStats) {
      stats = {
        totalAmount: parseFloat(viewStats.total_amount_usd) || 0,
        supportersCount: parseInt(viewStats.unique_supporters) || 0,
        totalDonations: parseInt(viewStats.total_donations) || 0,
        cryptoTotal: parseFloat(viewStats.crypto_total) || 0,
        fiatTotal: parseFloat(viewStats.fiat_total) || 0,
        averageDonation: parseFloat(viewStats.average_donation) || 0,
        lastUpdated: viewStats.calculated_at,
      };
    } else {
      // Fallback: Calculate from donations table directly
      const { data: donations, error: donationsError } = await supabase
        .from("donations")
        .select("amount_usd, source, user_id, supporter_email, from_address")
        .eq("status", "confirmed");

      if (donationsError) {
        // If table doesn't exist yet, return default values
        stats = {
          totalAmount: 0,
          supportersCount: 0,
          totalDonations: 0,
          cryptoTotal: 0,
          fiatTotal: 0,
          averageDonation: 0,
          lastUpdated: new Date().toISOString(),
        };
      } else {
        // Calculate stats manually
        const uniqueSupporters = new Set();
        let totalAmount = 0;
        let cryptoTotal = 0;
        let fiatTotal = 0;

        donations?.forEach((d) => {
          totalAmount += parseFloat(d.amount_usd) || 0;

          if (d.source?.startsWith("crypto_")) {
            cryptoTotal += parseFloat(d.amount_usd) || 0;
          } else {
            fiatTotal += parseFloat(d.amount_usd) || 0;
          }

          // Count unique supporters
          const supporterId = d.user_id || d.supporter_email || d.from_address;
          if (supporterId) uniqueSupporters.add(supporterId);
        });

        stats = {
          totalAmount,
          supportersCount: uniqueSupporters.size,
          totalDonations: donations?.length || 0,
          cryptoTotal,
          fiatTotal,
          averageDonation: donations?.length ? totalAmount / donations.length : 0,
          lastUpdated: new Date().toISOString(),
        };
      }
    }

    // Get milestones
    const { data: milestones, error: milestonesError } = await supabase
      .from("donation_milestones")
      .select("goal_amount, label, icon, is_reached, reached_at")
      .order("sort_order", { ascending: true });

    // Format milestones or use defaults
    const formattedMilestones = milestones?.length
      ? milestones.map((m) => ({
          goal: parseFloat(m.goal_amount),
          label: m.label,
          icon: m.icon,
          unlocked: m.is_reached,
          reachedAt: m.reached_at,
        }))
      : [
          { goal: 5000, label: "Serveurs dedies", icon: "server", unlocked: false },
          { goal: 15000, label: "API publique", icon: "code", unlocked: false },
          { goal: 30000, label: "App mobile", icon: "mobile", unlocked: false },
          { goal: 50000, label: "Audit externe", icon: "shield", unlocked: false },
        ];

    // Update milestones unlocked status based on current amount
    const milestonesWithStatus = formattedMilestones.map((m) => ({
      ...m,
      unlocked: m.unlocked || stats.totalAmount >= m.goal,
    }));

    return NextResponse.json({
      success: true,
      data: {
        currentAmount: Math.round(stats.totalAmount * 100) / 100,
        supportersCount: stats.supportersCount,
        milestones: milestonesWithStatus,
        breakdown: {
          crypto: Math.round(stats.cryptoTotal * 100) / 100,
          fiat: Math.round(stats.fiatTotal * 100) / 100,
        },
        stats: {
          totalDonations: stats.totalDonations,
          averageDonation: Math.round(stats.averageDonation * 100) / 100,
        },
        lastUpdated: stats.lastUpdated,
      },
    });
  } catch (error) {
    console.error("Error fetching donation stats:", error);

    // Return default values on error
    return NextResponse.json({
      success: true,
      data: {
        currentAmount: 0,
        supportersCount: 0,
        milestones: [
          { goal: 5000, label: "Serveurs dedies", icon: "server", unlocked: false },
          { goal: 15000, label: "API publique", icon: "code", unlocked: false },
          { goal: 30000, label: "App mobile", icon: "mobile", unlocked: false },
          { goal: 50000, label: "Audit externe", icon: "shield", unlocked: false },
        ],
        breakdown: { crypto: 0, fiat: 0 },
        stats: { totalDonations: 0, averageDonation: 0 },
        lastUpdated: new Date().toISOString(),
      },
    });
  }
}
