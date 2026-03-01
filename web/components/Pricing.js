"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import config from "@/config";
import ButtonCheckout from "./ButtonCheckout";

// Lazy-load crypto button (wagmi/rainbowkit are heavy)
const ButtonSubscribeCrypto = dynamic(
  () => import("./ButtonSubscribeCrypto"),
  { ssr: false, loading: () => <button className="btn btn-outline w-full" disabled>Loading wallet...</button> }
);

// Plan name → Superfluid key
const CRYPTO_PLAN_KEYS = {
  Explorer: "explorer",
  Professional: "professional",
  Enterprise: "enterprise",
};

const Pricing = () => {
  const [method, setMethod] = useState("card"); // card | crypto
  const allPlans = config?.lemonsqueezy?.plans || [];

  return (
    <section className="py-24 px-6" id="pricing">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 mb-4 text-sm font-medium rounded-full bg-base-content/10 text-base-content/70">
            Pricing
          </span>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Start free, upgrade when ready
          </h2>
          <p className="text-lg text-base-content/60 max-w-2xl mx-auto mb-8">
            Explore SafeScoring for free with 5 products per month.
            Upgrade for unlimited access and advanced features.
          </p>

          {/* Payment method toggle — minimal pill */}
          <div className="inline-flex bg-base-200 rounded-lg p-1 border border-base-300">
            <button
              onClick={() => setMethod("card")}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
                method === "card"
                  ? "bg-white text-black shadow-sm"
                  : "text-base-content/60 hover:text-base-content"
              }`}
            >
              Card
            </button>
            <button
              onClick={() => setMethod("crypto")}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
                method === "crypto"
                  ? "bg-white text-black shadow-sm"
                  : "text-base-content/60 hover:text-base-content"
              }`}
            >
              USDC
            </button>
          </div>
          <p className="text-xs text-base-content/40 mt-2">
            {method === "card"
              ? "Credit card via LemonSqueezy. Cancel anytime."
              : "Stream USDC per second via Superfluid on Polygon. Cancel anytime."}
          </p>
        </div>

        {/* Show message if no plans */}
        {allPlans.length === 0 && (
          <div className="text-center py-12 bg-base-200 rounded-lg">
            <p className="text-base-content/60">No pricing plans found</p>
          </div>
        )}

        {/* Plans grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {allPlans.map((plan) => {
            const planId = plan.variantId || plan.priceId;
            const isFreemium = planId === "free";
            const isFeatured = plan.isFeatured;
            const cryptoKey = CRYPTO_PLAN_KEYS[plan.name];

            return (
              <div
                key={planId}
                className={`relative rounded-2xl p-6 flex flex-col ${
                  isFeatured
                    ? "bg-base-200 border-2 border-white"
                    : isFreemium
                    ? "bg-base-200 border-2 border-base-content/30"
                    : "bg-base-200 border border-base-300"
                }`}
              >
                {/* Badges */}
                {isFeatured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 text-xs font-semibold bg-base-content/10 text-base-content/70 rounded-full whitespace-nowrap">
                      Most Popular
                    </span>
                  </div>
                )}
                {isFreemium && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 text-xs font-semibold bg-base-content/10 text-base-content/70 rounded-full whitespace-nowrap">
                      Freemium
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-6 mt-2">
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-base-content/60 text-sm min-h-[40px]">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    {plan.priceAnchor && (
                      <span className="text-lg text-base-content/40 line-through">
                        ${plan.priceAnchor}
                      </span>
                    )}
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-base-content/60 text-sm">
                      {method === "crypto" && plan.price > 0 ? "USDC/mo" : "/month"}
                    </span>
                  </div>
                  {/* Card: trial info */}
                  {method === "card" && plan.trialDays && (
                    <div className="flex items-center gap-2 mt-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-white">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs text-white font-medium">
                        {plan.trialDays}-day free trial
                      </span>
                    </div>
                  )}
                  {/* Crypto: streaming info */}
                  {method === "crypto" && plan.price > 0 && (
                    <p className="text-xs text-base-content/40 mt-2">
                      ~${(plan.price / 30).toFixed(2)}/day &middot; streaming
                    </p>
                  )}
                  {isFreemium && (
                    <div className="flex items-center gap-2 mt-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-base-content/50">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs text-base-content/50 font-medium">
                        No card required
                      </span>
                    </div>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6 flex-grow">
                  {plan.features.map((feature, i) => (
                    <li key={i} className={`flex items-start gap-2 ${feature.highlight ? "bg-base-300/50 -mx-2 px-2 py-1.5 rounded-lg" : ""}`}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-4 h-4 flex-shrink-0 mt-0.5 text-base-content/50"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className={`text-sm ${feature.highlight ? "text-base-content/80 font-medium" : "text-base-content/80"}`}>
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA — switches based on payment method */}
                {isFreemium ? (
                  <Link
                    href="/api/auth/signin?callbackUrl=/onboarding"
                    className="btn btn-primary w-full mt-auto"
                  >
                    Get Started Free
                  </Link>
                ) : method === "card" ? (
                  <ButtonCheckout
                    priceId={planId}
                    mode="subscription"
                    className={`w-full mt-auto ${isFeatured ? "btn-primary" : "btn-outline"}`}
                  />
                ) : cryptoKey ? (
                  <ButtonSubscribeCrypto
                    plan={cryptoKey}
                    className={`w-full mt-auto ${isFeatured ? "" : ""}`}
                    onSuccess={() => window.location.reload()}
                  />
                ) : (
                  <ButtonCheckout
                    priceId={planId}
                    mode="subscription"
                    className={`w-full mt-auto ${isFeatured ? "btn-primary" : "btn-outline"}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom note */}
        <div className="text-center mt-12">
          <div className="inline-flex items-center gap-2 text-base-content/50 text-sm mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            {method === "card"
              ? "14-day trial with card required (EU compliant)"
              : "USDC on Polygon via Superfluid. No middleman."}
          </div>
          <p className="text-base-content/50 text-sm">
            Need a custom solution?{" "}
            <a href="mailto:enterprise@safescoring.io" className="text-white hover:underline">
              Contact us
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
