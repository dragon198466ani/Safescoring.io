import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import config from "@/config";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { getNormStats } from "@/libs/norm-stats";
// Critical components - loaded immediately
import ScoreSecurityPanel from "@/components/ScoreSecurityPanel";
import CommunityStats from "@/components/CommunityStats";
import ProductLogo from "@/components/ProductLogo";
import PricingDisplay from "@/components/PricingDisplay";
// Heavy components - lazy loaded
import {
  LazySecurityIncidents,
  LazyCorrectionSection,
  LazyProductHeroGallery,
} from "@/libs/lazy-components";
import CompareWithSimilar from "@/components/CompareWithSimilar";
import FavoriteButton from "@/components/FavoriteButton";
import ShareButtons from "@/components/ShareButtons";
import ProductViewGate from "@/components/ProductViewGate";
import ScoreTypeSwitcher from "@/components/ScoreTypeSwitcher";
import { getLogoUrl, getFaviconUrl } from "@/libs/logo-utils";

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

  const normStats = await getNormStats();
  const title = `${product.name} Security Score${scoreText} | SafeScoring`;
  const description = product.short_description ||
    `${product.name} ${typeName} security evaluation. See the full SAFE score breakdown across Security, Adversity, Fidelity & Efficiency. ${normStats?.totalNorms || "Comprehensive"} norms evaluated.`;

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
      console.warn("Supabase not configured");
      return null;
    }

    // Fetch product without relations to avoid join issues
    const { data: productBasic, error: basicError } = await supabase
    .from("products")
    .select("id, name, slug, url, type_id, brand_id, updated_at, last_monthly_update, media, description, short_description, price_eur, price_details")
    .eq("slug", slug)
    .maybeSingle();

  if (basicError || !productBasic) {
    return null;
  }

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

  // Fetch brand, scores, and evaluations in parallel (reduces 3 sequential queries to 1 step)
  const [brandResult, safeScoringResult, evaluationsResult] = await Promise.all([
    productBasic.brand_id
      ? supabase.from("brands").select("id, name").eq("id", productBasic.brand_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("safe_scoring_results")
      .select("*")
      .eq("product_id", productBasic.id)
      .order("calculated_at", { ascending: false })
      .limit(1),
    supabase
      .from("evaluations")
      .select("norm_id, result, why_this_result")
      .eq("product_id", productBasic.id),
  ]);

  const brand = brandResult.data;
  const product = {
    ...productBasic,
    product_types: productType,
    all_types: productTypes,
    brands: brand
  };

  const safeScoring = safeScoringResult.data?.[0] || null;
  const evaluations = evaluationsResult.data;

  let evaluationStats = {
    totalNorms: 0,
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
      } else if (result === "NO") {
        evaluationStats.no++;
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
          reason: e.why_this_result
        });
      }
    });
  }

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
    },
    scores: {
      total: Math.round(safeScoring?.note_finale || 0),
      s: Math.round(safeScoring?.score_s || 0),
      a: Math.round(safeScoring?.score_a || 0),
      f: Math.round(safeScoring?.score_f || 0),
      e: Math.round(safeScoring?.score_e || 0),
    },
    consumerScores: {
      total: Math.round(safeScoring?.note_consumer || 0),
      s: Math.round(safeScoring?.s_consumer || 0),
      a: Math.round(safeScoring?.a_consumer || 0),
      f: Math.round(safeScoring?.f_consumer || 0),
      e: Math.round(safeScoring?.e_consumer || 0),
    },
    essentialScores: {
      total: Math.round(safeScoring?.note_essential || 0),
      s: Math.round(safeScoring?.s_essential || 0),
      a: Math.round(safeScoring?.a_essential || 0),
      f: Math.round(safeScoring?.f_essential || 0),
      e: Math.round(safeScoring?.e_essential || 0),
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

const getScoreLabel = (score) => {
  if (score >= 80) return { label: "Strong", color: "text-green-400" };
  if (score >= 60) return { label: "Moderate", color: "text-amber-400" };
  return { label: "Developing", color: "text-red-400" };
};

const ScoreCircle = ({ score, size = 140, strokeWidth = 10, lastUpdate }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  const scoreInfo = getScoreLabel(score);
  const strokeColor = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center p-6 rounded-2xl bg-base-200/50 border border-base-content/10">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="score-circle" width={size} height={size}>
          <circle
            className="score-circle-bg"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
          />
          <circle
            className="score-circle-progress"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            stroke={strokeColor}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-bold ${getScoreColor(score)}`}>
            {score}
          </span>
        </div>
      </div>
      <div className="mt-4 text-center">
        <div className="text-sm font-medium text-base-content/60 uppercase tracking-wider">SAFE Score</div>
        <div className={`text-base font-semibold mt-1 ${scoreInfo.color}`}>{scoreInfo.label}</div>
      </div>
      {lastUpdate && (
        <div className="mt-3 text-xs text-base-content/40">
          Updated {new Date(lastUpdate).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = await getProduct(slug);

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
    // Note: AggregateRating and Review removed to avoid implying endorsement or guarantee.
    // SafeScoring evaluations are methodology-based assessments, not consumer reviews.
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
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <Breadcrumbs items={[
            { label: "Home", href: "/" },
            { label: "Products", href: "/products" },
            { label: product.name },
          ]} />

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
                      <span className="badge badge-verified" title="This product has been evaluated using SafeScoring's methodology. This does not constitute an endorsement or security guarantee.">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 mr-1">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                        Scored
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-base-content/60 mt-1 flex flex-wrap items-center gap-1">
                    {product.types && product.types.length > 0 ? (
                      product.types.map((t, i) => (
                        <span key={t.id} className={i === 0 ? 'font-medium text-base-content/80' : 'text-base-content/50'}>
                          {t.name}{i < product.types.length - 1 && <span className="mx-1">•</span>}
                        </span>
                      ))
                    ) : (
                      <span>{product.type || 'Unknown'}</span>
                    )}
                    {product.brand && <span className="ml-1">• by {product.brand}</span>}
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-base-content/70 mb-4 max-w-2xl">{product.description}</p>

              {/* Pricing Info - secondary to Safe Score, auto-detects region for EUR/USD */}
              <PricingDisplay priceEur={product.pricing.price} details={product.pricing.details} />

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
                    Visit Website
                  </a>
                )}
                <FavoriteButton productId={product.id} />
                <ShareButtons url={`/products/${slug}`} title={`${product.name} SAFE Score: ${product.scores.total}/100`} />
              </div>
            </div>

            {/* Right: SAFE Score with type switcher (Full/Consumer/Essential) */}
            <div className="shrink-0">
              <ScoreTypeSwitcher
                scores={product.scores}
                consumerScores={product.consumerScores}
                essentialScores={product.essentialScores}
                lastUpdate={product.lastUpdate}
              />
            </div>
          </div>

          {/* Legal disclaimer — opinion framing (UK Defamation Act 2013 s.3 / French fair comment) */}
          <div className="mb-6 max-w-3xl">
            <p className="text-xs text-base-content/40">
              <span className="font-semibold text-base-content/50">Opinion-Based Evaluation</span> — Scores represent SafeScoring&apos;s opinion based on publicly available information and our SAFE methodology. They do not guarantee security, predict future incidents, or constitute financial, investment, or security advice. Experts using different criteria may reach different conclusions. Always conduct your own research.
              {" "}<a href="/tos#5.8" className="text-primary/60 hover:text-primary hover:underline">Dispute this score</a>
            </p>
          </div>

          {/* Free tier view gate — tracks usage and shows paywall if limit reached */}
          <ProductViewGate productId={product.id}>
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
                    <span className="text-sm">No photos available</span>
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
                        <div className={`text-lg font-bold ${getScoreColor(score)}`}>
                          {score}
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-base-300 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${score}%`,
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
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-base-content">{product.evaluationDetails.totalNorms}</div>
                    <div className="text-[10px] text-base-content/50 uppercase">Norms</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-400">{product.evaluationDetails.yes}</div>
                    <div className="text-[10px] text-base-content/50 uppercase">Yes</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-red-400">{product.evaluationDetails.no}</div>
                    <div className="text-[10px] text-base-content/50 uppercase">No</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-base-content/50">{product.evaluationDetails.na}</div>
                    <div className="text-[10px] text-base-content/50 uppercase">N/A</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Insights - Strategic advice based on scores */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Top Strength */}
            {(() => {
              const pillarScores = config.safe.pillars.map(pillar => ({
                ...pillar,
                score: product.scores[pillar.code.toLowerCase()]
              })).sort((a, b) => b.score - a.score);
              const topPillar = pillarScores[0];
              const weakPillar = pillarScores[pillarScores.length - 1];

              return (
                <>
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-400">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                      <span className="font-semibold text-emerald-400">Top Strength</span>
                      <span className="ml-auto text-2xl font-black" style={{ color: topPillar.color }}>{topPillar.code}</span>
                      <span className={`text-lg font-bold ${getScoreColor(topPillar.score)}`}>{topPillar.score}</span>
                    </div>
                    <p className="text-sm text-base-content/70">
                      {topPillar.score >= 80
                        ? `Excellent ${topPillar.name.toLowerCase()} rating. This product demonstrates strong practices in this area based on our methodology.`
                        : topPillar.score >= 60
                        ? `Good ${topPillar.name.toLowerCase()} fundamentals with room for further development based on our evaluation criteria.`
                        : `${topPillar.name} is the highest-scoring pillar in our evaluation. See methodology for scoring criteria.`}
                    </p>
                  </div>

                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-400">
                        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                      <span className="font-semibold text-amber-400">Priority Focus</span>
                      <span className="ml-auto text-2xl font-black" style={{ color: weakPillar.color }}>{weakPillar.code}</span>
                      <span className={`text-lg font-bold ${getScoreColor(weakPillar.score)}`}>{weakPillar.score}</span>
                    </div>
                    <p className="text-sm text-base-content/70">
                      {weakPillar.score < 60
                        ? `${weakPillar.name} scored lowest in our evaluation. This reflects our methodology's assessment of publicly available information.`
                        : weakPillar.score < 80
                        ? `${weakPillar.name} is the lowest-scoring pillar but scores within a moderate range. See our methodology for details.`
                        : `All pillars score within a strong range based on our evaluation methodology.`}
                    </p>
                  </div>
                </>
              );
            })()}
          </div>

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

          {/* Compare with similar products */}
          <CompareWithSimilar
            currentSlug={product.slug}
            currentName={product.name}
            currentScore={product.scores.total}
            typeId={product.types?.[0]?.id}
            category={product.category}
          />

          {/* CTA for full report */}
          <div className="rounded-xl bg-gradient-to-br from-primary/20 to-base-200 border border-base-300 p-8 text-center">
            <h2 className="text-xl font-bold mb-2">Want the full evaluation report?</h2>
            <p className="text-base-content/60 mb-6">
              Get detailed breakdown of all {product.evaluationDetails.totalNorms} norms, including evidence and recommendations.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <a
                href={`/api/reports/${product.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
                title="Professional plan required"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                Download PDF Report
              </a>
              <Link href="/#pricing" className="btn btn-primary">
                Upgrade to Professional
              </Link>
            </div>
          </div>
          </ProductViewGate>
        </div>
      </main>
      <Footer />
    </>
  );
}
