import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import config from "@/config";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import ProductLogo from "@/components/ProductLogo";
import { getFaviconUrl } from "@/libs/logo-utils";
import { getNormStats } from "@/libs/norm-stats";

// SEO: Revalidate every hour for fresh data
export const revalidate = 3600;

// SEO: Generate metadata for comparison pages
export async function generateMetadata({ params }) {
  const { slugs } = await params;

  if (!slugs || slugs.length < 2) {
    return { title: "Compare Products | SafeScoring" };
  }

  const [slugA, slugB] = slugs;

  if (!isSupabaseConfigured()) {
    return { title: "Compare Products | SafeScoring" };
  }

  // Fetch both products
  const { data: products } = await supabase
    .from("products")
    .select("name, slug")
    .in("slug", [slugA, slugB]);

  if (!products || products.length < 2) {
    return { title: "Compare Products | SafeScoring" };
  }

  const productA = products.find(p => p.slug === slugA);
  const productB = products.find(p => p.slug === slugB);

  const normStats = await getNormStats();
  const title = `${productA.name} vs ${productB.name} - Security Comparison | SafeScoring`;
  const description = `Compare ${productA.name} and ${productB.name} security scores. See which is safer based on ${normStats?.totalNorms || "comprehensive"} security criteria across Security, Adversity, Fidelity & Efficiency.`;

  return {
    title,
    description,
    keywords: [
      `${productA.name} vs ${productB.name}`,
      `${productB.name} vs ${productA.name}`,
      `${productA.name} comparison`,
      `${productB.name} comparison`,
      `${productA.name} review`,
      `${productB.name} review`,
      "crypto wallet comparison",
      "hardware wallet comparison",
      "security comparison",
      "SAFE score",
    ],
    openGraph: {
      title,
      description,
      url: `https://safescoring.io/compare/${slugA}/${slugB}`,
      siteName: "SafeScoring",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: `https://safescoring.io/compare/${slugA}/${slugB}`,
    },
  };
}

// Fetch product data
async function getProduct(slug) {
  if (!isSupabaseConfigured()) return null;

  const { data: product } = await supabase
    .from("products")
    .select("id, name, slug, url, type_id, short_description")
    .eq("slug", slug)
    .maybeSingle();

  if (!product) return null;

  // Get type
  let typeName = "Product";
  if (product.type_id) {
    const { data: typeData } = await supabase
      .from("product_types")
      .select("name")
      .eq("id", product.type_id)
      .maybeSingle();
    if (typeData) typeName = typeData.name;
  }

  // Get scores
  const { data: scoreData } = await supabase
    .from("safe_scoring_results")
    .select("note_finale, score_s, score_a, score_f, score_e")
    .eq("product_id", product.id)
    .order("calculated_at", { ascending: false })
    .limit(1);

  const scores = scoreData?.[0] || {};

  return {
    ...product,
    type: typeName,
    logoUrl: getFaviconUrl(product.url),
    scores: {
      total: Math.round(scores.note_finale || 0),
      s: Math.round(scores.score_s || 0),
      a: Math.round(scores.score_a || 0),
      f: Math.round(scores.score_f || 0),
      e: Math.round(scores.score_e || 0),
    }
  };
}

// Score color helper
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

const getScoreBg = (score) => {
  if (score >= 80) return "bg-green-500/20 border-green-500/30";
  if (score >= 60) return "bg-amber-500/20 border-amber-500/30";
  return "bg-red-500/20 border-red-500/30";
};

// Winner badge
const WinnerBadge = () => (
  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
    WINNER
  </span>
);

