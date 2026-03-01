import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import config from "@/config";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { getStats } from "@/libs/stats";
import ComparisonTierView from "@/components/ComparisonTierView";

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

  const platformStats = await getStats();
  const title = `${productA.name} vs ${productB.name} - Security Comparison | SafeScoring`;
  const description = `Compare ${productA.name} and ${productB.name} security scores. See which is safer based on ${platformStats.totalNorms} security criteria across Security, Adversity, Fidelity & Efficiency.`;

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

  // Get scores (including consumer and essential tiers)
  const { data: scoreData } = await supabase
    .from("safe_scoring_results")
    .select(`
      note_finale, score_s, score_a, score_f, score_e,
      note_consumer, s_consumer, a_consumer, f_consumer, e_consumer,
      note_essential, s_essential, a_essential, f_essential, e_essential
    `)
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
    },
    consumerScores: {
      total: Math.round(scores.note_consumer || 0),
      s: Math.round(scores.s_consumer || 0),
      a: Math.round(scores.a_consumer || 0),
      f: Math.round(scores.f_consumer || 0),
      e: Math.round(scores.e_consumer || 0),
    },
    essentialScores: {
      total: Math.round(scores.note_essential || 0),
      s: Math.round(scores.s_essential || 0),
      a: Math.round(scores.a_essential || 0),
      f: Math.round(scores.f_essential || 0),
      e: Math.round(scores.e_essential || 0),
    },
  };
}

export default async function ComparePage({ params }) {
  const platformStats = await getStats();
  const { slugs } = await params;

  if (!slugs || slugs.length < 2) {
    notFound();
  }

  const [slugA, slugB] = slugs;
  const [productA, productB] = await Promise.all([
    getProduct(slugA),
    getProduct(slugB)
  ]);

  if (!productA || !productB) {
    notFound();
  }

  // Compute "full" tier winner for SEO FAQ section (server-rendered)
  const fullWinner = productA.scores.total > productB.scores.total ? "A"
    : productA.scores.total < productB.scores.total ? "B" : "tie";

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 px-6 hero-bg">
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-base-content/60 mb-8">
            <Link href="/" className="hover:text-base-content">Home</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-base-content">Products</Link>
            <span>/</span>
            <span className="text-base-content">Compare</span>
          </div>

          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              {productA.name} vs {productB.name}
            </h1>
            <p className="text-base-content/60 max-w-2xl mx-auto">
              Security comparison based on {platformStats.totalNorms} criteria across Security, Adversity, Fidelity & Efficiency pillars.
            </p>
          </div>

          {/* Interactive tier-switching comparison */}
          <ComparisonTierView
            productA={productA}
            productB={productB}
            pillars={config.safe.pillars}
            totalNorms={platformStats.totalNorms}
          />

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
                <h3 className="font-semibold mb-2">Which is safer: {productA.name} or {productB.name}?</h3>
                <p className="text-base-content/70">
                  Based on our {platformStats.totalNorms}-criteria security evaluation, {fullWinner === 'tie' ? 'both products have similar security levels' : `${fullWinner === 'A' ? productA.name : productB.name} has a higher security score (${fullWinner === 'A' ? productA.scores.total : productB.scores.total}/100)`}.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">What is the SAFE Score?</h3>
                <p className="text-base-content/70">
                  The SAFE Score evaluates crypto products across 4 pillars: Security, Adversity, Fidelity, and Efficiency. It&apos;s based on {platformStats.totalNorms} security norms evaluated by AI and human experts.
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
