"use client";

import { useState } from "react";
import { useGlobalStats } from "@/libs/StatsProvider";

/**
 * MethodologyProof - Comprehensive AI-proof methodology explanation
 *
 * Displays all the ways SafeScoring methodology cannot be replicated by AI
 */
export default function MethodologyProof({ className = "" }) {
  const [activeTab, setActiveTab] = useState("overview");
  const { stats = {} } = useGlobalStats() || {};

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "blockchain", label: "Blockchain Proof" },
    { id: "community", label: "Community Verification" },
    { id: "data", label: "Data Integrity" },
  ];

  return (
    <div className={`rounded-2xl bg-base-200 border border-base-300 overflow-hidden ${className}`}>
      {/* Header with gradient */}
      <div className="p-6 bg-gradient-to-r from-green-500/10 via-amber-500/10 to-purple-500/10 border-b border-base-300">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-purple-500/20 border border-base-300">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-base-content">AI-Proof Methodology</h2>
            <p className="text-base-content/60 mt-1">
              Why SafeScoring evaluations cannot be replicated by artificial intelligence
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-base-300 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-base-content/60 hover:text-base-content hover:bg-base-300/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-6">
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "blockchain" && <BlockchainTab />}
        {activeTab === "community" && <CommunityTab />}
        {activeTab === "data" && <DataIntegrityTab />}
      </div>
    </div>
  );
}

/**
 * Overview tab - Summary of AI-proof features
 */
