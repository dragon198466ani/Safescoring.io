import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { getStats } from "@/libs/stats";

export const revalidate = 3600; // Revalidate every hour

export async function generateMetadata() {
  const stats = await getStats();
  return {
    title: "Weekly Score Changes - Transparency Report | SafeScoring",
    description: `See which crypto products had their security scores change this week. ${stats.totalProducts}+ products monitored across ${stats.totalNorms} security norms.`,
    openGraph: {
      title: "Weekly Score Changes | SafeScoring",
      description: "Real-time transparency: see which crypto products improved or declined in security this week.",
    },
  };
}

async function getScoreChanges() {
  if (!isSupabaseConfigured()) return { changes: [], stats: {} };

  // Get products with scores that changed recently
  const { data: products, error } = await supabase
    .from("products")
    .select(`
      id, name, slug, type_id, logo_url, updated_at,
      safe_scoring_results!inner(note_finale, score_s, score_a, score_f, score_e, scored_at)
    `)
    .not("safe_scoring_results.note_finale", "is", null)
    .order("safe_scoring_results.scored_at", { ascending: false })
    .limit(200);

  if (error || !products) return { changes: [], stats: {} };

  // Get product types
  const typeIds = [...new Set(products.map((p) => p.type_id).filter(Boolean))];
  let typesMap = {};
  if (typeIds.length > 0) {
    const { data: types } = await supabase
      .from("product_types")
      .select("id, name")
      .in("id", typeIds);
    types?.forEach((t) => { typesMap[t.id] = t.name; });
  }

  // Map products with score data
  const scoredProducts = products.map((p) => {
    const scoring = Array.isArray(p.safe_scoring_results)
      ? p.safe_scoring_results[0]
      : p.safe_scoring_results;
    return {
      name: p.name,
      slug: p.slug,
      type: typesMap[p.type_id] || "Unknown",
      logoUrl: p.logo_url,
      score: scoring?.note_finale || 0,
      pillarS: scoring?.score_s,
      pillarA: scoring?.score_a,
      pillarF: scoring?.score_f,
      pillarE: scoring?.score_e,
      scoredAt: scoring?.scored_at || p.updated_at,
    };
  });

  // Sort by score for ranking
  const sorted = scoredProducts.sort((a, b) => b.score - a.score);

  // Calculate stats
  const scores = sorted.map((p) => p.score).filter(Boolean);
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  return {
    changes: sorted.slice(0, 100),
    stats: {
      totalScored: sorted.length,
      averageScore: avgScore,
      highScorers: scores.filter((s) => s >= 75).length,
      lowScorers: scores.filter((s) => s < 50).length,
    },
  };
}

export default async function ScoreChangesPage() {
  const { changes, stats } = await getScoreChanges();

  const getScoreColor = (score) => {
    if (score >= 75) return "text-emerald-400";
    if (score >= 60) return "text-green-400";
    if (score >= 45) return "text-amber-400";
    return "text-red-400";
  };

  const getScoreBg = (score) => {
    if (score >= 75) return "bg-emerald-500/10 border-emerald-500/30";
    if (score >= 60) return "bg-green-500/10 border-green-500/30";
    if (score >= 45) return "bg-amber-500/10 border-amber-500/30";
    return "bg-red-500/10 border-red-500/30";
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-base-200">
        {/* Hero */}
        <section className="py-16 bg-gradient-to-br from-primary/10 via-base-100 to-secondary/10">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Updated Weekly
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
              Score Transparency Report
            </h1>
            <p className="text-lg text-base-content/60 max-w-2xl mx-auto">
              Real-time visibility into how crypto product security scores evolve.
              No hidden changes. Full transparency.
            </p>

            {/* Stats row */}
            <div className="flex justify-center gap-8 mt-10">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{stats.totalScored || 0}</p>
                <p className="text-sm text-base-content/50">Products Scored</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-400">{stats.averageScore || 0}/100</p>
                <p className="text-sm text-base-content/50">Average Score</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-400">{stats.highScorers || 0}</p>
                <p className="text-sm text-base-content/50">Score 75+</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-400">{stats.lowScorers || 0}</p>
                <p className="text-sm text-base-content/50">Score &lt; 50</p>
              </div>
            </div>
          </div>
        </section>

        {/* Scores Table */}
        <section className="py-12">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6">All Scored Products</h2>

            {changes.length === 0 ? (
              <div className="bg-base-100 rounded-xl p-12 text-center">
                <p className="text-base-content/50 text-lg">
                  No score data available yet. Check back soon.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr className="text-base-content/60">
                      <th className="w-12">#</th>
                      <th>Product</th>
                      <th>Type</th>
                      <th className="text-center">SAFE Score</th>
                      <th className="text-center">S</th>
                      <th className="text-center">A</th>
                      <th className="text-center">F</th>
                      <th className="text-center">E</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changes.map((product, i) => (
                      <tr key={product.slug} className="hover">
                        <td className="text-base-content/40 font-mono text-sm">{i + 1}</td>
                        <td>
                          <Link
                            href={`/products/${product.slug}`}
                            className="flex items-center gap-3 font-medium hover:text-primary transition-colors"
                          >
                            {product.logoUrl && (
                              <img
                                src={product.logoUrl}
                                alt=""
                                className="w-8 h-8 rounded-full bg-base-200"
                                loading="lazy"
                              />
                            )}
                            <span>{product.name}</span>
                          </Link>
                        </td>
                        <td className="text-sm text-base-content/50">{product.type}</td>
                        <td className="text-center">
                          <span className={`inline-flex items-center justify-center w-14 h-8 rounded-lg border text-sm font-bold ${getScoreBg(product.score)} ${getScoreColor(product.score)}`}>
                            {Math.round(product.score)}
                          </span>
                        </td>
                        <td className={`text-center text-sm font-medium ${getScoreColor(product.pillarS)}`}>
                          {product.pillarS != null ? Math.round(product.pillarS) : "—"}
                        </td>
                        <td className={`text-center text-sm font-medium ${getScoreColor(product.pillarA)}`}>
                          {product.pillarA != null ? Math.round(product.pillarA) : "—"}
                        </td>
                        <td className={`text-center text-sm font-medium ${getScoreColor(product.pillarF)}`}>
                          {product.pillarF != null ? Math.round(product.pillarF) : "—"}
                        </td>
                        <td className={`text-center text-sm font-medium ${getScoreColor(product.pillarE)}`}>
                          {product.pillarE != null ? Math.round(product.pillarE) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* CTA */}
            <div className="mt-12 bg-base-100 rounded-xl p-8 text-center border border-base-300">
              <h3 className="text-xl font-bold mb-2">Want alerts when scores change?</h3>
              <p className="text-base-content/60 mb-4">
                Create custom alert rules to get notified instantly when products you care about change.
              </p>
              <div className="flex justify-center gap-4">
                <Link href="/pricing" className="btn btn-primary">
                  Get Started Free
                </Link>
                <Link href="/methodology" className="btn btn-ghost">
                  Learn Our Methodology
                </Link>
              </div>
            </div>

            {/* Embed widget */}
            <div className="mt-8 bg-base-100 rounded-xl p-6 border border-base-300">
              <h3 className="font-bold mb-2">Embed This Report</h3>
              <p className="text-sm text-base-content/50 mb-3">
                Add the SafeScoring transparency widget to your site:
              </p>
              <code className="block bg-base-200 p-3 rounded-lg text-xs break-all">
                {`<iframe src="https://safescoring.io/changes?embed=true" width="100%" height="600" frameborder="0"></iframe>`}
              </code>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
