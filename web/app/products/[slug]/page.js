import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import config from "@/config";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { getNormStats } from "@/libs/getNormStats";
import { getT } from "@/libs/i18n/server";
// Critical components - loaded immediately
import ScoreSecurityPanel from "@/components/ScoreSecurityPanel";
import CommunityStats from "@/components/CommunityStats";
import ProductLogo from "@/components/ProductLogo";
import PricingDisplay from "@/components/PricingDisplay";
import ScoreCircle from "@/components/ScoreCircle";
// Heavy components - lazy loaded
import {
  LazySecurityIncidents,
  LazyCorrectionSection,
  LazyProductHeroGallery,
} from "@/libs/lazy-components";

// Enable ISR caching for better SEO and Google crawl efficiency
// Product scores don't change frequently, so 1 hour cache is reasonable
export const revalidate = 3600; // 1 hour

// Pre-render all product pages at build time for better SEO
export async function generateStaticParams() {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data: products } = await supabase
      .from("products")
      .select("slug")
      .not("slug", "is", null);

    return (products || []).map((product) => ({
      slug: product.slug,
    }));
  } catch (error) {
    console.error("Error generating static params:", error);
    return [];
  }
}

// SEO: Generate metadata for each product page
export async function generateMetadata({ params }) {
  const { slug } = await params;

  if (!isSupabaseConfigured()) {
    return { title: "Product | SafeScoring" };
  }

  const { data: product } = await supabase
    .from("products")
    .select("name, short_description, url, type_id")
    .eq("slug", slug)
    .maybeSingle();

  if (!product) {
    return { title: "Product Not Found | SafeScoring" };
  }

  // Get product type
  let typeName = "crypto product";
  if (product.type_id) {
    const { data: typeData } = await supabase
      .from("product_types")
      .select("name")
      .eq("id", product.type_id)
      .maybeSingle();
    if (typeData) typeName = typeData.name.toLowerCase();
  }

  // Get score
  const { data: scoreData } = await supabase
    .from("safe_scoring_results")
    .select("note_finale")
    .eq("product_id", product.id)
    .order("calculated_at", { ascending: false })
    .limit(1);

  const score = scoreData?.[0]?.note_finale ? Math.round(scoreData[0].note_finale) : null;
  const scoreText = score ? ` - SAFE Score: ${score}%` : "";

  const normStatsData = await getNormStats();
  const totalNormsLabel = normStatsData?.totalNorms ?? "comprehensive";

  const title = `${product.name} Security Score${scoreText} | SafeScoring`;
  const description = product.short_description ||
    `${product.name} ${typeName} security evaluation. See the full SAFE score breakdown across Security, Adversity, Fidelity & Efficiency. ${totalNormsLabel} norms evaluated.`;

  return {
    title,
    description,
    keywords: [
      product.name,
      `${product.name} security`,
      `${product.name} review`,
      `${product.name} safe`,
      `is ${product.name} safe`,
      `${product.name} audit`,
      typeName,
      "crypto security",
      "SAFE score",
      "security rating",
    ],
    openGraph: {
      title,
      description,
      url: `https://safescoring.io/products/${slug}`,
      siteName: "SafeScoring",
      type: "website",
      images: [
        {
          url: `/api/og-image?product=${slug}`,
          width: 1200,
          height: 630,
          alt: `${product.name} SAFE Score`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/og-image?product=${slug}`],
    },
    alternates: {
      canonical: `https://safescoring.io/products/${slug}`,
    },
  };
}

// Fetch product data from Supabase
async function getProduct(slug) {
  try {
    if (!isSupabaseConfigured()) {
      console.log("Supabase not configured");
      return null;
    }

    // Fetch product without relations to avoid join issues
    // Try with fees_breakdown first, fallback without if column doesn't exist yet
    let productBasic = null;
    const productCols = "id, name, slug, url, type_id, brand_id, updated_at, last_monthly_update, media, description, short_description, price_eur, price_details";
    const { data: productFull, error: fullError } = await supabase
      .from("products")
      .select(`${productCols}, fees_breakdown`)
      .eq("slug", slug)
      .maybeSingle();

    if (fullError) {
      // fees_breakdown column may not exist yet — retry without it
      const { data: productFallback, error: fallbackError } = await supabase
        .from("products")
        .select(productCols)
        .eq("slug", slug)
        .maybeSingle();
      if (fallbackError || !productFallback) return null;
      productBasic = productFallback;
    } else {
      productBasic = productFull;
    }

    if (!productBasic) return null;

  // Fetch ALL product types from product_type_mapping (multi-type support)
  let productTypes = [];
  const { data: typeMappings } = await supabase
    .from("product_type_mapping")
    .select("type_id, is_primary")
    .eq("product_id", productBasic.id)
    .order("is_primary", { ascending: false });

  if (typeMappings && typeMappings.length > 0) {
    const typeIds = typeMappings.map(m => m.type_id);
    const { data: typesData } = await supabase
      .from("product_types")
      .select("id, code, name, category")
      .in("id", typeIds);

    if (typesData) {
      // Sort by is_primary (primary first)
      productTypes = typeIds.map(id => typesData.find(t => t.id === id)).filter(Boolean);
    }
  }

  // Fallback to single type_id if no mapping exists
  let productType = productTypes[0] || null;
  if (!productType && productBasic.type_id) {
    const { data: typeData } = await supabase
      .from("product_types")
      .select("id, code, name, category")
      .eq("id", productBasic.type_id)
      .maybeSingle();
    productType = typeData;
    if (productType) productTypes = [productType];
  }

  // Fetch brand separately
  let brand = null;
  if (productBasic.brand_id) {
    const { data: brandData } = await supabase
      .from("brands")
      .select("id, name")
      .eq("id", productBasic.brand_id)
      .maybeSingle();
    brand = brandData;
  }

  const product = {
    ...productBasic,
    product_types: productType,
    all_types: productTypes,
    brands: brand
  };

  // Fetch safe_scoring_results for scores
  const { data: safeScoringData } = await supabase
    .from("safe_scoring_results")
    .select("*")
    .eq("product_id", product.id)
    .order("calculated_at", { ascending: false })
    .limit(1);

  const safeScoring = safeScoringData?.[0] || null;

  // Fetch evaluations with norm_id + transparency fields (with fallback if columns don't exist yet)
  let evaluations = null;
  const { data: evalsRich, error: evalsRichError } = await supabase
    .from("evaluations")
    .select("norm_id, result, why_this_result, confidence_score, evaluated_by, evaluation_date")
    .eq("product_id", product.id);

  if (evalsRichError) {
    // Fallback: columns may not exist yet — fetch only base columns
    const { data: evalsBasic } = await supabase
      .from("evaluations")
      .select("norm_id, result")
      .eq("product_id", product.id);
    evaluations = evalsBasic;
  } else {
    evaluations = evalsRich;
  }

  let evaluationStats = {
    totalNorms: 0,
    evaluated: 0,   // YES + NO (actually scored)
    yes: 0,
    no: 0,
    na: 0,
    tbd: 0,
  };

  // Group evaluations by pillar with details
  const pillarEvaluations = { S: [], A: [], F: [], E: [] };

  if (evaluations && evaluations.length > 0) {
    // Fetch norms details for these evaluations
    const normIds = [...new Set(evaluations.map(e => e.norm_id).filter(Boolean))];
    const { data: norms } = await supabase
      .from("norms")
      .select("id, code, pillar, title")
      .in("id", normIds);

    // Create a lookup map
    const normsMap = {};
    if (norms) {
      norms.forEach(n => { normsMap[n.id] = n; });
    }

    evaluationStats.totalNorms = evaluations.length;
    evaluations.forEach((e) => {
      const result = e.result?.toUpperCase();
      if (result === "YES" || result === "YESP") {
        evaluationStats.yes++;
        evaluationStats.evaluated++;
      } else if (result === "NO") {
        evaluationStats.no++;
        evaluationStats.evaluated++;
      } else if (result === "N/A" || result === "NA") {
        evaluationStats.na++;
      } else if (result === "TBD") {
        evaluationStats.tbd++;
      }

      // Group by pillar for detailed advice
      const norm = normsMap[e.norm_id];
      const pillar = norm?.pillar;
      if (pillar && pillarEvaluations[pillar]) {
        pillarEvaluations[pillar].push({
          code: norm.code,
          title: norm.title,
          result: result,
          reason: e.why_this_result,
          confidence: e.confidence_score || null,
          evaluatedBy: e.evaluated_by || null,
          evaluationDate: e.evaluation_date || null,
        });
      }
    });
  }

  // Helper to generate HD logo URL via Clearbit
  const getLogoUrl = (url) => {
    if (!url) return null;
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return `https://logo.clearbit.com/${domain}`;
    } catch {
      return null;
    }
  };

  // Fallback: Google Favicon (works for all sites)
  const getFaviconUrl = (url) => {
    if (!url) return null;
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    } catch {
      return null;
    }
  };

  // Build types display string
  const typesDisplay = product.all_types?.length > 0
    ? product.all_types.map(t => t.name).join(" • ")
    : product.product_types?.name || "Unknown";

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    type: typesDisplay,
    types: product.all_types || [],
    category: product.product_types?.category || "other",
    brand: product.brands?.name || null,
    website: product.url || "#",
    logoUrl: getFaviconUrl(product.url),
    fallbackUrl: getLogoUrl(product.url),
    media: product.media || [],
    description: product.description || product.short_description || `${product.name} is a ${product.product_types?.name || 'crypto product'} evaluated by SafeScoring.`,
    pricing: {
      price: product.price_eur || null,
      details: product.price_details || null,
      feesBreakdown: product.fees_breakdown || null,
    },
    scores: {
      total: safeScoring?.note_finale != null ? Math.round(safeScoring.note_finale) : null,
      s: safeScoring?.score_s != null ? Math.round(safeScoring.score_s) : null,
      a: safeScoring?.score_a != null ? Math.round(safeScoring.score_a) : null,
      f: safeScoring?.score_f != null ? Math.round(safeScoring.score_f) : null,
      e: safeScoring?.score_e != null ? Math.round(safeScoring.score_e) : null,
    },
    verified: safeScoring?.note_finale != null,
    // DATES CLAIRES - Chaque produit a des dates uniques et spécifiques
    dates: {
      scoreCalculatedAt: safeScoring?.calculated_at || null,      // Quand le score SAFE a été calculé
      lastEvaluatedAt: safeScoring?.last_evaluation_date || null, // Dernière évaluation des normes
      lastMonthlyUpdate: product.last_monthly_update || null,     // Dernière mise à jour mensuelle
      productUpdatedAt: product.updated_at || null,               // Dernière modification produit
    },
    // Compatibilité: utiliser calculated_at en priorité
    lastUpdate: safeScoring?.calculated_at || product.last_monthly_update || product.updated_at,
    evaluationDetails: evaluationStats,
    pillarEvaluations: pillarEvaluations,
    // AI-generated pillar insights (from generate_pillar_insights.py)
    pillarInsights: {
      s: safeScoring?.insight_s || null,
      a: safeScoring?.insight_a || null,
      f: safeScoring?.insight_f || null,
      e: safeScoring?.insight_e || null,
      generatedAt: safeScoring?.insights_generated_at || null,
    },
  };
  } catch (error) {
    console.error("Error fetching product:", error);
    return null;
  }
}

