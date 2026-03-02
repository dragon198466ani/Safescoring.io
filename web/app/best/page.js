import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getStats } from "@/libs/stats";

// Category definitions
const CATEGORIES = [
  {
    slug: "hardware-wallets",
    title: "Hardware Wallets",
    description: "Cold storage devices for maximum security",
    icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
    gradient: "from-blue-500/20 to-cyan-500/20",
  },
  {
    slug: "software-wallets",
    title: "Software Wallets",
    description: "Hot wallets and browser extensions",
    icon: "M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3",
    gradient: "from-purple-500/20 to-pink-500/20",
  },
  {
    slug: "exchanges",
    title: "Crypto Exchanges",
    description: "Centralized trading platforms",
    icon: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z",
    gradient: "from-green-500/20 to-emerald-500/20",
  },
  {
    slug: "defi-protocols",
    title: "DeFi Protocols",
    description: "Decentralized finance platforms",
    icon: "M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125",
    gradient: "from-amber-500/20 to-orange-500/20",
  },
  {
    slug: "staking",
    title: "Staking Platforms",
    description: "Earn rewards on your crypto",
    icon: "M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    gradient: "from-red-500/20 to-rose-500/20",
  },
];

export const revalidate = 3600;

export const metadata = {
  title: "Highest-Rated Crypto Products - Security Rankings | SafeScoring",
  description: "Compare crypto product security scores according to SafeScoring's published methodology. Editorial opinions for wallets, exchanges, DeFi protocols, and more.",
  keywords: ["crypto security ranking", "wallet security score", "exchange security rating", "crypto security opinion"],
  openGraph: {
    title: "Highest-Rated Crypto Products by SafeScoring",
    description: "Compare crypto product security scores according to SafeScoring's published SAFE methodology.",
    url: "https://safescoring.io/best",
  },
  alternates: {
    canonical: "https://safescoring.io/best",
  },
};

export default async function BestIndexPage() {
  const stats = await getStats();
  const currentYear = new Date().getFullYear();

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 px-6 hero-bg">
        <div className="max-w-5xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Highest-Rated Crypto Products {currentYear}
            </h1>
            <p className="text-xl text-base-content/60 max-w-2xl mx-auto">
              Independent security opinions based on {stats.totalNorms}+ criteria.
              Compare wallets, exchanges, and DeFi protocols according to our SAFE methodology.
            </p>
          </div>

          {/* Category Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CATEGORIES.map((category) => (
              <Link
                key={category.slug}
                href={`/best/${category.slug}`}
                className={`group relative rounded-2xl border border-base-300 p-8 transition-all hover:border-primary/50 hover:shadow-xl bg-gradient-to-br ${category.gradient}`}
              >
                {/* Icon */}
                <div className="w-14 h-14 rounded-xl bg-base-100/80 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-7 h-7 text-primary"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={category.icon} />
                  </svg>
                </div>

                {/* Content */}
                <h2 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                  {category.title}
                </h2>
                <p className="text-base-content/60 mb-4">{category.description}</p>

                {/* CTA */}
                <span className="inline-flex items-center gap-2 text-primary font-medium">
                  View Ranking
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>

          {/* Editorial Disclaimer */}
          <div className="mt-12 p-4 bg-base-200/50 rounded-lg border border-base-300">
            <p className="text-xs text-base-content/50 text-center">
              Rankings reflect SafeScoring&apos;s editorial opinions based on our published SAFE methodology. They are not statements of fact, guarantees of security, or recommendations to buy or sell any product. Always do your own research (DYOR).
            </p>
          </div>

          {/* Trust Section */}
          <div className="mt-8 text-center">
            <p className="text-base-content/50 mb-4">How we evaluate</p>
            <div className="flex flex-wrap justify-center gap-8">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-primary">{stats.totalNorms}+</span>
                <span className="text-base-content/60">Security Norms</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-primary">4</span>
                <span className="text-base-content/60">SAFE Pillars</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-primary">Monthly</span>
                <span className="text-base-content/60">Updates</span>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
