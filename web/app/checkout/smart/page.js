"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import config from "@/config";
import {
  isEUCountry,
  useCountryDetection,
  isValidVATFormat,
  determinePaymentProvider,
  calculatePriceWithVAT,
} from "@/libs/geo-detection";

/**
 * Smart Checkout Page
 * Routes to optimal payment provider based on:
 * - Geographic location (EU vs non-EU)
 * - Customer type (B2B vs B2C)
 * - VAT number validity
 *
 * Strategy:
 * - EU B2C (particuliers) → Lemon Squeezy (handles VAT)
 * - EU B2B (with VAT) → MoonPay Commerce (reverse charge)
 * - Non-EU → MoonPay Commerce (no EU VAT)
 */
function SmartCheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  // Plan selection
  const [selectedPlan, setSelectedPlan] = useState(searchParams.get("plan") || "professional");
  const [billingPeriod, setBillingPeriod] = useState(searchParams.get("billing") || "monthly");

  // Customer info
  const detectedCountry = useCountryDetection();
  const [countryCode, setCountryCode] = useState(detectedCountry || "US");
  const [isBusinessCustomer, setIsBusinessCustomer] = useState(false);
  const [vatNumber, setVatNumber] = useState("");
  const [vatValid, setVatValid] = useState(false);

  // UI state
  const [step, setStep] = useState(1); // 1: Location, 2: Customer Type, 3: Payment
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get plan details
  const plans = config?.lemonsqueezy?.plans || [];
  const plan = plans.find(p => p.planCode === selectedPlan) || plans[1];
  const basePrice = billingPeriod === "yearly" ? plan?.yearlyPrice : plan?.price;

  // Calculate price with VAT if applicable
  const isEU = isEUCountry(countryCode);
  const priceCalc = isEU && !isBusinessCustomer
    ? calculatePriceWithVAT(basePrice, countryCode)
    : { netPrice: basePrice, vatRate: 0, vatAmount: 0, totalPrice: basePrice };

  // Determine payment provider
  const providerInfo = determinePaymentProvider({
    countryCode,
    isBusinessCustomer,
    hasValidVAT: vatValid,
  });

  // Auto-detect country on mount
  useEffect(() => {
    if (detectedCountry) {
      setCountryCode(detectedCountry);
    }
  }, [detectedCountry]);

  // Validate VAT number
  useEffect(() => {
    if (vatNumber && isBusinessCustomer) {
      setVatValid(isValidVATFormat(vatNumber, countryCode));
    } else {
      setVatValid(false);
    }
  }, [vatNumber, countryCode, isBusinessCustomer]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/signin?callbackUrl=/checkout/smart?plan=${selectedPlan}&billing=${billingPeriod}`);
    }
  }, [status, router, selectedPlan, billingPeriod]);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      if (providerInfo.provider === "lemonsqueezy") {
        // EU B2C → Lemon Squeezy
        const variantId = billingPeriod === "yearly" ? plan?.yearlyVariantId : plan?.variantId;

        const response = await fetch("/api/lemonsqueezy/create-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variantId,
            redirectUrl: `${window.location.origin}/dashboard?payment=success`,
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        window.location.href = data.url;
      } else {
        // MoonPay Commerce → Non-EU or EU B2B
        const response = await fetch("/api/moonpay/create-transaction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan: selectedPlan,
            billingPeriod,
            countryCode,
            isBusinessCustomer,
            vatNumber: vatValid ? vatNumber : null,
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        window.location.href = data.url;
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-base-100 to-base-200 py-8 sm:py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link href="/pricing" className="btn btn-ghost btn-sm mb-6 gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Pricing
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Checkout</h1>
          <p className="text-base-content/60">
            {plan?.name} - ${basePrice}/{billingPeriod === "yearly" ? "year" : "month"}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <ul className="steps steps-horizontal w-full">
            <li className={`step ${step >= 1 ? "step-primary" : ""}`}>Location</li>
            {isEU && <li className={`step ${step >= 2 ? "step-primary" : ""}`}>Customer Type</li>}
            <li className={`step ${step >= 3 ? "step-primary" : ""}`}>Payment</li>
          </ul>
        </div>

        {/* Step 1: Location */}
        {step === 1 && (
          <div className="bg-base-100 rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-4">Where are you located?</h2>
            <p className="text-sm text-base-content/60 mb-6">
              This helps us determine the correct tax treatment
            </p>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Country</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
              >
                <option value="US">United States</option>
                <option value="FR">France</option>
                <option value="DE">Germany</option>
                <option value="ES">Spain</option>
                <option value="IT">Italy</option>
                <option value="NL">Netherlands</option>
                <option value="BE">Belgium</option>
                <option value="AT">Austria</option>
                <option value="GB">United Kingdom</option>
                <option value="CH">Switzerland</option>
                <option value="CA">Canada</option>
                <option value="AU">Australia</option>
                <option value="JP">Japan</option>
                <option value="SG">Singapore</option>
                <option value="BR">Brazil</option>
                <option value="MX">Mexico</option>
              </select>
            </div>

            {isEU && (
              <div className="alert alert-info mt-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span className="text-sm">
                  You're in the EU. We'll ask if you're buying as a business in the next step.
                </span>
              </div>
            )}

            <button
              onClick={() => setStep(isEU ? 2 : 3)}
              className="btn btn-primary w-full mt-6"
            >
              Continue
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        )}

        {/* Step 2: Customer Type (EU only) */}
        {step === 2 && isEU && (
          <div className="bg-base-100 rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-4">Business or Individual?</h2>
            <p className="text-sm text-base-content/60 mb-6">
              This determines VAT handling
            </p>

            <div className="space-y-3">
              <div
                onClick={() => setIsBusinessCustomer(false)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  !isBusinessCustomer ? "border-primary bg-primary/5" : "border-base-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    !isBusinessCustomer ? "border-primary" : "border-base-content/30"
                  }`}>
                    {!isBusinessCustomer && <div className="w-3 h-3 rounded-full bg-primary"></div>}
                  </div>
                  <div>
                    <h3 className="font-semibold">👤 Individual / Consumer</h3>
                    <p className="text-sm text-base-content/60">
                      VAT will be added automatically
                    </p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setIsBusinessCustomer(true)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  isBusinessCustomer ? "border-primary bg-primary/5" : "border-base-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isBusinessCustomer ? "border-primary" : "border-base-content/30"
                  }`}>
                    {isBusinessCustomer && <div className="w-3 h-3 rounded-full bg-primary"></div>}
                  </div>
                  <div>
                    <h3 className="font-semibold">🏢 Business / Company</h3>
                    <p className="text-sm text-base-content/60">
                      Provide your VAT number for reverse charge
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {isBusinessCustomer && (
              <div className="mt-6">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">EU VAT Number</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., FR12345678901"
                    className={`input input-bordered w-full ${
                      vatNumber && (vatValid ? "input-success" : "input-error")
                    }`}
                    value={vatNumber}
                    onChange={(e) => setVatNumber(e.target.value.toUpperCase())}
                  />
                  {vatNumber && (
                    <label className="label">
                      <span className={`label-text-alt ${vatValid ? "text-success" : "text-error"}`}>
                        {vatValid ? "✓ Valid format" : "✗ Invalid VAT format"}
                      </span>
                    </label>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(1)} className="btn btn-ghost flex-1">
                Back
              </button>
              <button onClick={() => setStep(3)} className="btn btn-primary flex-1">
                Continue
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Payment Summary */}
        {step === 3 && (
          <div className="bg-base-100 rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-4">Payment Summary</h2>

            {/* Pricing Breakdown */}
            <div className="bg-base-200 rounded-xl p-4 mb-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-base-content/60">Plan</span>
                  <span className="font-medium">{plan?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/60">Billing</span>
                  <span className="font-medium capitalize">{billingPeriod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/60">Subtotal</span>
                  <span className="font-medium">${priceCalc.netPrice}</span>
                </div>
                {priceCalc.vatRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-base-content/60">VAT ({priceCalc.vatRate}%)</span>
                    <span className="font-medium">${priceCalc.vatAmount}</span>
                  </div>
                )}
                <div className="divider my-2"></div>
                <div className="flex justify-between text-lg">
                  <span className="font-bold">Total</span>
                  <span className="font-bold">${priceCalc.totalPrice}</span>
                </div>
              </div>
            </div>

            {/* Payment Provider Info */}
            <div className={`alert ${providerInfo.provider === "lemonsqueezy" ? "alert-info" : "alert-success"} mb-6`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <div className="font-bold">
                  {providerInfo.provider === "lemonsqueezy" ? "Card Payment (Lemon Squeezy)" : "Crypto Payment (MoonPay)"}
                </div>
                <div className="text-xs">{providerInfo.reason}</div>
              </div>
            </div>

            {error && (
              <div className="alert alert-error mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(isEU ? 2 : 1)}
                className="btn btn-ghost flex-1"
                disabled={loading}
              >
                Back
              </button>
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="btn btn-primary flex-1"
              >
                {loading ? (
                  <>
                    <span className="loading loading-spinner"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    Pay ${priceCalc.totalPrice}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Security badges */}
        <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 mt-8 text-base-content/50 text-xs">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-success">
              <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
            </svg>
            Secure Payment
          </div>
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-primary">
              <path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
            VAT Compliant
          </div>
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-warning">
              <path d="M10 2a.75.75 0 01.75.75v.258a33.186 33.186 0 016.668.83.75.75 0 01-.336 1.461 31.28 31.28 0 00-1.103-.232l1.702 7.545a.75.75 0 01-.387.832A4.981 4.981 0 0115 14c-.825 0-1.606-.2-2.294-.556a.75.75 0 01-.387-.832l1.77-7.849a31.743 31.743 0 00-3.339-.254v11.505l6.545 1.636a.75.75 0 01-.18 1.476H2.864a.75.75 0 01-.18-1.476l6.566-1.636V4.508a31.74 31.74 0 00-3.339.254l1.77 7.85a.75.75 0 01-.387.831A4.98 4.98 0 015 14a4.98 4.98 0 01-2.294-.556.75.75 0 01-.387-.832l1.702-7.545c-.37.07-.738.148-1.103.232a.75.75 0 11-.336-1.462 33.053 33.053 0 016.668-.829V2.75A.75.75 0 0110 2z" />
            </svg>
            Cancel Anytime
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrapper with Suspense
export default function SmartCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    }>
      <SmartCheckoutContent />
    </Suspense>
  );
}
