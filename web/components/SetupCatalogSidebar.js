"use client";

import { useState, useMemo } from "react";
import ProductLogo from "@/components/ProductLogo";
import { getScoreColor } from "@/components/ScoreCircle";
import FreeLimitsExhausted from "@/components/FreeLimitsExhausted";
import config from "@/config";
import { useApi } from "@/hooks/useApi";

/**
 * Product type filters
 */
const PRODUCT_TYPES = [
  { id: "all", label: "Tous", icon: "🔍" },
  { id: "hardware_wallet", label: "Hardware", icon: "🔐" },
  { id: "software_wallet", label: "Software", icon: "📱" },
  { id: "exchange", label: "Exchange", icon: "💱" },
  { id: "defi", label: "DeFi", icon: "🌾" },
];

/**
 * Get product limits from config
 */
const getProductLimits = () => {
  const plans = config.lemonsqueezy?.plans || [];
  const free = plans.find(p => p.planCode === "free")?.limits?.maxProductsPerSetup || 3;
  const explorer = plans.find(p => p.planCode === "explorer")?.limits?.maxProductsPerSetup || 5;
  const pro = plans.find(p => p.planCode === "pro")?.limits?.maxProductsPerSetup || 10;
  const enterprise = plans.find(p => p.planCode === "enterprise")?.limits?.maxProductsPerSetup || -1;
  return { free, explorer, pro, enterprise };
};

const PRODUCT_LIMITS = getProductLimits();

/**
 * Single product card for catalog
 */
