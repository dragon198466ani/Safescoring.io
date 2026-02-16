"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import config from "@/config";
import { useNormStats } from "@/libs/NormStatsProvider";

const monitoringTiers = [
  {
    id: "starter",
    name: "Starter",
    price: 990,
    priceYearly: 790,
    description: "For emerging projects seeking credibility",
    features: [
      "Full SAFE evaluation (all security norms)",
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
    id: "assessed",
    name: "Assessed",
    price: 2990,
    priceYearly: 2490,
    description: "For established projects ready to demonstrate security",
    features: [
      "Everything in Starter",
      "Assessed Badge (animated)",
      "Monthly re-evaluation",
      "Assessed badge in directory listing",
      "Detailed improvement roadmap",
      "Dedicated account manager",
      "Press release template",
    ],
    badge: "assessed",
    cta: "Get Assessed",
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 9990,
    priceYearly: 7990,
    description: "For protocols and institutions requiring the highest standard",
    features: [
      "Everything in Assessed",
      "Enterprise Badge (premium)",
      "Weekly monitoring & alerts",
      "Custom scoring criteria",
      "White-label reports",
      "API access for integrations",
      "Incident response support",
      "Detailed evaluation reports",
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
    assessed: (
      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg border border-green-500/30">
        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center animate-pulse">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <span className="text-sm font-bold text-green-400">SAFE Assessed</span>
          <span className="text-xs text-base-content/50 ml-2">SAFE Scored</span>
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
          <span className="text-xs text-base-content/50 ml-2">SAFE Scored</span>
        </div>
      </div>
    ),
  };
  return badges[type];
};

const testimonials = [];

export default function CertificationPage() {
  const [annual, setAnnual] = useState(true);
  const normStats = useNormStats();

  const stats = [
    { value: "20%", label: "of Top 100 DeFi hacks hit audited projects (Halborn)" },
    { value: String(normStats?.totalNorms || "\u2014"), label: "security norms evaluated" },
    { value: `${normStats?.totalProducts || "\u2014"}+`, label: "products already scored" },
    { value: "Open", label: "transparent methodology" },
  ];

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 hero-bg">
        <section className="max-w-7xl mx-auto px-6 mb-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              For Crypto Projects & Protocols
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Get <span className="text-primary">SAFE Monitored</span>
            </h1>
            <p className="text-xl text-base-content/70 max-w-2xl mx-auto mb-8">
              Showcase your security evaluation. Build transparency with continuous monitoring that complements traditional audits.
            </p>
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 max-w-2xl mx-auto mb-4">
              <p className="text-xs text-base-content/60">
                <span className="font-semibold text-warning">Important:</span> SAFE Monitoring is a continuous evaluation service, not a security guarantee, endorsement, or accredited certification. Badges indicate ongoing evaluation by SafeScoring, not that a product is safe from all threats. Evaluations complement but do not replace professional security audits. SafeScoring is not a licensed security auditor or accredited certifying body (COFRAC/ISO 17021). Monitoring has no influence on SAFE scores — monitored and non-monitored products are evaluated with identical methodology and criteria.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              {stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-base-content/60">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-base-200 py-16 mb-20">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-center mb-12">Why SAFE Monitoring?</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-base-100 rounded-xl p-6 border border-base-300">
                <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Audits + Continuous Monitoring</h3>
                <p className="text-base-content/70">
                  According to Halborn, 20% of the Top 100 DeFi hacks hit audited projects. Audits check code, not operational security, backup procedures, or real-world resilience.
                </p>
              </div>
              <div className="bg-base-100 rounded-xl p-6 border border-base-300">
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">{normStats?.totalNorms || "\u2014"} Security Norms</h3>
                <p className="text-base-content/70">
                  We evaluate cryptography, adversity resistance, reliability, AND usability across a broad set of security norms.
                </p>
              </div>
              <div className="bg-base-100 rounded-xl p-6 border border-base-300">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Build User Trust</h3>
                <p className="text-base-content/70">
                  Display your SAFE score and badge on your website. Users increasingly look for security evaluations before depositing funds.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Monitoring Plans</h2>
            <p className="text-base-content/70 mb-6">Choose the level that fits your project</p>
            <div className="flex items-center justify-center gap-3">
              <span className={`text-sm ${!annual ? 'text-base-content' : 'text-base-content/50'}`}>Monthly</span>
              <input type="checkbox" className="toggle toggle-primary" checked={annual} onChange={() => setAnnual(!annual)} />
              <span className={`text-sm ${annual ? 'text-base-content' : 'text-base-content/50'}`}>
                Annual <span className="text-green-500 font-medium">(Save 20%)</span>
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {monitoringTiers.map((tier) => (
              <div key={tier.id} className={`relative rounded-2xl p-8 ${tier.popular ? 'bg-gradient-to-b from-primary/10 to-base-100 border-2 border-primary shadow-lg shadow-primary/10' : 'bg-base-200 border border-base-300'}`}>
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-content px-4 py-1 rounded-full text-sm font-medium">Most Popular</span>
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
                  <p className="text-sm text-base-content/60 mb-4">{tier.description}</p>
                  <div className="flex items-end justify-center gap-1">
                    <span className="text-4xl font-bold">${annual ? tier.priceYearly : tier.price}</span>
                    <span className="text-base-content/60 mb-1">/year</span>
                  </div>
                  {annual && tier.price !== tier.priceYearly && (
                    <div className="text-sm text-green-500 mt-1">Save ${(tier.price - tier.priceYearly) * 12 / 12}/year</div>
                  )}
                </div>
                <div className="flex justify-center mb-6"><BadgePreview type={tier.badge} /></div>
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
                <a href={`mailto:partners@safescoring.io?subject=SAFE%20Monitoring%20${encodeURIComponent(tier.name)}%20—%20Application`} className={`btn w-full ${tier.popular ? 'btn-primary' : 'btn-outline'}`}>{tier.cta}</a>
                <p className="text-xs text-base-content/40 mt-2 text-center">Apply via email — we&apos;ll get back within 48h</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-base-200 py-16 mb-20">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-center mb-12">How SAFE Monitoring Works</h2>
            <div className="space-y-8">
              {[
                { step: 1, title: "Apply", desc: "Submit your project details and choose your plan" },
                { step: 2, title: "Evaluation", desc: `Our AI evaluates your product against ${normStats?.totalNorms || "all"} security norms` },
                { step: 3, title: "Review", desc: "Our team reviews results and prepares your improvement roadmap" },
                { step: 4, title: "Monitoring", desc: "Receive your badge, score, and public listing within 7 days" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-6">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-content font-bold shrink-0">{item.step}</div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                    <p className="text-base-content/70">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-6 mb-20">
          <div className="rounded-2xl bg-base-200 border border-base-300 p-8 md:p-12 text-center">
            <div className="badge badge-primary badge-lg mb-4">Coming Soon</div>
            <h2 className="text-2xl font-bold mb-4">Monitoring Program Launching Soon</h2>
            <p className="text-base-content/70 mb-6 max-w-lg mx-auto">
              We&apos;re finalizing the monitoring process. Be among the first projects to get SAFE monitored and display your security badge.
            </p>
            <a href="mailto:partners@safescoring.io" className="btn btn-outline btn-primary">Get Notified at Launch</a>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-6">
          <div className="bg-gradient-to-r from-primary/20 to-base-200 rounded-2xl p-8 md:p-12 text-center border border-primary/20">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Showcase Your Evaluation?</h2>
            <p className="text-base-content/70 mb-8 max-w-xl mx-auto">
              Be among the first projects to get SAFE monitored. Get in touch to discuss your needs.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="mailto:partners@safescoring.io" className="btn btn-primary btn-lg">Contact Us</a>
              <Link href="/methodology" className="btn btn-outline btn-lg">Learn About SAFE</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
