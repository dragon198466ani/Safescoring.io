import Link from "next/link";
import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";
import config from "@/config";
import Leaderboard from "@/components/Leaderboard";
import TokenTeaser from "@/components/TokenTeaser";
import SeniorityTracker from "@/components/SeniorityTracker";
import { getT } from "@/libs/i18n/server";
import RadarChart from "@/components/charts/RadarChart";
import DistributionChart from "@/components/charts/DistributionChart";
import SetupComparisonChart from "@/components/charts/SetupComparisonChart";

const getScoreColor = (score) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
};

async function getDashboardData(userId) {
  if (!supabaseAdmin) {
    return { topProducts: [], stats: { products: 0, setups: 0, alerts: 0, incidents: 0 }, pillarAverages: null, distribution: null, userSetups: [], bestSetupScores: null, bestSetupScore: null };
  }

  // Fetch data in parallel for performance
  const [
    productsResult,
    setupsResult,
    alertsResult,
    incidentsResult,
    topProductsResult,
    globalScoresResult,
    userSetupsResult,
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
    // Global score stats for charts
    supabaseAdmin
      .from("safe_scoring_results")
      .select("product_id, note_finale, score_s, score_a, score_f, score_e")
      .not("note_finale", "is", null),
    // User's saved setups with products
    userId
      ? supabaseAdmin
          .from("user_setups")
          .select("id, name, products")
          .eq("user_id", userId)
      : Promise.resolve({ data: [] }),
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

  // Compute pillar averages (benchmark)
  const allScores = globalScoresResult.data || [];
  const pillarAverages = allScores.length > 0 ? {
    S: Math.round(allScores.reduce((sum, r) => sum + (r.score_s || 0), 0) / allScores.length),
    A: Math.round(allScores.reduce((sum, r) => sum + (r.score_a || 0), 0) / allScores.length),
    F: Math.round(allScores.reduce((sum, r) => sum + (r.score_f || 0), 0) / allScores.length),
    E: Math.round(allScores.reduce((sum, r) => sum + (r.score_e || 0), 0) / allScores.length),
  } : null;

  // Compute score distribution
  const distribution = {
    excellent: { count: allScores.filter(r => r.note_finale >= 90).length },
    good: { count: allScores.filter(r => r.note_finale >= 70 && r.note_finale < 90).length },
    average: { count: allScores.filter(r => r.note_finale >= 50 && r.note_finale < 70).length },
    poor: { count: allScores.filter(r => r.note_finale >= 30 && r.note_finale < 50).length },
    critical: { count: allScores.filter(r => r.note_finale < 30).length },
  };

  // Compute best user setup scores
  const userSetups = (userSetupsResult.data || []).map(setup => {
    const products = setup.products || [];
    const setupScores = products.map(p => {
      const scoreData = allScores.find(s => s.product_id === p.product_id);
      return scoreData ? { ...p, ...scoreData } : null;
    }).filter(Boolean);

    if (setupScores.length === 0) return { ...setup, combinedScore: null };

    let totalWeight = 0;
    let sums = { S: 0, A: 0, F: 0, E: 0, total: 0 };
    setupScores.forEach(s => {
      const weight = s.role === "wallet" ? 2 : 1;
      totalWeight += weight;
      sums.total += (s.note_finale || 0) * weight;
      sums.S += (s.score_s || 0) * weight;
      sums.A += (s.score_a || 0) * weight;
      sums.F += (s.score_f || 0) * weight;
      sums.E += (s.score_e || 0) * weight;
    });

    const combined = totalWeight > 0 ? {
      note_finale: Math.round(sums.total / totalWeight),
      score_s: Math.round(sums.S / totalWeight),
      score_a: Math.round(sums.A / totalWeight),
      score_f: Math.round(sums.F / totalWeight),
      score_e: Math.round(sums.E / totalWeight),
    } : null;

    let weakest = null;
    if (combined) {
      const pillars = [
        { code: "S", score: combined.score_s },
        { code: "A", score: combined.score_a },
        { code: "F", score: combined.score_f },
        { code: "E", score: combined.score_e },
      ];
      weakest = pillars.reduce((min, p) => p.score < min.score ? p : min, pillars[0]);
    }

    return {
      name: setup.name,
      combinedScore: combined ? { ...combined, weakest_pillar: weakest } : null,
    };
  }).filter(s => s.combinedScore);

  return {
    topProducts,
    stats: {
      products: productsResult.count || 0,
      setups: setupsResult.count || 0,
      alerts: alertsResult.count || 0,
      incidents: incidentsResult.count || 0,
    },
    pillarAverages,
    distribution,
    userSetups,
    bestSetupScores: userSetups.length > 0
      ? { S: userSetups[0].combinedScore.score_s, A: userSetups[0].combinedScore.score_a, F: userSetups[0].combinedScore.score_f, E: userSetups[0].combinedScore.score_e }
      : null,
    bestSetupScore: userSetups[0]?.combinedScore?.note_finale || null,
  };
}

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const t = getT();
  const session = await auth();
  const { topProducts, stats, pillarAverages, distribution, userSetups, bestSetupScores, bestSetupScore } = await getDashboardData(session?.user?.id);

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {t("dashboard.welcomeBack", { name: session?.user?.name?.split(" ")[0] || "User" })}
          </h1>
          <p className="text-base-content/60 mt-1">
            {t("dashboard.subtitle")}
          </p>
        </div>
        <Link href="/products" className="btn btn-primary gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          {t("dashboard.exploreProducts")}
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
            <span className="text-sm text-base-content/60">{t("dashboard.productsTracked")}</span>
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
            <span className="text-sm text-base-content/60">{t("dashboard.yourSetups")}</span>
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
            <span className="text-sm text-base-content/60">{t("dashboard.activeAlerts")}</span>
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
            <span className="text-sm text-base-content/60">{t("dashboard.securityIncidents")}</span>
          </div>
          <div className="text-3xl font-bold">{stats.incidents}</div>
        </div>
      </div>

      {/* SAFE Pillars overview */}
      <div className="rounded-2xl bg-base-200 border border-base-300 p-6">
        <h2 className="text-lg font-semibold mb-6">{t("dashboard.safeMethodologyOverview")}</h2>
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

      {/* Decision Support Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-base-200 border border-base-300 p-6">
          <h2 className="text-lg font-semibold mb-4">{t("charts.radar.title")}</h2>
          <RadarChart
            scores={bestSetupScores}
            benchmark={pillarAverages}
            size={280}
          />
        </div>
        <div className="rounded-2xl bg-base-200 border border-base-300 p-6">
          <h2 className="text-lg font-semibold mb-4">{t("charts.distribution.title")}</h2>
          <DistributionChart
            distribution={distribution}
            userScore={bestSetupScore}
          />
        </div>
      </div>

      {/* Setup Comparison */}
      {userSetups.length > 0 && (
        <div className="rounded-2xl bg-base-200 border border-base-300 p-6">
          <h2 className="text-lg font-semibold mb-4">{t("charts.comparison.title")}</h2>
          <SetupComparisonChart setups={userSetups} />
        </div>
      )}

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
          <h2 className="text-lg font-semibold">{t("dashboard.topRatedProducts")}</h2>
          <Link href="/products" className="text-sm text-primary hover:underline">
            {t("dashboard.viewAll")}
          </Link>
        </div>
        {topProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="bg-base-300/50">
                <tr>
                  <th className="font-medium text-base-content/70">{t("dashboard.product")}</th>
                  <th className="font-medium text-base-content/70">{t("dashboard.type")}</th>
                  <th className="font-medium text-base-content/70">{t("dashboard.safeScore")}</th>
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
                        {t("dashboard.view")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-base-content/60">
            <p>{t("dashboard.noProductsYet")}</p>
            <Link href="/products" className="btn btn-primary btn-sm mt-4">
              {t("dashboard.exploreProducts")}
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
              <h3 className="font-semibold mb-1">{t("dashboard.requestEvaluation")}</h3>
              <p className="text-sm text-base-content/60 mb-4">
                {t("dashboard.requestEvaluationDesc")}
              </p>
              <button className="btn btn-primary btn-sm">
                {t("dashboard.requestEvaluationBtn")}
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
              <h3 className="font-semibold mb-1">{t("dashboard.apiAccess")}</h3>
              <p className="text-sm text-base-content/60 mb-4">
                {t("dashboard.apiAccessDesc")}
              </p>
              <button className="btn btn-outline btn-sm">
                {t("dashboard.getApiKeys")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