function OverviewTab() {
  const { stats = {} } = useGlobalStats() || {};
  const features = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      ),
      title: "Blockchain Timestamps",
      description: "Every score is permanently recorded on-chain with an immutable timestamp.",
      color: "emerald",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: `${stats?.totalNorms?.toLocaleString() || "2376"} Security Norms`,
      description: "Comprehensive evaluation across all product categories with consistent methodology.",
      color: "blue",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "2+ Years of Data",
      description: "Historical evaluations that cannot be retroactively created.",
      color: "purple",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: "Community Consensus",
      description: "Corrections verified by real users with wallet-weighted votes. AI cannot fake verified accounts.",
      color: "amber",
    },
  ];

  const colorClasses = {
    emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    blue: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    purple: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    amber: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((feature, i) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-base-300/50 border border-base-300 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg border ${colorClasses[feature.color]}`}>
                {feature.icon}
              </div>
              <div>
                <h3 className="font-semibold text-base-content">{feature.title}</h3>
                <p className="text-sm text-base-content/60 mt-1">{feature.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th className="text-base-content/70">Feature</th>
              <th className="text-center text-emerald-400">SafeScoring</th>
              <th className="text-center text-red-400">AI Competitor</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Historical Data</td>
              <td className="text-center">
                <span className="text-emerald-400">2+ years</span>
              </td>
              <td className="text-center">
                <span className="text-red-400">0 days</span>
              </td>
            </tr>
            <tr>
              <td>Blockchain Proofs</td>
              <td className="text-center">
                <svg className="w-5 h-5 text-emerald-400 inline" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </td>
              <td className="text-center">
                <svg className="w-5 h-5 text-red-400 inline" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </td>
            </tr>
            <tr>
              <td>Verified Predictions</td>
              <td className="text-center">
                <span className="text-emerald-400">1,200+</span>
              </td>
              <td className="text-center">
                <span className="text-red-400">0</span>
              </td>
            </tr>
            <tr>
              <td>Human Corrections</td>
              <td className="text-center">
                <span className="text-emerald-400">Thousands</span>
              </td>
              <td className="text-center">
                <span className="text-red-400">None</span>
              </td>
            </tr>
            <tr>
              <td>Wallet-Verified Votes</td>
              <td className="text-center">
                <svg className="w-5 h-5 text-emerald-400 inline" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </td>
              <td className="text-center">
                <svg className="w-5 h-5 text-red-400 inline" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </td>
            </tr>
            <tr>
              <td>$SAFE Staking Weight</td>
              <td className="text-center">
                <span className="text-emerald-400">Up to 2.5x</span>
              </td>
              <td className="text-center">
                <span className="text-red-400">N/A</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Blockchain proof tab
 */
function BlockchainTab() {
  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        <h3 className="font-semibold text-emerald-400 mb-2">How Blockchain Verification Works</h3>
        <p className="text-sm text-base-content/70">
          Every SafeScoring evaluation is cryptographically hashed and published to the blockchain.
          This creates an immutable timestamp that proves when the evaluation was made.
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-base-content">Verification Process</h4>
        <div className="space-y-3">
          {[
            { step: 1, title: "Evaluation Created", desc: "Product is evaluated using SAFE methodology" },
            { step: 2, title: "Hash Generated", desc: "SHA-256 hash of evaluation data is computed" },
            { step: 3, title: "Published On-Chain", desc: "Hash is recorded on Polygon/Ethereum blockchain" },
            { step: 4, title: "Immutable Record", desc: "Timestamp cannot be modified or deleted" },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                {item.step}
              </div>
              <div>
                <h5 className="font-medium text-base-content">{item.title}</h5>
                <p className="text-sm text-base-content/60">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-base-300/50 border border-base-300">
        <h4 className="font-medium text-base-content mb-2">Smart Contract</h4>
        <code className="text-xs text-primary bg-base-300 px-2 py-1 rounded block overflow-x-auto">
          SafeScoreRegistry.sol - Polygon Network
        </code>
        <p className="text-xs text-base-content/50 mt-2">
          View on PolygonScan to verify any score independently.
        </p>
      </div>
    </div>
  );
}

/**
 * Community verification tab - How users can participate and earn rewards
 */
function CommunityTab() {
  return (
    <div className="space-y-6">
      {/* Introduction */}
      <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
        <h3 className="font-semibold text-primary mb-2">Gagnez des récompenses</h3>
        <p className="text-sm text-base-content/70">
          Aidez à améliorer les évaluations et gagnez des points vers l'airdrop $SAFE.
          Plus vous contribuez, plus votre influence grandit.
        </p>
      </div>

      {/* How to participate */}
      <div className="space-y-4">
        <h4 className="font-medium text-base-content">Comment participer</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              icon: "🔍",
              title: "Signaler une erreur",
              desc: "Vous voyez une info incorrecte ? Proposez une correction avec une preuve (lien, screenshot).",
              reward: "+50 pts si validée"
            },
            {
              icon: "✅",
              title: "Voter sur les corrections",
              desc: "Validez ou rejetez les corrections des autres. Votez honnêtement pour garder votre réputation.",
              reward: "+5 pts par vote"
            },
            {
              icon: "🦊",
              title: "Connecter votre wallet",
              desc: "Liez votre wallet crypto pour augmenter votre poids de vote et prouver votre sérieux.",
              reward: "Vote x1.5"
            },
            {
              icon: "💎",
              title: "Staker $SAFE",
              desc: "Stakez des tokens $SAFE pour avoir encore plus d'influence sur les décisions.",
              reward: "Jusqu'à x2.5"
            },
          ].map((item, i) => (
            <div key={i} className="p-4 rounded-xl bg-base-300/50 border border-base-300">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1">
                  <h5 className="font-medium text-base-content">{item.title}</h5>
                  <p className="text-sm text-base-content/60 mt-1">{item.desc}</p>
                  <span className="inline-block mt-2 text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">
                    {item.reward}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Your influence */}
      <div className="p-4 rounded-xl bg-base-300/50 border border-base-300">
        <h4 className="font-medium text-base-content mb-3">Votre poids de vote</h4>
        <p className="text-sm text-base-content/60 mb-4">
          Plus vous êtes fiable, plus votre vote compte :
        </p>
        <div className="space-y-2">
          {[
            { label: "Compte email", weight: "0.3x", color: "text-base-content/60", icon: "📧" },
            { label: "Compte > 30 jours", weight: "0.5x", color: "text-base-content/80", icon: "📅" },
            { label: "5+ corrections validées", weight: "0.7x", color: "text-amber-400", icon: "⭐" },
            { label: "Wallet connecté", weight: "1.0x", color: "text-purple-400", icon: "🦊" },
            { label: "Wallet actif (DeFi)", weight: "1.5x", color: "text-emerald-400", icon: "💚" },
            { label: "1000+ $SAFE stakés", weight: "2.5x", color: "text-primary font-bold", icon: "💎" },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className={`flex items-center gap-2 ${item.color}`}>
                <span>{item.icon}</span>
                {item.label}
              </span>
              <span className={`font-mono font-bold ${item.color}`}>{item.weight}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rewards */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-primary/10 border border-amber-500/20">
        <h4 className="font-medium text-amber-400 mb-3">🎁 Récompenses</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="text-center p-3 bg-base-300/50 rounded-lg">
            <div className="text-2xl mb-1">🏆</div>
            <div className="font-medium">Top contributeurs</div>
            <div className="text-xs text-base-content/60">Badge exclusif + bonus</div>
          </div>
          <div className="text-center p-3 bg-base-300/50 rounded-lg">
            <div className="text-2xl mb-1">🪂</div>
            <div className="font-medium">Airdrop $SAFE</div>
            <div className="text-xs text-base-content/60">Points convertis en tokens</div>
          </div>
          <div className="text-center p-3 bg-base-300/50 rounded-lg">
            <div className="text-2xl mb-1">👑</div>
            <div className="font-medium">Accès Premium</div>
            <div className="text-xs text-base-content/60">Gratuit pour les experts</div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center pt-4">
        <a href="/products" className="btn btn-primary">
          Commencer à contribuer
        </a>
        <p className="text-xs text-base-content/50 mt-3">
          Rendez-vous sur n'importe quelle fiche produit pour signaler une erreur ou voter
        </p>
      </div>
    </div>
  );
}

/**
 * Data integrity tab
 */
function DataIntegrityTab() {
  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
        <h3 className="font-semibold text-purple-400 mb-2">Data Protection</h3>
        <p className="text-sm text-base-content/70">
          Our data includes invisible markers that prove origin if copied. We can legally
          demonstrate data theft with cryptographic evidence.
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-base-content">Protection Layers</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: "Steganographic Fingerprinting",
              desc: "Invisible variations in scores and text that identify each data recipient",
              icon: "fingerprint",
            },
            {
              title: "Honeypot Detection",
              desc: "Fake products that prove copying if published by competitors",
              icon: "trap",
            },
            {
              title: "Watermarked Responses",
              desc: "Every API response contains traceable client identification",
              icon: "watermark",
            },
            {
              title: "Cryptographic Proofs",
              desc: "SHA-256 hashes committed to blockchain for legal evidence",
              icon: "lock",
            },
          ].map((item, i) => (
            <div key={i} className="p-4 rounded-lg bg-base-300/50 border border-base-300">
              <h5 className="font-medium text-base-content">{item.title}</h5>
              <p className="text-sm text-base-content/60 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
        <h4 className="font-medium text-red-400 mb-2">Legal Notice</h4>
        <p className="text-sm text-base-content/70">
          Unauthorized copying of SafeScoring data will result in legal action. Our fingerprinting
          technology provides irrefutable evidence of data origin in court.
        </p>
      </div>
    </div>
  );
}

/**
 * Compact badge version for embedding
 */
export function AIProofBadge({ className = "" }) {
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500/10 to-purple-500/10 border border-emerald-500/20 ${className}`}
      title="This methodology is protected by blockchain proofs and cannot be replicated by AI"
    >
      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      <span className="text-sm font-medium text-emerald-400">AI-Proof Methodology</span>
    </div>
  );
}
