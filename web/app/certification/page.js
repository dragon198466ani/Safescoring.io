"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { useGlobalStats } from "@/libs/StatsProvider";
import Footer from "@/components/Footer";

const certificationTiers = [
  {
    id: "starter",
    name: "Starter",
    price: 990,
    priceYearly: 790,
    description: "For emerging projects seeking credibility",
    features: [
      "Full SAFE evaluation ({totalNorms} norms)",
      "Public score on SafeScoring.io",
      "Starter Badge for your website",
      "Quarterly re-evaluation",
      "Basic improvement roadmap",
    ],
    badge: "starter",
    cta: "Get Started",
    popular: false,
  },
  {
    id: "verified",
    name: "Reviewed",
    price: 2990,
    priceYearly: 2490,
    description: "For established projects ready to showcase their evaluation",
    features: [
      "Everything in Starter",
      "Reviewed Badge (animated)",
      "Monthly re-evaluation",
      "Priority listing in directory",
      "Detailed improvement roadmap",
      "Dedicated account manager",
      "Press release template",
    ],
    badge: "verified",
    cta: "Get Reviewed",
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 9990,
    priceYearly: 7990,
    description: "For protocols and institutions requiring the highest standard",
    features: [
      "Everything in Reviewed",
      "Enterprise Badge (premium)",
      "Weekly monitoring & alerts",
      "Custom scoring criteria",
      "White-label reports",
      "API access for integrations",
      "Incident response support",
      "Board-ready security reports",
      "Multi-product discount",
    ],
    badge: "enterprise",
    cta: "Contact Sales",
    popular: false,
  },
];

const BadgePreview = ({ type }) => {
  const badges = {
    starter: (
      <div className="flex items-center gap-2 px-3 py-2 bg-base-300 rounded-lg border border-base-content/10">
        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <span className="text-sm font-medium">SAFE Evaluated</span>
      </div>
    ),
    verified: (
      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg border border-green-500/30">
        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center animate-pulse">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <span className="text-sm font-bold text-green-400">SAFE Reviewed</span>
          <span className="text-xs text-base-content/50 ml-2">Score: 78%</span>
        </div>
      </div>
    ),
    enterprise: (
      <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 rounded-lg border border-amber-500/50 shadow-lg shadow-amber-500/10">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
          <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
        <div>
          <span className="text-sm font-bold text-amber-400">SAFE Enterprise</span>
          <span className="text-xs text-base-content/50 ml-2">Score: 85%</span>
        </div>
      </div>
    ),
  };
  return badges[type];
};

const stats = [
  { value: "~50%", label: "of compromised projects had audits, according to industry reports" },
  { value: "{totalNorms}", label: "security norms evaluated" },
  { value: "100+", label: "products already scored" },
  { value: "Published", label: "evaluation criteria" },
];

const testimonials = [
  {
    quote: "The SAFE evaluation gave our users confidence. Our TVL increased 40% after displaying the badge.",
    author: "DeFi Protocol Founder",
    role: "Series A, $50M TVL",
  },
  {
    quote: "Finally, a security rating that covers both our hardware AND our companion app with the same rigor.",
    author: "Hardware Wallet CEO",
    role: "Top 10 Hardware Wallet",
  },
];

// Claim tiers - Care Economy pricing for "SafeScoring Evaluated" badge
const claimTiers = [
  {
    id: "standard",
    name: "Standard",
    price: 49,
    period: "year",
    description: "For projects that want to show they care about security",
    features: [
      "Digital badge for your website",
      "Listed as 'Scored by SafeScoring'",
      "Annual re-evaluation",
      "Public score display",
    ],
    cta: "Claim Standard",
    popular: false,
    color: "green",
  },
  {
    id: "verified",
    name: "Reviewed",
    price: 199,
    period: "year",
    description: "For projects ready to showcase their evaluation results",
    features: [
      "Everything in Standard",
      "Reviewed mark on profile",
      "Priority re-evaluation (quarterly)",
      "Improvement roadmap",
      "Email support",
    ],
    cta: "Claim Reviewed",
    popular: true,
    color: "primary",
  },
  {
    id: "premium",
    name: "Comprehensive",
    price: 499,
    period: "year",
    description: "Comprehensive review with physical and on-chain documentation",
    features: [
      "Everything in Reviewed",
      "Physical evaluation report shipped worldwide",
      "On-chain NFT evaluation badge",
      "Custom detailed security report",
      "Dedicated account manager",
      "Monthly re-evaluation",
    ],
    cta: "Claim Comprehensive",
    popular: false,
    color: "amber",
  },
];

