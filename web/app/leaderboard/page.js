import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import config from "@/config";
import { getFaviconUrl } from "@/libs/logo-utils";
import { getNormStats } from "@/libs/norm-stats";

export const revalidate = 3600; // Revalidate every hour

export const metadata = {
  title: "Security Leaderboard - Top Rated Crypto Products | SafeScoring",
  description: "Crypto wallets, exchanges, and DeFi protocols ranked by SafeScore. Updated monthly based on security evaluation criteria.",
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
    logoUrl: getFaviconUrl(p.url, 64),
  })) || [];

  // Get top contributors
  let contributors = [];
  try {
    const { data: reputationData } = await supabase
      .from("user_reputation")
      .select("user_id, reputation_score, reputation_level, corrections_approved, corrections_submitted")
      .order("reputation_score", { ascending: false })
      .limit(20);

    if (reputationData && reputationData.length > 0) {
      const userIds = reputationData.map(r => r.user_id).filter(Boolean);
      const { data: users } = await supabase
        .from("users")
        .select("id, name, image")
        .in("id", userIds);

      const usersMap = {};
      (users || []).forEach(u => { usersMap[u.id] = u; });

      contributors = reputationData.map((r, index) => {
        const user = usersMap[r.user_id] || {};
        return {
          rank: index + 1,
          name: user.name || "Anonymous",
          avatar: user.image || null,
          level: r.reputation_level || "newcomer",
          score: Math.round(r.reputation_score || 0),
          approved: r.corrections_approved || 0,
          submitted: r.corrections_submitted || 0,
        };
      });
    }
  } catch (err) {
    console.error("Error fetching contributors:", err);
  }

  return { products: formattedProducts, contributors };
}

const getScoreColor = (score) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
};

const getScoreLabel = (score) => {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Moderate";
  return "Developing";
};

const getRankBadge = (rank) => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
};

