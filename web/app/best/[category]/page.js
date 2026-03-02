import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import ProductLogo from "@/components/ProductLogo";
import { getStats } from "@/libs/stats";
import config from "@/config";

// Category definitions for SEO pages
const CATEGORIES = {
  "hardware-wallets": {
    title: "Highest-Rated Hardware Wallets",
    h1: "Top 10 Highest-Rated Hardware Wallets (by SafeScoring)",
    description: "Compare hardware wallet security scores according to SafeScoring's SAFE methodology. Independent editorial opinions based on our published criteria.",
    typeFilter: ["hardware_wallet"],
    icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
    keywords: ["hardware wallet", "cold wallet", "ledger", "trezor", "coldcard", "crypto storage", "meilleur hardware wallet", "portefeuille crypto physique", "comparatif ledger trezor"],
  },
  "software-wallets": {
    title: "Highest-Rated Software Wallets",
    h1: "Top 10 Highest-Rated Software Wallets (by SafeScoring)",
    description: "Compare software wallet security scores according to SafeScoring's methodology. Editorial opinions for MetaMask, Trust Wallet, and more.",
    typeFilter: ["software_wallet", "browser_extension", "mobile_wallet"],
    icon: "M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3",
    keywords: ["software wallet", "hot wallet", "metamask", "trust wallet", "phantom", "mobile wallet", "meilleur wallet crypto", "portefeuille crypto mobile", "comparatif wallet crypto"],
  },
  "exchanges": {
    title: "Highest-Rated Crypto Exchanges",
    h1: "Top 10 Highest-Rated Crypto Exchanges (by SafeScoring)",
    description: "Compare exchange security scores according to SafeScoring's methodology. Independent editorial assessments for cryptocurrency exchanges.",
    typeFilter: ["cex", "exchange"],
    icon: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z",
    keywords: ["crypto exchange", "cex", "binance", "coinbase", "kraken", "trading platform", "meilleur exchange crypto", "comparatif exchange crypto", "plateforme crypto sécurisée"],
  },
  "defi-protocols": {
    title: "Highest-Rated DeFi Protocols",
    h1: "Top 10 Highest-Rated DeFi Protocols (by SafeScoring)",
    description: "Compare DeFi protocol security scores according to SafeScoring's methodology. Editorial opinions on lending, DEX, and yield platforms.",
    typeFilter: ["defi", "dex", "lending", "yield"],
    icon: "M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125",
    keywords: ["defi", "decentralized finance", "dex", "uniswap", "aave", "lending protocol", "meilleur protocole defi", "sécurité defi", "comparatif defi"],
  },
  "staking": {
    title: "Highest-Rated Staking Platforms",
    h1: "Top 10 Highest-Rated Staking Platforms (by SafeScoring)",
    description: "Compare staking platform security scores according to SafeScoring's methodology. Editorial opinions on crypto staking security.",
    typeFilter: ["staking", "liquid_staking"],
    icon: "M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    keywords: ["staking", "liquid staking", "lido", "rocket pool", "ethereum staking", "meilleur staking crypto", "staking sécurisé"],
  },
};

// Revalidate every hour
export const revalidate = 3600;

// Generate static paths for all categories
export async function generateStaticParams() {
  return Object.keys(CATEGORIES).map((category) => ({ category }));
}

