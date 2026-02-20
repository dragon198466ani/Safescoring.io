import { getSEOTags } from "@/libs/seo";
import config from "@/config";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";

export const metadata = getSEOTags({
  title: `Pricing | ${config.appName}`,
  description: "Choose the perfect plan for your crypto security needs. Free tier available, pay with card or crypto.",
  canonicalUrlRelative: "/pricing",
});

export default function PricingPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-base-100 pt-20">
        {/* Hero section */}
        <section className="py-12 bg-gradient-to-b from-base-200 to-base-100">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-lg text-base-content/60 max-w-2xl mx-auto">
              Start free, upgrade when you need more. No hidden fees, cancel anytime.
              Pay with card or crypto.
            </p>
          </div>
        </section>

        {/* Pricing component */}
        <Pricing />

        {/* FAQ section */}
        <section className="py-16 bg-base-200">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold text-center mb-12">
              Frequently Asked Questions
            </h2>
            <FAQ />
          </div>
        </section>

        {/* Trust indicators */}
        <section className="py-12 bg-base-100">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div className="p-6">
                <div className="text-4xl mb-3">🔒</div>
                <h3 className="font-bold mb-2">Secure Payments</h3>
                <p className="text-sm text-base-content/60">
                  All payments processed through Lemon Squeezy (MoR) with bank-level security
                </p>
              </div>
              <div className="p-6">
                <div className="text-4xl mb-3">💰</div>
                <h3 className="font-bold mb-2">Money Back Guarantee</h3>
                <p className="text-sm text-base-content/60">
                  14-day refund policy for EU customers (GDPR compliant)
                </p>
              </div>
              <div className="p-6">
                <div className="text-4xl mb-3">🌍</div>
                <h3 className="font-bold mb-2">No KYC for Crypto</h3>
                <p className="text-sm text-base-content/60">
                  Pay with BTC, ETH, USDC or SOL - no identity verification required
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
