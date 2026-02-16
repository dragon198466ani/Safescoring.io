"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import ProductLogo from "@/components/ProductLogo";

/**
 * CompareProductPicker - Interactive dual product selector for /compare page
 * Lets users search/select two products and navigate to their comparison
 */
export default function CompareProductPicker({ products = [], categoryLabels = {} }) {
  const router = useRouter();
  const [productA, setProductA] = useState(null);
  const [productB, setProductB] = useState(null);
  const [searchA, setSearchA] = useState("");
  const [searchB, setSearchB] = useState("");
  const [focusA, setFocusA] = useState(false);
  const [focusB, setFocusB] = useState(false);

  const filteredA = useMemo(() => {
    if (!searchA.trim()) return products.slice(0, 20);
    const q = searchA.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [searchA, products]);

  const filteredB = useMemo(() => {
    if (!searchB.trim()) return products.slice(0, 20);
    const q = searchB.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [searchB, products]);

  const canCompare = productA && productB && productA.slug !== productB.slug;

  const handleCompare = () => {
    if (canCompare) {
      router.push(`/compare/${productA.slug}/${productB.slug}`);
    }
  };

  const selectProduct = (product, side) => {
    if (side === "A") {
      setProductA(product);
      setSearchA(product.name);
      setFocusA(false);
    } else {
      setProductB(product);
      setSearchB(product.name);
      setFocusB(false);
    }
  };

  const clearProduct = (side) => {
    if (side === "A") {
      setProductA(null);
      setSearchA("");
    } else {
      setProductB(null);
      setSearchB("");
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-amber-400";
    return "text-red-400";
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return "Strong";
    if (score >= 60) return "Moderate";
    return "Developing";
  };

  const ProductSelector = ({ selected, search, setSearch, filtered, focus, setFocus, side }) => (
    <div className="relative flex-1">
      <label className="text-sm font-medium text-base-content/60 mb-2 block">
        {side === "A" ? "Product 1" : "Product 2"}
      </label>
      {selected ? (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-base-300 border border-base-content/10">
          <ProductLogo logoUrl={selected.logoUrl} name={selected.name} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{selected.name}</div>
            <div className="text-xs text-base-content/50">{selected.type}</div>
          </div>
          <div className="text-right">
            <span className={`text-lg font-bold ${getScoreColor(selected.score)}`}>
              {selected.score}
            </span>
            <span className={`block text-xs ${getScoreColor(selected.score)}`}>
              {getScoreLabel(selected.score)}
            </span>
          </div>
          <button
            onClick={() => clearProduct(side)}
            className="btn btn-ghost btn-xs text-error"
            aria-label="Clear selection"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setFocus(true)}
            onBlur={() => setTimeout(() => setFocus(false), 200)}
            placeholder="Search by name or type..."
            className="input input-bordered w-full"
          />
          {focus && filtered.length > 0 && (
            <div className="absolute z-50 top-full mt-1 w-full bg-base-100 border border-base-300 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
              {filtered.map((product) => (
                <button
                  key={product.slug}
                  onMouseDown={() => selectProduct(product, side)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-base-200 transition-colors text-left"
                >
                  <ProductLogo logoUrl={product.logoUrl} name={product.name} size="xs" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{product.name}</div>
                    <div className="text-xs text-base-content/50">{product.type}</div>
                  </div>
                  <span className={`text-sm font-bold ${getScoreColor(product.score)}`} title={getScoreLabel(product.score)}>
                    {product.score}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="rounded-xl bg-base-200 border border-base-300 p-8 mb-12">
      <h2 className="text-xl font-bold mb-2 text-center">Create Custom Comparison</h2>
      <p className="text-center text-base-content/60 mb-8">
        Select two products to compare their security scores side by side.
      </p>

      <div className="flex flex-col md:flex-row items-end gap-4">
        <ProductSelector
          selected={productA}
          search={searchA}
          setSearch={setSearchA}
          filtered={filteredA}
          focus={focusA}
          setFocus={setFocusA}
          side="A"
        />

        <div className="flex items-center justify-center pb-1">
          <span className="text-2xl font-bold text-base-content/30">vs</span>
        </div>

        <ProductSelector
          selected={productB}
          search={searchB}
          setSearch={setSearchB}
          filtered={filteredB}
          focus={focusB}
          setFocus={setFocusB}
          side="B"
        />

        <button
          onClick={handleCompare}
          disabled={!canCompare}
          className="btn btn-primary min-w-[140px]"
        >
          Compare
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>

      {productA && productB && productA.slug === productB.slug && (
        <p className="text-center text-sm text-warning mt-4">
          Please select two different products to compare.
        </p>
      )}
    </div>
  );
}
