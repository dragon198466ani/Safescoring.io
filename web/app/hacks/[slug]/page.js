import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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
  const description = `${hack.summary} Pre-hack SafeScore: ${hack.safescore_before || "N/A"}/100. Learn what went wrong and how to protect yourself.`;

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
      safescore_before: 52,
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

### Why SafeScoring Rated It 52/100 BEFORE the Hack

Our pre-incident evaluation identified several red flags:

- **Closed source** - No way to audit security practices
- **Centralized key generation** - Keys partially derived server-side
- **Limited bug bounty** - Below industry standard
- **No hardware wallet support** - Single point of failure
- **Lack of transparency** - Minimal security documentation

### Lessons Learned

1. Never store large amounts in software wallets
2. Prefer open-source wallets with audited code
3. Use hardware wallets for significant holdings
4. Diversify across multiple wallets
5. Check SafeScoring ratings before trusting a wallet
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
      safescore_before: 45,
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

### Why SafeScoring Rated It 45/100 BEFORE the Hack

Critical vulnerabilities we identified:

- **Low validator count** - Only 9 validators (too few)
- **Centralization risk** - Sky Mavis controlled 4/9 validators
- **Poor key management** - Validator keys not properly secured
- **No monitoring** - Attack went undetected for 6 days
- **Trusted third-party access** - Axie DAO key should have been revoked

### Lessons Learned

1. Bridge security requires true decentralization
2. Validator key management is critical
3. Real-time monitoring is essential
4. Revoke access when no longer needed
5. More validators = more security
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
      safescore_before: 38,
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

FTX wasn't hacked in the traditional sense - it was fraud:

1. **Customer funds misused** - Lent to sister company Alameda
2. **No segregation** - Customer and company funds mixed
3. **Fake accounting** - Billions unaccounted for
4. **No oversight** - Zero internal controls
5. **Centralized control** - SBF controlled everything

### Why SafeScoring Rated It 38/100 BEFORE the Collapse

Our evaluation flagged serious issues:

- **Offshore jurisdiction** - No regulatory oversight
- **Opaque ownership** - Complex corporate structure
- **No proof of reserves** - Refused to provide attestation
- **Key person risk** - Excessive reliance on SBF
- **Related party transactions** - Alameda relationship undisclosed

### Lessons Learned

1. Not your keys, not your crypto
2. Exchanges are not banks - no FDIC
3. Proof of reserves is minimum requirement
4. Offshore = less protection
5. If it seems too good to be true, it is
      `,
      attack_vector: "Fraud / Insolvency",
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

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://safescoring.io" },
      { "@type": "ListItem", position: 2, name: "Hacks", item: "https://safescoring.io/hacks" },
      { "@type": "ListItem", position: 3, name: hack.title, item: `https://safescoring.io/hacks/${slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Header />
      <main className="min-h-screen pt-24 pb-16 px-6 hero-bg">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <nav className="text-sm breadcrumbs mb-6">
            <ul>
              <li><Link href="/">Home</Link></li>
              <li><Link href="/hacks">Hacks</Link></li>
              <li className="text-base-content/70">{hack.project}</li>
            </ul>
          </nav>

          {/* Hero */}
          <div className="bg-base-200 rounded-2xl p-8 mb-8 border border-base-300">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Left: Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`badge ${getCategoryColor(hack.category)}`}>{hack.category}</span>
                  <span className="text-base-content/50">
                    {new Date(hack.date).toLocaleDateString("en-US", {
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
                      {hack.safescore_before < 50 ? "We warned about this" : "Red flags identified"}
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

          {/* CTA Box */}
          <div className="bg-gradient-to-br from-primary/20 to-base-200 border border-primary/30 rounded-xl p-8 text-center mb-8">
            <h2 className="text-2xl font-bold mb-3">Don't trust. Verify.</h2>
            <p className="text-base-content/70 mb-6 max-w-lg mx-auto">
              Check the SafeScore of any crypto tool before trusting it with your funds.
              Our ratings identified red flags in {hack.project} before this incident.
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

// Simple markdown parser
function parseMarkdown(md) {
  if (!md) return "";

  return md
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
