import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { getSEOTags } from "@/libs/seo";
import NewsletterInline from "@/components/NewsletterInline";
import ShareButtons from "@/components/ShareButtons";

export const revalidate = 86400; // 24 hours — re-evaluate daily

// Pre-render all review pages at build time for SEO
export async function generateStaticParams() {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data: products } = await supabase
      .from("products")
      .select("slug")
      .not("slug", "is", null);

    return (products || []).map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

// Fetch product data for the review page
async function getProductReviewData(slug) {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data: product } = await supabase
      .from("products")
      .select("id, name, slug, url, type_id, description, short_description")
      .eq("slug", slug)
      .maybeSingle();

    if (!product) return null;

    // Get type
    let typeName = "crypto product";
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
      .select("note_finale, score_s, score_a, score_f, score_e, calculated_at")
      .eq("product_id", product.id)
      .order("calculated_at", { ascending: false })
      .limit(1);

    const s = scoreData?.[0] || {};
    const score = Math.round(s.note_finale || 0);
    const scores = {
      s: Math.round(s.score_s || 0),
      a: Math.round(s.score_a || 0),
      f: Math.round(s.score_f || 0),
      e: Math.round(s.score_e || 0),
    };

    // Get evaluation counts
    const { data: evaluations } = await supabase
      .from("evaluations")
      .select("result")
      .eq("product_id", product.id);

    let stats = { total: 0, yes: 0, no: 0 };
    if (evaluations) {
      stats.total = evaluations.length;
      evaluations.forEach((e) => {
        const r = e.result?.toUpperCase();
        if (r === "YES" || r === "YESP") stats.yes++;
        else if (r === "NO") stats.no++;
      });
    }

    return {
      name: product.name,
      slug: product.slug,
      url: product.url,
      type: typeName,
      description:
        product.description ||
        product.short_description ||
        `${product.name} is a ${typeName} evaluated by SafeScoring.`,
      score,
      scores,
      stats,
      calculatedAt: s.calculated_at,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = await getProductReviewData(slug);

  if (!product) {
    return getSEOTags({
      title: "Security Review Not Found | SafeScoring",
      canonicalUrlRelative: `/blog/review/${slug}`,
    });
  }

  const scoreText = product.score
    ? ` — SAFE Score: ${product.score}/100`
    : "";
  const title = `${product.name} Security Review${scoreText} | SafeScoring`;
  const description = `Is ${product.name} safe to use? Full SAFE score breakdown: Security ${product.scores.s}%, Adversity ${product.scores.a}%, Fidelity ${product.scores.f}%, Efficiency ${product.scores.e}%. ${product.stats.total} norms evaluated.`;

  return getSEOTags({
    title,
    description,
    canonicalUrlRelative: `/blog/review/${slug}`,
    extraTags: {
      openGraph: {
        title,
        description,
        url: `/blog/review/${slug}`,
        images: [
          {
            url: `/api/og/products/${slug}`,
            width: 1200,
            height: 630,
            alt: `${product.name} SAFE Score`,
          },
        ],
        type: "article",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [`/api/og/products/${slug}`],
      },
    },
  });
}

const getScoreColor = (score) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
};

const getScoreLabel = (score) => {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Moderate";
  return "At Risk";
};

const getScoreBg = (score) => {
  if (score >= 80) return "bg-green-500/10 border-green-500/20";
  if (score >= 60) return "bg-amber-500/10 border-amber-500/20";
  return "bg-red-500/10 border-red-500/20";
};

