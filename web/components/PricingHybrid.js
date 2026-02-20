"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import ButtonCheckout from "./ButtonCheckout";
import ButtonSubscribeCrypto from "./ButtonSubscribeCrypto";
import config from "@/config";

/**
 * Hybrid Pricing Component
 * Shows payment options:
 * - Card (Stripe/LemonSqueezy) - Monthly subscription
 * - Crypto Monthly (Superfluid streaming) - USDC per month
 */
export default function PricingHybrid() {
  const [paymentMethod, setPaymentMethod] = useState("card"); // card | crypto
  const [billingCycle, setBillingCycle] = useState("annual"); // monthly | annual
  const { isConnected: _isConnected } = useAccount();

  const plans = config.lemonsqueezy.plans;

  // Plan name to key mapping for Superfluid
  const planKeys = {
    Explorer: "explorer",
    Professional: "professional",
    Enterprise: "enterprise",
  };

  return (
    <section className="py-24 px-8 max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold mb-4">Choose Your Plan</h2>
        <p className="text-base-content/70 max-w-2xl mx-auto">
          Get full access to detailed security analyses, comparisons, and alerts
        </p>

        {/* Payment Method Toggle */}
        <div className="flex justify-center mt-8">
          <div className="bg-base-200 p-1 rounded-xl inline-flex">
            <button
              onClick={() => setPaymentMethod("card")}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                paymentMethod === "card"
                  ? "bg-primary text-primary-content shadow-lg"
                  : "text-base-content/70 hover:text-base-content"
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Card
              </span>
            </button>
            <button
              onClick={() => setPaymentMethod("crypto")}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                paymentMethod === "crypto"
                  ? "bg-primary text-primary-content shadow-lg"
                  : "text-base-content/70 hover:text-base-content"
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z" />
                </svg>
                USDC
              </span>
            </button>
          </div>
        </div>

        {/* Billing Cycle Toggle — only for card payments */}
        {paymentMethod === "card" && (
          <div className="flex justify-center mt-4">
            <div className="bg-base-200 p-1 rounded-xl inline-flex items-center gap-1">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  billingCycle === "monthly"
                    ? "bg-base-100 text-base-content shadow-sm"
                    : "text-base-content/60 hover:text-base-content"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("annual")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  billingCycle === "annual"
                    ? "bg-base-100 text-base-content shadow-sm"
                    : "text-base-content/60 hover:text-base-content"
                }`}
              >
                Annual
                <span className="ml-1.5 px-2 py-0.5 text-xs bg-success/20 text-success rounded-full font-semibold">
                  -25%
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Payment method descriptions */}
        <div className="mt-4 text-sm">
          {paymentMethod === "card" && (
            <p className="text-base-content/70">
              Pay with credit card. Cancel anytime.
            </p>
          )}
          {paymentMethod === "crypto" && (
            <p className="text-success">
              Stream USDC per second via Superfluid. Pay only for time used, cancel anytime.
            </p>
          )}
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-8">
        {plans.map((plan, _index) => {
          const tierName = plan.name;
          const isPopular = plan.isFeatured;

          return (
            <div
              key={plan.variantId}
              className={`card bg-base-100 shadow-xl ${
                isPopular ? "border-2 border-primary" : ""
              }`}
            >
              {isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="badge badge-primary">Most Popular</span>
                </div>
              )}

              <div className="card-body">
                <h3 className="card-title text-2xl">{plan.name}</h3>
                <p className="text-base-content/70 text-sm">{plan.description}</p>

                {/* Pricing */}
                <div className="my-6">
                  {paymentMethod === "card" && (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold">
                          ${billingCycle === "annual" ? (plan.priceAnnual || plan.price) : plan.price}
                        </span>
                        <span className="text-base-content/50">
                          {plan.price === 0 ? "" : billingCycle === "annual" ? "/year" : "/month"}
                        </span>
                      </div>
                      {plan.priceAnchor && (
                        <p className="text-sm text-base-content/50 line-through">
                          ${billingCycle === "annual"
                            ? (plan.priceAnchorAnnual || plan.priceAnchor * 12)
                            : plan.priceAnchor}/{billingCycle === "annual" ? "year" : "month"}
                        </p>
                      )}
                      {billingCycle === "annual" && plan.price > 0 && plan.priceAnnual && (
                        <p className="text-xs text-base-content/50 mt-1">
                          ${(plan.priceAnnual / 12).toFixed(2)}/mo equivalent
                        </p>
                      )}
                    </>
                  )}
                  {paymentMethod === "crypto" && (
                    <>
                      {plan.price > 0 ? (
                        <>
                          <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold">${plan.price}</span>
                            <span className="text-base-content/50">USDC/mo</span>
                          </div>
                          <p className="text-sm text-success">
                            Streaming payment
                          </p>
                          <p className="text-xs text-base-content/50">
                            ~${(plan.price / 30).toFixed(2)}/day
                          </p>
                        </>
                      ) : (
                        <div className="text-2xl font-bold">Free</div>
                      )}
                    </>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3 flex-grow">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <svg
                        className={`w-5 h-5 flex-shrink-0 ${
                          feature.highlight ? "text-primary" : "text-success"
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span
                        className={feature.highlight ? "font-medium" : ""}
                      >
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <div className="card-actions mt-6">
                  {plan.price === 0 ? (
                    <button className="btn btn-outline btn-block">
                      Get Started Free
                    </button>
                  ) : paymentMethod === "card" ? (
                    <ButtonCheckout
                      priceId={billingCycle === "annual" ? (plan.variantIdAnnual || plan.variantId) : plan.variantId}
                      mode="subscription"
                      className="btn-primary btn-block"
                    />
                  ) : (
                    <ButtonSubscribeCrypto
                      plan={planKeys[tierName]}
                      className="btn-block"
                      onSuccess={() => window.location.reload()}
                    />
                  )}
                </div>

                {/* Trial info for card payments */}
                {paymentMethod === "card" && plan.trialDays && (
                  <p className="text-center text-sm text-base-content/50 mt-2">
                    {plan.trialDays}-day free trial
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Crypto Benefits */}
      {paymentMethod === "crypto" && (
        <div className="mt-12 bg-base-200 rounded-2xl p-8">
          <h3 className="text-xl font-bold mb-4 text-center">
            How Streaming Payments Work
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="font-semibold">Real-time Streaming</h4>
              <p className="text-sm text-base-content/70">
                Pay per second via Superfluid. $19/month = ~$0.0000073/second
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h4 className="font-semibold">Cancel Anytime</h4>
              <p className="text-sm text-base-content/70">
                Stop streaming instantly. Pay only for time used, no refund needed.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h4 className="font-semibold">Self-Custody</h4>
              <p className="text-sm text-base-content/70">
                Your wallet controls the stream. No middleman, no chargebacks.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