function CatalogProductCard({ product, onAdd, onAddToCart, isAdded, isInCart, disabled }) {
  const score = product.scores?.note_finale || product.score;

  return (
    <div
      className={`w-full p-3 rounded-xl border text-left transition-all ${
        isAdded
          ? "bg-primary/10 border-primary/40"
          : isInCart
          ? "bg-amber-500/10 border-amber-500/40"
          : disabled
          ? "bg-base-300/30 border-base-content/5 opacity-50"
          : "bg-base-300/50 border-base-content/5 hover:border-primary/40 hover:bg-base-300"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <ProductLogo
            logoUrl={product.logo_url || (product.slug ? `https://www.google.com/s2/favicons?domain=${product.slug}.com&sz=128` : null)}
            name={product.name}
            size="sm"
          />
          {isAdded && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-2.5 h-2.5 text-primary-content">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
          )}
          {isInCart && !isAdded && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-2.5 h-2.5 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{product.name}</p>
          <p className="text-xs text-base-content/50 truncate">
            {product.product_types?.name || product.type_name || ""}
          </p>
        </div>

        {score && (
          <div className={`text-sm font-bold ${getScoreColor(score)}`}>
            {score}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {!isAdded && !isInCart && (
            <>
              {/* Add to cart */}
              <button
                onClick={() => onAddToCart?.(product)}
                disabled={disabled}
                className="btn btn-ghost btn-xs btn-circle text-amber-500 hover:bg-amber-500/10"
                title="Ajouter au panier"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
              </button>
              {/* Add directly */}
              <button
                onClick={() => onAdd?.(product)}
                disabled={disabled}
                className="btn btn-ghost btn-xs btn-circle text-primary hover:bg-primary/10"
                title="Ajouter au setup"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            </>
          )}
          {isInCart && !isAdded && (
            <button
              onClick={() => onAddToCart?.(product)}
              className="btn btn-ghost btn-xs btn-circle text-red-400 hover:bg-red-500/10"
              title="Retirer du panier"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Cart/Panier component
 */
function ProductCart({ items, onRemove, onAddAll, onClear }) {
  if (items.length === 0) return null;

  return (
    <div className="p-3 bg-amber-500/10 border-t border-amber-500/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-amber-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
          <span className="text-sm font-medium text-amber-500">Panier ({items.length})</span>
        </div>
        <button
          onClick={onClear}
          className="text-xs text-red-400 hover:underline"
        >
          Vider
        </button>
      </div>

      {/* Cart items preview */}
      <div className="flex flex-wrap gap-1 mb-2">
        {items.slice(0, 5).map(item => (
          <div
            key={item.id}
            className="flex items-center gap-1 px-2 py-1 bg-base-200 rounded-lg text-xs"
          >
            <span className="truncate max-w-20">{item.name}</span>
            <button
              onClick={() => onRemove(item)}
              className="text-red-400 hover:text-red-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        {items.length > 5 && (
          <span className="text-xs text-base-content/50 px-2 py-1">+{items.length - 5}</span>
        )}
      </div>

      {/* Add all button */}
      <button
        onClick={onAddAll}
        className="btn btn-warning btn-sm w-full gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Ajouter tout au setup
      </button>
    </div>
  );
}

export default function SetupCatalogSidebar({
  addedProductIds = [],
  onAddProduct,
  maxHeight = "400px",
  productLimit = 3,
  isPaid = false,
  onLimitReached,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [cart, setCart] = useState([]);

  // Fetch products catalog with useApi (5-minute cache)
  const { data: productsData, isLoading: loading } = useApi("/api/products?limit=100", {
    ttl: 5 * 60 * 1000,
  });
  const products = useMemo(() => productsData?.products || [], [productsData]);

  // Calculate actual limit (use prop if provided, otherwise use defaults)
  const actualLimit = productLimit || (isPaid ? PRODUCT_LIMITS.pro : PRODUCT_LIMITS.free);
  const currentCount = addedProductIds.length;
  const remainingSlots = actualLimit === -1 ? 999 : actualLimit - currentCount;
  const isAtLimit = actualLimit !== -1 && currentCount >= actualLimit;

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = !searchQuery ||
        product.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === "all" ||
        product.type_code === selectedType;
      return matchesSearch && matchesType;
    });
  }, [products, searchQuery, selectedType]);

  // Determine default role based on product type
  const getDefaultRole = (product) => {
    if (product.type_code?.includes("wallet")) return "wallet";
    if (product.type_code === "exchange") return "exchange";
    if (product.type_code === "defi") return "defi";
    return "other";
  };

  // Handle add product
  const handleAdd = (product) => {
    if (isAtLimit) {
      onLimitReached?.();
      return;
    }
    const role = getDefaultRole(product);
    onAddProduct?.(product, role);
  };

  // Handle cart operations
  const handleAddToCart = (product) => {
    const isInCart = cart.some(p => p.id === product.id);
    if (isInCart) {
      setCart(cart.filter(p => p.id !== product.id));
    } else {
      if (cart.length + currentCount >= actualLimit && actualLimit !== -1) {
        onLimitReached?.();
        return;
      }
      setCart([...cart, product]);
    }
  };

  const handleAddAllFromCart = () => {
    if (cart.length + currentCount > actualLimit && actualLimit !== -1) {
      onLimitReached?.();
      return;
    }
    cart.forEach(product => {
      const role = getDefaultRole(product);
      onAddProduct?.(product, role);
    });
    setCart([]);
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const cartProductIds = cart.map(p => p.id);

  return (
    <div className="bg-base-200 rounded-xl border border-base-300 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-base-300">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Catalogue
          </h3>

          {/* Limit indicator */}
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs ${
            isAtLimit ? 'bg-amber-500/20 text-amber-400' : 'bg-base-300 text-base-content/60'
          }`}>
            {isAtLimit ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            ) : null}
            <span>{currentCount}/{actualLimit === -1 ? '∞' : actualLimit}</span>
          </div>
        </div>

        {/* Limit warning - use inline FreeLimitsExhausted */}
        {isAtLimit && (
          <div className="mb-3">
            <FreeLimitsExhausted
              usedProducts={currentCount}
              maxProducts={actualLimit}
              onUpgradeClick={onLimitReached}
              variant="inline"
            />
          </div>
        )}

        {/* Search */}
        <div className="relative mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className="input input-sm input-bordered w-full pl-9 bg-base-300/50"
          />
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>

        {/* Type filters */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {PRODUCT_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`px-2 py-1 rounded-lg text-xs whitespace-nowrap transition-all ${
                selectedType === type.id
                  ? "bg-primary text-primary-content"
                  : "bg-base-300/50 text-base-content/70 hover:bg-base-300"
              }`}
            >
              <span className="mr-1">{type.icon}</span>
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cart */}
      <ProductCart
        items={cart}
        onRemove={(p) => setCart(cart.filter(item => item.id !== p.id))}
        onAddAll={handleAddAllFromCart}
        onClear={handleClearCart}
      />

      {/* Products list */}
      <div
        className="p-3 space-y-2 overflow-y-auto"
        style={{ maxHeight }}
      >
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-14 bg-base-300/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-6 text-base-content/40">
            <p className="text-sm">Aucun produit trouvé</p>
          </div>
        ) : (
          filteredProducts.map(product => (
            <CatalogProductCard
              key={product.id}
              product={product}
              onAdd={handleAdd}
              onAddToCart={handleAddToCart}
              isAdded={addedProductIds.includes(product.id)}
              isInCart={cartProductIds.includes(product.id)}
              disabled={isAtLimit && !addedProductIds.includes(product.id) && !cartProductIds.includes(product.id)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-base-100/50 border-t border-base-content/5 flex items-center justify-between text-xs text-base-content/40">
        <span>{filteredProducts.length} produits</span>
        {!isPaid && (
          <span className="text-amber-400">Plan gratuit: {PRODUCT_LIMITS.free} produits max</span>
        )}
      </div>
    </div>
  );
}
