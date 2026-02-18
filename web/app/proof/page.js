"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

/**
 * Proof of Incopiability Page
 * Demonstrates why SafeScoring data cannot be copied by AI or competitors
 */

const PROTECTION_LAYERS = [
  {
    id: "fingerprinting",
    title: "Steganographic Fingerprinting",
    icon: "fingerprint",
    description: "Every API response contains invisible, mathematically unique variations tied to each client.",
    details: [
      "Score variations of ±0.05 per client (imperceptible but traceable)",
      "Unicode homoglyphs in text (visually identical, technically different)",
      "Deterministic array ordering per client",
      "HMAC-SHA256 based, impossible to reverse-engineer without secret key",
    ],
    proof: "If you see our data elsewhere with these exact variations, we can prove which account scraped it.",
    effectiveness: 95,
  },
  {
    id: "honeypots",
    title: "Honeypot Products",
    icon: "trap",
    description: "Fake but realistic products injected into responses. Publishing them = irrefutable proof of copying.",
    details: [
      "30% of clients receive 1-2 honeypot products",
      "Products look 100% real (names, scores, descriptions)",
      "Only SafeScoring knows which products are fake",
      "Each honeypot is tied to a specific client fingerprint",
    ],
    proof: "If a competitor publishes a honeypot, we have legal evidence of data theft.",
    effectiveness: 100,
  },
  {
    id: "temporal",
    title: "Temporal Moat (Historical Data)",
    icon: "clock",
    description: "12+ months of score history cannot be recreated retroactively.",
    details: [
      "Daily score snapshots since launch",
      "Hourly snapshots for critical events",
      "Historical incident correlation",
      "Prediction accuracy tracking over time",
    ],
    proof: "A competitor can copy today's scores, but NOT the evolution over the past year.",
    effectiveness: 100,
  },
  {
    id: "blockchain",
    title: "Proof of Anteriority (Blockchain)",
    icon: "chain",
    description: "Cryptographic commitments published on-chain prove when we evaluated each product.",
    details: [
      "SHA-256 hash of each evaluation",
      "Published on Polygon blockchain",
      "Immutable timestamp proof",
      "Weekly Merkle root commitments",
    ],
    proof: "We can prove in court that our evaluation existed before any copy appeared.",
    effectiveness: 100,
  },
  {
    id: "ratelimit",
    title: "Anti-Scraping Rate Limits",
    icon: "shield",
    description: "Strict limits prevent mass data extraction.",
    details: [
      "30 requests/minute for public APIs",
      "Exponential backoff on violations",
      "10-minute blocks after 3 violations",
      "Redis-backed distributed rate limiting",
    ],
    proof: "Scraping our full database would take months and trigger multiple blocks.",
    effectiveness: 85,
  },
  {
    id: "methodology",
    title: "Proprietary Methodology",
    icon: "brain",
    description: "Our scoring weights and rules are trade secrets that cannot be reverse-engineered.",
    details: [
      "911 norms with custom applicability rules",
      "Pillar weights based on security impact",
      "YESp (imposed by design) unique concept",
      "Multi-level scoring (Essential/Consumer/Full)",
    ],
    proof: "Even with all our data, reproducing accurate scores requires our methodology.",
    effectiveness: 90,
  },
];

const IconMap = {
  fingerprint: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a7.464 7.464 0 01-1.15 3.993m1.989 3.559A11.209 11.209 0 008.25 10.5a3.75 3.75 0 117.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 01-3.6 9.75m6.633-4.596a18.666 18.666 0 01-2.485 5.33" />
    </svg>
  ),
  trap: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  clock: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  chain: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  ),
  shield: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  brain: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  ),
};

