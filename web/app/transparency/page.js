import Link from "next/link";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import { getNormStats } from "@/libs/norm-stats";

export const metadata = getSEOTags({
  title: `Score Transparency | ${config.appName}`,
  description: "See real score distribution across all crypto products. We rate using a standardized methodology - some products score high, others don't. Scores are not influenced by commercial relationships.",
  canonicalUrlRelative: "/transparency",
});

// Fetch stats at build time
async function getStats() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data: scores } = await supabase
      .from("safe_scoring_results")
      .select("product_id, note_finale, score_s, score_a, score_f, score_e")
      .not("note_finale", "is", null);

    const { data: products } = await supabase
      .from("products")
      .select("id, name, slug, product_types(name)");

    if (!scores || !products) return null;

    const productMap = {};
    products.forEach(p => { productMap[p.id] = p; });

    const distribution = { excellent: [], good: [], average: [], poor: [], critical: [] };
    const allScores = [];

    scores.forEach(s => {
      const product = productMap[s.product_id];
      if (!product) return;

      const score = s.note_finale;
      allScores.push(score);

      const item = {
        name: product.name,
        slug: product.slug,
        type: product.product_types?.name,
        score: Math.round(score * 10) / 10,
        s: s.score_s ? Math.round(s.score_s * 10) / 10 : null,
        a: s.score_a ? Math.round(s.score_a * 10) / 10 : null,
        f: s.score_f ? Math.round(s.score_f * 10) / 10 : null,
        e: s.score_e ? Math.round(s.score_e * 10) / 10 : null
      };

      if (score >= 90) distribution.excellent.push(item);
      else if (score >= 70) distribution.good.push(item);
      else if (score >= 50) distribution.average.push(item);
      else if (score >= 30) distribution.poor.push(item);
      else distribution.critical.push(item);
    });

    Object.keys(distribution).forEach(k => {
      distribution[k].sort((a, b) => b.score - a.score);
    });

    const avg = allScores.length > 0
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length * 10) / 10
      : 0;

    return {
      total: allScores.length,
      avg,
      min: allScores.length > 0 ? Math.round(Math.min(...allScores) * 10) / 10 : 0,
      max: allScores.length > 0 ? Math.round(Math.max(...allScores) * 10) / 10 : 0,
      distribution
    };
  } catch (e) {
    console.error(e);
    return null;
  }
}

const ScoreBar = ({ percentage, color }) => (
  <div className="w-full bg-base-300 rounded-full h-3">
    <div
      className={`h-3 rounded-full ${color}`}
      style={{ width: `${Math.min(percentage, 100)}%` }}
    />
  </div>
);

const ProductCard = ({ product, rank }) => (
  <Link
    href={`/products/${product.slug}`}
    className="flex items-center gap-3 p-3 rounded-lg bg-base-200/50 hover:bg-base-200 transition-colors"
  >
    <span className="text-base-content/40 text-sm w-6">#{rank}</span>
    <div className="flex-1 min-w-0">
      <div className="font-medium truncate">{product.name}</div>
      <div className="text-xs text-base-content/50">{product.type}</div>
    </div>
    <div className={`font-bold ${
      product.score >= 70 ? 'text-success' :
      product.score >= 50 ? 'text-warning' : 'text-error'
    }`}>
      {product.score}%
    </div>
  </Link>
);

