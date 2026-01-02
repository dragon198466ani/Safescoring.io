import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import ProductLogo from "@/components/ProductLogo";

export const revalidate = 3600; // Revalidate every hour

export const metadata = {
  title: "Compare Crypto Products - Security Comparison Tool | SafeScoring",
  description: "Compare security scores of crypto wallets, exchanges, and DeFi protocols. See side-by-side SAFE Score analysis based on 916 security criteria.",
  keywords: [
    "crypto comparison",
    "wallet comparison",
    "ledger vs trezor",
    "metamask vs trust wallet",
    "exchange comparison",
    "security comparison",
    "SAFE score",
  ],
};

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

// Popular comparisons (SEO gold)
const POPULAR_COMPARISONS = [
  { a: "ledger-nano-x", b: "trezor-model-t", label: "Ledger vs Trezor" },
  { a: "metamask", b: "trust-wallet", label: "MetaMask vs Trust Wallet" },
  { a: "ledger-nano-s-plus", b: "trezor-safe-3", label: "Ledger Nano S+ vs Trezor Safe 3" },
  { a: "coinbase", b: "kraken", label: "Coinbase vs Kraken" },
  { a: "binance", b: "coinbase", label: "Binance vs Coinbase" },
  { a: "uniswap", b: "sushiswap", label: "Uniswap vs SushiSwap" },
  { a: "aave", b: "compound", label: "Aave vs Compound" },
  { a: "phantom", b: "solflare", label: "Phantom vs Solflare" },
];

async function getTopProducts() {
  if (!isSupabaseConfigured()) return [];

  // Get products with scores
  const { data: products } = await supabase
    .from("products")
    .select(`
      id, name, slug, url, type_id,
      safe_scoring_results!inner(note_finale)
    `)
    .not("safe_scoring_results.note_finale", "is", null)
    .order("name")
    .limit(50);

  if (!products) return [];

  // Get types
  const typeIds = [...new Set(products.map(p => p.type_id).filter(Boolean))];
  const { data: types } = await supabase
    .from("product_types")
    .select("id, name, category")
    .in("id", typeIds);

  const typesMap = {};
  types?.forEach(t => { typesMap[t.id] = t; });

  return products.map(p => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    logoUrl: getLogoUrl(p.url),
    type: typesMap[p.type_id]?.name || "Product",
    category: typesMap[p.type_id]?.category || "other",
    score: Math.round(p.safe_scoring_results?.[0]?.note_finale || 0),
  }));
}

export default async function CompareLandingPage() {
  const products = await getTopProducts();

  // Group by category
  const byCategory = {};
  products.forEach(p => {
    if (!byCategory[p.category]) byCategory[p.category] = [];
    byCategory[p.category].push(p);
  });

  const categoryLabels = {
    hardware: "Hardware Wallets",
    software: "Software Wallets",
    exchange: "Exchanges",
    defi: "DeFi Protocols",
    other: "Other",
  };

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 px-6 hero-bg">
        <div className="max-w-5xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Compare Crypto Security Scores
            </h1>
            <p className="text-base-content/60 max-w-2xl mx-auto">
              Side-by-side comparison of wallets, exchanges, and DeFi protocols based on 916 security criteria.
            </p>
          </div>

          {/* Popular comparisons */}
          <div className="mb-12">
            <h2 className="text-xl font-bold mb-6">Popular Comparisons</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {POPULAR_COMPARISONS.map((comp) => (
                <Link
                  key={`${comp.a}-${comp.b}`}
                  href={`/compare/${comp.a}/${comp.b}`}
                  className="p-4 rounded-xl bg-base-200 border border-base-300 hover:border-primary transition-colors text-center"
                >
                  <span className="font-medium">{comp.label}</span>
                  <span className="block text-xs text-base-content/50 mt-1">View comparison →</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Custom comparison */}
          <div className="rounded-xl bg-base-200 border border-base-300 p-8 mb-12">
            <h2 className="text-xl font-bold mb-6 text-center">Create Custom Comparison</h2>
            <p className="text-center text-base-content/60 mb-6">
              Select two products from the lists below to compare their security scores.
            </p>

            {Object.entries(byCategory).map(([category, prods]) => (
              prods.length > 0 && (
                <div key={category} className="mb-8">
                  <h3 className="font-semibold mb-4 text-base-content/80">
                    {categoryLabels[category] || category}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {prods.map((product) => (
                      <Link
                        key={product.slug}
                        href={`/products/${product.slug}`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-base-300 hover:bg-primary/20 transition-colors text-sm"
                      >
                        <ProductLogo logoUrl={product.logoUrl} name={product.name} size="xs" />
                        <span>{product.name}</span>
                        <span className={`text-xs font-bold ${
                          product.score >= 80 ? 'text-green-400' :
                          product.score >= 60 ? 'text-amber-400' : 'text-red-400'
                        }`}>
                          {product.score}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            ))}

            <div className="text-center mt-6 p-4 bg-base-300/50 rounded-lg">
              <p className="text-sm text-base-content/60">
                <strong>Tip:</strong> To compare two products, use the URL format:{' '}
                <code className="bg-base-300 px-2 py-0.5 rounded text-xs">
                  /compare/product-a/product-b
                </code>
              </p>
            </div>
          </div>

          {/* SEO content */}
          <div className="prose prose-invert max-w-none">
            <h2>Why Compare Crypto Security Scores?</h2>
            <p>
              Not all crypto products are created equal when it comes to security. Our comparison tool helps you make informed decisions by showing side-by-side security analysis based on our comprehensive SAFE Score methodology.
            </p>

            <h3>What We Compare</h3>
            <ul>
              <li><strong>Security (S)</strong> - Technical security measures, encryption, key management</li>
              <li><strong>Adversity (A)</strong> - Resilience to attacks, incident history, recovery capabilities</li>
              <li><strong>Fidelity (F)</strong> - Team reputation, transparency, audit history</li>
              <li><strong>Efficiency (E)</strong> - User experience, update frequency, documentation</li>
            </ul>

            <h3>Popular Questions</h3>
            <p>
              <strong>Is Ledger or Trezor more secure?</strong> Both are industry leaders, but they have different strengths. Use our <Link href="/compare/ledger-nano-x/trezor-model-t">Ledger vs Trezor comparison</Link> to see the detailed breakdown.
            </p>
            <p>
              <strong>Which software wallet is safest?</strong> Security varies significantly between hot wallets. Compare MetaMask, Trust Wallet, and others to find the best fit for your needs.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
