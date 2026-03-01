"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useGlobalStats } from "@/libs/StatsProvider";

/**
 * Changelog Page
 * Honest record of updates since launch
 */

const CHANGELOG = [
  {
    version: "1.2.0",
    date: "January 24, 2026",
    type: "feature",
    changes: [
      { type: "added", text: "Trust & Transparency page" },
      { type: "added", text: "Public changelog" },
      { type: "added", text: "Why we stay pseudonymous section" },
      { type: "improved", text: "Legal documentation" },
    ],
  },
  {
    version: "1.1.0",
    date: "January 15, 2026",
    type: "feature",
    changes: [
      { type: "added", text: "Product comparison tool" },
      { type: "added", text: "Setup analysis (custom stacks)" },
      { type: "added", text: "PDF export for reports" },
      { type: "added", text: "Anti-copy protection system" },
      { type: "improved", text: "Mobile responsiveness" },
    ],
  },
  {
    version: "1.0.0",
    date: "December 24, 2025",
    type: "major",
    changes: [
      { type: "added", text: "Public launch of SafeScoring" },
      { type: "added", text: "SAFE methodology (Security, Adversity, Fidelity, Efficiency)" },
      { type: "added", text: "2376 security norms" },
      { type: "added", text: "1535+ product evaluations" },
      { type: "added", text: "Free tier with unlimited product scores" },
      { type: "added", text: "Subscription plans (Explorer, Pro, Enterprise)" },
    ],
  },
];

const ROADMAP = [
  {
    quarter: "Q1 2026",
    items: [
      { text: "API access for developers", status: "in_progress" },
      { text: "More DeFi protocol evaluations", status: "in_progress" },
      { text: "Community corrections system", status: "planned" },
    ],
  },
  {
    quarter: "Q2 2026",
    items: [
      { text: "Blockchain proof timestamps", status: "planned" },
      { text: "Real-time score alerts", status: "planned" },
      { text: "Mobile app (iOS/Android)", status: "planned" },
    ],
  },
];

const TYPE_STYLES = {
  added: { bg: "bg-green-500/10", text: "text-green-400", label: "Added" },
  improved: { bg: "bg-blue-500/10", text: "text-blue-400", label: "Improved" },
  fixed: { bg: "bg-amber-500/10", text: "text-amber-400", label: "Fixed" },
};

const VERSION_STYLES = {
  major: "bg-primary/10 border-primary/30",
  feature: "bg-base-200 border-base-300",
};

const STATUS_STYLES = {
  in_progress: { bg: "bg-amber-500/10", text: "text-amber-400", label: "In Progress" },
  planned: { bg: "bg-base-300", text: "text-base-content/50", label: "Planned" },
};

function ChangeItem({ type, text }) {
  const style = TYPE_STYLES[type] || TYPE_STYLES.added;
  return (
    <li className="flex items-start gap-3">
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
      <span className="text-base-content/80">{text}</span>
    </li>
  );
}

export default function ChangelogPage() {
  const { stats, loading } = useGlobalStats();

  return (
    <>
      <Header />
      <main className="min-h-screen pt-20 pb-16">
        {/* Hero */}
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Public Record
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Changelog</h1>
            <p className="text-lg text-base-content/60 max-w-2xl mx-auto">
              A transparent history of SafeScoring updates since our launch in December 2025.
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="px-6 pb-12">
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-base-200/50 border border-base-300 text-center">
                <div className="text-2xl font-bold text-primary">{CHANGELOG.length}</div>
                <div className="text-xs text-base-content/60">Releases</div>
              </div>
              <div className="p-4 rounded-xl bg-base-200/50 border border-base-300 text-center">
                <div className="text-2xl font-bold text-green-400">1</div>
                <div className="text-xs text-base-content/60">Month Active</div>
              </div>
              <div className="p-4 rounded-xl bg-base-200/50 border border-base-300 text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {loading ? "..." : stats.totalNorms}
                </div>
                <div className="text-xs text-base-content/60">Norms</div>
              </div>
            </div>
          </div>
        </section>

        {/* Changelog List */}
        <section className="px-6 pb-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold mb-6">Release History</h2>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-base-300 hidden md:block" />

              <div className="space-y-6">
                {CHANGELOG.map((release, i) => (
                  <div key={i} className="relative">
                    {/* Timeline dot */}
                    <div className="absolute left-2.5 top-6 w-3 h-3 rounded-full bg-primary border-2 border-base-100 hidden md:block" />

                    <div className={`md:ml-12 p-6 rounded-2xl border ${VERSION_STYLES[release.type]}`}>
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <span className="text-xl font-bold">v{release.version}</span>
                        <span className="text-sm text-base-content/50">{release.date}</span>
                        {release.type === "major" && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/20 text-primary">
                            Launch
                          </span>
                        )}
                      </div>
                      <ul className="space-y-2">
                        {release.changes.map((change, j) => (
                          <ChangeItem key={j} {...change} />
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Roadmap */}
        <section className="py-16 px-6 bg-base-200/30">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold mb-2">Roadmap</h2>
            <p className="text-base-content/60 mb-8">What we&apos;re working on next</p>

            <div className="grid md:grid-cols-2 gap-6">
              {ROADMAP.map((quarter, i) => (
                <div key={i} className="p-6 rounded-xl bg-base-100 border border-base-300">
                  <h3 className="font-semibold mb-4">{quarter.quarter}</h3>
                  <ul className="space-y-3">
                    {quarter.items.map((item, j) => {
                      const style = STATUS_STYLES[item.status];
                      return (
                        <li key={j} className="flex items-center justify-between gap-3">
                          <span className="text-sm text-base-content/80">{item.text}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
                            {style.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">Want to stay updated?</h2>
            <p className="text-base-content/60 mb-8">
              Follow our progress and get notified about new features.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/products" className="btn btn-primary">
                Explore Products
              </Link>
              <Link href="/trust" className="btn btn-ghost">
                View Transparency
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
