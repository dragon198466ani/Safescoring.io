import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import config from "@/config";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { auth } from "@/libs/auth";
import ScoreSecurityPanel from "@/components/ScoreSecurityPanel";
import SecurityIncidents from "@/components/SecurityIncidents";
import CommunityStats from "@/components/CommunityStats";
import ProductLogo from "@/components/ProductLogo";
import ProductMedia from "@/components/ProductMedia";
import PillarIllustrations from "@/components/PillarIllustrations";
import LockedContent from "@/components/LockedContent";
import PricingDisplay from "@/components/PricingDisplay";
import CorrectionSection from "@/components/CorrectionSection";

// Disable cache for product pages
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

  const title = `${product.name} Security Score${scoreText} | SafeScoring`;
  const description = product.short_description ||
    `${product.name} ${typeName} security evaluation. See the full SAFE score breakdown across Security, Adversity, Fidelity & Efficiency. 916 norms evaluated.`;

  // Get logo for OG image
  let logoUrl = null;
  if (product.url) {
    try {
      const domain = new URL(product.url).hostname.replace('www.', '');
      logoUrl = `https://logo.clearbit.com/${domain}`;
    } catch {}
  }

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

  // Fetch evaluations with norm_id
  const { data: evaluations } = await supabase
    .from("evaluations")
    .select("norm_id, result, why_this_result")
    .eq("product_id", product.id);

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
    },
    scores: {
      total: Math.round(safeScoring?.note_finale || 0),
      s: Math.round(safeScoring?.score_s || 0),
      a: Math.round(safeScoring?.score_a || 0),
      f: Math.round(safeScoring?.score_f || 0),
      e: Math.round(safeScoring?.score_e || 0),
    },
    verified: true,
    lastUpdate: safeScoring?.calculated_at || product.last_monthly_update || product.updated_at,
    evaluationDetails: evaluationStats,
    pillarEvaluations: pillarEvaluations,
  };
  } catch (error) {
    console.error("Error fetching product:", error);
    return null;
  }
}

