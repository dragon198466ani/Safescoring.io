import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";

export const dynamic = "force-dynamic";

// GET /api/user/analytics - Get user's usage analytics
export async function GET(request) {
  try {
    const protection = await quickProtect(request, "standard");
    if (protection.blocked) return protection.response;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const userId = session.user.id;
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch data in parallel
    const [viewsResult, topProductsResult, setupsResult] = await Promise.all([
      // Daily view counts for last 30 days
      supabaseAdmin
        .from("product_views")
        .select("viewed_at")
        .eq("user_id", userId)
        .gte("viewed_at", thirtyDaysAgo.toISOString()),

      // Top viewed products (all time for this user)
      supabaseAdmin
        .from("product_views")
        .select("product_id, products(id, name, slug, url)")
        .eq("user_id", userId)
        .order("viewed_at", { ascending: false })
        .limit(200),

      // User's setups count
      supabaseAdmin
        .from("user_setups")
        .select("id, name, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

    // Process daily views into chart data (last 30 days)
    const dailyViews = {};
    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split("T")[0];
      dailyViews[key] = 0;
    }

    (viewsResult.data || []).forEach((view) => {
      const key = new Date(view.viewed_at).toISOString().split("T")[0];
      if (dailyViews[key] !== undefined) {
        dailyViews[key]++;
      }
    });

    // Convert to sorted array
    const chartData = Object.entries(dailyViews)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Process top products (count views per product)
    const productCounts = {};
    const productInfo = {};
    (topProductsResult.data || []).forEach((view) => {
      const pid = view.product_id;
      if (!pid) return;
      productCounts[pid] = (productCounts[pid] || 0) + 1;
      if (view.products && !productInfo[pid]) {
        productInfo[pid] = {
          id: view.products.id,
          name: view.products.name,
          slug: view.products.slug,
          logoUrl: view.products.url
            ? `https://www.google.com/s2/favicons?domain=${new URL(view.products.url).hostname}&sz=64`
            : null,
        };
      }
    });

    const topProducts = Object.entries(productCounts)
      .map(([pid, count]) => ({
        ...productInfo[pid],
        viewCount: count,
      }))
      .filter((p) => p.name)
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 10);

    // Summary stats
    const totalViews = (viewsResult.data || []).length;
    const totalSetups = (setupsResult.data || []).length;
    const activeToday = chartData.length > 0 ? chartData[chartData.length - 1].count : 0;

    return NextResponse.json({
      chartData,
      topProducts,
      summary: {
        totalViews30d: totalViews,
        totalSetups,
        activeToday,
        avgDailyViews: Math.round(totalViews / 30 * 10) / 10,
      },
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
