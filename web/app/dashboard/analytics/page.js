"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const [analytics, setAnalytics] = useState(null);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/signin";
      return;
    }
    if (status !== "authenticated") return;

    async function fetchData() {
      try {
        const [analyticsRes, usageRes] = await Promise.all([
          fetch("/api/user/analytics"),
          fetch("/api/user/usage"),
        ]);

        if (analyticsRes.ok) {
          setAnalytics(await analyticsRes.json());
        }
        if (usageRes.ok) {
          setUsage(await usageRes.json());
        }
      } catch {
        // Silently fail
      }
      setLoading(false);
    }

    fetchData();
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (!session) return null;

  const chartData = analytics?.chartData || [];
  const topProducts = analytics?.topProducts || [];
  const summary = analytics?.summary || {};
  const maxCount = Math.max(...chartData.map((d) => d.count), 1);

  const getBarColor = (count) => {
    if (count === 0) return "bg-base-300";
    if (count >= maxCount * 0.8) return "bg-amber-400";
    return "bg-primary";
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const isEmpty = chartData.every((d) => d.count === 0) && topProducts.length === 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-base-content/60 mt-1">
          Track your product exploration activity and usage.
        </p>
      </div>

      {/* Usage Overview */}
      {usage && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl bg-base-200 border border-base-300 p-4">
            <div className="text-2xl font-bold">{summary.totalViews30d || 0}</div>
            <div className="text-xs text-base-content/60">Views (30 days)</div>
          </div>
          <div className="rounded-xl bg-base-200 border border-base-300 p-4">
            <div className="text-2xl font-bold">{summary.avgDailyViews || 0}</div>
            <div className="text-xs text-base-content/60">Avg Daily Views</div>
          </div>
          <div className="rounded-xl bg-base-200 border border-base-300 p-4">
            <div className="text-2xl font-bold">{summary.totalSetups || 0}</div>
            <div className="text-xs text-base-content/60">Setups Created</div>
          </div>
          <div className="rounded-xl bg-base-200 border border-base-300 p-4">
            <div className="text-2xl font-bold capitalize">
              {usage.planType || "Free"}
            </div>
            <div className="text-xs text-base-content/60">Current Plan</div>
          </div>
        </div>
      )}

      {/* Plan Usage Bars */}
      {usage && !usage.isPaid && (
        <div className="rounded-xl bg-base-200 border border-base-300 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Plan Usage</h2>
            <Link href="/#pricing" className="btn btn-primary btn-sm">
              Upgrade
            </Link>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-base-content/70">Monthly Product Views</span>
                <span className="font-medium">
                  {usage.used || 0} / {usage.limit === -1 ? "∞" : usage.limit || 5}
                </span>
              </div>
              <div className="w-full bg-base-300 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    usage.remaining <= 1 ? "bg-error" : usage.remaining <= 2 ? "bg-warning" : "bg-primary"
                  }`}
                  style={{
                    width: `${Math.min(100, usage.limit > 0 ? (usage.used / usage.limit) * 100 : 0)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {isEmpty ? (
        /* Empty State */
        <div className="rounded-xl bg-base-200 border border-base-300 p-12 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-xl font-bold mb-2">No activity yet</h2>
          <p className="text-base-content/60 mb-6">
            Start browsing products to see your analytics here.
          </p>
          <Link href="/products" className="btn btn-primary">
            Browse Products
          </Link>
        </div>
      ) : (
        <>
          {/* Activity Chart — Last 30 Days */}
          <div className="rounded-xl bg-base-200 border border-base-300 p-6 mb-8">
            <h2 className="text-lg font-bold mb-6">Activity — Last 30 Days</h2>
            <div className="flex items-end gap-1 h-40">
              {chartData.map((day) => (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center group relative"
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-base-100 border border-base-300 rounded-lg px-2 py-1 text-xs whitespace-nowrap shadow-lg z-10 pointer-events-none">
                    <div className="font-medium">{formatDate(day.date)}</div>
                    <div className="text-base-content/60">
                      {day.count} view{day.count !== 1 ? "s" : ""}
                    </div>
                  </div>
                  {/* Bar */}
                  <div
                    className={`w-full rounded-t-sm ${getBarColor(day.count)} transition-all min-h-[2px]`}
                    style={{
                      height: day.count > 0 ? `${Math.max(8, (day.count / maxCount) * 100)}%` : "2px",
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-base-content/40">
              <span>{chartData.length > 0 ? formatDate(chartData[0].date) : ""}</span>
              <span>{chartData.length > 0 ? formatDate(chartData[chartData.length - 1].date) : ""}</span>
            </div>
          </div>

          {/* Top Viewed Products */}
          {topProducts.length > 0 && (
            <div className="rounded-xl bg-base-200 border border-base-300 p-6 mb-8">
              <h2 className="text-lg font-bold mb-4">Most Viewed Products</h2>
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th className="w-12">#</th>
                      <th>Product</th>
                      <th className="text-right">Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((product, index) => (
                      <tr key={product.id || index} className="hover">
                        <td className="text-base-content/50 font-medium">{index + 1}</td>
                        <td>
                          <Link
                            href={`/products/${product.slug}`}
                            className="flex items-center gap-3 hover:text-primary"
                          >
                            {product.logoUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={product.logoUrl} alt="" className="w-6 h-6 rounded" />
                            )}
                            <span className="font-medium">{product.name}</span>
                          </Link>
                        </td>
                        <td className="text-right">
                          <span className="font-bold">{product.viewCount}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Upgrade CTA for Free users */}
      {usage && !usage.isPaid && (
        <div className="rounded-xl bg-gradient-to-br from-primary/20 to-base-200 border border-base-300 p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Unlock Full Analytics</h2>
          <p className="text-base-content/60 mb-6 max-w-md mx-auto">
            Upgrade to Professional for unlimited product views, score history tracking,
            API access, and detailed risk breakdowns.
          </p>
          <Link href="/#pricing" className="btn btn-primary">
            View Plans
          </Link>
        </div>
      )}
    </div>
  );
}
