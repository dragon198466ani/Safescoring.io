"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

/**
 * SafeTokenShop - Premium content marketplace
 * Users spend $SAFE tokens to unlock analyses, request evaluations, etc.
 */
export default function SafeTokenShop({ productSlug = null, setupId = null }) {
  const { data: session } = useSession();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [activeTab, setActiveTab] = useState("content");

  // Premium content catalog
  const contentCatalog = [
    {
      type: "deep_analysis",
      name: "Analyse Complète",
      description: "Analyse détaillée des 916 normes avec justifications IA",
      price: 20,
      icon: "🔬",
      requiresProduct: true,
    },
    {
      type: "pillar_breakdown",
      name: "Détail par Pilier",
      description: "Breakdown S/A/F/E avec points forts et faiblesses",
      price: 10,
      icon: "📊",
      requiresProduct: true,
    },
    {
      type: "risk_report",
      name: "Rapport de Risques",
      description: "Identification des vulnérabilités et recommandations",
      price: 15,
      icon: "⚠️",
      requiresProduct: true,
    },
    {
      type: "setup_analysis",
      name: "Analyse Setup Complète",
      description: "Audit détaillé de ton setup avec recommandations",
      price: 25,
      icon: "🛡️",
      requiresSetup: true,
    },
    {
      type: "setup_comparison",
      name: "Comparaison Setups",
      description: "Compare ton setup avec les meilleurs du marché",
      price: 15,
      icon: "⚖️",
      requiresSetup: true,
    },
    {
      type: "pdf_report",
      name: "Rapport PDF Produit",
      description: "PDF exportable avec analyse complète",
      price: 15,
      icon: "📄",
      requiresProduct: true,
    },
    {
      type: "pdf_setup",
      name: "Rapport PDF Setup",
      description: "PDF de ton setup à partager/archiver",
      price: 20,
      icon: "📑",
      requiresSetup: true,
    },
    {
      type: "security_guide",
      name: "Guide Sécurité Avancé",
      description: "Guide complet pour sécuriser tes cryptos",
      price: 30,
      icon: "🔐",
      requiresProduct: false,
      requiresSetup: false,
    },
    {
      type: "opsec_checklist",
      name: "Checklist OPSEC",
      description: "Liste de vérification sécurité personnalisée",
      price: 10,
      icon: "✅",
      requiresProduct: false,
      requiresSetup: false,
    },
  ];

  useEffect(() => {
    if (session?.user?.id) {
      fetchBalance();
      fetchPurchases();
    } else {
      setLoading(false);
    }
  }, [session]);

  const fetchBalance = async () => {
    try {
      const res = await fetch("/api/user/points");
      if (res.ok) {
        const data = await res.json();
        setBalance(data);
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  const fetchPurchases = async () => {
    try {
      const res = await fetch("/api/shop/purchases");
      if (res.ok) {
        const data = await res.json();
        setPurchases(data.purchases || []);
      }
    } catch (error) {
      console.error("Error fetching purchases:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (contentType, referenceId = null) => {
    if (!session) {
      toast.error("Connecte-toi pour acheter du contenu");
      return;
    }

    setPurchasing(contentType);

    try {
      const res = await fetch("/api/shop/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_type: contentType,
          reference_id: referenceId || productSlug || setupId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`${data.content} débloqué !`);
        fetchBalance();
        fetchPurchases();
      } else {
        toast.error(data.error || "Échec de l'achat");
      }
    } catch (error) {
      toast.error("Erreur lors de l'achat");
    } finally {
      setPurchasing(null);
    }
  };

  const hasAlreadyPurchased = (contentType, referenceId) => {
    return purchases.some(
      (p) =>
        p.content_type === contentType &&
        (p.reference_id === referenceId || (!referenceId && !p.reference_id))
    );
  };

  const getFilteredContent = () => {
    return contentCatalog.filter((item) => {
      if (item.requiresProduct && !productSlug) return false;
      if (item.requiresSetup && !setupId) return false;
      return true;
    });
  };

  if (!session) {
    return (
      <div className="bg-base-200 rounded-xl p-6 text-center">
        <div className="text-4xl mb-4">🔐</div>
        <h3 className="text-lg font-bold mb-2">Token Shop</h3>
        <p className="text-base-content/70 mb-4">
          Connecte-toi pour accéder au shop et dépenser tes $SAFE tokens
        </p>
        <a href="/signin" className="btn btn-primary btn-sm">
          Se connecter
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-base-200 rounded-xl p-6">
        <div className="flex items-center justify-center gap-2">
          <span className="loading loading-spinner loading-sm"></span>
          <span>Chargement du shop...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-base-200 rounded-xl overflow-hidden">
      {/* Header with balance */}
      <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 p-4 border-b border-base-300">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span>🪙</span> Token Shop
            </h3>
            <p className="text-sm text-base-content/70">
              Dépense tes $SAFE pour débloquer du contenu premium
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-amber-500">
              {balance?.available_balance || 0}
            </div>
            <div className="text-xs text-base-content/60">$SAFE disponibles</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-base-300 m-4 mb-0">
        <button
          className={`tab ${activeTab === "content" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("content")}
        >
          Contenu Premium
        </button>
        <button
          className={`tab ${activeTab === "purchases" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("purchases")}
        >
          Mes Achats ({purchases.length})
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === "content" && (
          <div className="grid gap-3">
            {getFilteredContent().map((item) => {
              const referenceId = item.requiresProduct
                ? productSlug
                : item.requiresSetup
                ? setupId
                : null;
              const alreadyOwned = hasAlreadyPurchased(item.type, referenceId);
              const canAfford = (balance?.available_balance || 0) >= item.price;

              return (
                <div
                  key={item.type}
                  className={`bg-base-100 rounded-lg p-4 flex items-center gap-4 ${
                    alreadyOwned ? "opacity-60" : ""
                  }`}
                >
                  <div className="text-3xl">{item.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.name}</h4>
                    <p className="text-sm text-base-content/70">
                      {item.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-amber-500 mb-1">
                      {item.price} $SAFE
                    </div>
                    {alreadyOwned ? (
                      <span className="badge badge-success badge-sm">Débloqué</span>
                    ) : (
                      <button
                        className={`btn btn-sm ${
                          canAfford ? "btn-primary" : "btn-disabled"
                        }`}
                        onClick={() => handlePurchase(item.type, referenceId)}
                        disabled={purchasing === item.type || !canAfford}
                      >
                        {purchasing === item.type ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : canAfford ? (
                          "Acheter"
                        ) : (
                          "Solde insuffisant"
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {getFilteredContent().length === 0 && (
              <div className="text-center py-8 text-base-content/60">
                <p>Sélectionne un produit ou un setup pour voir le contenu disponible</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "purchases" && (
          <div className="space-y-3">
            {purchases.length === 0 ? (
              <div className="text-center py-8 text-base-content/60">
                <div className="text-4xl mb-2">📦</div>
                <p>Aucun achat pour le moment</p>
              </div>
            ) : (
              purchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="bg-base-100 rounded-lg p-4 flex items-center gap-4"
                >
                  <div className="text-2xl">
                    {contentCatalog.find((c) => c.type === purchase.content_type)
                      ?.icon || "📄"}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">
                      {contentCatalog.find((c) => c.type === purchase.content_type)
                        ?.name || purchase.content_type}
                    </h4>
                    {purchase.reference_id && (
                      <p className="text-sm text-base-content/70">
                        Réf: {purchase.reference_id}
                      </p>
                    )}
                    <p className="text-xs text-base-content/50">
                      {new Date(purchase.purchased_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="badge badge-outline">
                    -{purchase.tokens_spent} $SAFE
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Earn more tokens CTA */}
      <div className="p-4 pt-0">
        <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold">Besoin de plus de tokens ?</p>
            <p className="text-sm text-base-content/70">
              Vote sur les évaluations pour gagner des $SAFE
            </p>
          </div>
          <a href="/community" className="btn btn-sm btn-outline">
            Gagner des tokens
          </a>
        </div>
      </div>
    </div>
  );
}