// Generate crypto security action-oriented advice for each pillar based on product type and specific failed evaluations
const getPillarAdvice = (pillarCode, score, evaluations = [], productTypes = []) => {
  // Get failed evaluations with their titles
  const failedEvals = evaluations.filter(e => e.result === "NO");
  const failedCount = failedEvals.length;
  const failedTitles = failedEvals.slice(0, 2).map(e => e.title).filter(Boolean);

  const riskLevel = score >= 80 ? "low" : score >= 60 ? "moderate" : "high";

  // Identify product category from types
  const typeNames = productTypes.map(t => t.name?.toLowerCase() || '').join(' ');
  const isHardwareWallet = typeNames.includes('hardware') || typeNames.includes('signing device');
  const isSoftwareWallet = typeNames.includes('software') || typeNames.includes('mobile') || typeNames.includes('browser') || typeNames.includes('desktop');
  const isExchange = typeNames.includes('exchange') || typeNames.includes('cex');
  const isDeFi = typeNames.includes('defi') || typeNames.includes('dex') || typeNames.includes('lending') || typeNames.includes('protocol');
  const isCard = typeNames.includes('card');

  // Build specific issue text from failed evaluations
  const getIssueText = () => {
    if (failedCount === 0) return '';
    if (failedTitles.length === 0) return `${failedCount} area${failedCount > 1 ? 's' : ''} flagged. `;
    if (failedTitles.length === 1) return `Issue identified: ${failedTitles[0]}. `;
    return `Key concerns: ${failedTitles[0]} and ${failedTitles[1]}${failedCount > 2 ? ` (+${failedCount - 2} more)` : ''}. `;
  };

  const issueText = getIssueText();

  // Generate advice based on product type, pillar, risk level, and specific issues
  const generateAdvice = () => {
    // HIGH RISK - Critical issues found
    if (riskLevel === "high") {
      if (isHardwareWallet) {
        const hwHighAdvice = {
          S: `${issueText}Critical for hardware security: verify secure element certification (CC EAL5+), ensure firmware signature verification, and check for supply chain protections.`,
          A: `${issueText}Recovery vulnerabilities detected. Implement metal seed backup with geographic distribution, test recovery procedures, and consider Shamir secret sharing.`,
          F: `${issueText}Vendor trust concerns identified. Research security disclosure history, verify company jurisdiction, and monitor independent security audits.`,
          E: `${issueText}Usability gaps may introduce security risks. Ensure all transaction details display on-device, verify no blind signing is required, and check address verification accuracy.`
        };
        return hwHighAdvice[pillarCode];
      }
      if (isSoftwareWallet) {
        const swHighAdvice = {
          S: `${issueText}Elevated security risk. Consider hardware wallet for high-value assets, revoke unnecessary dApp permissions, and enable transaction simulation before signing.`,
          A: `${issueText}Backup vulnerabilities detected. Store seed phrase offline immediately, avoid cloud backups for private keys, and test recovery on a separate device.`,
          F: `${issueText}Trust verification needed. Check audit reports, verify update authenticity through multiple sources, and monitor community security discussions.`,
          E: `${issueText}Interface risks identified. Use transaction simulation for every interaction, verify contract addresses via block explorers, and bookmark official URLs only.`
        };
        return swHighAdvice[pillarCode];
      }
      if (isExchange) {
        const exHighAdvice = {
          S: `${issueText}Platform security gaps detected. Minimize funds on platform, enable all 2FA options including hardware keys, and set strict withdrawal whitelists.`,
          A: `${issueText}Fund protection concerns. Verify proof-of-reserves status, understand insurance coverage, and maintain asset distribution across multiple platforms.`,
          F: `${issueText}Compliance or transparency issues. Monitor regulatory news, understand jurisdiction risks, and have contingency plans for potential restrictions.`,
          E: `${issueText}Fee or interface concerns. Scrutinize all fee structures including hidden costs, verify execution quality, and document all transactions.`
        };
        return exHighAdvice[pillarCode];
      }
      if (isDeFi) {
        const defiHighAdvice = {
          S: `${issueText}Smart contract risks identified. Use dedicated DeFi wallet, limit approvals to exact amounts, revoke permissions after use, and verify contracts via multiple sources.`,
          A: `${issueText}Protocol resilience concerns. Set conservative position parameters, monitor oracle health actively, prepare exit transactions, and maintain liquidation buffers.`,
          F: `${issueText}Governance or team concerns. Review admin key controls, monitor for suspicious governance proposals, and understand centralization and upgrade risks.`,
          E: `${issueText}Interface vulnerabilities detected. Mandatory transaction simulation, verify all parameters manually, check slippage settings, and be alert to frontend attacks.`
        };
        return defiHighAdvice[pillarCode];
      }
      if (isCard) {
        const cardHighAdvice = {
          S: `${issueText}Card security gaps identified. Enable real-time transaction alerts, set conservative spending limits, and monitor all transactions closely.`,
          A: `${issueText}Fund protection concerns. Maintain minimal card balance, understand liability policies, and verify dispute resolution procedures before significant use.`,
          F: `${issueText}Issuer or compliance concerns. Monitor regulatory status, understand banking partner relationship, and have alternative payment methods ready.`,
          E: `${issueText}Fee transparency issues. Scrutinize all fees including FX spreads, verify conversion rates, and reconcile app transactions with statements.`
        };
        return cardHighAdvice[pillarCode];
      }
      // Generic high risk
      return `${issueText}Elevated risk level. Review security practices, minimize exposure, implement additional protective measures, and monitor actively.`;
    }

    // MODERATE RISK - Some concerns
    if (riskLevel === "moderate") {
      if (isHardwareWallet) {
        const hwModAdvice = {
          S: `${issueText}Verify secure element specs, check for open-source firmware options, and ensure anti-tampering mechanisms are present.`,
          A: `${issueText}Review passphrase and multi-sig support, maintain tested backup procedures, and consider redundant seed storage.`,
          F: `${issueText}Research manufacturer's security track record, verify jurisdiction, and follow official channels for firmware updates.`,
          E: `${issueText}Review companion app permissions, verify transaction display completeness, and ensure address verification is clear.`
        };
        return hwModAdvice[pillarCode];
      }
      if (isSoftwareWallet) {
        const swModAdvice = {
          S: `${issueText}Review key storage method, consider hardware wallet integration, and audit connected dApps regularly.`,
          A: `${issueText}Verify backup encryption, maintain offline seed copy, and test recovery procedure periodically.`,
          F: `${issueText}Verify updates through official channels, check security audit history, and monitor community feedback.`,
          E: `${issueText}Enable transaction simulation, verify contract interactions via explorer, and use bookmarked official URLs.`
        };
        return swModAdvice[pillarCode];
      }
      if (isExchange) {
        const exModAdvice = {
          S: `${issueText}Enable hardware 2FA, set withdrawal delays, and review API permissions and active sessions regularly.`,
          A: `${issueText}Verify proof-of-reserves, understand withdrawal policies, and consider distributing assets across platforms.`,
          F: `${issueText}Monitor regulatory compliance updates, understand jurisdiction implications, and stay informed via official channels.`,
          E: `${issueText}Review fee schedules carefully, understand margin mechanics if applicable, and verify order execution quality.`
        };
        return exModAdvice[pillarCode];
      }
      if (isDeFi) {
        const defiModAdvice = {
          S: `${issueText}Limit token approvals to needed amounts, use revoke tools regularly, and verify contract upgradability status.`,
          A: `${issueText}Set up position monitoring alerts, understand oracle dependencies, and maintain liquidation safety buffers.`,
          F: `${issueText}Monitor governance proposals affecting security, verify admin key controls, and follow official announcements.`,
          E: `${issueText}Use transaction simulation before execution, verify slippage settings, and double-check addresses for complex operations.`
        };
        return defiModAdvice[pillarCode];
      }
      if (isCard) {
        const cardModAdvice = {
          S: `${issueText}Enable real-time alerts, review provider security practices, and understand the conversion process.`,
          A: `${issueText}Review chargeback policies, understand price lock mechanisms, and verify unauthorized use coverage.`,
          F: `${issueText}Monitor card program regulatory status, understand banking partnerships, and review terms updates.`,
          E: `${issueText}Verify fee transparency, understand conversion rates at transaction time, and reconcile regularly.`
        };
        return cardModAdvice[pillarCode];
      }
      // Generic moderate
      return `${issueText}Review security configurations, enable available protections, and maintain regular monitoring practices.`;
    }

    // LOW RISK - Good but can still improve
    if (isHardwareWallet) {
      const hwLowAdvice = {
        S: `${issueText}Good foundation. To improve: consider multi-sig setup, verify secure element is CC EAL6+ certified, and enable all available anti-tampering features.`,
        A: `${issueText}Solid recovery setup. To strengthen: implement Shamir backup (2-of-3), add passphrase protection, and practice recovery drills quarterly.`,
        F: `${issueText}Reliable vendor. To maximize: subscribe to security bulletins, verify firmware hashes independently, and consider backup device from different manufacturer.`,
        E: `${issueText}Good usability. To enhance: enable all verification prompts, use dedicated signing device for high-value transactions, and verify addresses on external display.`
      };
      return hwLowAdvice[pillarCode];
    }
    if (isSoftwareWallet) {
      const swLowAdvice = {
        S: `${issueText}Solid security. To improve: pair with hardware wallet for high-value assets, audit connected dApps monthly, and enable all available security features.`,
        A: `${issueText}Good backup system. To strengthen: create encrypted offline backup, test recovery on separate device, and implement time-delayed transactions for large amounts.`,
        F: `${issueText}Active development. To maximize: enable auto-updates, follow security researchers covering this wallet, and periodically review permissions granted.`,
        E: `${issueText}Clear interface. To enhance: always use transaction simulation, bookmark official URLs only, and verify contract interactions via multiple sources.`
      };
      return swLowAdvice[pillarCode];
    }
    if (isExchange) {
      const exLowAdvice = {
        S: `${issueText}Good platform security. To improve: enable hardware security keys (YubiKey), set strict withdrawal whitelists with 24h delay, and review API permissions.`,
        A: `${issueText}Solid fund protection. To strengthen: diversify across 2-3 platforms, verify proof-of-reserves monthly, and understand exact insurance coverage limits.`,
        F: `${issueText}Compliant platform. To maximize: monitor regulatory news in your jurisdiction, understand withdrawal limits during market stress, and document all transactions.`,
        E: `${issueText}Transparent fees. To optimize: compare maker/taker fees, understand hidden spread costs, and use limit orders to control execution quality.`
      };
      return exLowAdvice[pillarCode];
    }
    if (isDeFi) {
      const defiLowAdvice = {
        S: `${issueText}Audited contracts. To improve: limit approvals to exact amounts needed, use revoke.cash regularly, and verify contracts via multiple block explorers.`,
        A: `${issueText}Resilient protocol. To strengthen: set conservative collateral ratios (150%+ buffer), monitor oracle feeds, and prepare exit transactions in advance.`,
        F: `${issueText}Solid governance. To maximize: participate in votes, monitor admin key movements, and follow security researchers covering this protocol.`,
        E: `${issueText}Good documentation. To enhance: always simulate transactions first, double-check slippage settings, and verify MEV protection is enabled.`
      };
      return defiLowAdvice[pillarCode];
    }
    if (isCard) {
      const cardLowAdvice = {
        S: `${issueText}Good card security. To improve: set conservative daily limits, enable instant notifications, and review connected accounts monthly.`,
        A: `${issueText}Solid protection. To strengthen: understand exact liability limits, document dispute procedures, and maintain minimal card balance.`,
        F: `${issueText}Compliant issuer. To maximize: monitor terms changes, understand banking partner stability, and have backup payment method ready.`,
        E: `${issueText}Clear fee structure. To optimize: verify FX rates at transaction time, compare to alternatives for large purchases, and reconcile weekly.`
      };
      return cardLowAdvice[pillarCode];
    }

    // Generic low risk - still with improvements
    const genericLow = {
      S: `${issueText}Good security base. To improve: enable all available security features, review configurations quarterly, and stay updated on best practices.`,
      A: `${issueText}Solid resilience. To strengthen: implement redundant backups, test recovery procedures, and maintain contingency plans.`,
      F: `${issueText}Reliable product. To maximize: follow official security channels, verify updates independently, and monitor community discussions.`,
      E: `${issueText}Good usability. To enhance: verify all transaction details, use available simulation tools, and document important operations.`
    };
    return genericLow[pillarCode];
  };

  return generateAdvice() || "Apply standard crypto security best practices.";
};

