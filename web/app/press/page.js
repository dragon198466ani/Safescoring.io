import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import config from "@/config";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { getNormStats } from "@/libs/norm-stats";

export const revalidate = 3600; // Revalidate every hour

export const metadata = {
  title: "Press Kit | SafeScoring",
  description: "Media resources, brand assets, and press information for SafeScoring - the crypto security rating platform.",
  keywords: "SafeScoring press kit, crypto security news, blockchain security media",
};

async function getPressStats(normStats) {
  if (!isSupabaseConfigured()) {
    return {
      productsRated: normStats?.totalProducts || "\u2014",
      securityNorms: normStats?.totalNorms || "\u2014",
      productCategories: normStats?.totalProductTypes || "10+",
      avgScore: null,
    };
  }

  try {
    // Get total products rated
    const { count: productsRated } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true });

    // Get product type count
    const { data: types } = await supabase
      .from("product_types")
      .select("id");

    // Get average score
    const { data: scores } = await supabase
      .from("safe_scoring_results")
      .select("note_finale")
      .not("note_finale", "is", null);

    const avgScore = scores && scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + (s.note_finale || 0), 0) / scores.length * 10) / 10
      : null;

    return {
      productsRated: productsRated || normStats?.totalProducts || "\u2014",
      securityNorms: normStats?.totalNorms || "\u2014",
      productCategories: types?.length || normStats?.totalProductTypes || "10+",
      avgScore,
    };
  } catch (error) {
    console.error("Press stats error:", error);
    return {
      productsRated: normStats?.totalProducts || "\u2014",
      securityNorms: normStats?.totalNorms || "\u2014",
      productCategories: normStats?.totalProductTypes || "10+",
      avgScore: null,
    };
  }
}

const pressReleases = [
  {
    date: "2025-01-15",
    title: "SafeScoring Launches Comprehensive Crypto Security Rating Platform",
    excerpt: "New platform evaluates crypto products across comprehensive security norms to help users make safer choices.",
  },
  {
    date: "2025-02-01",
    title: "SafeScoring Introduces Browser Extension for Real-Time Security Alerts",
    excerpt: "Chrome extension warns users about security risks while browsing crypto websites.",
  },
  {
    date: "2025-03-01",
    title: "SafeScoring Opens API for Developers and Partners",
    excerpt: "Free API enables wallets, portfolio trackers, and news sites to integrate security ratings.",
  },
];

const mediaContacts = [
  { name: "Press Inquiries", email: "press@safescoring.io" },
  { name: "Partnership", email: "partners@safescoring.io" },
  { name: "General", email: "hello@safescoring.io" },
];