function DemoFingerprint() {
  const [demoData, setDemoData] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateDemo = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/proof/demo-fingerprint");
      const data = await res.json();
      setDemoData(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="bg-base-200 rounded-xl p-6 border border-base-300">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <span className="text-primary">Live Demo:</span> See Your Unique Fingerprint
      </h3>
      <p className="text-sm text-base-content/70 mb-4">
        Click the button to see how your API responses are uniquely fingerprinted.
        Each request generates variations specific to your session.
      </p>
      <button
        onClick={generateDemo}
        disabled={loading}
        className="btn btn-primary mb-4"
      >
        {loading ? (
          <span className="loading loading-spinner loading-sm"></span>
        ) : (
          "Generate My Fingerprint Demo"
        )}
      </button>

      {demoData && (
        <div className="space-y-4">
          <div className="bg-base-100 rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2 text-green-500">Your Session ID</h4>
            <code className="text-xs bg-base-300 px-2 py-1 rounded break-all">
              {demoData.sessionId}
            </code>
          </div>

          <div className="bg-base-100 rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2 text-amber-500">Score Variation Applied</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-base-content/60">Original:</span>
                <span className="ml-2 font-mono">{demoData.originalScore}</span>
              </div>
              <div>
                <span className="text-base-content/60">Your Version:</span>
                <span className="ml-2 font-mono text-primary">{demoData.fingerprintedScore}</span>
              </div>
            </div>
            <p className="text-xs text-base-content/50 mt-2">
              Difference: {Math.abs(demoData.fingerprintedScore - demoData.originalScore).toFixed(4)} (invisible to users)
            </p>
          </div>

          <div className="bg-base-100 rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2 text-blue-500">Text Homoglyph Applied</h4>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div>
                <span className="text-base-content/60">Original:</span>
                <span className="ml-2 font-mono">&quot;{demoData.originalText}&quot;</span>
              </div>
              <div>
                <span className="text-base-content/60">Your Version:</span>
                <span className="ml-2 font-mono text-primary">&quot;{demoData.fingerprintedText}&quot;</span>
              </div>
            </div>
            <p className="text-xs text-base-content/50 mt-2">
              Characters modified: {demoData.modifiedPositions?.join(", ") || "positions hidden"}
            </p>
          </div>

          <div className="alert alert-warning">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm">
              This fingerprint is linked to your session. If this exact data appears elsewhere, we know it came from you.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function ProtectionCard({ protection }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-base-100 rounded-xl border border-base-300 overflow-hidden hover:border-primary/50 transition-all">
      <div
        className="p-6 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            {IconMap[protection.icon]}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-lg">{protection.title}</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-base-content/50">Effectiveness</span>
                <div className="badge badge-primary">{protection.effectiveness}%</div>
              </div>
            </div>
            <p className="text-sm text-base-content/70">{protection.description}</p>
          </div>
          <button className="btn btn-ghost btn-sm btn-circle">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className={`w-5 h-5 transition-transform ${expanded ? "rotate-180" : ""}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-6 pb-6 pt-0 border-t border-base-200">
          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <div>
              <h4 className="font-semibold text-sm mb-3 text-primary">How It Works</h4>
              <ul className="space-y-2">
                {protection.details.map((detail, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                    <span className="text-base-content/80">{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3 text-amber-500">Legal Proof</h4>
              <p className="text-sm text-base-content/70 bg-base-200 rounded-lg p-4">
                {protection.proof}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProofPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Fetch protection stats
    fetch("/api/proof/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  return (
    <>
      <Header />
      <main className="min-h-screen pt-20 pb-16 px-4 hero-bg">
        <div className="max-w-5xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 text-red-500 text-sm font-medium mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
              </svg>
              Anti-Copy Protection Active
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Why SafeScoring Data is{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-500">
                Incopiable
              </span>
            </h1>
            <p className="text-lg text-base-content/60 max-w-2xl mx-auto">
              Our multi-layered protection system makes copying our data not just difficult,
              but legally traceable. Here&apos;s the technical proof.
            </p>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              <div className="bg-base-100 rounded-xl p-4 border border-base-300 text-center">
                <div className="text-3xl font-bold text-primary">{stats.protectionLayers || 6}</div>
                <div className="text-sm text-base-content/60">Protection Layers</div>
              </div>
              <div className="bg-base-100 rounded-xl p-4 border border-base-300 text-center">
                <div className="text-3xl font-bold text-green-500">{stats.activeHoneypots || "5+"}</div>
                <div className="text-sm text-base-content/60">Active Honeypots</div>
              </div>
              <div className="bg-base-100 rounded-xl p-4 border border-base-300 text-center">
                <div className="text-3xl font-bold text-amber-500">{stats.historicalDays || "365+"}</div>
                <div className="text-sm text-base-content/60">Days of History</div>
              </div>
              <div className="bg-base-100 rounded-xl p-4 border border-base-300 text-center">
                <div className="text-3xl font-bold text-blue-500">{stats.blockchainCommits || "52+"}</div>
                <div className="text-sm text-base-content/60">Blockchain Proofs</div>
              </div>
            </div>
          )}

          {/* Demo */}
          <div className="mb-12">
            <DemoFingerprint />
          </div>

          {/* Protection Layers */}
          <h2 className="text-2xl font-bold mb-6">6 Layers of Protection</h2>
          <div className="space-y-4 mb-12">
            {PROTECTION_LAYERS.map((protection) => (
              <ProtectionCard key={protection.id} protection={protection} />
            ))}
          </div>

          {/* Why AI Cannot Copy */}
          <div className="bg-gradient-to-br from-primary/10 via-base-100 to-amber-500/10 rounded-2xl p-8 border border-primary/20 mb-12">
            <h2 className="text-2xl font-bold mb-6">Why AI Cannot Reproduce Our Data</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-base-100/80 backdrop-blur rounded-xl p-5">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
                <h3 className="font-semibold mb-2">No Training Data</h3>
                <p className="text-sm text-base-content/70">
                  Our data is not in any public training dataset. AI cannot &quot;know&quot; our scores without scraping.
                </p>
              </div>
              <div className="bg-base-100/80 backdrop-blur rounded-xl p-5">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold mb-2">Temporal Impossibility</h3>
                <p className="text-sm text-base-content/70">
                  12+ months of score evolution cannot be generated. History is our strongest moat.
                </p>
              </div>
              <div className="bg-base-100/80 backdrop-blur rounded-xl p-5">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500 mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <h3 className="font-semibold mb-2">Honeypot Traps</h3>
                <p className="text-sm text-base-content/70">
                  Any AI trained on our data will reproduce honeypots, proving copyright infringement.
                </p>
              </div>
            </div>
          </div>

          {/* Legal Notice */}
          <div className="bg-base-200 rounded-xl p-6 border border-base-300">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-primary">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              Legal Notice
            </h3>
            <p className="text-sm text-base-content/70 mb-4">
              SafeScoring data is protected by copyright and database rights under EU Directive 96/9/EC.
              Unauthorized reproduction, scraping, or redistribution is prohibited and will be prosecuted.
            </p>
            <p className="text-sm text-base-content/70">
              Our technical protection measures (fingerprinting, honeypots, blockchain proofs) provide
              irrefutable evidence for legal proceedings against data theft.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/tos" className="btn btn-sm btn-ghost">
                Terms of Service
              </Link>
              <Link href="/legal" className="btn btn-sm btn-ghost">
                Legal Information
              </Link>
              <a href="mailto:legal@safescoring.io" className="btn btn-sm btn-ghost">
                Report Infringement
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
