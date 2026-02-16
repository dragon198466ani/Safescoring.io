import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

export const revalidate = 3600; // 1 hour ISR

export const metadata = {
  title: "Crypto Hacks & Security Incidents | SafeScoring",
  description:
    "Database of crypto hacks, exploits, and security incidents. Learn from past attacks to protect your assets. Analysis includes SafeScoring pre-hack ratings.",
  keywords: [
    "crypto hacks",
    "defi exploits",
    "blockchain security incidents",
    "crypto theft",
    "smart contract hacks",
    "exchange hacks",
    "wallet hacks",
  ],
  openGraph: {
    title: "Crypto Hacks Database | SafeScoring",
    description: "Comprehensive database of crypto hacks, exploits and security incidents with pre-hack SafeScore analysis.",
    url: "https://safescoring.io/hacks",
  },
};

// Fetch incidents from database
async function getHacks() {
  if (!isSupabaseConfigured()) {
    return { data: getSampleHacks(), isSample: true };
  }

  try {
    const { data, error } = await supabase
      .from("incidents")
      .select("*")
      .order("date", { ascending: false })
      .limit(50);

    if (error) throw error;
    return { data: data || getSampleHacks(), isSample: !data || data.length === 0 };
  } catch (e) {
    if (process.env.NODE_ENV === "development") console.error("Error fetching hacks:", e);
    return { data: getSampleHacks(), isSample: true };
  }
}

// Sample data for development — real incidents, no fabricated scores
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
    },
    {
      id: "2",
      slug: "ronin-bridge-2022",
      title: "Ronin Bridge Exploit",
      project: "Ronin Network",
      amount_usd: 625000000,
      date: "2022-03-23",
      category: "BRIDGE",
      summary: "Validator keys compromised in largest DeFi hack to date. $625M stolen.",
      product_slug: "ronin-bridge",
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
    },
    {
      id: "4",
      slug: "wormhole-2022",
      title: "Wormhole Bridge Hack",
      project: "Wormhole",
      amount_usd: 320000000,
      date: "2022-02-02",
      category: "BRIDGE",
      summary: "Smart contract vulnerability exploited. 120,000 wETH stolen.",
      product_slug: "wormhole",
    },
    {
      id: "5",
      slug: "nomad-bridge-2022",
      title: "Nomad Bridge Hack",
      project: "Nomad",
      amount_usd: 190000000,
      date: "2022-08-01",
      category: "BRIDGE",
      summary: "Configuration error allowed anyone to drain funds. Chaotic free-for-all hack.",
      product_slug: "nomad",
    },
    {
      id: "6",
      slug: "euler-finance-2023",
      title: "Euler Finance Exploit",
      project: "Euler Finance",
      amount_usd: 197000000,
      date: "2023-03-13",
      category: "DEFI",
      summary: "Flash loan attack exploiting donation function. Funds later returned.",
      product_slug: "euler-finance",
    },
    {
      id: "7",
      slug: "curve-2023",
      title: "Curve Finance Reentrancy",
      project: "Curve Finance",
      amount_usd: 70000000,
      date: "2023-07-30",
      category: "DEFI",
      summary: "Vyper compiler bug enabled reentrancy attacks on multiple pools.",
      product_slug: "curve",
    },
    {
      id: "8",
      slug: "multichain-2023",
      title: "Multichain Collapse",
      project: "Multichain",
      amount_usd: 130000000,
      date: "2023-07-06",
      category: "BRIDGE",
      summary: "CEO arrest led to bridge collapse. $130M+ stuck or stolen.",
      product_slug: "multichain",
    },
  ];
}