// Generate metadata for SEO
export async function generateMetadata({ params }) {
  const { category } = await params;
  const categoryData = CATEGORIES[category];

  if (!categoryData) {
    return { title: "Best Crypto Products | SafeScoring" };
  }

  const stats = await getStats();
  const currentYear = new Date().getFullYear();

  return {
    title: `${categoryData.title} ${currentYear} - Security Ranking | SafeScoring`,
    description: categoryData.description,
    keywords: [...categoryData.keywords, "security", "rating", "comparison", currentYear.toString()],
    openGraph: {
      title: `${categoryData.title} ${currentYear} | SafeScoring`,
      description: categoryData.description,
      url: `https://safescoring.io/best/${category}`,
      siteName: "SafeScoring",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${categoryData.title} ${currentYear}`,
      description: categoryData.description,
    },
    alternates: {
      canonical: `https://safescoring.io/best/${category}`,
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

// Score color helper
const getScoreColor = (score) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
};

const getScoreBg = (score) => {
  if (score >= 80) return "bg-green-500/10 border-green-500/20";
  if (score >= 60) return "bg-amber-500/10 border-amber-500/20";
  return "bg-red-500/10 border-red-500/20";
};

// Fetch top products for category
async function getTopProducts(categoryData, limit = 10) {
  if (!isSupabaseConfigured()) return [];

  // Get product type IDs
  const { data: types } = await supabase
    .from("product_types")
    .select("id, code")
    .in("code", categoryData.typeFilter);

  if (!types || types.length === 0) return [];

  const typeIds = types.map((t) => t.id);

  // Get products with scores
  const { data: products } = await supabase
    .from("products")
    .select(`
      id, name, slug, url, short_description,
      product_type_links!inner(type_id)
    `)
    .in("product_type_links.type_id", typeIds)
    .eq("is_active", true)
    .limit(50);

  if (!products || products.length === 0) return [];

  // Get scores for all products
  const productIds = products.map((p) => p.id);
  const { data: scores } = await supabase
    .from("safe_scoring_results")
    .select("product_id, note_finale, score_s, score_a, score_f, score_e, calculated_at")
    .in("product_id", productIds)
    .order("calculated_at", { ascending: false });

  // Create score map (latest score per product)
  const scoreMap = {};
  scores?.forEach((s) => {
    if (!scoreMap[s.product_id]) {
      scoreMap[s.product_id] = s;
    }
  });

  // Combine and sort by score
  const productsWithScores = products
    .map((p) => ({
      ...p,
      logoUrl: getLogoUrl(p.url),
      scores: scoreMap[p.id]
        ? {
            total: Math.round(scoreMap[p.id].note_finale || 0),
            s: Math.round(scoreMap[p.id].score_s || 0),
            a: Math.round(scoreMap[p.id].score_a || 0),
            f: Math.round(scoreMap[p.id].score_f || 0),
            e: Math.round(scoreMap[p.id].score_e || 0),
          }
        : null,
    }))
    .filter((p) => p.scores && p.scores.total > 0)
    .sort((a, b) => b.scores.total - a.scores.total)
    .slice(0, limit);

  return productsWithScores;
}

// JSON-LD Structured Data
function BestOfStructuredData({ category, categoryData, products, stats }) {
  const siteUrl = "https://safescoring.io";
  const currentYear = new Date().getFullYear();

  // ItemList schema for rankings
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `${categoryData.title} ${currentYear}`,
    "description": categoryData.description,
    "numberOfItems": products.length,
    "itemListElement": products.map((product, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Product",
        "name": product.name,
        "description": product.short_description || `${product.name} security rating`,
        "url": `${siteUrl}/products/${product.slug}`,
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": product.scores.total,
          "bestRating": 100,
          "worstRating": 0,
          "ratingCount": stats.totalNorms || 1100,
        },
      },
    })),
  };

  // FAQ schema
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": `What is the highest-rated ${category.replace(/-/g, " ")} according to SafeScoring in ${currentYear}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": products.length > 0
            ? `According to SafeScoring's ${stats.totalNorms}-criteria SAFE methodology, ${products[0].name} currently has the highest score at ${products[0].scores.total}/100. Scores represent SafeScoring's editorial opinion and are not guarantees of security.`
            : `Check our ranking for the latest security scores.`,
        },
      },
      {
        "@type": "Question",
        "name": "How are security scores calculated?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `SafeScoring evaluates products across ${stats.totalNorms} security criteria using the SAFE methodology: Security, Adversity, Fidelity, and Efficiency. Each product is scored from 0-100.`,
        },
      },
    ],
  };

  // Breadcrumb schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": siteUrl },
      { "@type": "ListItem", "position": 2, "name": "Best Products", "item": `${siteUrl}/best` },
      { "@type": "ListItem", "position": 3, "name": categoryData.title, "item": `${siteUrl}/best/${category}` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}