export default async function ComparePage({ params }) {
  const { slugs } = await params;

  if (!slugs || slugs.length < 2) {
    notFound();
  }

  const [slugA, slugB] = slugs;
  const [productA, productB, normStats] = await Promise.all([
    getProduct(slugA),
    getProduct(slugB),
    getNormStats()
  ]);

  if (!productA || !productB) {
    notFound();
  }

  // Determine winners for each category
  const winners = {
    total: productA.scores.total > productB.scores.total ? 'A' : productA.scores.total < productB.scores.total ? 'B' : 'tie',
    s: productA.scores.s > productB.scores.s ? 'A' : productA.scores.s < productB.scores.s ? 'B' : 'tie',
    a: productA.scores.a > productB.scores.a ? 'A' : productA.scores.a < productB.scores.a ? 'B' : 'tie',
    f: productA.scores.f > productB.scores.f ? 'A' : productA.scores.f < productB.scores.f ? 'B' : 'tie',
    e: productA.scores.e > productB.scores.e ? 'A' : productA.scores.e < productB.scores.e ? 'B' : 'tie',
  };

  // Count wins
  const pillarWins = { A: 0, B: 0 };
  ['s', 'a', 'f', 'e'].forEach(p => {
    if (winners[p] === 'A') pillarWins.A++;
    if (winners[p] === 'B') pillarWins.B++;
  });

  return (
    <>
      <Header />
      <main className="min-h-screen pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 hero-bg">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <Breadcrumbs items={[
            { label: "Home", href: "/" },
            { label: "Products", href: "/products" },
            { label: `${productA.name} vs ${productB.name}` },
          ]} />

          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              {productA.name} vs {productB.name}
            </h1>
            <p className="text-base-content/60 max-w-2xl mx-auto">
              Security comparison based on {normStats?.totalNorms || "2000+"} criteria across Security, Adversity, Fidelity & Efficiency pillars.
            </p>
            <p className="text-xs text-base-content/40 mt-2 max-w-2xl mx-auto">
              Comparisons reflect SafeScoring&apos;s opinion-based evaluation methodology. A higher score does not mean a product is &quot;safer&quot; or &quot;better&quot; — it indicates a higher rating under our specific criteria. Scores do not guarantee security, predict future incidents, or constitute a recommendation. Different methodologies may produce different results. Not financial or security advice.
              {" "}<a href="/tos#5.8" className="text-primary/50 hover:text-primary hover:underline">Dispute a score</a>
            </p>
          </div>

          {/* Main comparison grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-12">
            {/* Product A */}
            <div className={`rounded-xl border p-4 sm:p-6 relative ${getScoreBg(productA.scores.total)}`}>
              {winners.total === 'A' && <WinnerBadge />}
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <ProductLogo logoUrl={productA.logoUrl} name={productA.name} size="md" />
                <div className="min-w-0">
                  <h2 className="font-bold text-sm sm:text-lg truncate">{productA.name}</h2>
                  <p className="text-xs sm:text-sm text-base-content/60">{productA.type}</p>
                </div>
              </div>
              <div className={`text-3xl sm:text-5xl font-bold text-center mb-1 sm:mb-2 ${getScoreColor(productA.scores.total)}`}>
                {productA.scores.total}
              </div>
              <div className={`text-center text-xs sm:text-sm font-medium mb-1 ${getScoreColor(productA.scores.total)}`}>{getScoreLabel(productA.scores.total)}</div>
              <div className="text-center text-xs text-base-content/60 mb-3 sm:mb-4">SAFE Score</div>
              <Link href={`/products/${productA.slug}`} className="btn btn-sm btn-outline w-full min-h-[44px]">
                View Details
              </Link>
            </div>

            {/* VS — visible only on tablet/desktop between the two cards */}
            <div className="hidden md:flex items-center justify-center">
              <div className="text-4xl font-black text-base-content/20">VS</div>
            </div>

            {/* Product B */}
            <div className={`rounded-xl border p-4 sm:p-6 relative ${getScoreBg(productB.scores.total)}`}>
              {winners.total === 'B' && <WinnerBadge />}
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <ProductLogo logoUrl={productB.logoUrl} name={productB.name} size="md" />
                <div className="min-w-0">
                  <h2 className="font-bold text-sm sm:text-lg truncate">{productB.name}</h2>
                  <p className="text-xs sm:text-sm text-base-content/60">{productB.type}</p>
                </div>
              </div>
              <div className={`text-3xl sm:text-5xl font-bold text-center mb-1 sm:mb-2 ${getScoreColor(productB.scores.total)}`}>
                {productB.scores.total}
              </div>
              <div className={`text-center text-xs sm:text-sm font-medium mb-1 ${getScoreColor(productB.scores.total)}`}>{getScoreLabel(productB.scores.total)}</div>
              <div className="text-center text-xs text-base-content/60 mb-3 sm:mb-4">SAFE Score</div>
              <Link href={`/products/${productB.slug}`} className="btn btn-sm btn-outline w-full min-h-[44px]">
                View Details
              </Link>
            </div>
          </div>

          {/* Pillar breakdown */}
          <div className="rounded-xl bg-base-200 border border-base-300 p-6 mb-12">
            <h2 className="text-xl font-bold mb-6 text-center">Pillar-by-Pillar Comparison</h2>

            {/* Mobile + small tablet: card layout per pillar */}
            <div className="space-y-3 md:hidden">
              {config.safe.pillars.map((pillar) => {
                const codeKey = pillar.code.toLowerCase();
                const scoreA = productA.scores[codeKey];
                const scoreB = productB.scores[codeKey];
                const winner = winners[codeKey];

                return (
                  <div key={pillar.code} className="rounded-lg bg-base-300/50 p-4">
                    {/* Pillar header */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl font-black" style={{ color: pillar.color }}>{pillar.code}</span>
                      <span className="text-sm font-semibold text-base-content/80">{pillar.name}</span>
                    </div>
                    {/* Scores side by side */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Product A */}
                      <div className={`text-center p-2 rounded-lg ${winner === 'A' ? 'bg-green-500/10 ring-1 ring-green-500/30' : ''}`}>
                        <div className="text-xs text-base-content/50 mb-1 truncate">{productA.name}</div>
                        <div className={`text-2xl font-bold ${getScoreColor(scoreA)}`}>{scoreA}</div>
                        <div className="w-full h-1.5 bg-base-300 rounded-full overflow-hidden mt-2">
                          <div className="h-full rounded-full" style={{ width: `${scoreA}%`, backgroundColor: pillar.color }} />
                        </div>
                        {winner === 'A' && <span className="text-xs text-green-400 font-semibold mt-1 inline-block">Winner</span>}
                      </div>
                      {/* Product B */}
                      <div className={`text-center p-2 rounded-lg ${winner === 'B' ? 'bg-green-500/10 ring-1 ring-green-500/30' : ''}`}>
                        <div className="text-xs text-base-content/50 mb-1 truncate">{productB.name}</div>
                        <div className={`text-2xl font-bold ${getScoreColor(scoreB)}`}>{scoreB}</div>
                        <div className="w-full h-1.5 bg-base-300 rounded-full overflow-hidden mt-2">
                          <div className="h-full rounded-full" style={{ width: `${scoreB}%`, backgroundColor: pillar.color }} />
                        </div>
                        {winner === 'B' && <span className="text-xs text-green-400 font-semibold mt-1 inline-block">Winner</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tablet + desktop: horizontal bar comparison */}
            <div className="hidden md:block space-y-4">
              {config.safe.pillars.map((pillar) => {
                const codeKey = pillar.code.toLowerCase();
                const scoreA = productA.scores[codeKey];
                const scoreB = productB.scores[codeKey];
                const winner = winners[codeKey];

                return (
                  <div key={pillar.code} className="grid grid-cols-7 gap-4 items-center p-4 rounded-lg bg-base-300/50">
                    {/* Product A score */}
                    <div className={`col-span-2 text-right ${winner === 'A' ? 'font-bold' : ''}`}>
                      <span className={`text-2xl ${getScoreColor(scoreA)}`}>{scoreA}</span>
                      {winner === 'A' && <span className="ml-2 text-green-400">✓</span>}
                    </div>

                    {/* Progress bar A */}
                    <div className="col-span-1">
                      <div className="w-full h-2 bg-base-300 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${scoreA}%`,
                            backgroundColor: pillar.color,
                          }}
                        />
                      </div>
                    </div>

                    {/* Pillar name */}
                    <div className="col-span-1 text-center">
                      <div className="text-2xl font-black" style={{ color: pillar.color }}>
                        {pillar.code}
                      </div>
                      <div className="text-xs text-base-content/60">{pillar.name}</div>
                    </div>

                    {/* Progress bar B */}
                    <div className="col-span-1">
                      <div className="w-full h-2 bg-base-300 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${scoreB}%`,
                            backgroundColor: pillar.color,
                          }}
                        />
                      </div>
                    </div>

                    {/* Product B score */}
                    <div className={`col-span-2 text-left ${winner === 'B' ? 'font-bold' : ''}`}>
                      {winner === 'B' && <span className="mr-2 text-green-400">✓</span>}
                      <span className={`text-2xl ${getScoreColor(scoreB)}`}>{scoreB}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 rounded-lg bg-base-300 text-center">
              <p className="text-base-content/80">
                <strong>{productA.name}</strong> wins in <strong className="text-green-400">{pillarWins.A}</strong> pillars
                {' '}&bull;{' '}
                <strong>{productB.name}</strong> wins in <strong className="text-green-400">{pillarWins.B}</strong> pillars
              </p>
            </div>
          </div>

          {/* Verdict */}
          <div className="rounded-xl bg-gradient-to-br from-primary/20 to-base-200 border border-base-300 p-8 text-center mb-12">
            <h2 className="text-2xl font-bold mb-4">Verdict</h2>
            {winners.total === 'tie' ? (
              <p className="text-lg text-base-content/80">
                Both products have the same overall SAFE Score. Check individual pillar scores to see which best fits your needs.
              </p>
            ) : (
              <p className="text-lg text-base-content/80">
                <strong className="text-primary">
                  {winners.total === 'A' ? productA.name : productB.name}
                </strong>
                {' '}has a higher overall security score with{' '}
                <strong className={getScoreColor(winners.total === 'A' ? productA.scores.total : productB.scores.total)}>
                  {winners.total === 'A' ? productA.scores.total : productB.scores.total}/100
                </strong>
                {' '}compared to{' '}
                <strong className={getScoreColor(winners.total === 'A' ? productB.scores.total : productA.scores.total)}>
                  {winners.total === 'A' ? productB.scores.total : productA.scores.total}/100
                </strong>.
              </p>
            )}
          </div>

          {/* Compare other products CTA */}
          <div className="text-center">
            <p className="text-base-content/60 mb-4">Want to compare other products?</p>
            <Link href="/products" className="btn btn-primary">
              Browse All Products
            </Link>
          </div>

          {/* SEO: Structured FAQ */}
          <div className="mt-16 rounded-xl bg-base-200 border border-base-300 p-8">
            <h2 className="text-xl font-bold mb-6">Frequently Asked Questions</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Which scores higher in SAFE methodology: {productA.name} or {productB.name}?</h3>
                <p className="text-base-content/70">
                  Based on our {normStats?.totalNorms || "\u2014"}-criteria security evaluation, {winners.total === 'tie' ? 'both products have similar security levels' : `${winners.total === 'A' ? productA.name : productB.name} has a higher security score (${winners.total === 'A' ? productA.scores.total : productB.scores.total}/100)`}.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">What is the SAFE Score?</h3>
                <p className="text-base-content/70">
                  The SAFE Score evaluates crypto products across 4 pillars: Security, Adversity, Fidelity, and Efficiency. It&apos;s based on {normStats?.totalNorms || "\u2014"} security norms evaluated by AI and human experts.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">How often are scores updated?</h3>
                <p className="text-base-content/70">
                  We update security scores monthly and immediately after any security incidents or major product updates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
