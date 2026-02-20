"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

// Plan prices (inline to avoid server import issues)
const PLAN_PRICES = {
  explorer: { monthly: 19, yearly: 182 },
  professional: { monthly: 39, yearly: 374 },
  enterprise: { monthly: 499, yearly: 4790 },
};

const POPULAR_CRYPTOS = [
  { code: 'btc', name: 'Bitcoin' },
  { code: 'eth', name: 'Ethereum' },
  { code: 'usdttrc20', name: 'USDT (TRC20)' },
  { code: 'usdterc20', name: 'USDT (ERC20)' },
  { code: 'usdc', name: 'USDC' },
  { code: 'ltc', name: 'Litecoin' },
];

const PLANS = [
  {
    id: "explorer",
    name: "Explorer",
    description: "Compare and optimize your crypto security",
    features: [
      "5 setup analyses",
      "Unlimited comparisons",
      "PDF export",
      "Email support",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    description: "Full security intelligence",
    features: [
      "20 setup analyses",
      "API access (1,000 req/day)",
      "Score history",
      "Priority support",
    ],
    featured: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Security at scale",
    features: [
      "Unlimited setups & API",
      "Priority support (<4h) + Slack",
      "Custom evaluations (5/mo)",
      "SSO (on request) + Team seats",
    ],
  },
];

function CryptoCheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [selectedPlan, setSelectedPlan] = useState(searchParams.get("plan") || "professional");
  const [billingPeriod, setBillingPeriod] = useState("monthly");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const cancelled = searchParams.get("cancelled");

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/signin?callbackUrl=/checkout/crypto?plan=${selectedPlan}`);
    }
  }, [status, router, selectedPlan]);

  const handleCheckout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/crypto/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          billingPeriod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Checkout failed");
      }

      // Redirect to NowPayments hosted checkout
      window.location.href = data.invoiceUrl;
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const currentPlan = PLANS.find((p) => p.id === selectedPlan);
  const price = PLAN_PRICES[selectedPlan]?.[billingPeriod] || 0;
  const yearlyDiscount = billingPeriod === "yearly" ? "20% off" : null;

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Pay with Crypto</h1>
          <p className="text-base-content/60">
            Secure payment with 100+ cryptocurrencies
          </p>
        </div>

        {/* Cancelled notice */}
        {cancelled && (
          <div className="alert alert-warning mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Payment was cancelled. You can try again below.</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="alert alert-error mb-6">
            <span>{error}</span>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Plan Selection */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Select Plan</h2>

            {PLANS.map((plan) => (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedPlan === plan.id
                    ? "border-primary bg-primary/5"
                    : "border-base-300 hover:border-base-content/30"
                } ${plan.featured ? "ring-2 ring-primary/20" : ""}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold">{plan.name}</h3>
                    <p className="text-sm text-base-content/60">{plan.description}</p>
                  </div>
                  {plan.featured && (
                    <span className="badge badge-primary badge-sm">Popular</span>
                  )}
                </div>
                <ul className="text-sm space-y-1 mt-3">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Billing Period */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`btn btn-sm flex-1 ${billingPeriod === "monthly" ? "btn-primary" : "btn-outline"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod("yearly")}
                className={`btn btn-sm flex-1 ${billingPeriod === "yearly" ? "btn-primary" : "btn-outline"}`}
              >
                Yearly (20% off)
              </button>
            </div>
          </div>

          {/* Payment Summary */}
          <div>
            <div className="bg-base-100 rounded-xl p-6 border border-base-300 sticky top-4">
              <h2 className="text-xl font-bold mb-4">Payment Summary</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-base-content/60">Plan</span>
                  <span className="font-medium">{currentPlan?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/60">Billing</span>
                  <span className="font-medium capitalize">{billingPeriod}</span>
                </div>
                {yearlyDiscount && (
                  <div className="flex justify-between text-success">
                    <span>Discount</span>
                    <span>{yearlyDiscount}</span>
                  </div>
                )}
                <div className="divider my-2"></div>
                <div className="flex justify-between text-lg">
                  <span className="font-bold">Total</span>
                  <span className="font-bold">${price}</span>
                </div>
              </div>

              {/* Supported Cryptos */}
              <div className="mb-6">
                <p className="text-sm text-base-content/60 mb-2">Accepted currencies:</p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_CRYPTOS.map((crypto) => (
                    <span
                      key={crypto.code}
                      className="badge badge-outline badge-sm"
                    >
                      {crypto.name}
                    </span>
                  ))}
                  <span className="badge badge-ghost badge-sm">+100 more</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={isLoading}
                className="btn btn-primary btn-block"
              >
                {isLoading ? (
                  <span className="loading loading-spinner"></span>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Pay with Crypto
                  </>
                )}
              </button>

              <p className="text-xs text-base-content/50 text-center mt-3">
                Powered by NowPayments. Secure & instant.
              </p>

              {/* Alternative */}
              <div className="divider text-xs text-base-content/40">or</div>

              <Link href="/pricing" className="btn btn-outline btn-block btn-sm">
                Pay with Card
              </Link>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 p-4 bg-base-100 rounded-xl border border-base-300">
          <h3 className="font-bold mb-2">How it works</h3>
          <ol className="text-sm text-base-content/70 space-y-2">
            <li>1. Select your plan and click "Pay with Crypto"</li>
            <li>2. Choose your preferred cryptocurrency on the payment page</li>
            <li>3. Send the exact amount to the provided wallet address</li>
            <li>4. Your subscription activates automatically after confirmation</li>
          </ol>
          <p className="text-xs text-base-content/50 mt-3">
            Note: Crypto subscriptions don't auto-renew. We'll remind you before expiry.
          </p>
        </div>
      </div>
    </div>
  );
}

// Wrap with Suspense for useSearchParams
export default function CryptoCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    }>
      <CryptoCheckoutContent />
    </Suspense>
  );
}
