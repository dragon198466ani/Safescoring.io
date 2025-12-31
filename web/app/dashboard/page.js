import Link from "next/link";
import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";
import config from "@/config";
import Leaderboard from "@/components/Leaderboard";
import TokenTeaser from "@/components/TokenTeaser";
import SeniorityTracker from "@/components/SeniorityTracker";

const getScoreColor = (score) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
};

const getChangeIndicator = (change) => {
  if (change > 0) return { icon: "↑", color: "text-green-400" };
  if (change < 0) return { icon: "↓", color: "text-red-400" };
  return { icon: "→", color: "text-base-content/50" };
};

async function getDashboardData(userId) {
  if (!supabaseAdmin) {
    return { topProducts: [], stats: { products: 0, setups: 0, alerts: 0, incidents: 0 } };
  }

  // Fetch data in parallel for performance
  const [
    productsResult,
    setupsResult,
    alertsResult,
    incidentsResult,
    topProductsResult,
  ] = await Promise.all([
    // Total products count
    supabaseAdmin
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    // User's setups count
    userId
      ? supabaseAdmin
          .from("user_setups")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
      : Promise.resolve({ count: 0 }),
    // User's active alerts count
    userId
      ? supabaseAdmin
          .from("alert_user_matches")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
      : Promise.resolve({ count: 0 }),
    // Recent incidents count
    supabaseAdmin
      .from("security_incidents")
      .select("*", { count: "exact", head: true })
      .eq("is_published", true),
    // Top rated products
    supabaseAdmin
      .from("safe_scoring_results")
      .select(`
        product_id,
        note_finale,
        score_s,
        score_a,
        score_f,
        score_e,
        products!inner (
          id,
          name,
          slug,
          product_types:type_id (name)
        )
      `)
      .not("note_finale", "is", null)
      .order("note_finale", { ascending: false })
      .limit(5),
  ]);

  // Format top products
  const topProducts = (topProductsResult.data || []).map((item) => ({
    id: item.products.id,
    name: item.products.name,
    slug: item.products.slug,
    type: item.products.product_types?.name || "Product",
    score: Math.round(item.note_finale || 0),
    change: 0, // Would need score_history to calculate
  }));

  return {
    topProducts,
    stats: {
      products: productsResult.count || 0,
      setups: setupsResult.count || 0,
      alerts: alertsResult.count || 0,
      incidents: incidentsResult.count || 0,
    },
  };
}

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await auth();
  const { topProducts, stats } = await getDashboardData(session?.user?.id);

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Welcome back, {session?.user?.name?.split(" ")[0] || "User"}
          </h1>
          <p className="text-base-content/60 mt-1">
            Here&apos;s what&apos;s happening with crypto security today
          </p>
        </div>
        <Link href="/products" className="btn btn-primary gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          Explore Products
        </Link>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-metric">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-green-500/20 text-green-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
              </svg>
            </div>
            <span className="text-sm text-base-content/60">Products Tracked</span>
          </div>
          <div className="text-3xl font-bold">{stats.products}</div>
        </div>

        <div className="card-metric">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </div>
            <span className="text-sm text-base-content/60">Your Setups</span>
          </div>
          <div className="text-3xl font-bold">{stats.setups}</div>
        </div>

        <div className="card-metric">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <span className="text-sm text-base-content/60">Active Alerts</span>
          </div>
          <div className="text-3xl font-bold">{stats.alerts}</div>
        </div>

        <div className="card-metric">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-red-500/20 text-red-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <span className="text-sm text-base-content/60">Security Incidents</span>
          </div>
          <div className="text-3xl font-bold">{stats.incidents}</div>
        </div>
      </div>

      {/* SAFE Pillars overview */}
      <div className="rounded-2xl bg-base-200 border border-base-300 p-6">
        <h2 className="text-lg font-semibold mb-6">SAFE Methodology Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {config.safe.pillars.map((pillar) => (
            <div
              key={pillar.code}
              className="p-4 rounded-xl bg-base-300/30 border border-base-300"
            >
              <div
                className="text-2xl font-black mb-2"
                style={{ color: pillar.color }}
              >
                {pillar.code}
              </div>
              <div className="font-medium text-sm mb-1">{pillar.name}</div>
              <div className="text-xs text-base-content/50 line-clamp-2">
                {pillar.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Token & Reputation Section */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Token Teaser - takes 2 columns */}
        <div className="lg:col-span-2">
          <TokenTeaser />
        </div>
        {/* Seniority Tracker */}
        <div>
          <SeniorityTracker />
        </div>
      </div>

      {/* Leaderboard */}
      <Leaderboard limit={5} />

      {/* Top rated products table */}
      <div className="rounded-2xl bg-base-200 border border-base-300 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-base-300">
          <h2 className="text-lg font-semibold">Top Rated Products</h2>
          <Link href="/products" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        {topProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="bg-base-300/50">
                <tr>
                  <th className="font-medium text-base-content/70">Product</th>
                  <th className="font-medium text-base-content/70">Type</th>
                  <th className="font-medium text-base-content/70">SAFE Score</th>
                  <th className="font-medium text-base-content/70"></th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-base-300/30">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-base-300 flex items-center justify-center font-bold text-primary">
                          {product.name.charAt(0)}
                        </div>
                        <span className="font-medium">{product.name}</span>
                      </div>
                    </td>
                    <td className="text-base-content/60">{product.type}</td>
                    <td>
                      <span className={`font-bold ${getScoreColor(product.score)}`}>
                        {product.score}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/products/${product.slug}`}
                        className="btn btn-ghost btn-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-base-content/60">
            <p>No products available yet.</p>
            <Link href="/products" className="btn btn-primary btn-sm mt-4">
              Explore Products
            </Link>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-base-200 border border-base-300 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/20">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-primary">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Request Product Evaluation</h3>
              <p className="text-sm text-base-content/60 mb-4">
                Can&apos;t find a product? Request an evaluation for any crypto product.
              </p>
              <button className="btn btn-primary btn-sm">
                Request Evaluation
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-purple-500/20 to-base-200 border border-base-300 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-purple-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-purple-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Download API Access</h3>
              <p className="text-sm text-base-content/60 mb-4">
                Integrate SafeScoring data into your own applications.
              </p>
              <button className="btn btn-outline btn-sm">
                Get API Keys
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