export default async function TransparencyPage() {
  const [stats, normStats] = await Promise.all([getStats(), getNormStats()]);

  const categories = [
    { key: 'excellent', label: 'Strong', range: '90-100%', color: 'bg-success', textColor: 'text-success', description: 'High evaluation across all pillars' },
    { key: 'good', label: 'Good', range: '70-89%', color: 'bg-info', textColor: 'text-info', description: 'Solid evaluation with minor areas for improvement' },
    { key: 'average', label: 'Average', range: '50-69%', color: 'bg-warning', textColor: 'text-warning', description: 'Moderate evaluation, opportunities for improvement' },
    { key: 'poor', label: 'Below Average', range: '30-49%', color: 'bg-orange-500', textColor: 'text-orange-500', description: 'Below average evaluation, improvement recommended' },
    { key: 'critical', label: 'Low', range: '0-29%', color: 'bg-error', textColor: 'text-error', description: 'Low evaluation, significant improvement needed' },
  ];

  return (
    <>
    <Header />
    <main className="min-h-screen pt-24 pb-16 px-6 hero-bg">
      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto">
        <Breadcrumbs items={[
          { label: "Home", href: "/" },
          { label: "Score Transparency" },
        ]} />
      </div>

      {/* Hero */}
      <section className="py-16 px-6 bg-gradient-to-b from-base-200/50 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-4 py-1.5 mb-4 text-sm font-medium rounded-full bg-primary/10 text-primary">
            Transparency Report
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Real Scores. <span className="text-gradient-safe">Methodology-Driven.</span>
          </h1>
          <p className="text-lg text-base-content/60 max-w-2xl mx-auto">
            We don&apos;t give everyone a gold star. Our evaluations are based on {normStats?.totalNorms || "\u2014"} security
            norms — some products score high, others don&apos;t. Scores are not influenced by commercial relationships.
          </p>
        </div>
      </section>

      {/* Key Stats */}
      {stats && (
        <section className="py-8 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-base-200/50 rounded-2xl p-6 text-center border border-base-300">
                <div className="text-4xl font-bold text-primary">{stats.total}</div>
                <div className="text-sm text-base-content/60 mt-1">Products Rated</div>
              </div>
              <div className="bg-base-200/50 rounded-2xl p-6 text-center border border-base-300">
                <div className="text-4xl font-bold">{stats.avg}%</div>
                <div className="text-sm text-base-content/60 mt-1">Average Score</div>
              </div>
              <div className="bg-base-200/50 rounded-2xl p-6 text-center border border-base-300">
                <div className="text-4xl font-bold text-success">{stats.max}%</div>
                <div className="text-sm text-base-content/60 mt-1">Highest Score</div>
              </div>
              <div className="bg-base-200/50 rounded-2xl p-6 text-center border border-base-300">
                <div className="text-4xl font-bold text-error">{stats.min}%</div>
                <div className="text-sm text-base-content/60 mt-1">Lowest Score</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Why Some Products Fail */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-error/10 border border-error/20 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-error">
                <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
              </svg>
              Why Some Products Score Low
            </h2>
            <div className="space-y-4 text-base-content/80">
              <p>
                Not every product passes our security evaluation. Here are the most common reasons
                products receive low scores:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-error">✗</span>
                  <span><strong>No independent security audit</strong> - Many products skip third-party audits</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-error">✗</span>
                  <span><strong>Closed source code</strong> - Can't verify security claims without code review</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-error">✗</span>
                  <span><strong>Missing duress protection</strong> - No features to protect under coercion</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-error">✗</span>
                  <span><strong>Poor key management</strong> - Weak encryption or exposed secrets</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-error">✗</span>
                  <span><strong>No bug bounty program</strong> - No incentive for responsible disclosure</span>
                </li>
              </ul>
              <p className="text-sm text-base-content/60 mt-4">
                We evaluate all products against the same {normStats?.totalNorms || "\u2014"} norms.
                No exceptions, no paid placements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Score Distribution */}
      {stats && (
        <section className="py-12 px-6">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold mb-8 text-center">Score Distribution</h2>

            <div className="grid md:grid-cols-5 gap-4 mb-12">
              {categories.map(cat => {
                const count = stats.distribution[cat.key]?.length || 0;
                const percentage = stats.total > 0 ? Math.round(count / stats.total * 100) : 0;
                return (
                  <div key={cat.key} className="bg-base-200/50 rounded-xl p-4 border border-base-300">
                    <div className={`text-sm font-medium ${cat.textColor}`}>{cat.label}</div>
                    <div className="text-xs text-base-content/50 mb-2">{cat.range}</div>
                    <div className="text-3xl font-bold">{count}</div>
                    <div className="text-xs text-base-content/50">{percentage}% of products</div>
                    <div className="mt-2">
                      <ScoreBar percentage={percentage * 2} color={cat.color} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Products by Category */}
            <div className="space-y-8">
              {categories.map(cat => {
                const products = stats.distribution[cat.key] || [];
                if (products.length === 0) return null;

                return (
                  <div key={cat.key} className="bg-base-200/30 rounded-2xl p-6 border border-base-300">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className={`text-lg font-bold ${cat.textColor}`}>
                          {cat.label} ({cat.range})
                        </h3>
                        <p className="text-sm text-base-content/50">{cat.description}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${cat.color} text-white`}>
                        {products.length} products
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {products.slice(0, 6).map((product, idx) => (
                        <ProductCard key={product.slug} product={product} rank={idx + 1} />
                      ))}
                    </div>
                    {products.length > 6 && (
                      <div className="mt-4 text-center">
                        <Link href="/products" className="text-sm text-primary hover:underline">
                          View all {products.length} products in this category →
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Hybrid AI + Human Approach */}
      <section className="py-16 px-6 bg-gradient-to-b from-primary/5 to-transparent border-t border-base-300">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 mb-4 text-sm font-medium rounded-full bg-primary/10 text-primary">
              Our Approach
            </span>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              AI for Speed. Humans for Judgment.
            </h2>
            <p className="text-base-content/60 max-w-2xl mx-auto">
              We combine the scale of AI with the nuance of human expertise. Here's how we avoid the pitfalls of pure automation.
            </p>
          </div>

          {/* Process Steps */}
          <div className="space-y-6 mb-12">
            <div className="flex gap-4 items-start bg-base-100 rounded-xl p-6 border border-base-300">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold">1</div>
              <div>
                <h3 className="font-bold text-lg mb-2">AI Analyzes at Scale</h3>
                <p className="text-base-content/60">
                  Our AI system evaluates each product against {normStats?.totalNorms || "\u2014"} security norms in minutes, not weeks.
                  Same criteria applied consistently to every product.
                </p>
                <div className="flex gap-4 mt-3 text-sm">
                  <span className="text-success">✓ Speed: minutes per product</span>
                  <span className="text-success">✓ Consistency: identical criteria</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 items-start bg-base-100 rounded-xl p-6 border border-base-300">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-secondary text-secondary-content flex items-center justify-center font-bold">2</div>
              <div>
                <h3 className="font-bold text-lg mb-2">Humans Verify Critical Scores</h3>
                <p className="text-base-content/60">
                  When the AI says "I'm not sure" (TBD), human experts review. Critical security norms
                  get a second-pass verification. New product types require manual validation.
                </p>
                <div className="flex gap-4 mt-3 text-sm">
                  <span className="text-success">✓ Expert review on edge cases</span>
                  <span className="text-success">✓ Conservative bias: no false positives</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 items-start bg-base-100 rounded-xl p-6 border border-base-300">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent text-accent-content flex items-center justify-center font-bold">3</div>
              <div>
                <h3 className="font-bold text-lg mb-2">Community Corrects Errors</h3>
                <p className="text-base-content/60">
                  Found a mistake? Submit a correction with evidence. Our experts validate submissions,
                  and all approved corrections are visible in the changelog.
                </p>
                <div className="flex gap-4 mt-3 text-sm">
                  <span className="text-success">✓ Open correction system</span>
                  <span className="text-success">✓ Full changelog transparency</span>
                </div>
              </div>
            </div>
          </div>

          {/* Why Hybrid */}
          <div className="bg-base-200/50 rounded-2xl p-8 border border-base-300">
            <h3 className="font-bold text-lg mb-4 text-center">Why Hybrid Works Better</h3>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl mb-2">🤖</div>
                <div className="font-medium">100% AI</div>
                <p className="text-sm text-base-content/50 mt-1">Fast but can hallucinate. No judgment on edge cases.</p>
              </div>
              <div>
                <div className="text-3xl mb-2">👤</div>
                <div className="font-medium">100% Human</div>
                <p className="text-sm text-base-content/50 mt-1">Accurate but slow, expensive, and inconsistent.</p>
              </div>
              <div className="bg-success/10 rounded-xl p-4 -m-2">
                <div className="text-3xl mb-2">🤝</div>
                <div className="font-medium text-success">Hybrid</div>
                <p className="text-sm text-base-content/70 mt-1">AI speed + human judgment + community verification.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Commitment */}
      <section className="py-16 px-6 bg-base-200/50 border-t border-base-300">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">Our Commitment to Objectivity</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-base-100 rounded-xl p-6 border border-base-300">
              <div className="text-success text-2xl mb-3">✓</div>
              <h3 className="font-bold mb-2">Scores Independent of Commercial Relationships</h3>
              <p className="text-sm text-base-content/60">
                Monitoring and partnership programs do not influence scores. Evaluations are based on our standardized methodology.
              </p>
            </div>
            <div className="bg-base-100 rounded-xl p-6 border border-base-300">
              <div className="text-success text-2xl mb-3">✓</div>
              <h3 className="font-bold mb-2">Same Standards for All</h3>
              <p className="text-sm text-base-content/60">
                Every product is evaluated against the same {normStats?.totalNorms || "\u2014"} security norms.
              </p>
            </div>
            <div className="bg-base-100 rounded-xl p-6 border border-base-300">
              <div className="text-success text-2xl mb-3">✓</div>
              <h3 className="font-bold mb-2">Transparent Methodology</h3>
              <p className="text-sm text-base-content/60">
                Our SAFE framework is fully documented. Anyone can understand how scores are calculated.
              </p>
            </div>
            <div className="bg-base-100 rounded-xl p-6 border border-base-300">
              <div className="text-success text-2xl mb-3">✓</div>
              <h3 className="font-bold mb-2">Regular Updates</h3>
              <p className="text-sm text-base-content/60">
                Scores are recalculated when products update their security. Past performance doesn't lock in a score.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Check Any Product's Score</h2>
          <p className="text-base-content/60 mb-8">
            Search our database of {stats?.total || normStats?.totalProducts || "\u2014"}+ rated products.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/products" className="btn btn-primary btn-lg">
              Browse All Products
            </Link>
            <Link href="/methodology" className="btn btn-outline btn-lg">
              View Methodology
            </Link>
          </div>
        </div>
      </section>
    </main>
    <Footer />
    </>
  );
}
