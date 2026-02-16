import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import config from "@/config";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import ProductLogo from "@/components/ProductLogo";
import CompareProductPicker from "@/components/CompareProductPicker";
import { getFaviconUrl } from "@/libs/logo-utils";
import { getNormStats } from "@/libs/norm-stats";

export const revalidate = 3600; // Revalidate every hour

export const metadata = {
  title: "Compare Crypto Products - Security Comparison Tool | SafeScoring",
  description: "Compare security scores of crypto wallets, exchanges, and DeFi protocols. See side-by-side SAFE Score analysis based on comprehensive security criteria.",
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
    logoUrl: getFaviconUrl(p.url),
    type: typesMap[p.type_id]?.name || "Product",
    category: typesMap[p.type_id]?.category || "other",
    score: Math.round(p.safe_scoring_results?.[0]?.note_finale || 0),
  }));
}

export default async function CompareLandingPage() {
  const [products, normStats] = await Promise.all([getTopProducts(), getNormStats()]);

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
        <div className="max-w-7xl mx-auto">
          <Breadcrumbs items={[
            { label: "Home", href: "/" },
            { label: "Compare" },
          ]} />

          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Compare Crypto Security Scores
            </h1>
            <p className="text-base-content/60 max-w-2xl mx-auto">
              Side-by-side comparison of wallets, exchanges, and DeFi protocols based on {normStats?.totalNorms || "2000+"} security criteria.
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

          {/* Interactive product picker */}
          <CompareProductPicker products={products} categoryLabels={categoryLabels} />

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
              <strong>Which software wallet scores highest?</strong> Security evaluations vary significantly between hot wallets. Compare MetaMask, Trust Wallet, and others to find the right fit for your needs.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
