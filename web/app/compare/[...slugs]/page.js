import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import config from "@/config";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import ProductLogo from "@/components/ProductLogo";
import { getNormStats } from "@/libs/getNormStats";
import { getT } from "@/libs/i18n/server";

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
  const totalNorms = normStats?.totalNorms ?? "comprehensive";

  const title = `${productA.name} vs ${productB.name} - Security Comparison | SafeScoring`;
  const description = `Compare ${productA.name} and ${productB.name} security scores. See which is safer based on ${totalNorms} security criteria across Security, Adversity, Fidelity & Efficiency.`;

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

// Get logo URL helper
const getLogoUrl = (url) => {
  if (!url) return null;
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch {
    return null;
  }
};

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
    logoUrl: getLogoUrl(product.url),
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
    getNormStats(),
  ]);
  const totalNorms = normStats?.totalNorms ?? "—";

  if (!productA || !productB) {
    notFound();
  }

  const t = getT();

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
      <main className="min-h-screen pt-24 pb-16 px-6 hero-bg">
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-base-content/60 mb-8">
            <Link href="/" className="hover:text-base-content">{t("comparePage.home")}</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-base-content">{t("comparePage.products")}</Link>
            <span>/</span>
            <span className="text-base-content">{t("comparePage.compare")}</span>
          </div>

          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              {t("comparePage.vsTitle", { productA: productA.name, productB: productB.name })}
            </h1>
            <p className="text-base-content/60 max-w-2xl mx-auto">
              {t("comparePage.comparisonSubtitle", { count: totalNorms })}
            </p>
          </div>

          {/* Main comparison grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {/* Product A */}
            <div className={`rounded-xl border p-6 relative ${getScoreBg(productA.scores.total)}`}>
              {winners.total === 'A' && <WinnerBadge />}
              <div className="flex items-center gap-3 mb-4">
                <ProductLogo logoUrl={productA.logoUrl} name={productA.name} size="md" />
                <div>
                  <h2 className="font-bold text-lg">{productA.name}</h2>
                  <p className="text-sm text-base-content/60">{productA.type}</p>
                </div>
              </div>
              <div className={`text-5xl font-bold text-center mb-2 ${getScoreColor(productA.scores.total)}`}>
                {productA.scores.total}
              </div>
              <div className="text-center text-sm text-base-content/60 mb-4">{t("comparePage.safeScore")}</div>
              <Link href={`/products/${productA.slug}`} className="btn btn-sm btn-outline w-full">
                {t("comparePage.viewDetails")}
              </Link>
            </div>

            {/* VS */}
            <div className="flex items-center justify-center">
              <div className="text-4xl font-black text-base-content/20">{t("comparePage.vs")}</div>
            </div>

            {/* Product B */}
            <div className={`rounded-xl border p-6 relative ${getScoreBg(productB.scores.total)}`}>
              {winners.total === 'B' && <WinnerBadge />}
              <div className="flex items-center gap-3 mb-4">
                <ProductLogo logoUrl={productB.logoUrl} name={productB.name} size="md" />
                <div>
                  <h2 className="font-bold text-lg">{productB.name}</h2>
                  <p className="text-sm text-base-content/60">{productB.type}</p>
                </div>
              </div>
              <div className={`text-5xl font-bold text-center mb-2 ${getScoreColor(productB.scores.total)}`}>
                {productB.scores.total}
              </div>
              <div className="text-center text-sm text-base-content/60 mb-4">{t("comparePage.safeScore")}</div>
              <Link href={`/products/${productB.slug}`} className="btn btn-sm btn-outline w-full">
                {t("comparePage.viewDetails")}
              </Link>
            </div>
          </div>

          {/* Pillar breakdown */}
          <div className="rounded-xl bg-base-200 border border-base-300 p-6 mb-12">
            <h2 className="text-xl font-bold mb-6 text-center">{t("comparePage.pillarComparison")}</h2>

            <div className="space-y-4">
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
            <h2 className="text-2xl font-bold mb-4">{t("comparePage.verdict")}</h2>
            {(() => {
              const winnerName = winners.total === 'A' ? productA.name : productB.name;
              const loserName = winners.total === 'A' ? productB.name : productA.name;
              const winnerScore = winners.total === 'A' ? productA.scores.total : productB.scores.total;
              const loserScore = winners.total === 'A' ? productB.scores.total : productA.scores.total;
              const diff = Math.abs(winnerScore - loserScore);

              if (winners.total === 'tie') {
                return (
                  <p className="text-lg text-base-content/80">
                    {t("comparePage.verdictClose", { winner: productA.name })}
                  </p>
                );
              }

              const verdictKey = diff > 20 ? "verdictClearWinner" : winnerScore >= 80 ? "verdictBothExcellent" : "verdictClose";
              return (
                <p className="text-lg text-base-content/80">
                  {t(`comparePage.${verdictKey}`, { winner: winnerName, loser: loserName })}
                </p>
              );
            })()}
          </div>

          {/* Compare other products CTA */}
          <div className="text-center">
            <p className="text-base-content/60 mb-4">{t("comparePage.compareOther")}</p>
            <Link href="/products" className="btn btn-primary">
              {t("comparePage.browseAll")}
            </Link>
          </div>

          {/* SEO: Structured FAQ */}
          <div className="mt-16 rounded-xl bg-base-200 border border-base-300 p-8">
            <h2 className="text-xl font-bold mb-6">{t("comparePage.faqTitle")}</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">{t("comparePage.faqWhichSafer", { productA: productA.name, productB: productB.name })}</h3>
                <p className="text-base-content/70">
                  {t("comparePage.faqWhichSaferAnswer", {
                    winner: winners.total === 'tie' ? productA.name : (winners.total === 'A' ? productA.name : productB.name),
                    winnerScore: winners.total === 'A' ? productA.scores.total : productB.scores.total,
                    loserScore: winners.total === 'A' ? productB.scores.total : productA.scores.total,
                  })}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">{t("comparePage.faqWhatIsSafe")}</h3>
                <p className="text-base-content/70">
                  {t("comparePage.faqWhatIsSafeAnswer")}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">{t("comparePage.faqHowOften")}</h3>
                <p className="text-base-content/70">
                  {t("comparePage.faqHowOftenAnswer")}
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