const getScoreColor = (score) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
};

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  const t = getT();
  const dateLocale = t("lang") === "fr" ? "fr-FR" : "en-GB";

  if (!product) {
    notFound();
  }

  // Schema.org JSON-LD for rich snippets in Google
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    url: `https://safescoring.io/products/${slug}`,
    image: product.logoUrl || `https://safescoring.io/api/og-image?product=${slug}`,
    brand: {
      "@type": "Brand",
      name: product.brand || product.name,
    },
    category: product.type,
    aggregateRating: product.verified ? {
      "@type": "AggregateRating",
      ratingValue: (product.scores.total / 20).toFixed(1), // Convert 0-100 to 0-5
      bestRating: "5",
      worstRating: "0",
      ratingCount: product.evaluationDetails.evaluated,
      reviewCount: 1,
    } : undefined,
    review: product.verified ? {
      "@type": "Review",
      reviewRating: {
        "@type": "Rating",
        ratingValue: (product.scores.total / 20).toFixed(1),
        bestRating: "5",
        worstRating: "0",
      },
      author: {
        "@type": "Organization",
        name: "SafeScoring",
        url: "https://safescoring.io",
      },
      reviewBody: `Security evaluation based on ${product.evaluationDetails.evaluated} norms. SAFE Score: ${product.scores.total}% (S:${product.scores.s}%, A:${product.scores.a}%, F:${product.scores.f}%, E:${product.scores.e}%)`,
      datePublished: product.lastUpdate,
    } : undefined,
  };

  // Breadcrumb schema
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://safescoring.io" },
      { "@type": "ListItem", position: 2, name: "Products", item: "https://safescoring.io/products" },
      { "@type": "ListItem", position: 3, name: product.name, item: `https://safescoring.io/products/${slug}` },
    ],
  };

  return (
    <>
      {/* JSON-LD Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Header />
      <main className="min-h-screen pt-24 pb-16 px-6 hero-bg">
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-base-content/60 mb-8">
            <Link href="/" className="hover:text-base-content">{t("common.home")}</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-base-content">{t("nav.products")}</Link>
            <span>/</span>
            <span className="text-base-content">{product.name}</span>
          </div>

          {/* Product header */}
          <div className="flex flex-col lg:flex-row gap-8 mb-12">
            {/* Left: Product info */}
            <div className="flex-1 min-w-0">
              {/* Logo + Title row */}
              <div className="flex items-center gap-4 mb-4">
                <ProductLogo logoUrl={product.logoUrl} fallbackUrl={product.fallbackUrl} name={product.name} size="lg" />
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl md:text-3xl font-bold">{product.name}</h1>
                    {product.verified && (
                      <span className="badge badge-verified">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 mr-1">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                        {t("product.verified")}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-base-content/60 mt-1 flex flex-wrap items-center gap-1">
                    {product.types && product.types.length > 0 ? (
                      product.types.map((pt, i) => (
                        <span key={pt.id} className={i === 0 ? 'font-medium text-base-content/80' : 'text-base-content/50'}>
                          {pt.name}{i < product.types.length - 1 && <span className="mx-1">•</span>}
                        </span>
                      ))
                    ) : (
                      <span>{product.type || 'Unknown'}</span>
                    )}
                    {product.brand && <span className="ml-1">• {t("product.by")} {product.brand}</span>}
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-base-content/70 mb-4 max-w-2xl">{product.description}</p>

              {/* Pricing Info - secondary to Safe Score, auto-detects region for EUR/USD */}
              <PricingDisplay priceEur={product.pricing.price} details={product.pricing.details} feesBreakdown={product.pricing.feesBreakdown} />

              {/* Action buttons - subtle links */}
              <div className="flex items-center gap-4 flex-wrap text-sm">
                {product.website && product.website !== "#" && (
                  <a
                    href={product.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-base-content/60 hover:text-primary transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                    {t("product.visitWebsite")}
                  </a>
                )}
                <button className="inline-flex items-center gap-1.5 text-base-content/60 hover:text-primary transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                  {t("product.addToFavorites")}
                </button>
              </div>
            </div>

            {/* Right: SAFE Score Circle only */}
            <div className="shrink-0">
              <ScoreCircle score={product.scores.total ?? 0} lastUpdate={product.lastUpdate} />
            </div>
          </div>

          {/* Not yet evaluated banner */}
          {!product.verified && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 mb-8 flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-400 flex-shrink-0">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <div>
                <span className="font-semibold text-amber-400">{t("product.notYetEvaluated")}</span>
                <p className="text-sm text-base-content/60 mt-0.5">
                  {t("product.notYetEvaluatedDesc")}
                </p>
              </div>
            </div>
          )}

          {/* Hero Section: Gallery + Pillar Scores côte à côte */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
            {/* Left: Gallery (2/3 on desktop) */}
            <div className="lg:col-span-2">
              {product.media && product.media.length > 0 ? (
                <LazyProductHeroGallery media={product.media} productName={product.name} />
              ) : (
                <div className="aspect-[16/9] rounded-2xl bg-base-200/50 border border-base-content/10 flex items-center justify-center">
                  <div className="text-center text-base-content/40">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 mx-auto mb-2 opacity-50">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                    <span className="text-sm">{t("product.noPhotos")}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Pillar Scores S,A,F,E + Stats (1/3 on desktop) */}
            <div className="lg:col-span-1 flex flex-col gap-3">
              {/* Pillar scores */}
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                {config.safe.pillars.map((pillar) => {
                  const score = product.scores[pillar.code.toLowerCase()];
                  return (
                    <Link
                      key={pillar.code}
                      href={`/methodology#${pillar.code.toLowerCase()}`}
                      className="p-3 rounded-xl bg-base-200 border border-base-300 hover:border-primary/50 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="text-lg font-black"
                            style={{ color: pillar.color }}
                          >
                            {pillar.code}
                          </div>
                          <div className="text-xs text-base-content/60 group-hover:text-base-content/80 transition-colors">
                            {pillar.name}
                          </div>
                        </div>
                        <div className={`text-lg font-bold ${score != null ? getScoreColor(score) : "text-base-content/30"}`}>
                          {score != null ? score : "—"}
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-base-300 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${score ?? 0}%`,
                            backgroundColor: pillar.color,
                          }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Evaluation stats compact */}
              <div className="rounded-xl bg-base-200/50 border border-base-content/10 p-3">
                <div className="grid grid-cols-5 gap-1.5 text-center">
                  <div title="Norms evaluated (YES + NO)">
                    <div className="text-lg font-bold text-base-content">{product.evaluationDetails.evaluated}</div>
                    <div className="text-[10px] text-base-content/50 uppercase">{t("product.scored")}</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-400">{product.evaluationDetails.yes}</div>
                    <div className="text-[10px] text-base-content/50 uppercase">{t("product.yes")}</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-red-400">{product.evaluationDetails.no}</div>
                    <div className="text-[10px] text-base-content/50 uppercase">{t("product.no")}</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-base-content/30">{product.evaluationDetails.na}</div>
                    <div className="text-[10px] text-base-content/50 uppercase">{t("product.na")}</div>
                  </div>
                  <div title="Total norms checked (incl. N/A)">
                    <div className="text-lg font-bold text-base-content/40">{product.evaluationDetails.totalNorms}</div>
                    <div className="text-[10px] text-base-content/50 uppercase">{t("product.total")}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Insights - AI-generated per-pillar strategic summaries */}
          {product.verified && (
          <div className="mb-12">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-primary">
                <path d="M10 1a6 6 0 00-3.815 10.631C7.237 12.5 8 13.443 8 14.456v.644a.75.75 0 00.572.729 6.016 6.016 0 002.856 0A.75.75 0 0012 15.1v-.644c0-1.013.762-1.957 1.815-2.825A6 6 0 0010 1zM8.863 17.414a.75.75 0 00-.226 1.483 9.066 9.066 0 002.726 0 .75.75 0 00-.226-1.483 7.553 7.553 0 01-2.274 0z" />
              </svg>
              {t("product.securityInsights")}
            </h2>
            {(() => {
              const hasInsights = product.pillarInsights?.s || product.pillarInsights?.a || product.pillarInsights?.f || product.pillarInsights?.e;

              if (hasInsights) {
                // Dynamic: show AI-generated insights from DB (one card per pillar)
                return (
                  <div className="grid md:grid-cols-2 gap-4">
                    {config.safe.pillars.map((pillar) => {
                      const insightText = product.pillarInsights?.[pillar.code.toLowerCase()];
                      if (!insightText) return null;
                      const score = product.scores[pillar.code.toLowerCase()] ?? 0;

                      return (
                        <div
                          key={pillar.code}
                          className="rounded-xl p-5 border"
                          style={{
                            backgroundColor: `${pillar.color}08`,
                            borderColor: `${pillar.color}25`,
                          }}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl font-black" style={{ color: pillar.color }}>
                              {pillar.code}
                            </span>
                            <span className="font-semibold text-sm text-base-content/80">{pillar.name}</span>
                            <span className={`ml-auto text-lg font-bold ${getScoreColor(score)}`}>
                              {score}
                            </span>
                          </div>
                          <p className="text-sm text-base-content/70 leading-relaxed">
                            {insightText}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              }

              // Fallback: top strength / priority focus (template-based)
              const pillarScores = config.safe.pillars.map(pillar => ({
                ...pillar,
                score: product.scores[pillar.code.toLowerCase()] ?? 0
              })).sort((a, b) => b.score - a.score);
              const topPillar = pillarScores[0];
              const weakPillar = pillarScores[pillarScores.length - 1];

              return (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-400">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                      <span className="font-semibold text-emerald-400">{t("product.topStrength")}</span>
                      <span className="ml-auto text-2xl font-black" style={{ color: topPillar.color }}>{topPillar.code}</span>
                      <span className={`text-lg font-bold ${getScoreColor(topPillar.score)}`}>{topPillar.score}</span>
                    </div>
                    <p className="text-sm text-base-content/70">
                      {topPillar.score >= 80
                        ? t("product.insightExcellent", { pillar: topPillar.name.toLowerCase() })
                        : topPillar.score >= 60
                        ? t("product.insightGood", { pillar: topPillar.name.toLowerCase() })
                        : t("product.insightStrongest", { pillar: topPillar.name })}
                    </p>
                  </div>

                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-400">
                        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                      <span className="font-semibold text-amber-400">{t("product.priorityFocus")}</span>
                      <span className="ml-auto text-2xl font-black" style={{ color: weakPillar.color }}>{weakPillar.code}</span>
                      <span className={`text-lg font-bold ${getScoreColor(weakPillar.score)}`}>{weakPillar.score}</span>
                    </div>
                    <p className="text-sm text-base-content/70">
                      {weakPillar.score < 60
                        ? t("product.insightWeakLow", { pillar: weakPillar.name })
                        : weakPillar.score < 80
                        ? t("product.insightWeakMid", { pillar: weakPillar.name })
                        : t("product.insightAllStrong")}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
          )}

          {/* Detailed Norm Evaluations by Pillar */}
          {product.evaluationDetails.totalNorms > 0 && (
            <div className="mb-12">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-primary">
                  <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" />
                </svg>
                {t("product.evaluationDetails")}
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {config.safe.pillars.map((pillar) => {
                  const evals = product.pillarEvaluations?.[pillar.code] || [];
                  if (evals.length === 0) return null;

                  const yesCount = evals.filter(e => e.result === "YES" || e.result === "YESP").length;
                  const noCount = evals.filter(e => e.result === "NO").length;
                  const naCount = evals.filter(e => e.result === "N/A" || e.result === "NA").length;

                  return (
                    <div
                      key={pillar.code}
                      className="rounded-xl border border-base-300 overflow-hidden"
                    >
                      {/* Pillar header */}
                      <div
                        className="px-4 py-3 flex items-center justify-between"
                        style={{ backgroundColor: `${pillar.color}15` }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black" style={{ color: pillar.color }}>
                            {pillar.code}
                          </span>
                          <span className="font-semibold text-sm">{pillar.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-green-400 font-medium">{yesCount} ✓</span>
                          <span className="text-red-400 font-medium">{noCount} ✗</span>
                          <span className="text-base-content/40">{naCount} N/A</span>
                        </div>
                      </div>

                      {/* Norm list — show first 12, with expandable justification */}
                      <div className="divide-y divide-base-300/50">
                        {evals.slice(0, 12).map((ev, i) => (
                          <details key={i} className="group">
                            <summary className="px-4 py-2.5 flex items-start gap-2 cursor-pointer hover:bg-base-200/50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                              <span className={`mt-0.5 text-xs font-bold flex-shrink-0 ${
                                ev.result === "YES" || ev.result === "YESP"
                                  ? "text-green-400"
                                  : ev.result === "NO"
                                  ? "text-red-400"
                                  : "text-base-content/30"
                              }`}>
                                {ev.result === "YES" || ev.result === "YESP" ? "✓" : ev.result === "NO" ? "✗" : "—"}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <code className="text-[10px] px-1.5 py-0.5 rounded bg-base-300/50 text-base-content/50 font-mono">
                                    {ev.code}
                                  </code>
                                  <span className="text-sm text-base-content/80 truncate">{ev.title}</span>
                                  {/* Expand arrow */}
                                  {ev.reason && (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-base-content/30 ml-auto flex-shrink-0 transition-transform group-open:rotate-180">
                                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                              </div>
                            </summary>
                            {/* Expandable justification */}
                            {ev.reason && (
                              <div className="px-4 pb-3 pl-10">
                                <p className="text-xs text-base-content/60 leading-relaxed">
                                  {ev.reason}
                                </p>
                                {ev.evaluationDate && (
                                  <span className="text-[10px] text-base-content/30 mt-1 inline-block" title="Evaluation date">
                                    {new Date(ev.evaluationDate).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </span>
                                )}
                              </div>
                            )}
                          </details>
                        ))}
                        {evals.length > 12 && (
                          <div className="px-4 py-2 text-center">
                            <span className="text-xs text-base-content/40">
                              {t("product.moreNorms", { count: evals.length - 12 })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Score & Security + Security History - Side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
            {/* Score & Security Panel */}
            <ScoreSecurityPanel slug={product.slug} productName={product.name} />

            {/* Security Incidents */}
            <LazySecurityIncidents slug={product.slug} />
          </div>

          {/* Community & External Data */}
          <div className="mb-12">
            <CommunityStats productName={product.name} productSlug={product.slug} />
          </div>

          {/* Help Improve - User Corrections (Closed-Loop Data) */}
          <div className="mb-12">
            <LazyCorrectionSection
              productId={product.id}
              productSlug={product.slug}
              productName={product.name}
            />
          </div>

          {/* CTA for full report */}
          <div className="rounded-xl bg-gradient-to-br from-primary/20 to-base-200 border border-base-300 p-8 text-center">
            <h2 className="text-xl font-bold mb-2">{t("product.fullReport")}</h2>
            <p className="text-base-content/60 mb-6">
              {t("product.fullReportDesc", { count: product.evaluationDetails.evaluated })}
            </p>
            <Link href="/#pricing" className="btn btn-primary">
              {t("product.upgradePro")}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
