import Link from "next/link";
import config from "@/config";
import ButtonCheckout from "./ButtonCheckout";

const PricingPreview = () => {
  const allPlans = config?.lemonsqueezy?.plans || [];

  return (
    <section className="py-16 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Quick pricing overview */}
        <div className="text-center mb-8">
          <span className="inline-block px-4 py-1.5 mb-3 text-sm font-medium rounded-full bg-primary/10 text-primary">
            Transparent Pricing
          </span>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
            Simple, transparent pricing
          </h2>
          <p className="text-base text-base-content/60 max-w-xl mx-auto">
            Start free, upgrade anytime. No hidden fees.
          </p>
        </div>

        {/* Compact price cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {allPlans.map((plan) => {
            const planId = plan.variantId;
            const isFreemium = planId === "free";
            const isFeatured = plan.isFeatured;

            return (
              <div
                key={planId}
                className={`relative rounded-xl p-5 text-center transition-all hover:scale-105 ${
                  isFeatured
                    ? "bg-primary/10 border-2 border-primary shadow-lg"
                    : isFreemium
                    ? "bg-success/10 border-2 border-success/30"
                    : "bg-base-200 border border-base-300"
                }`}
              >
                {isFeatured && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                    <span className="px-2 py-0.5 text-xs font-bold bg-primary text-primary-content rounded-full">
                      Popular
                    </span>
                  </div>
                )}

                <h3 className="text-lg font-bold mb-1">{plan.name}</h3>

                <div className="mb-2">
                  {isFreemium ? (
                    <div className="text-3xl font-bold text-success">Free</div>
                  ) : (
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-bold">${plan.price}</span>
                      <span className="text-sm text-base-content/60">/mo</span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-base-content/60 mb-4 min-h-[32px]">
                  {plan.description}
                </p>

                {/* Single key feature */}
                <div className="text-xs text-base-content/70 font-medium mb-4">
                  {plan.features[0]?.name || "Full access"}
                </div>

                {/* CTA Button */}
                {isFreemium ? (
                  <Link
                    href="/api/auth/signin?callbackUrl=/onboarding"
                    className="btn btn-success btn-sm w-full"
                  >
                    Start Free
                  </Link>
                ) : (
                  <ButtonCheckout
                    priceId={planId}
                    className={`btn-sm w-full ${isFeatured ? "btn-primary" : "btn-outline"}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Call to action to full pricing */}
        <div className="text-center mt-8">
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
          >
            See detailed features & compare plans
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"
              />
            </svg>
          </a>

          {/* GDPR Notice */}
          <p className="text-xs text-base-content/50 mt-4 max-w-md mx-auto">
            By subscribing, you agree to our{" "}
            <Link href="/privacy" className="link link-hover">Privacy Policy</Link>
            {" "}and{" "}
            <Link href="/tos" className="link link-hover">Terms of Service</Link>.
            We process your data in accordance with GDPR.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingPreview;
