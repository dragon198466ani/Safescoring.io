"use client";

import { useState, useEffect } from "react";

// Top products to suggest
const SUGGESTED_PRODUCTS = [
  { id: "ledger-nano-x", name: "Ledger Nano X", type: "Hardware Wallet", score: 87 },
  { id: "trezor-model-t", name: "Trezor Model T", type: "Hardware Wallet", score: 85 },
  { id: "metamask", name: "MetaMask", type: "Software Wallet", score: 74 },
  { id: "uniswap", name: "Uniswap", type: "DEX", score: 79 },
  { id: "binance", name: "Binance", type: "Exchange", score: 76 },
  { id: "coinbase", name: "Coinbase", type: "Exchange", score: 81 },
];

const getScoreColor = (score) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
};

export default function StepFirstProduct({ data, onNext, onBack, saving }) {
  const [selected, setSelected] = useState(data.firstProduct || null);
  const [products, setProducts] = useState(SUGGESTED_PRODUCTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopProducts();
  }, []);

  const fetchTopProducts = async () => {
    try {
      const res = await fetch("/api/products?limit=6&sort=score");
      if (res.ok) {
        const data = await res.json();
        if (data.products?.length > 0) {
          setProducts(
            data.products.map((p) => ({
              id: p.slug || p.id,
              name: p.name,
              type: p.product_types?.[0]?.name || "Product",
              score: p.safe_scoring_results?.[0]?.note_finale || 0,
            }))
          );
        }
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
    setLoading(false);
  };

  const handleSubmit = () => {
    onNext({ firstProduct: selected });
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Choose your first product to follow</h2>
        <p className="text-base-content/60">
          Select a product to start tracking. You can add more later.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {products.map((product) => (
            <button
              key={product.id}
              onClick={() => setSelected(product.id)}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                selected === product.id
                  ? "border-primary bg-primary/10"
                  : "border-base-300 hover:border-base-content/20"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-base-300 flex items-center justify-center font-bold text-lg text-primary">
                  {product.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{product.name}</div>
                  <div className="text-sm text-base-content/60">{product.type}</div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getScoreColor(product.score)}`}>
                    {product.score}
                  </div>
                  <div className="text-xs text-base-content/50">SAFE Score</div>
                </div>
                {selected === product.id && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-primary">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="btn btn-ghost">
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="btn btn-primary flex-1"
        >
          {saving ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : selected ? (
            "Continue"
          ) : (
            "Skip for now"
          )}
        </button>
      </div>
    </div>
  );
}
