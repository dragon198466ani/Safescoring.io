"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import config from "@/config";

/**
 * Unified Checkout Page - Simple & Clean
 * - Lemon Squeezy (fiat) = Merchant of Record - TVA auto, conformité
 * - NOWPayments (crypto) = Paiement direct
 */
function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [selectedMethod, setSelectedMethod] = useState("card");
  const [selectedPlan, setSelectedPlan] = useState(searchParams.get("plan") || "explorer");
  const [billingPeriod, setBillingPeriod] = useState(searchParams.get("billing") || "monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get plan details
  const plans = config?.lemonsqueezy?.plans || [];
  const plan = plans.find(p => p.planCode === selectedPlan) || plans[1];
  const price = billingPeriod === "yearly" ? plan?.yearlyPrice : plan?.price;
  const variantId = billingPeriod === "yearly" ? plan?.yearlyVariantId : plan?.variantId;

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/signin?callbackUrl=/checkout/unified?plan=${selectedPlan}&billing=${billingPeriod}`);
    }
  }, [status, router, selectedPlan, billingPeriod]);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      if (selectedMethod === "card") {
        // Lemon Squeezy checkout - gère tout automatiquement
        const response = await fetch("/api/lemonsqueezy/create-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variantId,
            redirectUrl: `${window.location.origin}/dashboard?payment=success`,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Erreur lors du checkout");
        }

        if (data.url) {
          window.location.href = data.url;
        }
      } else if (selectedMethod === "crypto") {
        // Direct crypto payment (NOWPayments)
        router.push(`/checkout/crypto?plan=${selectedPlan}&billing=${billingPeriod}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
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
    <div className="min-h-screen bg-gradient-to-b from-base-100 to-base-200 py-8 sm:py-12 px-4 safe-padding-all">
      <div className="max-w-2xl mx-auto">
        {/* Back link */}
        <Link href="/pricing" className="btn btn-ghost btn-sm mb-6 gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Retour
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Checkout</h1>
          <p className="text-base-content/60">
            Choisissez votre méthode de paiement
          </p>
        </div>

        {/* Plan Summary */}
        <div className="bg-base-200 rounded-2xl p-6 mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold">{plan?.name}</h2>
              <p className="text-sm text-base-content/60">{plan?.description}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">${price}</div>
              <div className="text-sm text-base-content/60">
                /{billingPeriod === "yearly" ? "an" : "mois"}
              </div>
            </div>
          </div>

          {/* Billing toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`btn min-h-[44px] flex-1 touch-manipulation ${billingPeriod === "monthly" ? "btn-primary" : "btn-ghost"}`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setBillingPeriod("yearly")}
              className={`btn min-h-[44px] flex-1 touch-manipulation ${billingPeriod === "yearly" ? "btn-primary" : "btn-ghost"}`}
            >
              Annuel
              <span className="badge badge-success badge-sm">-20%</span>
            </button>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="space-y-3 mb-8">
          <h3 className="font-semibold text-lg mb-4">Méthode de paiement</h3>

          {/* Card via Lemon Squeezy (Recommended) */}
          <PaymentMethodOption
            selected={selectedMethod === "card"}
            onSelect={() => setSelectedMethod("card")}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-primary">
                <path d="M4.5 3.75a3 3 0 00-3 3v.75h21v-.75a3 3 0 00-3-3h-15z" />
                <path fillRule="evenodd" d="M22.5 9.75h-21v7.5a3 3 0 003 3h15a3 3 0 003-3v-7.5zm-18 3.75a.75.75 0 01.75-.75h6a.75.75 0 010 1.5h-6a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3z" clipRule="evenodd" />
              </svg>
            }
            title="Carte bancaire"
            subtitle="Visa, Mastercard, Apple Pay, Google Pay, SEPA"
            badge="Recommandé"
            badgeColor="bg-primary"
            badges={["Apple Pay", "Google Pay", "SEPA"]}
          >
            <div className="mt-3 p-3 bg-success/10 rounded-lg">
              <div className="flex items-start gap-2 text-xs text-success">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0 mt-0.5">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                <span>
                  <strong>TVA calculée automatiquement</strong> - Factures conformes, remboursements gérés
                </span>
              </div>
            </div>
          </PaymentMethodOption>

          {/* Direct Crypto */}
          <PaymentMethodOption
            selected={selectedMethod === "crypto"}
            onSelect={() => setSelectedMethod("crypto")}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-orange-500">
                <path d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
            }
            title="Crypto"
            subtitle="Payez depuis votre wallet"
            badges={["BTC", "ETH", "USDC", "SOL"]}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-error mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="btn btn-primary btn-lg w-full gap-2 min-h-[56px] touch-manipulation active:scale-[0.98] hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/20 transition-all duration-200"
        >
          {loading ? (
            <>
              <span className="loading loading-spinner"></span>
              Redirection...
            </>
          ) : (
            <>
              Payer ${price}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </>
          )}
        </button>

        {/* Security badges */}
        <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 mt-8 text-base-content/50">
          <div className="flex items-center gap-2 text-xs">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-success">
              <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
            </svg>
            Paiement sécurisé
          </div>
          <div className="flex items-center gap-2 text-xs">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-primary">
              <path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
            TVA auto
          </div>
          <div className="flex items-center gap-2 text-xs">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-warning">
              <path d="M10 2a.75.75 0 01.75.75v.258a33.186 33.186 0 016.668.83.75.75 0 01-.336 1.461 31.28 31.28 0 00-1.103-.232l1.702 7.545a.75.75 0 01-.387.832A4.981 4.981 0 0115 14c-.825 0-1.606-.2-2.294-.556a.75.75 0 01-.387-.832l1.77-7.849a31.743 31.743 0 00-3.339-.254v11.505l6.545 1.636a.75.75 0 01-.18 1.476H2.864a.75.75 0 01-.18-1.476l6.566-1.636V4.508a31.74 31.74 0 00-3.339.254l1.77 7.85a.75.75 0 01-.387.831A4.98 4.98 0 015 14a4.98 4.98 0 01-2.294-.556.75.75 0 01-.387-.832l1.702-7.545c-.37.07-.738.148-1.103.232a.75.75 0 11-.336-1.462 33.053 33.053 0 016.668-.829V2.75A.75.75 0 0110 2zM5 14c.701 0 1.374-.12 2-.341v-2.948l-2 .001v3.288zm8-3.288v2.948A4.475 4.475 0 0015 14v-3.287l-2-.001z" />
            </svg>
            Annulation gratuite
          </div>
        </div>

        {/* Provider badge */}
        <div className="text-center mt-6">
          <p className="text-xs text-base-content/40">
            Paiements sécurisés par Lemon Squeezy
          </p>
        </div>
      </div>
    </div>
  );
}

// Wrapper with Suspense for useSearchParams
export default function UnifiedCheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><span className="loading loading-spinner loading-lg"></span></div>}>
      <CheckoutContent />
    </Suspense>
  );
}

// Payment Method Option Component
function PaymentMethodOption({
  selected,
  onSelect,
  icon,
  title,
  subtitle,
  badge,
  badgeColor = "bg-success",
  badges = [],
  children,
}) {
  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={`relative p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 touch-manipulation active:scale-[0.99] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-base-100 ${
        selected
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
          : "border-base-content/10 hover:border-primary/40 hover:bg-base-200/50"
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Radio */}
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 ${
          selected ? "border-primary" : "border-base-content/30"
        }`}>
          {selected && <div className="w-3 h-3 rounded-full bg-primary"></div>}
        </div>

        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-base-200 flex items-center justify-center">
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">{title}</h4>
            {badge && (
              <span className={`px-2 py-0.5 text-[10px] font-bold text-white rounded-full ${badgeColor}`}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-sm text-base-content/60">{subtitle}</p>
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {badges.map((b) => (
                <span key={b} className="px-2 py-0.5 text-[10px] bg-base-300 rounded-full">
                  {b}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Children (for extra info) */}
      {selected && children}
    </div>
  );
}
