import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import ShareButtons from "@/components/ShareButtons";

export const revalidate = 3600;

// Generate static params for all hacks
export async function generateStaticParams() {
  if (!isSupabaseConfigured()) {
    return getSampleHacks().map((h) => ({ slug: h.slug }));
  }

  try {
    const { data } = await supabase.from("incidents").select("slug").not("slug", "is", null);
    return (data || []).map((h) => ({ slug: h.slug }));
  } catch {
    return [];
  }
}

// Generate SEO metadata
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const hack = await getHack(slug);

  if (!hack) {
    return { title: "Hack Not Found | SafeScoring" };
  }

  const amount = formatAmount(hack.amount_usd);
  const title = `${hack.title}: ${amount} Stolen - Security Analysis | SafeScoring`;
  const description = hack.safescore_before
    ? `${hack.summary} Pre-hack SafeScore: ${hack.safescore_before}/100. Learn what went wrong and how to protect yourself.`
    : `${hack.summary} Learn what went wrong and how to protect yourself.`;

  return {
    title,
    description,
    keywords: [
      `${hack.project} hack`,
      `${hack.project} hacked`,
      `${hack.project} exploit`,
      `${hack.project} security`,
      "crypto hack analysis",
      "defi exploit",
      hack.category?.toLowerCase(),
    ],
    openGraph: {
      title,
      description,
      url: `https://safescoring.io/hacks/${slug}`,
      type: "article",
      images: [
        {
          url: `/api/og-image?hack=${slug}`,
          width: 1200,
          height: 630,
          alt: `${hack.title} Analysis`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

async function getHack(slug) {
  if (!isSupabaseConfigured()) {
    return getSampleHacks().find((h) => h.slug === slug);
  }

  try {
    const { data, error } = await supabase.from("incidents").select("*").eq("slug", slug).single();

    if (error) throw error;
    return data;
  } catch {
    return getSampleHacks().find((h) => h.slug === slug);
  }
}

function getSampleHacks() {
  return [
    {
      id: "1",
      slug: "atomic-wallet-2023",
      title: "Atomic Wallet Hack",
      project: "Atomic Wallet",
      amount_usd: 100000000,
      date: "2023-06-03",
      category: "WALLET",
      summary: "Private keys compromised through supply chain attack. Over $100M stolen from users.",
      product_slug: "atomic-wallet",
      content: `
## What Happened

On June 3, 2023, Atomic Wallet users began reporting unauthorized transactions draining their wallets. The attack affected thousands of users across multiple blockchains.

### Timeline

- **June 2-3, 2023**: First reports of unauthorized withdrawals
- **June 3**: Atomic Wallet acknowledges the incident
- **June 5**: Estimated losses reach $35M+
- **June 20**: Final tally exceeds $100M

### Attack Vector

The exact attack vector remains unclear, but evidence points to:

1. **Supply chain compromise** - Malicious code may have been injected into a software update
2. **Server-side vulnerability** - User data may have been exposed through backend systems
3. **Encryption weakness** - Private keys may not have been properly secured

### Areas Noted in Retrospective Analysis

Based on publicly available information at the time:

- **Closed source** - Code not publicly auditable
- **Key generation architecture** - Questions about server-side involvement
- **Bug bounty program** - Scope below some industry benchmarks
- **Self-custody only** - No hardware wallet integration
- **Limited documentation** - Minimal public security documentation

### General Lessons

1. Consider hardware wallets for larger amounts
2. Prefer open-source wallets with audited code
3. Use hardware wallets for significant holdings
4. Diversify across multiple wallets
5. Check security ratings before trusting a wallet
      `,
      attack_vector: "Supply Chain / Unknown",
      funds_recovered: 0,
      attacker_identified: false,
    },
    {
      id: "2",
      slug: "ronin-bridge-2022",
      title: "Ronin Bridge Exploit",
      project: "Ronin Network",
      amount_usd: 625000000,
      date: "2022-03-23",
      category: "BRIDGE",
      summary: "Validator keys compromised in largest DeFi hack to date. $625M stolen by Lazarus Group.",
      product_slug: "ronin-bridge",
      content: `
## What Happened

The Ronin Bridge, connecting Axie Infinity to Ethereum, was exploited for $625M - the largest DeFi hack ever at the time.

### Timeline

- **March 23, 2022**: Attack occurs (undetected)
- **March 29, 2022**: User reports withdrawal issue
- **March 29, 2022**: Ronin discovers the hack - 6 days later
- **April 2022**: FBI attributes to Lazarus Group (North Korea)

### Attack Vector

The attacker compromised 5 of 9 validator keys:

1. **4 Sky Mavis validators** - Compromised through spear phishing
2. **1 Axie DAO validator** - Still authorized from a previous arrangement

With 5/9 keys, the attacker could sign any transaction.

### Areas Noted in Retrospective Analysis

Based on publicly available information:

- **Validator count** - 9 validators at the time of the incident
- **Validator distribution** - Sky Mavis operated 4 of 9 validators
- **Key management** - Validator key security was a factor
- **Monitoring gaps** - Attack reportedly went undetected for 6 days
- **Access management** - Previously authorized access was not revoked

### General Lessons

1. Bridge security benefits from broader decentralization
2. Validator key management is an important security consideration
3. Real-time monitoring can help detect incidents faster
4. Access should be revoked when no longer needed
5. More validators can distribute risk
      `,
      attack_vector: "Social Engineering / Key Compromise",
      funds_recovered: 30000000,
      attacker_identified: true,
    },
    {
      id: "3",
      slug: "ftx-collapse-2022",
      title: "FTX Exchange Collapse",
      project: "FTX",
      amount_usd: 8000000000,
      date: "2022-11-11",
      category: "EXCHANGE",
      summary: "Exchange insolvency and alleged fraud. $8B+ in customer funds missing.",
      product_slug: "ftx",
      content: `
## What Happened

FTX, once the world's second-largest crypto exchange, collapsed in spectacular fashion, revealing massive fraud and mismanagement.

### Timeline

- **November 2, 2022**: CoinDesk reveals Alameda balance sheet concerns
- **November 6**: Binance announces FTT sale
- **November 8**: FTX halts withdrawals
- **November 11**: FTX files for bankruptcy
- **November 12**: $600M+ drained in "unauthorized access"

### What Went Wrong

According to court proceedings and public reports, FTX's collapse involved alleged mismanagement of customer funds:

1. **Customer funds commingled** - Allegedly lent to sister company Alameda Research
2. **Lack of fund segregation** - Customer and company funds reportedly mixed
3. **Accounting concerns** - Billions reportedly unaccounted for
4. **Governance gaps** - Limited internal controls reported
5. **Concentrated decision-making** - Key decisions made by a small group

### Areas Noted in Retrospective Analysis

Based on publicly available information at the time:

- **Offshore jurisdiction** - Limited regulatory oversight
- **Complex corporate structure** - Opaque ownership reported
- **Proof of reserves** - Not provided prior to collapse
- **Key person dependency** - Concentrated decision-making authority
- **Related party relationships** - Alameda relationship insufficiently disclosed

### General Lessons

1. Consider self-custody for long-term holdings
2. Exchanges are not insured like banks
3. Proof of reserves is an important transparency measure
4. Regulatory jurisdiction matters for user protection
5. Diversification across platforms can reduce concentration risk
      `,
      attack_vector: "Alleged Mismanagement / Insolvency",
      funds_recovered: 0,
      attacker_identified: true,
    },
  ];
}

function formatAmount(amount) {
  if (amount >= 1000000000) return `$${(amount / 1000000000).toFixed(1)}B`;
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(0)}M`;
  return `$${(amount / 1000).toFixed(0)}K`;
}

function getCategoryColor(category) {
  const colors = {
    WALLET: "badge-warning",
    EXCHANGE: "badge-error",
    BRIDGE: "badge-secondary",
    DEFI: "badge-primary",
  };
  return colors[category] || "badge-ghost";
}

function getScoreColor(score) {
  if (score >= 70) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-error";
}

export default async function HackPage({ params }) {
  const { slug } = await params;
  const hack = await getHack(slug);

  if (!hack) {
    notFound();
  }

  // JSON-LD for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: hack.title,
    description: hack.summary,
    datePublished: hack.date,
    url: `https://safescoring.io/hacks/${slug}`,
    author: {
      "@type": "Organization",
      name: "SafeScoring",
    },
    publisher: {
      "@type": "Organization",
      name: "SafeScoring",
      url: "https://safescoring.io",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />
      <main className="min-h-screen pt-24 pb-16 px-6 hero-bg">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <Breadcrumbs items={[
            { label: "Home", href: "/" },
            { label: "Hacks", href: "/hacks" },
            { label: hack.project },
          ]} />

          {/* Hero */}
          <div className="bg-base-200 rounded-2xl p-8 mb-8 border border-base-300">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Left: Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`badge ${getCategoryColor(hack.category)}`}>{hack.category}</span>
                  <span className="text-base-content/50">
                    {new Date(hack.date).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>

                <h1 className="text-3xl md:text-4xl font-black mb-4">{hack.title}</h1>
                <p className="text-lg text-base-content/70 mb-6">{hack.summary}</p>

                {/* Share */}
                <ShareButtons
                  url={`/hacks/${slug}`}
                  title={`${hack.title}: ${formatAmount(hack.amount_usd)} Stolen`}
                  type="hack"
                />
              </div>

              {/* Right: Stats */}
              <div className="md:w-64 space-y-4">
                {/* Amount */}
                <div className="bg-error/10 border border-error/30 rounded-xl p-4 text-center">
                  <div className="text-4xl font-black text-error">{formatAmount(hack.amount_usd)}</div>
                  <div className="text-sm text-base-content/60">Total Stolen</div>
                </div>

                {/* Pre-hack Score */}
                {hack.safescore_before && (
                  <div className="bg-base-100 rounded-xl p-4 text-center">
                    <div className="text-sm text-base-content/50 mb-1">SafeScore BEFORE Hack</div>
                    <div className={`text-4xl font-black ${getScoreColor(hack.safescore_before)}`}>
                      {hack.safescore_before}
                      <span className="text-base text-base-content/40">/100</span>
                    </div>
                    <div className="text-xs text-base-content/40 mt-1">
                      {hack.safescore_before < 50 ? "Score below average pre-incident" : "Retrospective assessment"}
                    </div>
                  </div>
                )}

                {/* Link to product */}
                {hack.product_slug && (
                  <Link
                    href={`/products/${hack.product_slug}`}
                    className="btn btn-outline btn-sm w-full"
                  >
                    View Current Score
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Quick Facts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-base-200 rounded-lg p-4 text-center">
              <div className="text-xs text-base-content/50 mb-1">Attack Vector</div>
              <div className="font-semibold text-sm">{hack.attack_vector || "Unknown"}</div>
            </div>
            <div className="bg-base-200 rounded-lg p-4 text-center">
              <div className="text-xs text-base-content/50 mb-1">Funds Recovered</div>
              <div className="font-semibold text-sm">
                {hack.funds_recovered ? formatAmount(hack.funds_recovered) : "None"}
              </div>
            </div>
            <div className="bg-base-200 rounded-lg p-4 text-center">
              <div className="text-xs text-base-content/50 mb-1">Attacker Identified</div>
              <div className="font-semibold text-sm">{hack.attacker_identified ? "Yes" : "No"}</div>
            </div>
            <div className="bg-base-200 rounded-lg p-4 text-center">
              <div className="text-xs text-base-content/50 mb-1">Category</div>
              <div className="font-semibold text-sm">{hack.category}</div>
            </div>
          </div>

          {/* Content */}
          {hack.content && (
            <article className="prose prose-invert max-w-none mb-12">
              <div dangerouslySetInnerHTML={{ __html: parseMarkdown(hack.content) }} />
            </article>
          )}

          {/* Disclaimer */}
          <div className="bg-base-200/50 border border-base-300 rounded-xl p-4 mb-8">
            <p className="text-xs text-base-content/50 text-center">
              Incident data is compiled from public reports and may be incomplete or contain inaccuracies. SafeScoring does not guarantee the accuracy of incident details.
              Product evaluations reflect our methodology at a point in time and do not predict future security outcomes.
              If you believe any information is incorrect, contact us at{" "}
              <a href="mailto:legal@safescoring.io" className="underline">legal@safescoring.io</a>.
            </p>
          </div>

          {/* CTA Box */}
          <div className="bg-gradient-to-br from-primary/20 to-base-200 border border-primary/30 rounded-xl p-8 text-center mb-8">
            <h2 className="text-2xl font-bold mb-3">Evaluate before you trust.</h2>
            <p className="text-base-content/70 mb-6 max-w-lg mx-auto">
              Review the security evaluation of any crypto tool before using it.
              {hack.safescore_before
                ? ` ${hack.project} had a below-average evaluation prior to this incident based on publicly available data.`
                : ` Regular security evaluation helps identify areas for improvement.`
              }
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/products" className="btn btn-primary">
                Check Your Tools
              </Link>
              {hack.product_slug && (
                <Link href={`/products/${hack.product_slug}`} className="btn btn-outline">
                  View {hack.project} Score
                </Link>
              )}
            </div>
          </div>

          {/* Related Hacks */}
          <div className="border-t border-base-300 pt-8">
            <h3 className="text-xl font-bold mb-4">Other Security Incidents</h3>
            <div className="flex flex-wrap gap-3">
              {getSampleHacks()
                .filter((h) => h.slug !== slug)
                .slice(0, 3)
                .map((h) => (
                  <Link
                    key={h.slug}
                    href={`/hacks/${h.slug}`}
                    className="badge badge-lg badge-ghost hover:badge-primary transition-colors py-3 px-4"
                  >
                    {h.project}: {formatAmount(h.amount_usd)}
                  </Link>
                ))}
              <Link href="/hacks" className="badge badge-lg badge-outline py-3 px-4">
                View All
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, (c) => map[c]);
}

// Simple markdown parser (with XSS protection)
function parseMarkdown(md) {
  if (!md) return "";

  // Escape HTML first to prevent injection, then apply markdown formatting
  return escapeHtml(md)
    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold mt-8 mb-4">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-semibold mt-6 mb-3">$1</h3>')
    .replace(/^\- \*\*(.+?)\*\* - (.+)$/gm, '<li class="mb-2"><strong>$1</strong> - $2</li>')
    .replace(/^\- (.+)$/gm, "<li>$1</li>")
    .replace(/^\d+\. \*\*(.+?)\*\* - (.+)$/gm, '<li class="mb-2"><strong>$1</strong> - $2</li>')
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n\n/g, "</p><p class='mb-4'>")
    .replace(/^<li>/gm, '<ul class="list-disc list-inside mb-4"><li>')
    .replace(/<\/li>\n(?!<li>)/g, "</li></ul>");
}