export default async function ProductReviewPage({ params }) {
  const { slug } = await params;
  const product = await getProductReviewData(slug);

  if (!product) notFound();

  const pillars = [
    {
      code: "S",
      name: "Security",
      score: product.scores.s,
      color: "#3b82f6",
      description:
        "Technical security measures including encryption, key management, code audits, and infrastructure hardening.",
    },
    {
      code: "A",
      name: "Adversity",
      score: product.scores.a,
      color: "#a855f7",
      description:
        "Incident response capabilities, hack history, insurance coverage, and resilience against attacks.",
    },
    {
      code: "F",
      name: "Fidelity",
      score: product.scores.f,
      color: "#f59e0b",
      description:
        "Transparency, regulatory compliance, team accountability, legal structure, and proof of reserves.",
    },
    {
      code: "E",
      name: "Efficiency",
      score: product.scores.e,
      color: "#22c55e",
      description:
        "User experience, operational reliability, uptime track record, and support responsiveness.",
    },
  ];

  const sortedPillars = [...pillars].sort((a, b) => b.score - a.score);
  const strongest = sortedPillars[0];
  const weakest = sortedPillars[sortedPillars.length - 1];

  // Schema.org Article structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${product.name} Security Review — SAFE Score: ${product.score}/100`,
    description: `Full security evaluation of ${product.name}. ${product.stats.total} norms evaluated across 4 pillars.`,
    author: {
      "@type": "Organization",
      name: "SafeScoring",
      url: "https://safescoring.io",
    },
    publisher: {
      "@type": "Organization",
      name: "SafeScoring",
      url: "https://safescoring.io",
    },
    datePublished: product.calculatedAt || new Date().toISOString(),
    dateModified: product.calculatedAt || new Date().toISOString(),
    mainEntityOfPage: `https://safescoring.io/blog/review/${slug}`,
    image: `https://safescoring.io/api/og/products/${slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Back link */}
      <div className="mb-8">
        <Link
          href="/blog"
          className="link !no-underline text-base-content/80 hover:text-base-content inline-flex items-center gap-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M15 10a.75.75 0 01-.75.75H7.612l2.158 1.96a.75.75 0 11-1.04 1.08l-3.5-3.25a.75.75 0 010-1.08l3.5-3.25a.75.75 0 111.04 1.08L7.612 9.25h6.638A.75.75 0 0115 10z"
              clipRule="evenodd"
            />
          </svg>
          Back to Blog
        </Link>
      </div>

      <article className="max-w-3xl">
        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <span className="badge badge-primary badge-sm">Security Review</span>
            <span className="badge badge-ghost badge-sm">{product.type}</span>
            {product.calculatedAt && (
              <span className="text-sm text-base-content/60">
                {new Date(product.calculatedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
            {product.name} Security Review
          </h1>

          <p className="text-lg text-base-content/70 mb-6">
            {product.description}
          </p>

          <div className="flex items-center gap-4">
            <ShareButtons
              url={`/blog/review/${product.slug}`}
              title={`${product.name} Security Review — SAFE Score: ${product.score}/100`}
              type="product"
              score={product.score}
            />
          </div>
        </header>

        {/* Score Summary */}
        <section className="mb-12">
          <div
            className={`rounded-2xl border p-6 ${getScoreBg(product.score)}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">SAFE Score</h2>
                <p className="text-sm text-base-content/60">
                  Based on {product.stats.total} verified norms
                </p>
              </div>
              <div className="text-right">
                <div
                  className={`text-5xl font-black ${getScoreColor(product.score)}`}
                >
                  {product.score}
                </div>
                <div className="text-sm font-medium text-base-content/60">
                  / 100
                </div>
              </div>
            </div>

            <div className="text-lg font-semibold mb-1">
              Rating:{" "}
              <span className={getScoreColor(product.score)}>
                {getScoreLabel(product.score)}
              </span>
            </div>
            <p className="text-sm text-base-content/70">
              {product.stats.yes} norms passed, {product.stats.no} failed out of{" "}
              {product.stats.total} evaluated.
            </p>
          </div>
        </section>

        {/* Pillar Breakdown */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">
            Pillar-by-Pillar Breakdown
          </h2>

          <div className="space-y-4">
            {pillars.map((pillar) => (
              <div
                key={pillar.code}
                className="rounded-xl bg-base-200 border border-base-300 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span
                      className="text-2xl font-black"
                      style={{ color: pillar.color }}
                    >
                      {pillar.code}
                    </span>
                    <span className="font-semibold">{pillar.name}</span>
                  </div>
                  <span
                    className={`text-2xl font-bold ${getScoreColor(pillar.score)}`}
                  >
                    {pillar.score}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-base-300 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pillar.score}%`,
                      backgroundColor: pillar.color,
                    }}
                  />
                </div>

                <p className="text-sm text-base-content/60">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Strengths & Weaknesses */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Key Findings</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-emerald-400 font-semibold">
                  ✓ Strongest Pillar
                </span>
              </div>
              <p className="text-lg font-bold" style={{ color: strongest.color }}>
                {strongest.code} — {strongest.name}: {strongest.score}%
              </p>
              <p className="text-sm text-base-content/70 mt-1">
                {strongest.score >= 80
                  ? `${product.name} demonstrates excellent practices in ${strongest.name.toLowerCase()}.`
                  : strongest.score >= 60
                    ? `${strongest.name} is the strongest area with room for improvement.`
                    : `${strongest.name} is the best-performing pillar but still needs significant work.`}
              </p>
            </div>

            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-amber-400 font-semibold">
                  ⚠ Priority Focus
                </span>
              </div>
              <p className="text-lg font-bold" style={{ color: weakest.color }}>
                {weakest.code} — {weakest.name}: {weakest.score}%
              </p>
              <p className="text-sm text-base-content/70 mt-1">
                {weakest.score < 40
                  ? `${weakest.name} is a significant concern. Consider alternatives or additional precautions.`
                  : weakest.score < 60
                    ? `${weakest.name} needs attention. Monitor for improvements in this area.`
                    : `All pillars are relatively strong. ${weakest.name} is the area with most room for growth.`}
              </p>
            </div>
          </div>
        </section>

        {/* Newsletter CTA */}
        <section className="mb-12">
          <NewsletterInline context="product" productName={product.name} />
        </section>

        {/* Methodology note */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">About This Review</h2>
          <div className="text-base-content/70 space-y-3">
            <p>
              This security review is automatically generated from SafeScoring&apos;s
              database of {product.stats.total} evaluated norms for{" "}
              {product.name}. Each norm is a specific, verifiable security
              criterion with a binary Yes/No answer.
            </p>
            <p>
              The SAFE score is calculated objectively — no opinions, no
              sponsorships, no bias. Scores are re-evaluated monthly to reflect
              changes in the product&apos;s security posture.
            </p>
            <p>
              <Link href="/methodology" className="link link-primary">
                Read the full methodology →
              </Link>
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="mb-12">
          <div className="rounded-xl bg-gradient-to-br from-primary/20 to-base-200 border border-base-300 p-8 text-center">
            <h2 className="text-xl font-bold mb-2">
              See the full {product.name} evaluation
            </h2>
            <p className="text-base-content/60 mb-4">
              View detailed norm-by-norm breakdown, score history, and security
              incidents.
            </p>
            <Link
              href={`/products/${product.slug}`}
              className="btn btn-primary"
            >
              View Full Product Page →
            </Link>
          </div>
        </section>

        {/* Related links */}
        <section>
          <h2 className="text-xl font-bold mb-4">Related</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/products"
              className="btn btn-ghost btn-sm"
            >
              Browse All Products
            </Link>
            <Link
              href="/compare"
              className="btn btn-ghost btn-sm"
            >
              Compare Products
            </Link>
            <Link
              href="/hacks"
              className="btn btn-ghost btn-sm"
            >
              Recent Hacks
            </Link>
            <Link
              href={`/badge?product=${product.slug}`}
              className="btn btn-ghost btn-sm"
            >
              Embed Badge
            </Link>
          </div>
        </section>
      </article>
    </>
  );
}