export default async function LeaderboardPage() {
  const [{ products, contributors }, normStats] = await Promise.all([getLeaderboardData(), getNormStats()]);

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
      <main className="min-h-screen pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 hero-bg">
        <div className="max-w-7xl mx-auto">
          <Breadcrumbs items={[
            { label: "Home", href: "/" },
            { label: "Leaderboard" },
          ]} />

          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Security Leaderboard
            </h1>
            <p className="text-base-content/60 max-w-2xl mx-auto">
              Crypto products ranked by SafeScore evaluation.
              Updated monthly based on {normStats?.totalNorms || "2000+"} security criteria.
            </p>
            <p className="text-xs text-base-content/40 mt-2 max-w-2xl mx-auto">
              Scores reflect SafeScoring&apos;s evaluation methodology and do not guarantee security or predict future incidents. Not financial advice.
            </p>
          </div>

          {/* Overall Top 10 */}
          <div className="rounded-xl bg-base-200 border border-base-300 p-6 mb-12">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span>🏆</span> Top 10 — Ranked by SAFE Score
            </h2>

            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th className="w-12 sm:w-16">Rank</th>
                    <th>Product</th>
                    <th className="hidden md:table-cell">Type</th>
                    <th className="hidden lg:table-cell text-center">S</th>
                    <th className="hidden lg:table-cell text-center">A</th>
                    <th className="hidden lg:table-cell text-center">F</th>
                    <th className="hidden lg:table-cell text-center">E</th>
                    <th className="text-right">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {products.slice(0, 10).map((product) => (
                    <tr key={product.slug} className="hover">
                      <td className="text-lg sm:text-2xl">{getRankBadge(product.rank)}</td>
                      <td>
                        <Link href={`/products/${product.slug}`} className="flex items-center gap-2 sm:gap-3 hover:text-primary min-h-[44px]">
                          {product.logoUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={product.logoUrl} alt="" className="w-6 h-6 sm:w-8 sm:h-8 rounded" />
                          )}
                          <span className="font-medium text-sm sm:text-base">{product.name}</span>
                        </Link>
                      </td>
                      <td className="hidden md:table-cell text-sm text-base-content/60">{product.type}</td>
                      <td className="hidden lg:table-cell text-center text-sm" style={{ color: config.safe.pillars[0].color }}>{product.scores.s}</td>
                      <td className="hidden lg:table-cell text-center text-sm" style={{ color: config.safe.pillars[1].color }}>{product.scores.a}</td>
                      <td className="hidden lg:table-cell text-center text-sm" style={{ color: config.safe.pillars[2].color }}>{product.scores.f}</td>
                      <td className="hidden lg:table-cell text-center text-sm" style={{ color: config.safe.pillars[3].color }}>{product.scores.e}</td>
                      <td className="text-right">
                        <span className={`text-lg sm:text-xl font-bold ${getScoreColor(product.score)}`} title={getScoreLabel(product.score)}>
                          {product.score}
                        </span>
                        <span className={`block text-xs ${getScoreColor(product.score)}`}>{getScoreLabel(product.score)}</span>
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
                <span>🔐</span> Hardware Wallets
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
                    <div className="text-right">
                      <span className={`font-bold ${getScoreColor(p.score)}`}>{p.score}</span>
                      <span className={`block text-xs ${getScoreColor(p.score)}`}>{getScoreLabel(p.score)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Software Wallets */}
            <div className="rounded-xl bg-base-200 border border-base-300 p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span>📱</span> Software Wallets
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
                    <div className="text-right">
                      <span className={`font-bold ${getScoreColor(p.score)}`}>{p.score}</span>
                      <span className={`block text-xs ${getScoreColor(p.score)}`}>{getScoreLabel(p.score)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Exchanges */}
            <div className="rounded-xl bg-base-200 border border-base-300 p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span>🏦</span> Exchanges
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
                    <div className="text-right">
                      <span className={`font-bold ${getScoreColor(p.score)}`}>{p.score}</span>
                      <span className={`block text-xs ${getScoreColor(p.score)}`}>{getScoreLabel(p.score)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* DeFi */}
            <div className="rounded-xl bg-base-200 border border-base-300 p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span>🌐</span> DeFi Protocols
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
                    <div className="text-right">
                      <span className={`font-bold ${getScoreColor(p.score)}`}>{p.score}</span>
                      <span className={`block text-xs ${getScoreColor(p.score)}`}>{getScoreLabel(p.score)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Community Contributors */}
            <div className="rounded-xl bg-base-200 border border-base-300 p-6 mt-12">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span>👥</span> Community Contributors
              </h2>
              <p className="text-sm text-base-content/60 mb-6">
                Users who improve product scores by submitting verified corrections earn reputation points.
              </p>
          {contributors.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th className="w-12 sm:w-16">Rank</th>
                      <th>Contributor</th>
                      <th className="hidden sm:table-cell">Level</th>
                      <th className="hidden md:table-cell text-center">Approved</th>
                      <th className="text-right">Reputation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contributors.map((c) => (
                      <tr key={c.rank} className="hover">
                        <td className="text-lg">{getRankBadge(c.rank)}</td>
                        <td>
                          <div className="flex items-center gap-3">
                            {c.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={c.avatar} alt="" className="w-8 h-8 rounded-full" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                                {c.name[0]?.toUpperCase() || "?"}
                              </div>
                            )}
                            <span className="font-medium">{c.name}</span>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell">
                          <span className={`badge badge-sm ${
                            c.level === "oracle" ? "badge-secondary" :
                            c.level === "expert" ? "badge-warning" :
                            c.level === "trusted" ? "badge-success" :
                            c.level === "contributor" ? "badge-info" :
                            "badge-ghost"
                          }`}>
                            {c.level}
                          </span>
                        </td>
                        <td className="hidden md:table-cell text-center">{c.approved}</td>
                        <td className="text-right">
                          <span className="font-bold text-primary">{c.score}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          ) : (
              <div className="text-center py-8">
                <p className="text-base-content/50 mb-4">No contributions yet. Be the first to help improve product scores!</p>
                <Link href="/products" className="btn btn-primary btn-sm">
                  Browse Products & Submit Corrections
                </Link>
              </div>
          )}
            </div>

          {/* Methodology note */}
          <div className="mt-12 text-center">
            <p className="text-sm text-base-content/50 mb-4">
              Rankings based on SafeScore methodology: {normStats?.totalNorms || "2000+"} security norms across Security, Adversity, Fidelity & Efficiency.
            </p>
            <Link href="/methodology" className="text-primary hover:underline text-sm">
              Learn about our methodology →
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
