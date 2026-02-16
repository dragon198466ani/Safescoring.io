"use client";

import Link from "next/link";
import config from "@/config";
import ButtonCheckout from "./ButtonCheckout";
import ButtonCryptoCheckout from "./ButtonCryptoCheckout";
import { useTranslation } from "@/libs/i18n/LanguageProvider";

const Pricing = () => {
  const { t } = useTranslation();
  const allPlans = config?.lemonsqueezy?.plans || [];

  return (
    <section className="py-24 px-6" id="pricing">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 mb-4 text-sm font-medium rounded-full bg-primary/10 text-primary">
            {t("pricing.title")}
          </span>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            {t("pricing.subtitle")}
          </h2>
          <p className="text-lg text-base-content/60 max-w-2xl mx-auto">
            {t("pricing.subtitleDesc")}
          </p>
        </div>

        {/* Show message if no plans */}
        {allPlans.length === 0 && (
          <div className="text-center py-12 bg-base-200 rounded-lg">
            <p className="text-base-content/60">{t("pricing.noPlans")}</p>
            <p className="text-xs text-base-content/40 mt-2">
              Try restarting the dev server (npm run dev)
            </p>
          </div>
        )}

        {/* All plans in unified grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {allPlans.map((plan) => {
            const planId = plan.variantId;
            const isFreemium = planId === "free";
            const isFeatured = plan.isFeatured;

            return (
              <div
                key={planId}
                className={`relative rounded-2xl p-6 flex flex-col ${
                  isFeatured
                    ? "bg-gradient-to-b from-primary/20 to-base-200 border-2 border-primary"
                    : isFreemium
                    ? "bg-base-200 border-2 border-success/50"
                    : "bg-base-200 border border-base-300"
                }`}
              >
                {/* Badges */}
                {isFeatured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 text-xs font-semibold bg-primary text-primary-content rounded-full whitespace-nowrap">
                      {t("pricing.mostPopular")}
                    </span>
                  </div>
                )}
                {isFreemium && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 text-xs font-semibold bg-success text-success-content rounded-full whitespace-nowrap">
                      {t("pricing.freemium")}
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
                    <span className="text-4xl font-bold">{plan.price}€</span>
                    <span className="text-base-content/60 text-sm">/{t("pricing.perMonth")}</span>
                  </div>
                  {plan.trialDays && (
                    <div className="flex items-center gap-2 mt-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-primary">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs text-primary font-medium">
                        {t("pricing.trialDays", { days: plan.trialDays })}
                      </span>
                    </div>
                  )}
                  {isFreemium && (
                    <div className="flex items-center gap-2 mt-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-success">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs text-success font-medium">
                        {t("pricing.noCardRequired")}
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
                        className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                          feature.highlight
                            ? "text-amber-400"
                            : isFeatured
                            ? "text-primary"
                            : isFreemium
                            ? "text-success"
                            : "text-green-500"
                        }`}
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className={`text-sm ${feature.highlight ? "text-amber-400 font-medium" : "text-base-content/80"}`}>
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isFreemium ? (
                  <Link
                    href="/api/auth/signin?callbackUrl=/onboarding"
                    className="btn btn-success btn-outline w-full mt-auto"
                  >
                    {t("pricing.getStartedFree")}
                  </Link>
                ) : (
                  <div className="mt-auto space-y-2">
                    {/* Primary: Fiat via LemonSqueezy (cards, PayPal — EU VAT handled) */}
                    <ButtonCheckout
                      priceId={planId}
                      mode="subscription"
                      className={`w-full ${
                        isFeatured ? "btn-primary" : "btn-outline"
                      }`}
                    />
                    {/* Secondary: Crypto via MoonPay (BTC, ETH, USDC, SOL…) */}
                    <ButtonCryptoCheckout
                      planName={plan.name}
                      className="w-full btn-ghost text-base-content/50 hover:text-primary"
                    />
                    {/* Auto-renewal + refund disclosure (ROSCA / Code de la consommation) */}
                    <p className="text-[10px] text-base-content/40 text-center leading-tight">
                      Subscription renews automatically. Cancel anytime.
                      <br />14-day money-back guarantee.{" "}
                      <Link href="/tos#6" className="text-primary/50 hover:underline">Terms</Link>
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom note */}
        <div className="text-center mt-12 space-y-2">
          <div className="inline-flex items-center gap-2 text-base-content/50 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
            {t("pricing.cardPaypalNote")}
          </div>
          <div className="inline-flex items-center gap-2 text-base-content/50 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t("pricing.cryptoPaymentNote")}
          </div>
          <p className="text-base-content/40 text-xs mt-2">
            {t("pricing.trialCancelNote")}
          </p>
          <p className="text-base-content/50 text-sm mt-2">
            {t("pricing.customSolution")}{" "}
            <a href="mailto:enterprise@safescoring.io" className="text-primary hover:underline">
              {t("pricing.contactUs")}
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
