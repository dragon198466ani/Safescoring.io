"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/common/Modal";
import { toast } from "react-hot-toast";

/**
 * AuditUpgradeModal - One-time purchase modal for security audit
 *
 * Products:
 * - Basic Audit: 9.99€ - Quick analysis with recommendations
 * - Full Audit: 29.99€ - Complete expert analysis + personalized setup
 */

const AUDIT_PRODUCTS = {
  basic: {
    name: "Audit Basique",
    price: 9.99,
    description: "Analyse rapide de votre sécurité crypto",
    features: [
      "Analyse de vos réponses au quiz",
      "Identification des failles principales",
      "Recommandations de produits adaptés",
      "Rapport PDF téléchargeable",
    ],
    variantId: process.env.NEXT_PUBLIC_LS_AUDIT_BASIC_VARIANT_ID || "audit-basic",
  },
  full: {
    name: "Audit Complet Expert",
    price: 29.99,
    description: "Analyse complète par nos experts sécurité",
    features: [
      "Tout l'audit basique +",
      "Analyse personnalisée de votre setup actuel",
      "Setup optimal personnalisé avec scores SAFE",
      "Comparaison détaillée des meilleures solutions",
      "Plan d'action prioritaire",
      "Support email 30 jours",
    ],
    variantId: process.env.NEXT_PUBLIC_LS_AUDIT_FULL_VARIANT_ID || "audit-full",
    isFeatured: true,
  },
};

export default function AuditUpgradeModal({ isOpen, onClose }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState("full");

  const handlePurchase = async (productKey) => {
    if (!session) {
      // Redirect to signin first
      router.push("/signin?callbackUrl=/dashboard?upgrade=audit");
      return;
    }

    setLoading(productKey);

    try {
      const product = AUDIT_PRODUCTS[productKey];

      const res = await fetch("/api/lemonsqueezy/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: product.variantId,
          successUrl: `${window.location.origin}/dashboard?payment=success&product=audit`,
          cancelUrl: `${window.location.origin}/dashboard?upgrade=audit`,
        }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Erreur lors de la création du paiement. Veuillez réessayer.");
      setLoading(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" showCloseButton={true}>
      <Modal.Body>
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-amber-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold mb-2">Audit de Sécurité Crypto</h3>
          <p className="text-base-content/60">
            Obtenez une analyse experte de votre configuration crypto et des recommandations personnalisées.
          </p>
        </div>

        {/* Plan Selection */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {Object.entries(AUDIT_PRODUCTS).map(([key, product]) => (
            <div
              key={key}
              onClick={() => setSelectedPlan(key)}
              className={`rounded-2xl border-2 p-5 cursor-pointer transition-all ${
                selectedPlan === key
                  ? product.isFeatured
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                    : "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30"
                  : "border-base-300 hover:border-base-content/30"
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{product.name}</span>
                    {product.isFeatured && (
                      <span className="badge badge-primary badge-xs">Recommandé</span>
                    )}
                  </div>
                  <p className="text-xs text-base-content/60 mt-1">{product.description}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedPlan === key
                    ? product.isFeatured ? "border-primary bg-primary" : "border-amber-500 bg-amber-500"
                    : "border-base-300"
                }`}>
                  {selectedPlan === key && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-bold">{product.price}€</span>
                <span className="text-xs text-base-content/60">paiement unique</span>
              </div>

              {/* Features */}
              <ul className="space-y-2">
                {product.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-success flex-shrink-0 mt-0.5">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={() => handlePurchase(selectedPlan)}
          disabled={loading !== null}
          className={`btn w-full h-14 text-base gap-2 ${
            AUDIT_PRODUCTS[selectedPlan].isFeatured ? "btn-primary" : "btn-warning"
          }`}
        >
          {loading !== null ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Commander mon audit - {AUDIT_PRODUCTS[selectedPlan].price}€
            </>
          )}
        </button>

        {/* Trust indicators */}
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-base-content/40">
          <div className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            Paiement sécurisé
          </div>
          <div className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
            CB, PayPal, Crypto
          </div>
          <div className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
            Satisfait ou remboursé
          </div>
        </div>

        {/* Sign in prompt for anonymous users */}
        {!session && (
          <p className="text-center text-xs text-base-content/50 mt-4">
            Vous devrez vous connecter pour finaliser l'achat
          </p>
        )}
      </Modal.Body>
    </Modal>
  );
}