const getScoreColor = (score) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
};

const getScoreLabel = (score) => {
  if (score >= 80) return { label: "Excellent", color: "text-green-400" };
  if (score >= 60) return { label: "Good", color: "text-amber-400" };
  return { label: "At Risk", color: "text-red-400" };
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
  const session = await auth();
  const isAuthenticated = !!session?.user;

  if (!product) {
    notFound();
  }

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
                        Verified
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
                <button className="inline-flex items-center gap-1.5 text-base-content/60 hover:text-primary transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                  Add to Favorites
                </button>
              </div>
            </div>

            {/* Right: Score circle */}
            <div className="flex flex-col items-center lg:items-end shrink-0">
              <ScoreCircle score={product.scores.total} lastUpdate={product.lastUpdate} />
            </div>
          </div>

          {/* Product Photos & Videos */}
          {product.media && product.media.length > 0 && (
            <ProductMedia media={product.media} productName={product.name} />
          )}

          {/* SAFE Pillar scores */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {config.safe.pillars.map((pillar) => {
              const score = product.scores[pillar.code.toLowerCase()];
              const IllustrationComponent = PillarIllustrations[pillar.code];
              return (
                <div
                  key={pillar.code}
                  className="p-6 rounded-xl bg-base-200 border border-base-300 relative"
                >
                  {/* Info icon with tooltip */}
                  <Link
                    href={`/methodology#${pillar.code.toLowerCase()}`}
                    className="absolute top-3 right-3 group"
                    title={pillar.description}
                  >
                    <div className="w-5 h-5 rounded-full bg-base-content/10 hover:bg-base-content/20 flex items-center justify-center transition-colors cursor-pointer">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-base-content/50 group-hover:text-base-content/80">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    {/* Tooltip */}
                    <div className="absolute right-0 top-full mt-2 w-48 p-2 bg-base-300 rounded-lg shadow-lg text-xs text-base-content/80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 pointer-events-none">
                      {pillar.description}
                      <span className="text-primary block mt-1">Click for details</span>
                    </div>
                  </Link>
                  {/* Illustration */}
                  <div className="flex justify-center mb-4">
                    {IllustrationComponent && (
                      <IllustrationComponent size={60} color={pillar.color} />
                    )}
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="text-2xl font-black"
                      style={{ color: pillar.color }}
                    >
                      {pillar.code}
                    </div>
                    <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
                      {score}
                    </div>
                  </div>
                  <div className="font-medium text-sm mb-1">{pillar.name}</div>
                  <div className="w-full h-2 bg-base-300 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${score}%`,
                        backgroundColor: pillar.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Priority Pillars Analysis */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Top Strength - VISIBLE TO ALL (teaser) */}
            <div className="rounded-xl bg-base-200 border border-base-300 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-green-400">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
                Top Strength
              </h2>
              {(() => {
                const pillarScores = config.safe.pillars.map(pillar => ({
                  ...pillar,
                  score: product.scores[pillar.code.toLowerCase()]
                })).sort((a, b) => b.score - a.score);
                const topPillar = pillarScores[0];
                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-base-300/50">
                      <div
                        className="text-3xl font-black"
                        style={{ color: topPillar.color }}
                      >
                        {topPillar.code}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{topPillar.name}</div>
                        <div className="text-sm text-base-content/60">{topPillar.description}</div>
                      </div>
                      <div className={`text-2xl font-bold ${getScoreColor(topPillar.score)}`}>
                        {topPillar.score}
                      </div>
                    </div>
                    <div className="flex items-start gap-2 px-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-base-content/70 italic">{getPillarAdvice(topPillar.code, topPillar.score, product.pillarEvaluations[topPillar.code], product.types)}</p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Priority Areas - LOCKED FOR NON-AUTHENTICATED */}
            {isAuthenticated ? (
              <div className="rounded-xl bg-base-200 border border-base-300 p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-400">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  Priority Areas
                </h2>
                <ul className="space-y-4">
                  {(() => {
                    const pillarScores = config.safe.pillars.map(pillar => ({
                      ...pillar,
                      score: product.scores[pillar.code.toLowerCase()]
                    })).sort((a, b) => a.score - b.score);
                    return pillarScores.slice(0, 3).map((pillar, i) => (
                      <li key={pillar.code} className="rounded-lg bg-base-300/50 overflow-hidden">
                        <div className="flex items-center gap-3 p-3">
                          <span className="text-lg font-bold text-base-content/40 w-6">{i + 1}</span>
                          <div
                            className="text-xl font-black"
                            style={{ color: pillar.color }}
                          >
                            {pillar.code}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{pillar.name}</div>
                          </div>
                          <div className={`text-lg font-bold ${getScoreColor(pillar.score)}`}>
                            {pillar.score}
                          </div>
                        </div>
                        <div className="px-3 pb-3 pt-0">
                          <p className="text-xs text-base-content/60 italic pl-9">{getPillarAdvice(pillar.code, pillar.score, product.pillarEvaluations[pillar.code], product.types)}</p>
                        </div>
                      </li>
                    ));
                  })()}
                </ul>
              </div>
            ) : (
              <LockedContent title="Priority Areas">
                <div className="rounded-xl bg-base-200 border border-base-300 p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-400">
                      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    Priority Areas
                  </h2>
                  <ul className="space-y-4">
                    {(() => {
                      const pillarScores = config.safe.pillars.map(pillar => ({
                        ...pillar,
                        score: product.scores[pillar.code.toLowerCase()]
                      })).sort((a, b) => a.score - b.score);
                      // Show first item visible, rest blurred with real data structure
                      return pillarScores.slice(0, 3).map((pillar, i) => (
                        <li key={pillar.code} className="rounded-lg bg-base-300/50 overflow-hidden">
                          <div className="flex items-center gap-3 p-3">
                            <span className="text-lg font-bold text-base-content/40 w-6">{i + 1}</span>
                            <div
                              className="text-xl font-black"
                              style={{ color: pillar.color }}
                            >
                              {pillar.code}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{pillar.name}</div>
                            </div>
                            <div className={`text-lg font-bold ${getScoreColor(pillar.score)}`}>
                              {pillar.score}
                            </div>
                          </div>
                          <div className="px-3 pb-3 pt-0">
                            <p className="text-xs text-base-content/60 italic pl-9">Create an account to see detailed recommendations.</p>
                          </div>
                        </li>
                      ));
                    })()}
                  </ul>
                </div>
              </LockedContent>
            )}
          </div>

          {/* Evaluation stats */}
          <div className="rounded-xl bg-base-200 border border-base-300 p-6 mb-12">
            <h2 className="text-lg font-semibold mb-6">Evaluation Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <div>
                <div className="text-3xl font-bold text-base-content">
                  {product.evaluationDetails.totalNorms}
                </div>
                <div className="text-sm text-base-content/60">Norms Evaluated</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-400">
                  {product.evaluationDetails.yes}
                </div>
                <div className="text-sm text-base-content/60">Compliant (YES)</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-red-400">
                  {product.evaluationDetails.no}
                </div>
                <div className="text-sm text-base-content/60">Non-Compliant (NO)</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-base-content/50">
                  {product.evaluationDetails.na}
                </div>
                <div className="text-sm text-base-content/60">Not Applicable</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-amber-400">
                  {product.evaluationDetails.tbd}
                </div>
                <div className="text-sm text-base-content/60">To Be Determined</div>
              </div>
            </div>
            {product.evaluationDetails.totalNorms > 0 && (
              <div className="mt-6">
                <div className="w-full h-4 bg-base-300 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-green-500"
                    style={{
                      width: `${(product.evaluationDetails.yes / product.evaluationDetails.totalNorms) * 100}%`,
                    }}
                  />
                  <div
                    className="h-full bg-red-500"
                    style={{
                      width: `${(product.evaluationDetails.no / product.evaluationDetails.totalNorms) * 100}%`,
                    }}
                  />
                  <div
                    className="h-full bg-amber-500"
                    style={{
                      width: `${(product.evaluationDetails.tbd / product.evaluationDetails.totalNorms) * 100}%`,
                    }}
                  />
                  <div
                    className="h-full bg-base-content/30"
                    style={{
                      width: `${(product.evaluationDetails.na / product.evaluationDetails.totalNorms) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Score & Security Panel - Unified view */}
          <div className="mb-8">
            <ScoreSecurityPanel slug={product.slug} productName={product.name} />
          </div>

          {/* Security Incidents - Full history */}
          <div className="mb-12">
            <SecurityIncidents slug={product.slug} />
          </div>

          {/* Community & External Data */}
          <div className="mb-12">
            <CommunityStats productName={product.name} productSlug={product.slug} />
          </div>

          {/* Help Improve - User Corrections (Closed-Loop Data) */}
          <div className="mb-12">
            <CorrectionSection
              productId={product.id}
              productSlug={product.slug}
              productName={product.name}
            />
          </div>

          {/* CTA for full report */}
          <div className="rounded-xl bg-gradient-to-br from-primary/20 to-base-200 border border-base-300 p-8 text-center">
            <h2 className="text-xl font-bold mb-2">Want the full evaluation report?</h2>
            <p className="text-base-content/60 mb-6">
              Get detailed breakdown of all {product.evaluationDetails.totalNorms} norms, including evidence and recommendations.
            </p>
            <Link href="/#pricing" className="btn btn-primary">
              Upgrade to Professional
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