// Example evaluated products
const certifiedExamples = [
  {
    name: "Ledger Nano X",
    category: "Hardware Wallet",
    score: 82,
    tier: "verified",
    badge: "SAFE Reviewed",
  },
  {
    name: "Aave V3",
    category: "DeFi Protocol",
    score: 76,
    tier: "standard",
    badge: "SAFE Scored",
  },
  {
    name: "Trezor Model T",
    category: "Hardware Wallet",
    score: 79,
    tier: "premium",
    badge: "SAFE Comprehensive",
  },
  {
    name: "Uniswap V3",
    category: "DEX",
    score: 71,
    tier: "verified",
    badge: "SAFE Reviewed",
  },
];

// FAQ items
const certFaqItems = [
  {
    q: "What is the minimum score required to claim an evaluation badge?",
    a: "Your product needs a minimum SAFE score of 50 to be eligible for an evaluation badge. If your score is below 50, we provide a detailed improvement roadmap to help you reach eligibility.",
  },
  {
    q: "What is the difference between Evaluation Plans and Claim tiers?",
    a: "Evaluation Plans (Starter/Reviewed/Enterprise) are comprehensive evaluation packages for projects wanting full SAFE analysis. Claim tiers (Standard/Reviewed/Premium) allow already-scored projects to officially claim and display their 'SafeScoring Evaluated' badge on their website and materials.",
  },
  {
    q: "How long does the claim review process take?",
    a: "Our team reviews claims within 48 hours. Once approved, you'll receive your digital badge immediately. Physical evaluation reports (Comprehensive tier) ship within 5-7 business days.",
  },
  {
    q: "Can I upgrade my claim tier later?",
    a: "Yes, you can upgrade at any time. You'll only pay the difference for the remaining period. Downgrades take effect at the next renewal date.",
  },
  {
    q: "What happens when my evaluation badge expires?",
    a: "Evaluation badges are valid for one year. We send renewal reminders 30 days before expiration. If not renewed, your badge and listing are deactivated but your score history remains.",
  },
  {
    q: "Do I get an NFT with the Premium tier?",
    a: "Yes, Premium tier includes an on-chain NFT evaluation badge minted on Ethereum. This provides immutable documentation of your security evaluation that can be referenced by anyone.",
  },
];