export default async function PressPage() {
  const normStats = await getNormStats();
  const pressStats = await getPressStats(normStats);

  const stats = [
    { label: "Products Rated", value: `${pressStats.productsRated}+` },
    { label: "Security Norms", value: String(pressStats.securityNorms) },
    { label: "Product Categories", value: `${pressStats.productCategories}+` },
    ...(pressStats.avgScore
      ? [{ label: "Average Score", value: `${pressStats.avgScore}%` }]
      : [{ label: "Methodology", value: "SAFE" }]),
  ];

  return (
    <>
    <Header />
    <main className="min-h-screen pt-24 pb-16 hero-bg">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/20 to-secondary/20 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="badge badge-primary mb-4">Press & Media</div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Press Kit
            </h1>
            <p className="text-xl text-base-content/70 max-w-2xl mx-auto">
              Everything you need to write about SafeScoring.
              Brand assets, statistics, and press releases.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-base-100">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold mb-8 text-center">Key Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, idx) => (
              <div key={idx} className="card bg-base-200 text-center">
                <div className="card-body">
                  <div className="text-3xl md:text-4xl font-bold text-primary">
                    {stat.value}
                  </div>
                  <div className="text-sm text-base-content/70">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section className="py-12 bg-base-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">About SafeScoring</h2>
              <div className="prose prose-sm">
                <p>
                  SafeScoring is a security evaluation platform for crypto products.
                  We evaluate wallets, exchanges, DeFi protocols, and blockchain services across
                  {pressStats.securityNorms} security norms to provide objective, transparent security scores.
                </p>
                <p>
                  Our mission is to make crypto safer by helping users identify secure products
                  and encouraging protocols to improve their security practices.
                </p>
                <p>
                  The SAFE methodology evaluates four key pillars:
                </p>
                <ul>
                  <li><strong>S</strong>ecurity - Technical security measures and architecture</li>
                  <li><strong>A</strong>dversity - Incident response and resilience under attack</li>
                  <li><strong>F</strong>idelity - Transparency, audits, and trustworthiness</li>
                  <li><strong>E</strong>fficiency - Performance, UX, and operational reliability</li>
                </ul>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-4">Boilerplate</h2>
              <div className="bg-base-100 rounded-lg p-6 border border-base-300">
                <p className="text-sm text-base-content/80 leading-relaxed">
                  <strong>Short (50 words):</strong><br />
                  SafeScoring is a crypto security rating platform that evaluates wallets, exchanges,
                  and DeFi protocols across {pressStats.securityNorms} security norms. Using the SAFE methodology (Security,
                  Adversity, Fidelity, Efficiency), SafeScoring provides objective scores to help
                  users make informed decisions about crypto products.
                </p>
                <div className="divider"></div>
                <p className="text-sm text-base-content/80 leading-relaxed">
                  <strong>Tweet-sized (280 chars):</strong><br />
                  SafeScoring rates crypto security. {pressStats.productsRated}+ products. {pressStats.securityNorms} norms. One score.
                  Know if your wallet, exchange, or DeFi protocol is safe before you connect.
                  Free at safescoring.io
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Brand Assets */}
      <section className="py-12 bg-base-100">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold mb-8">Brand Assets</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Logo */}
            <div className="card bg-base-200">
              <div className="card-body">
                <h3 className="card-title text-lg">Logo</h3>
                <div className="bg-base-300 rounded-lg p-8 flex items-center justify-center min-h-[120px]">
                  <div className="text-3xl font-bold">
                    <span className="text-primary">Safe</span>
                    <span>Scoring</span>
                  </div>
                </div>
                <div className="card-actions mt-4">
                  <button className="btn btn-sm btn-outline w-full">
                    Download PNG
                  </button>
                </div>
              </div>
            </div>

            {/* Colors */}
            <div className="card bg-base-200">
              <div className="card-body">
                <h3 className="card-title text-lg">Brand Colors</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-[#6366f1]"></div>
                    <div>
                      <div className="font-mono text-sm">#6366f1</div>
                      <div className="text-xs text-base-content/60">Primary / Brand</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-[#f59e0b]"></div>
                    <div>
                      <div className="font-mono text-sm">#f59e0b</div>
                      <div className="text-xs text-base-content/60">Warning / Caution</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-[#ef4444]"></div>
                    <div>
                      <div className="font-mono text-sm">#ef4444</div>
                      <div className="text-xs text-base-content/60">Danger / Risk</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-[#0f172a]"></div>
                    <div>
                      <div className="font-mono text-sm">#0f172a</div>
                      <div className="text-xs text-base-content/60">Background Dark</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Screenshots */}
            <div className="card bg-base-200">
              <div className="card-body">
                <h3 className="card-title text-lg">Screenshots</h3>
                <p className="text-sm text-base-content/70 mb-4">
                  High-resolution screenshots of the platform, comparison pages, and widgets.
                </p>
                <div className="card-actions">
                  <button className="btn btn-sm btn-outline w-full">
                    Download All (ZIP)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Guidelines */}
          <div className="mt-8 p-6 bg-base-200 rounded-lg">
            <h3 className="font-bold mb-4">Brand Guidelines</h3>
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="font-semibold text-success mb-2">Do</h4>
                <ul className="space-y-1 text-base-content/70">
                  <li>&#10003; Use &quot;SafeScoring&quot; as one word with capital S&apos;s</li>
                  <li>&#10003; Reference our methodology as &quot;SAFE score&quot; or &quot;SafeScore&quot;</li>
                  <li>&#10003; Link to product pages when citing scores</li>
                  <li>&#10003; Use official colors and assets</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-error mb-2">Don&apos;t</h4>
                <ul className="space-y-1 text-base-content/70">
                  <li>&#10007; Alter logo colors or proportions</li>
                  <li>&#10007; Imply endorsement without permission</li>
                  <li>&#10007; Use outdated scores (refresh via API)</li>
                  <li>&#10007; Misrepresent what scores mean</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Press Releases */}
      <section className="py-12 bg-base-200">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold mb-8">Press Releases</h2>

          <div className="space-y-4">
            {pressReleases.map((pr, idx) => (
              <div key={idx} className="card bg-base-100">
                <div className="card-body">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm text-base-content/60 mb-1">
                        {new Date(pr.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <h3 className="card-title text-lg">{pr.title}</h3>
                      <p className="text-sm text-base-content/70 mt-2">{pr.excerpt}</p>
                    </div>
                    <button className="btn btn-sm btn-ghost">Read &rarr;</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Media Coverage CTA */}
      <section className="py-12 bg-base-100">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold mb-4">Write About Us</h2>
          <p className="text-base-content/70 mb-6 max-w-lg mx-auto">
            Are you a journalist or content creator covering crypto security?
            We&apos;d love to be featured in your publication.
          </p>
          <a href="mailto:press@safescoring.io" className="btn btn-primary">
            Get in Touch
          </a>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 bg-gradient-to-r from-primary/20 to-secondary/20">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">Media Contact</h2>
          <p className="text-base-content/70 mb-8">
            For press inquiries, interviews, or additional information.
          </p>

          <div className="flex flex-wrap justify-center gap-6">
            {mediaContacts.map((contact, idx) => (
              <a
                key={idx}
                href={`mailto:${contact.email}`}
                className="card bg-base-100 hover:bg-base-200 transition-colors"
              >
                <div className="card-body py-4 px-6">
                  <div className="text-sm text-base-content/60">{contact.name}</div>
                  <div className="font-mono text-primary">{contact.email}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
    <Footer />
    </>
  );
}