// Format currency
function formatAmount(amount) {
  if (amount >= 1000000000) return `$${(amount / 1000000000).toFixed(1)}B`;
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(0)}M`;
  return `$${(amount / 1000).toFixed(0)}K`;
}

// Get category color
function getCategoryColor(category) {
  const colors = {
    WALLET: "badge-warning",
    EXCHANGE: "badge-error",
    BRIDGE: "badge-secondary",
    DEFI: "badge-primary",
    NFT: "badge-accent",
    HACK: "badge-error",
  };
  return colors[category] || "badge-ghost";
}

// Get score color
function getScoreColor(score) {
  if (score >= 70) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-error";
}

function getScoreLabel(score) {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Moderate";
  return "Developing";
}

export default async function HacksPage() {
  const { data: hacks, isSample } = await getHacks();

  // Calculate stats
  const totalStolen = hacks.reduce((sum, h) => sum + (h.amount_usd || 0), 0);
  const hacksWithScores = hacks.filter((h) => h.safescore_before);
  const avgScoreBefore = hacksWithScores.length > 0
    ? Math.round(hacksWithScores.reduce((sum, h) => sum + h.safescore_before, 0) / hacksWithScores.length)
    : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Crypto Hacks Database",
    description: "Comprehensive database of cryptocurrency security incidents",
    url: "https://safescoring.io/hacks",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: hacks.length,
      itemListElement: hacks.slice(0, 10).map((hack, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://safescoring.io/hacks/${hack.slug}`,
        name: hack.title,
      })),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />
      <main className="min-h-screen pt-24 pb-16 px-6 hero-bg">
        <div className="max-w-7xl mx-auto">
          <Breadcrumbs items={[
            { label: "Home", href: "/" },
            { label: "Hacks Database" },
          ]} />
          {/* Sample data banner */}
          {isSample && (
            <div className="alert alert-info mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">Showing notable historical incidents. Live incident tracking is being populated.</span>
            </div>
          )}

          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-black mb-4">
              Crypto <span className="text-error">Hacks</span> Database
            </h1>
            <p className="text-xl text-base-content/70 max-w-2xl mx-auto mb-8">
              Learn from past security incidents. Every hack listed includes our pre-incident SafeScore rating.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-6">
              <div className="stat bg-base-200 rounded-box px-6 py-4">
                <div className="stat-title">Total Stolen</div>
                <div className="stat-value text-error">{formatAmount(totalStolen)}</div>
                <div className="stat-desc">from tracked incidents</div>
              </div>
              {avgScoreBefore !== null && (
                <div className="stat bg-base-200 rounded-box px-6 py-4">
                  <div className="stat-title">Avg Score Before Hack</div>
                  <div className="stat-value text-warning">{avgScoreBefore}/100</div>
                  <div className="stat-desc">SafeScore pre-incident</div>
                </div>
              )}
              <div className="stat bg-base-200 rounded-box px-6 py-4">
                <div className="stat-title">Incidents Tracked</div>
                <div className="stat-value">{hacks.length}</div>
                <div className="stat-desc">and growing</div>
              </div>
            </div>
          </div>

          {/* Key Insight */}
          <div className="alert alert-warning mb-10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="font-bold">Security is an ongoing process</h3>
              <p className="text-sm">Code audits and continuous monitoring serve complementary roles. SafeScoring evaluates ongoing security practices alongside audit results.</p>
            </div>
          </div>

          {/* Legal disclaimer */}
          <p className="text-xs text-base-content/40 mb-6">
            Incident data is compiled from public reports and may be incomplete or contain inaccuracies. Pre-hack scores are retrospective assessments. This information does not constitute financial advice. If you believe any data is incorrect, please <a href="mailto:contact@safescoring.io" className="underline hover:text-primary">contact us</a>.
          </p>

          {/* Hacks List */}
          <div className="space-y-4">
            {hacks.map((hack) => (
              <Link
                key={hack.id}
                href={`/hacks/${hack.slug}`}
                className="block bg-base-200 hover:bg-base-300 rounded-xl p-6 transition-all border border-base-300 hover:border-primary/50"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Main Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-bold">{hack.title}</h2>
                      <span className={`badge ${getCategoryColor(hack.category)}`}>{hack.category}</span>
                    </div>
                    <p className="text-base-content/70 line-clamp-2">{hack.summary}</p>
                    <div className="text-sm text-base-content/50 mt-2">
                      {new Date(hack.date).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                  </div>

                  {/* Amount & Score */}
                  <div className="flex items-center gap-6">
                    {/* Amount Stolen */}
                    <div className="text-right">
                      <div className="text-2xl font-black text-error">{formatAmount(hack.amount_usd)}</div>
                      <div className="text-xs text-base-content/50">stolen</div>
                    </div>

                    {/* Pre-hack Score */}
                    {hack.safescore_before && (
                      <div className="text-center px-4 py-2 bg-base-100 rounded-lg">
                        <div className={`text-2xl font-bold ${getScoreColor(hack.safescore_before)}`} title={getScoreLabel(hack.safescore_before)}>
                          {hack.safescore_before}
                        </div>
                        <div className={`text-xs font-medium ${getScoreColor(hack.safescore_before)}`}>{getScoreLabel(hack.safescore_before)}</div>
                        <div className="text-xs text-base-content/50">pre-hack score</div>
                      </div>
                    )}

                    {/* Arrow */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 rounded-xl bg-gradient-to-br from-error/20 to-base-200 border border-base-300 p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Stay informed about security</h2>
            <p className="text-base-content/60 mb-6 max-w-xl mx-auto">
              Review the security evaluation of your crypto tools to make more informed decisions.
            </p>
            <Link href="/products" className="btn btn-primary btn-lg">
              Check Your Tools Now
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