export default function CertificationPage() {
  const [annual, setAnnual] = useState(true);
  const { stats: globalStats } = useGlobalStats();

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16">
        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-6 mb-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              For Crypto Projects & Protocols
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Get <span className="text-primary">SAFE Evaluated</span>
            </h1>
            <p className="text-xl text-base-content/70 max-w-2xl mx-auto mb-8">
              Showcase your evaluation. Display your evaluation results. According to industry reports, many compromised projects had existing audits -- a comprehensive evaluation covers more ground.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              {stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl font-bold text-primary">{stat.value.replace("{totalNorms}", globalStats.totalNorms)}</div>
                  <div className="text-sm text-base-content/60">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Evaluation Section */}
        <section className="bg-base-200 py-16 mb-20">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-center mb-12">Why a SAFE Evaluation?</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-base-100 rounded-xl p-6 border border-base-300">
                <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Audits Are Not Enough</h3>
                <p className="text-base-content/70">
                  According to industry reports, a significant portion of compromised DeFi projects had been audited. Audits check code, but may not cover operational security, backup procedures, or broader resilience factors.
                </p>
              </div>
              <div className="bg-base-100 rounded-xl p-6 border border-base-300">
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">{globalStats.totalNorms} Security Norms</h3>
                <p className="text-base-content/70">
                  We evaluate cryptography, adversity resistance, reliability, AND usability. One of the most comprehensive security assessments in crypto.
                </p>
              </div>
              <div className="bg-base-100 rounded-xl p-6 border border-base-300">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Display Your Evaluation Results</h3>
                <p className="text-base-content/70">
                  Display your SAFE score and badge on your website. Users can review scores before depositing. Evaluated projects may see increased user confidence.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="max-w-6xl mx-auto px-6 mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Evaluation Plans</h2>
            <p className="text-base-content/70 mb-6">Choose the level that fits your project</p>

            {/* Annual/Monthly Toggle */}
            <div className="flex items-center justify-center gap-3">
              <span className={`text-sm ${!annual ? 'text-base-content' : 'text-base-content/50'}`}>Monthly</span>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={annual}
                onChange={() => setAnnual(!annual)}
              />
              <span className={`text-sm ${annual ? 'text-base-content' : 'text-base-content/50'}`}>
                Annual <span className="text-green-500 font-medium">(Save 20%)</span>
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {certificationTiers.map((tier) => (
              <div
                key={tier.id}
                className={`relative rounded-2xl p-8 ${
                  tier.popular
                    ? 'bg-gradient-to-b from-primary/10 to-base-100 border-2 border-primary shadow-lg shadow-primary/10'
                    : 'bg-base-200 border border-base-300'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-content px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
                  <p className="text-sm text-base-content/60 mb-4">{tier.description}</p>
                  <div className="flex items-end justify-center gap-1">
                    <span className="text-4xl font-bold">
                      ${annual ? tier.priceYearly : tier.price}
                    </span>
                    <span className="text-base-content/60 mb-1">/year</span>
                  </div>
                  {annual && tier.price !== tier.priceYearly && (
                    <div className="text-sm text-green-500 mt-1">
                      Save ${(tier.price - tier.priceYearly) * 12 / 12}/year
                    </div>
                  )}
                </div>

                {/* Badge Preview */}
                <div className="flex justify-center mb-6">
                  <BadgePreview type={tier.badge} />
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm">{feature.replace("{totalNorms}", globalStats.totalNorms)}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={tier.id === 'enterprise' ? '/contact?plan=enterprise' : `/claim?plan=${tier.id}`}
                  className={`btn w-full ${tier.popular ? 'btn-primary' : 'btn-outline'}`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-base-200 py-16 mb-20">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-center mb-12">How the Evaluation Works</h2>
            <div className="space-y-8">
              {[
                { step: 1, title: "Apply", desc: "Submit your project details and choose your plan" },
                { step: 2, title: "Evaluation", desc: `Our AI evaluates your product against ${globalStats.totalNorms} security norms` },
                { step: 3, title: "Review", desc: "Our team verifies results and prepares your improvement roadmap" },
                { step: 4, title: "Results", desc: "Receive your badge, score, and public listing within 7 days" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-6">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-content font-bold shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                    <p className="text-base-content/70">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="max-w-4xl mx-auto px-6 mb-20">
          <h2 className="text-2xl font-bold text-center mb-12">What Projects Say</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-base-200 rounded-xl p-6 border border-base-300">
                <svg className="w-8 h-8 text-primary/30 mb-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <p className="text-lg mb-4 italic">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <div className="font-medium">{t.author}</div>
                  <div className="text-sm text-base-content/60">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Claim Your Badge - Care Economy Tiers */}
        <section className="max-w-6xl mx-auto px-6 mb-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-full text-green-500 text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Already Scored? Claim Your Badge
            </div>
            <h2 className="text-3xl font-bold mb-4">Claim &ldquo;SafeScoring Evaluated&rdquo;</h2>
            <p className="text-base-content/70 max-w-2xl mx-auto">
              If your product is already scored on SafeScoring, claim your official evaluation badge to display on your website and marketing materials.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {claimTiers.map((tier) => (
              <div
                key={tier.id}
                className={`relative rounded-2xl p-8 ${
                  tier.popular
                    ? 'bg-gradient-to-b from-primary/10 to-base-100 border-2 border-primary shadow-lg shadow-primary/10'
                    : 'bg-base-200 border border-base-300'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-content px-4 py-1 rounded-full text-sm font-medium">
                      Best Value
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
                  <p className="text-sm text-base-content/60 mb-4">{tier.description}</p>
                  <div className="flex items-end justify-center gap-1">
                    <span className="text-4xl font-bold">${tier.price}</span>
                    <span className="text-base-content/60 mb-1">/{tier.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/api/certification/claim?tier=${tier.id}`}
                  className={`btn w-full ${tier.popular ? 'btn-primary' : 'btn-outline'}`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Example Evaluated Products */}
        <section className="bg-base-200 py-16 mb-20">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-center mb-4">Evaluated Products</h2>
            <p className="text-base-content/70 text-center mb-12 max-w-xl mx-auto">
              These projects have claimed their SafeScoring evaluation badge and display their results publicly.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {certifiedExamples.map((product, i) => (
                <div key={i} className="bg-base-100 rounded-xl p-5 border border-base-300 hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-base-content/50 uppercase tracking-wider">{product.category}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      product.tier === 'premium'
                        ? 'bg-amber-500/10 text-amber-500'
                        : product.tier === 'verified'
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-base-content/10 text-base-content/60'
                    }`}>
                      {product.badge}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-full bg-base-300 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          product.score >= 80 ? 'bg-green-500' : product.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${product.score}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-base-content/80 shrink-0">{product.score}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="max-w-4xl mx-auto px-6 mb-20">
          <h2 className="text-2xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {certFaqItems.map((item, i) => (
              <div key={i} className="collapse collapse-arrow bg-base-200 border border-base-300 rounded-xl">
                <input type="radio" name="cert-faq" defaultChecked={i === 0} />
                <div className="collapse-title text-lg font-medium">
                  {item.q}
                </div>
                <div className="collapse-content">
                  <p className="text-base-content/70 pt-2">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-6">
          <div className="bg-gradient-to-r from-primary/20 to-base-200 rounded-2xl p-8 md:p-12 text-center border border-primary/20">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Showcase Your Evaluation?</h2>
            <p className="text-base-content/70 mb-8 max-w-xl mx-auto">
              Join 100+ projects that display their SAFE score. Start your evaluation today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/claim" className="btn btn-primary btn-lg">
                Start Evaluation
              </Link>
              <Link href="/contact" className="btn btn-outline btn-lg">
                Talk to Sales
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
