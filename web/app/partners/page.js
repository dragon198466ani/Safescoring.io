import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PartnerForm from "@/components/PartnerForm";

export const metadata = {
  title: "Partners & Integrations | SafeScoring",
  description: "Partner with SafeScoring to integrate security ratings into your crypto product. API access, white-label solutions, and affiliate programs.",
  keywords: "crypto security partnership, SafeScoring integration, blockchain security API partner",
};

const partnerTypes = [
  {
    title: "Wallet Providers",
    icon: "💼",
    description: "Show security scores for DeFi protocols before users connect. Protect your users with real-time risk assessment.",
    benefits: [
      "Reduce user exposure to risky protocols",
      "Increase trust in your wallet",
      "Free API integration",
      "Co-marketing opportunities"
    ],
    cta: "Integrate Now",
  },
  {
    title: "Exchanges & Platforms",
    icon: "📊",
    description: "Display SafeScores alongside listed tokens and protocols. Help users make informed trading decisions.",
    benefits: [
      "Enhanced due diligence for listings",
      "Differentiate from competitors",
      "Automated score updates",
      "Custom branded widgets"
    ],
    cta: "Get Started",
  },
  {
    title: "Media & Research",
    icon: "📰",
    description: "Embed security ratings in your articles and research reports. Add credibility with objective data.",
    benefits: [
      "Instant credibility boost",
      "Easy badge embedding",
      "Affiliate revenue share",
      "Exclusive data access"
    ],
    cta: "Join Program",
  },
  {
    title: "Security Auditors",
    icon: "🔒",
    description: "Get your audited projects rated on SafeScoring. Showcase your audit quality to a wider audience.",
    benefits: [
      "Featured auditor profile",
      "Direct client referrals",
      "Audit verification badges",
      "Featured listing for clients"
    ],
    cta: "Apply Now",
  },
];

const integrationOptions = [
  {
    name: "API Access",
    description: "RESTful API with JSON responses. Perfect for backend integrations.",
    features: ["100 req/hour free tier", "Real-time scores", "Full CORS support"],
    link: "/api-docs",
  },
  {
    name: "Embeddable Widgets",
    description: "Drop-in HTML widgets with customizable themes.",
    features: ["Iframe or JS embed", "Dark/light themes", "Multiple sizes"],
    link: "/badge",
  },
  {
    name: "Webhooks",
    description: "Get notified when scores change for products you track.",
    features: ["Real-time updates", "Configurable thresholds", "Retry logic"],
    link: "/api-docs#webhooks",
  },
  {
    name: "White Label",
    description: "Custom-branded security ratings for enterprise partners.",
    features: ["Your branding", "Custom domains", "Dedicated support"],
    link: "mailto:partners@safescoring.io",
  },
];

const affiliateProgram = {
  commission: "20%",
  cookie: "90 days",
  payouts: "Monthly",
  features: [
    "Earn 20% recurring commission on all referrals",
    "90-day cookie duration for attribution",
    "Real-time dashboard with analytics",
    "Marketing materials provided",
    "Dedicated affiliate manager",
    "Custom promo codes available",
  ],
};

export default function PartnersPage() {
  return (
    <>
    <Header />
    <main className="min-h-screen pt-24 pb-16 hero-bg">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/20 to-secondary/20 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="badge badge-primary mb-4">Partnership Program</div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Partner with SafeScoring
            </h1>
            <p className="text-xl text-base-content/70 max-w-2xl mx-auto mb-8">
              Integrate security ratings into your product. Help your users make safer crypto decisions.
            </p>
            <div className="flex gap-4 justify-center">
              <a href="#become-partner" className="btn btn-primary">
                Become a Partner
              </a>
              <Link href="/api-docs" className="btn btn-outline">
                View API Docs
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Partner Types */}
      <section className="py-16 bg-base-100">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4">Partner Programs</h2>
          <p className="text-center text-base-content/70 mb-12 max-w-2xl mx-auto">
            Whether you&apos;re a wallet, exchange, media outlet, or auditor, we have a partnership program for you.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {partnerTypes.map((partner, idx) => (
              <div key={idx} className="card bg-base-200 hover:shadow-xl transition-shadow">
                <div className="card-body">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-4xl">{partner.icon}</div>
                    <h3 className="card-title text-xl">{partner.title}</h3>
                  </div>

                  <p className="text-base-content/70 mb-4">{partner.description}</p>

                  <ul className="space-y-2 mb-6">
                    {partner.benefits.map((benefit, bIdx) => (
                      <li key={bIdx} className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-success flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {benefit}
                      </li>
                    ))}
                  </ul>

                  <div className="card-actions">
                    <a href="#become-partner" className="btn btn-primary btn-sm">
                      {partner.cta}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration Options */}
      <section className="py-16 bg-base-200">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4">Integration Options</h2>
          <p className="text-center text-base-content/70 mb-12">
            Multiple ways to integrate SafeScoring into your product.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {integrationOptions.map((option, idx) => (
              <div key={idx} className="card bg-base-100">
                <div className="card-body">
                  <h3 className="card-title text-lg">{option.name}</h3>
                  <p className="text-sm text-base-content/70 mb-4">{option.description}</p>

                  <ul className="space-y-1 mb-4">
                    {option.features.map((feature, fIdx) => (
                      <li key={fIdx} className="text-xs text-base-content/60">
                        • {feature}
                      </li>
                    ))}
                  </ul>

                  <div className="card-actions mt-auto">
                    <Link href={option.link} className="btn btn-ghost btn-sm w-full">
                      Learn More →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Affiliate Program */}
      <section className="py-16 bg-base-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="badge badge-secondary mb-4">Affiliate Program</div>
              <h2 className="text-3xl font-bold mb-4">Earn with SafeScoring</h2>
              <p className="text-base-content/70 mb-6">
                Refer users to SafeScoring and earn recurring commission on all Premium subscriptions.
                Perfect for content creators, influencers, and crypto educators.
              </p>

              <ul className="space-y-3 mb-8">
                {affiliateProgram.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <div className="badge badge-success badge-sm">✓</div>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <a href="#become-partner" className="btn btn-primary">
                Join Affiliate Program
              </a>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="card bg-primary/10 text-center">
                <div className="card-body">
                  <div className="text-4xl font-bold text-primary">{affiliateProgram.commission}</div>
                  <div className="text-sm text-base-content/70">Commission</div>
                </div>
              </div>
              <div className="card bg-secondary/10 text-center">
                <div className="card-body">
                  <div className="text-4xl font-bold text-secondary">{affiliateProgram.cookie}</div>
                  <div className="text-sm text-base-content/70">Cookie Duration</div>
                </div>
              </div>
              <div className="card bg-accent/10 text-center">
                <div className="card-body">
                  <div className="text-4xl font-bold text-accent">{affiliateProgram.payouts}</div>
                  <div className="text-sm text-base-content/70">Payouts</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Become a Partner CTA */}
      <section className="py-16 bg-base-200">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold mb-4">Become a Partner</h2>
          <p className="text-base-content/70 mb-6 max-w-lg mx-auto">
            Join our growing ecosystem of wallets, exchanges, auditors, and media partners
            helping make crypto safer for everyone.
          </p>
          <a href="#become-partner" className="btn btn-primary">
            Apply Now
          </a>
        </div>
      </section>

      {/* CTA Form */}
      <section id="become-partner" className="py-16 bg-gradient-to-r from-primary/20 to-secondary/20">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-2xl justify-center mb-6">
                Apply to Partner
              </h2>

              <PartnerForm />
            </div>
          </div>
        </div>
      </section>
    </main>
    <Footer />
    </>
  );
}