export default async function BestOfPage({ params }) {
  const { category } = await params;
  const categoryData = CATEGORIES[category];

  if (!categoryData) {
    notFound();
  }

  const [products, stats] = await Promise.all([
    getTopProducts(categoryData),
    getStats(),
  ]);

  const currentYear = new Date().getFullYear();

  return (
    <>
      <BestOfStructuredData
        category={category}
        categoryData={categoryData}
        products={products}
        stats={stats}
      />
      <Header />
      <main className="min-h-screen pt-24 pb-16 px-6 hero-bg">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-base-content/60 mb-8">
            <Link href="/" className="hover:text-base-content">Home</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-base-content">Products</Link>
            <span>/</span>
            <span className="text-base-content">{categoryData.title}</span>
          </div>

          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-8 h-8 text-primary"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={categoryData.icon} />
              </svg>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              {categoryData.h1} {currentYear}
            </h1>
            <p className="text-lg text-base-content/60 max-w-2xl mx-auto">
              {categoryData.description} Updated based on {stats.totalNorms} security norms.
            </p>
          </div>

          {/* Top 3 Podium */}
          {products.length >= 3 && (
            <div className="grid md:grid-cols-3 gap-4 mb-12">
              {/* #2 */}
              <div className="order-1 md:order-1 md:mt-8">
                <PodiumCard product={products[1]} rank={2} />
              </div>
              {/* #1 */}
              <div className="order-0 md:order-2">
                <PodiumCard product={products[0]} rank={1} featured />
              </div>
              {/* #3 */}
              <div className="order-2 md:order-3 md:mt-12">
                <PodiumCard product={products[2]} rank={3} />
              </div>
            </div>
          )}

          {/* Editorial Disclaimer */}
          <div className="mb-6 p-4 bg-base-200/50 rounded-lg border border-base-300">
            <p className="text-xs text-base-content/50 text-center">
              Rankings reflect SafeScoring&apos;s editorial opinions based on our published SAFE methodology. They are not statements of fact, guarantees of security, or recommendations to buy or sell any product. Always do your own research (DYOR).
            </p>
          </div>

          {/* Full Ranking Table */}
          <div className="rounded-2xl bg-base-200 border border-base-300 overflow-hidden">
            <div className="px-6 py-4 border-b border-base-300 bg-base-300/30">
              <h2 className="text-xl font-bold">Complete Ranking</h2>
            </div>
            <div className="divide-y divide-base-300">
              {products.map((product, index) => (
                <RankingRow key={product.id} product={product} rank={index + 1} />
              ))}
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-16 rounded-xl bg-base-200 border border-base-300 p-8">
            <h2 className="text-xl font-bold mb-6">Frequently Asked Questions</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">
                  What is the highest-rated {category.replace(/-/g, " ")} according to SafeScoring in {currentYear}?
                </h3>
                <p className="text-base-content/70">
                  {products.length > 0
                    ? `According to SafeScoring's ${stats.totalNorms}-criteria SAFE methodology, ${products[0].name} currently has the highest score at ${products[0].scores.total}/100. This ranking reflects our editorial opinion based on Security, Adversity resistance, Fidelity, and Efficiency criteria. Scores are not guarantees of security.`
                    : "Check back soon for updated rankings."}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">How are these security scores calculated?</h3>
                <p className="text-base-content/70">
                  SafeScoring evaluates each product across {stats.totalNorms} security criteria using the SAFE methodology.
                  Each pillar (Security, Adversity, Fidelity, Efficiency) is scored independently, then combined into an overall score from 0-100.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">How often are rankings updated?</h3>
                <p className="text-base-content/70">
                  Rankings are updated monthly and immediately after any significant security incidents or product updates that affect scores.
                </p>
              </div>
            </div>
          </div>

          {/* Other Categories */}
          <div className="mt-12">
            <h2 className="text-xl font-bold mb-6">Explore Other Rankings</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(CATEGORIES)
                .filter(([key]) => key !== category)
                .map(([key, data]) => (
                  <Link
                    key={key}
                    href={`/best/${key}`}
                    className="flex items-center gap-3 p-4 rounded-xl bg-base-200 border border-base-300 hover:border-primary/50 transition-all"
                  >
                    <div className="p-2 rounded-lg bg-primary/10">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5 text-primary"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d={data.icon} />
                      </svg>
                    </div>
                    <span className="font-medium">{data.title}</span>
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

// Podium Card Component
function PodiumCard({ product, rank, featured = false }) {
  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };

  return (
    <Link
      href={`/products/${product.slug}`}
      className={`block rounded-2xl border p-6 text-center transition-all hover:shadow-lg ${
        featured
          ? "bg-gradient-to-br from-amber-500/20 to-base-200 border-amber-500/30"
          : "bg-base-200 border-base-300 hover:border-base-content/20"
      }`}
    >
      <div className="text-4xl mb-3">{medals[rank]}</div>
      <div className="flex justify-center mb-3">
        <ProductLogo logoUrl={product.logoUrl} name={product.name} size="lg" />
      </div>
      <h3 className={`font-bold mb-1 ${featured ? "text-lg" : ""}`}>{product.name}</h3>
      <div className={`text-3xl font-black ${getScoreColor(product.scores.total)}`}>
        {product.scores.total}
        <span className="text-base text-base-content/40">/100</span>
      </div>
    </Link>
  );
}

// Ranking Row Component
function RankingRow({ product, rank }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="flex items-center gap-4 p-4 hover:bg-base-300/50 transition-colors"
    >
      {/* Rank */}
      <div className="w-8 text-center font-bold text-base-content/50">#{rank}</div>

      {/* Logo & Name */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <ProductLogo logoUrl={product.logoUrl} name={product.name} size="sm" />
        <div className="min-w-0">
          <div className="font-medium truncate">{product.name}</div>
          {product.short_description && (
            <div className="text-xs text-base-content/50 truncate">{product.short_description}</div>
          )}
        </div>
      </div>

      {/* SAFE Pillars - Hidden on mobile */}
      <div className="hidden md:flex items-center gap-2">
        {config.safe.pillars.map((pillar) => {
          const score = product.scores[pillar.code.toLowerCase()];
          return (
            <div
              key={pillar.code}
              className="flex items-center gap-1 px-2 py-1 rounded bg-base-300/50"
            >
              <span className="text-xs font-bold" style={{ color: pillar.color }}>
                {pillar.code}
              </span>
              <span className="text-xs">{score}</span>
            </div>
          );
        })}
      </div>

      {/* Total Score */}
      <div className={`text-xl font-bold ${getScoreColor(product.scores.total)}`}>
        {product.scores.total}
      </div>
    </Link>
  );
}
