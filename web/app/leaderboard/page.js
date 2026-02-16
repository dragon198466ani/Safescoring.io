import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { getNormStats } from "@/libs/getNormStats";
import { getT } from "@/libs/i18n/server";

export const revalidate = 3600; // Revalidate every hour

export const metadata = {
  title: "Security Leaderboard - Top Rated Crypto Products | SafeScoring",
  description: "See the most secure crypto wallets, exchanges, and DeFi protocols ranked by SafeScore. Updated monthly based on comprehensive security criteria.",
};

async function getLeaderboardData() {
  if (!isSupabaseConfigured()) return { products: [], contributors: [] };

  // Get top products by score
  const { data: products } = await supabase
    .from("products")
    .select(`
      id, name, slug, url, type_id,
      safe_scoring_results!inner(note_finale, score_s, score_a, score_f, score_e)
    `)
    .not("safe_scoring_results.note_finale", "is", null)
    .order("safe_scoring_results.note_finale", { ascending: false })
    .limit(50);

  // Get product types
  const typeIds = [...new Set(products?.map(p => p.type_id).filter(Boolean))];
  const { data: types } = await supabase
    .from("product_types")
    .select("id, name, category")
    .in("id", typeIds);

  const typesMap = {};
  types?.forEach(t => { typesMap[t.id] = t; });

  // Format products
  const formattedProducts = products?.map((p, index) => ({
    rank: index + 1,
    name: p.name,
    slug: p.slug,
    type: typesMap[p.type_id]?.name || "Product",
    category: typesMap[p.type_id]?.category || "other",
    score: Math.round(p.safe_scoring_results?.[0]?.note_finale || 0),
    scores: {
      s: Math.round(p.safe_scoring_results?.[0]?.score_s || 0),
      a: Math.round(p.safe_scoring_results?.[0]?.score_a || 0),
      f: Math.round(p.safe_scoring_results?.[0]?.score_f || 0),
      e: Math.round(p.safe_scoring_results?.[0]?.score_e || 0),
    },
    logoUrl: p.url ? `https://www.google.com/s2/favicons?domain=${new URL(p.url).hostname}&sz=64` : null,
  })) || [];

  return { products: formattedProducts };
}

const getScoreColor = (score) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
};

const getRankBadge = (rank) => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
};

export default async function LeaderboardPage() {
  const [{ products }, normStats] = await Promise.all([
    getLeaderboardData(),
    getNormStats(),
  ]);
  const t = await getT();
  const totalNorms = normStats?.totalNorms ?? "—";

  // Group by category
  const byCategory = {
    hardware: products.filter(p => p.category === 'hardware'),
    software: products.filter(p => p.category === 'software'),
    exchange: products.filter(p => p.category === 'exchange'),
    defi: products.filter(p => p.category === 'defi'),
  };

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 px-6 hero-bg">
        <div className="max-w-6xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              {t("leaderboardPage.title")}
            </h1>
            <p className="text-base-content/60 max-w-2xl mx-auto">
              {t("leaderboardPage.subtitle", { norms: totalNorms })}
            </p>
          </div>

          {/* Overall Top 10 */}
          <div className="rounded-xl bg-base-200 border border-base-300 p-6 mb-12">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span>🏆</span> {t("leaderboardPage.top10")}
            </h2>

            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th className="w-16">{t("leaderboardPage.rank")}</th>
                    <th>{t("leaderboardPage.product")}</th>
                    <th>{t("leaderboardPage.type")}</th>
                    <th className="text-center">S</th>
                    <th className="text-center">A</th>
                    <th className="text-center">F</th>
                    <th className="text-center">E</th>
                    <th className="text-right">{t("leaderboardPage.score")}</th>
                  </tr>
                </thead>
                <tbody>
                  {products.slice(0, 10).map((product) => (
                    <tr key={product.slug} className="hover">
                      <td className="text-2xl">{getRankBadge(product.rank)}</td>
                      <td>
                        <Link href={`/products/${product.slug}`} className="flex items-center gap-3 hover:text-primary">
                          {product.logoUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={product.logoUrl} alt="" className="w-8 h-8 rounded" />
                          )}
                          <span className="font-medium">{product.name}</span>
                        </Link>
                      </td>
                      <td className="text-sm text-base-content/60">{product.type}</td>
                      <td className="text-center text-sm" style={{ color: '#00d4aa' }}>{product.scores.s}</td>
                      <td className="text-center text-sm" style={{ color: '#8b5cf6' }}>{product.scores.a}</td>
                      <td className="text-center text-sm" style={{ color: '#f59e0b' }}>{product.scores.f}</td>
                      <td className="text-center text-sm" style={{ color: '#06b6d4' }}>{product.scores.e}</td>
                      <td className="text-right">
                        <span className={`text-xl font-bold ${getScoreColor(product.score)}`}>
                          {product.score}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Category Leaderboards */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Hardware Wallets */}
            <div className="rounded-xl bg-base-200 border border-base-300 p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span>🔐</span> {t("leaderboardPage.hardwareWallets")}
              </h2>
              <div className="space-y-2">
                {byCategory.hardware.slice(0, 5).map((p, i) => (
                  <Link
                    key={p.slug}
                    href={`/products/${p.slug}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-base-300/50 hover:bg-base-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg w-8">{getRankBadge(i + 1)}</span>
                      <span className="font-medium">{p.name}</span>
                    </div>
                    <span className={`font-bold ${getScoreColor(p.score)}`}>{p.score}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Software Wallets */}
            <div className="rounded-xl bg-base-200 border border-base-300 p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span>📱</span> {t("leaderboardPage.softwareWallets")}
              </h2>
              <div className="space-y-2">
                {byCategory.software.slice(0, 5).map((p, i) => (
                  <Link
                    key={p.slug}
                    href={`/products/${p.slug}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-base-300/50 hover:bg-base-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg w-8">{getRankBadge(i + 1)}</span>
                      <span className="font-medium">{p.name}</span>
                    </div>
                    <span className={`font-bold ${getScoreColor(p.score)}`}>{p.score}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Exchanges */}
            <div className="rounded-xl bg-base-200 border border-base-300 p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span>🏦</span> {t("leaderboardPage.exchanges")}
              </h2>
              <div className="space-y-2">
                {byCategory.exchange.slice(0, 5).map((p, i) => (
                  <Link
                    key={p.slug}
                    href={`/products/${p.slug}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-base-300/50 hover:bg-base-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg w-8">{getRankBadge(i + 1)}</span>
                      <span className="font-medium">{p.name}</span>
                    </div>
                    <span className={`font-bold ${getScoreColor(p.score)}`}>{p.score}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* DeFi */}
            <div className="rounded-xl bg-base-200 border border-base-300 p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span>🌐</span> {t("leaderboardPage.defiProtocols")}
              </h2>
              <div className="space-y-2">
                {byCategory.defi.slice(0, 5).map((p, i) => (
                  <Link
                    key={p.slug}
                    href={`/products/${p.slug}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-base-300/50 hover:bg-base-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg w-8">{getRankBadge(i + 1)}</span>
                      <span className="font-medium">{p.name}</span>
                    </div>
                    <span className={`font-bold ${getScoreColor(p.score)}`}>{p.score}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Methodology note */}
          <div className="mt-12 text-center">
            <p className="text-sm text-base-content/50 mb-4">
              {t("leaderboardPage.methodologyNote", { norms: totalNorms })}
            </p>
            <Link href="/methodology" className="text-primary hover:underline text-sm">
              {t("leaderboardPage.learnMethodology")}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
