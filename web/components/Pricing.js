import Link from "next/link";
import config from "@/config";
import ButtonCheckout from "./ButtonCheckout";

const Pricing = () => {
  // Use lemonsqueezy plans (stripe.plans is deprecated/empty)
  const allPlans = config?.lemonsqueezy?.plans || config?.stripe?.plans || [];

  return (
    <section className="py-24 px-6" id="pricing">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 mb-4 text-sm font-medium rounded-full bg-primary/10 text-primary">
            Pricing
          </span>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Start free, upgrade when ready
          </h2>
          <p className="text-lg text-base-content/60 max-w-2xl mx-auto">
            Explore SafeScoring for free with 5 products per month.
            Upgrade for unlimited access and advanced features.
          </p>
        </div>

        {/* Show message if no plans */}
        {allPlans.length === 0 && (
          <div className="text-center py-12 bg-base-200 rounded-lg">
            <p className="text-base-content/60">No pricing plans found</p>
            <p className="text-xs text-base-content/40 mt-2">
              Try restarting the dev server (npm run dev)
            </p>
          </div>
        )}

        {/* All plans in unified grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {allPlans.map((plan) => {
            // Support both priceId (stripe) and variantId (lemonsqueezy)
            const planId = plan.priceId || plan.variantId;
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
                      Most Popular
                    </span>
                  </div>
                )}
                {isFreemium && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 text-xs font-semibold bg-success text-success-content rounded-full whitespace-nowrap">
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
                    <span className="text-base-content/60 text-sm">/month</span>
                  </div>
                  {plan.trialDays && (
                    <div className="flex items-center gap-2 mt-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-primary">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs text-primary font-medium">
                        {plan.trialDays}-day free trial
                      </span>
                    </div>
                  )}
                  {isFreemium && (
                    <div className="flex items-center gap-2 mt-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-success">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs text-success font-medium">
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
                    Get Started Free
                  </Link>
                ) : (
                  <ButtonCheckout
                    priceId={planId}
                    mode="subscription"
                    className={`w-full mt-auto ${
                      isFeatured ? "btn-primary" : "btn-outline"
                    }`}
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
            14-day trial with card required (EU compliant)
          </div>
          <p className="text-base-content/50 text-sm">
            Need a custom solution?{" "}
            <a href="mailto:enterprise@safescoring.io" className="text-primary hover:underline">
              Contact us
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
