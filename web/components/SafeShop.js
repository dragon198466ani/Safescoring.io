"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

/**
 * SafeShop - Boutique pour dépenser ses $SAFE
 */
export default function SafeShop() {
  const { data: session } = useSession();
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);

  useEffect(() => {
    fetchShop();
  }, [session]);

  const fetchShop = async () => {
    try {
      const res = await fetch("/api/shop");
      const data = await res.json();
      setShop(data);
    } catch (err) {
      console.error("Error fetching shop:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (itemId) => {
    if (!session) {
      window.location.href = "/signin";
      return;
    }

    setPurchasing(itemId);
    try {
      const res = await fetch("/api/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });

      const data = await res.json();

      if (data.success) {
        alert(`🎉 Acheté ! Nouveau solde: ${data.new_balance} $SAFE`);
        fetchShop(); // Refresh
      } else {
        alert(data.error || "Erreur lors de l'achat");
      }
    } catch (err) {
      console.error("Purchase error:", err);
      alert("Erreur lors de l'achat");
    } finally {
      setPurchasing(null);
    }
  };

  const hasItem = (itemId) => {
    return shop?.userItems?.some(
      (i) => i.item_id === itemId && i.status !== "expired"
    );
  };

  const hasBadge = (badgeId) => {
    return shop?.userBadges?.some((b) => b.badge_id === badgeId);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-base-300 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  const { items, balance } = shop || {};

  return (
    <div className="space-y-8">
      {/* Header avec balance */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg">
        <div>
          <p className="text-sm text-base-content/60">Ton solde</p>
          <p className="text-2xl font-bold">
            {balance?.toLocaleString() || 0} <span className="text-primary">$SAFE</span>
          </p>
        </div>
        <a href="/products" className="btn btn-primary btn-sm">
          Gagner plus →
        </a>
      </div>

      {/* Premium */}
      <Section title="⭐ Premium" subtitle="Débloquer toutes les fonctionnalités">
        <div className="grid gap-4 sm:grid-cols-3">
          {items?.premium?.map((item) => (
            <ShopItem
              key={item.id}
              item={item}
              owned={hasItem(item.id)}
              canAfford={balance >= item.price_safe}
              purchasing={purchasing === item.id}
              onPurchase={() => handlePurchase(item.id)}
            />
          ))}
        </div>
      </Section>

      {/* Badges */}
      <Section title="🏆 Badges" subtitle="Affichés sur ton profil">
        <div className="grid gap-4 sm:grid-cols-4">
          {items?.badge?.map((item) => (
            <BadgeItem
              key={item.id}
              item={item}
              owned={hasBadge(item.id)}
              canAfford={balance >= item.price_safe}
              purchasing={purchasing === item.id}
              onPurchase={() => handlePurchase(item.id)}
            />
          ))}
        </div>
      </Section>

      {/* Features */}
      <Section title="🚀 Fonctionnalités" subtitle="Boosts temporaires">
        <div className="grid gap-4 sm:grid-cols-3">
          {items?.feature?.map((item) => (
            <ShopItem
              key={item.id}
              item={item}
              owned={hasItem(item.id)}
              canAfford={balance >= item.price_safe}
              purchasing={purchasing === item.id}
              onPurchase={() => handlePurchase(item.id)}
            />
          ))}
        </div>
      </Section>

      {/* Mes badges */}
      {shop?.userBadges?.length > 0 && (
        <Section title="✨ Mes badges">
          <div className="flex flex-wrap gap-2">
            {shop.userBadges.map((badge) => (
              <div
                key={badge.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-base-200 rounded-full"
                style={{ borderColor: badge.badge_color, borderWidth: 2 }}
              >
                <span>{badge.badge_emoji}</span>
                <span className="text-sm font-medium">{badge.badge_name}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-1">{title}</h2>
      {subtitle && <p className="text-sm text-base-content/60 mb-4">{subtitle}</p>}
      {children}
    </div>
  );
}

function ShopItem({ item, owned, canAfford, purchasing, onPurchase }) {
  return (
    <div className={`card bg-base-200 p-4 ${owned ? "opacity-60" : ""}`}>
      <h3 className="font-semibold">{item.name}</h3>
      <p className="text-sm text-base-content/60 mb-3">{item.description}</p>

      {item.duration_days && (
        <p className="text-xs text-base-content/50 mb-2">
          Durée: {item.duration_days} jours
        </p>
      )}

      <div className="flex items-center justify-between mt-auto">
        <span className="font-bold text-primary">{item.price_safe} $SAFE</span>

        {owned ? (
          <span className="badge badge-success">Actif</span>
        ) : (
          <button
            onClick={onPurchase}
            disabled={!canAfford || purchasing}
            className={`btn btn-sm ${canAfford ? "btn-primary" : "btn-disabled"}`}
          >
            {purchasing ? (
              <span className="loading loading-spinner loading-xs" />
            ) : canAfford ? (
              "Acheter"
            ) : (
              "Pas assez"
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function BadgeItem({ item, owned, canAfford, purchasing, onPurchase }) {
  return (
    <div
      className={`card bg-base-200 p-4 text-center ${owned ? "ring-2 ring-success" : ""}`}
    >
      <div
        className="text-4xl mb-2 mx-auto w-16 h-16 flex items-center justify-center rounded-full"
        style={{ backgroundColor: item.badge_color + "20" }}
      >
        {item.badge_emoji}
      </div>
      <h3 className="font-semibold">{item.name}</h3>
      <p className="text-xs text-base-content/60 mb-3">{item.description}</p>

      <div className="mt-auto">
        {owned ? (
          <span className="badge badge-success">Obtenu ✓</span>
        ) : (
          <>
            <p className="font-bold text-primary mb-2">{item.price_safe} $SAFE</p>
            <button
              onClick={onPurchase}
              disabled={!canAfford || purchasing}
              className={`btn btn-sm w-full ${canAfford ? "btn-primary" : "btn-disabled"}`}
            >
              {purchasing ? (
                <span className="loading loading-spinner loading-xs" />
              ) : canAfford ? (
                "Obtenir"
              ) : (
                "Pas assez"
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
