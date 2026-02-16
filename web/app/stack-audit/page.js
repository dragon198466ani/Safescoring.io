"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import ProductLogo from "@/components/ProductLogo";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";

/**
 * Stack Audit - Analyze compatibility between products in your stack
 * Shows compatibility matrix with justifications
 */

const getCompatibilityColor = (status) => {
  switch (status) {
    case "excellent": return "text-green-400 bg-green-500/10 border-green-500/30";
    case "good": return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    case "limited": return "text-orange-400 bg-orange-500/10 border-orange-500/30";
    case "incompatible": return "text-red-400 bg-red-500/10 border-red-500/30";
    default: return "text-base-content/50 bg-base-300/50 border-base-300";
  }
};

const getCompatibilityLabel = (status) => {
  switch (status) {
    case "excellent": return "Strong";
    case "good": return "Moderate";
    case "limited": return "Developing";
    case "incompatible": return "Incompatible";
    default: return "Not analyzed";
  }
};

const getCompatibilityIcon = (status) => {
  switch (status) {
    case "excellent":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "good":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "limited":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      );
    case "incompatible":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
      );
  }
};

function CompatibilityCard({ compatibility }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-xl border p-4 transition-all cursor-pointer hover:shadow-lg ${getCompatibilityColor(compatibility.status)}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="mt-1">
          {getCompatibilityIcon(compatibility.status)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Products */}
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-sm truncate">{compatibility.product_a_name}</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 opacity-50">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
            <span className="font-semibold text-sm truncate">{compatibility.product_b_name}</span>
          </div>

          {/* Status & Confidence */}
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-medium uppercase tracking-wide">
              {getCompatibilityLabel(compatibility.status)}
            </span>
            {compatibility.ai_confidence !== null && (
              <span className="text-xs opacity-70">
                {Math.round(compatibility.ai_confidence * 100)}% confidence
              </span>
            )}
          </div>

          {/* Justification - Always visible */}
          {compatibility.ai_justification && (
            <p className="text-sm opacity-90 leading-relaxed">
              {compatibility.ai_justification}
            </p>
          )}

          {/* Method - Show on expand */}
          {expanded && compatibility.ai_method && (
            <div className="mt-3 pt-3 border-t border-current/10">
              <p className="text-xs opacity-70 mb-1">Integration method:</p>
              <p className="text-sm">{compatibility.ai_method}</p>
            </div>
          )}

          {/* Steps - Show on expand */}
          {expanded && compatibility.ai_steps && (
            <div className="mt-3">
              <p className="text-xs opacity-70 mb-1">Steps:</p>
              <p className="text-sm whitespace-pre-line">{compatibility.ai_steps}</p>
            </div>
          )}

          {/* Limitations - Show on expand */}
          {expanded && compatibility.ai_limitations && (
            <div className="mt-3 p-2 rounded-lg bg-base-content/5">
              <p className="text-xs opacity-70 mb-1">⚠️ Limitations:</p>
              <p className="text-sm">{compatibility.ai_limitations}</p>
            </div>
          )}
        </div>

        {/* Expand indicator */}
        <div className="opacity-50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function ProductSelector({ products, selectedIds, onToggle }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {products.map(product => {
        const isSelected = selectedIds.includes(product.id);
        return (
          <button
            key={product.id}
            onClick={() => onToggle(product.id)}
            className={`p-3 rounded-xl border transition-all text-left ${
              isSelected
                ? "bg-primary/10 border-primary/50 ring-2 ring-primary/20"
                : "bg-base-200 border-base-300 hover:border-primary/30"
            }`}
          >
            <div className="flex items-center gap-2">
              <ProductLogo logoUrl={product.logo_url} name={product.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{product.name}</p>
                <p className="text-xs text-base-content/50 truncate">{product.type_name}</p>
              </div>
              {isSelected && (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-primary shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function StackAuditPage() {
  const [products, setProducts] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [compatibility, setCompatibility] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch available products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("/api/products?limit=100");
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        }
      } catch (err) {
        console.error("Failed to fetch products:", err);
      }
      setLoadingProducts(false);
    };
    fetchProducts();
  }, []);

  // Fetch compatibility when selection changes
  useEffect(() => {
    const fetchCompatibility = async () => {
      if (selectedProductIds.length < 2) {
        setCompatibility(null);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/compatibility?products=${selectedProductIds.join(",")}`);
        if (res.ok) {
          const data = await res.json();
          setCompatibility(data);
        }
      } catch (err) {
        console.error("Failed to fetch compatibility:", err);
      }
      setLoading(false);
    };

    fetchCompatibility();
  }, [selectedProductIds]);

  // Toggle product selection
  const handleToggleProduct = (productId) => {
    setSelectedProductIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // Filter products by search
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    return products.filter(p =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  // Sort compatibility by status (issues first)
  const sortedCompatibility = useMemo(() => {
    if (!compatibility?.compatibility) return [];
    return [...compatibility.compatibility].sort((a, b) => {
      const order = { incompatible: 0, limited: 1, unknown: 2, good: 3, excellent: 4 };
      return (order[a.status] || 5) - (order[b.status] || 5);
    });
  }, [compatibility]);

  return (
    <>
    <Header />
    <main className="min-h-screen pt-24 pb-16 px-6 hero-bg">
    <div className="max-w-7xl mx-auto">
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Stack Audit" },
      ]} />

      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Stack Audit</h1>
        <p className="text-base-content/60">
          Select products to analyze how well they work together
        </p>
      </div>

      {/* Product Selection */}
      <div className="bg-base-200 rounded-2xl border border-base-300 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Select Products</h2>
          <span className="text-sm text-base-content/50">
            {selectedProductIds.length} selected
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="input input-bordered w-full pl-10 bg-base-100"
          />
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>

        {loadingProducts ? (
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-base-300 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto">
            <ProductSelector
              products={filteredProducts}
              selectedIds={selectedProductIds}
              onToggle={handleToggleProduct}
            />
          </div>
        )}

        {selectedProductIds.length > 0 && (
          <div className="mt-4 pt-4 border-t border-base-300 flex justify-between items-center">
            <button
              onClick={() => setSelectedProductIds([])}
              className="btn btn-ghost btn-sm"
            >
              Clear selection
            </button>
            <span className="text-sm text-base-content/50">
              {(selectedProductIds.length * (selectedProductIds.length - 1)) / 2} pairs to analyze
            </span>
          </div>
        )}
      </div>

      {/* Results */}
      {selectedProductIds.length >= 2 && (
        <div className="space-y-6">
          {/* Summary */}
          {compatibility?.summary && (
            <div className={`rounded-2xl border p-6 ${
              compatibility.summary.overallStatus === "issues"
                ? "bg-red-500/10 border-red-500/30"
                : compatibility.summary.overallStatus === "excellent"
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-base-200 border-base-300"
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Compatibility Summary</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  compatibility.summary.overallStatus === "issues"
                    ? "bg-red-500/20 text-red-400"
                    : compatibility.summary.overallStatus === "excellent"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-base-300 text-base-content/70"
                }`}>
                  {compatibility.summary.overallStatus === "issues"
                    ? "Issues Found"
                    : compatibility.summary.overallStatus === "excellent"
                      ? "All Compatible"
                      : compatibility.summary.overallStatus === "incomplete"
                        ? "Partially Analyzed"
                        : "Good"}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">{compatibility.summary.compatiblePairs}</p>
                  <p className="text-xs text-base-content/50">Compatible</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-400">{compatibility.summary.incompatiblePairs}</p>
                  <p className="text-xs text-base-content/50">Incompatible</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{compatibility.summary.avgConfidence}%</p>
                  <p className="text-xs text-base-content/50">Avg. Confidence</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-base-content/50">{compatibility.summary.missingPairs}</p>
                  <p className="text-xs text-base-content/50">Not Analyzed</p>
                </div>
              </div>

              {/* Issues alert */}
              {compatibility.issues?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-current/10">
                  <p className="text-sm font-medium mb-2">⚠️ Attention Required:</p>
                  <ul className="space-y-1">
                    {compatibility.issues.map((issue, i) => (
                      <li key={i} className="text-sm opacity-80">
                        <span className="font-medium">{issue.products.join(" & ")}</span>: {issue.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Compatibility List */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Detailed Analysis</h2>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 bg-base-300 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : sortedCompatibility.length > 0 ? (
              <div className="space-y-3">
                {sortedCompatibility.map(comp => (
                  <CompatibilityCard key={comp.id} compatibility={comp} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-base-content/50 bg-base-200 rounded-2xl border border-base-300">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto mb-3 opacity-50">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
                <p className="font-medium mb-1">No compatibility data yet</p>
                <p className="text-sm">These product pairs haven&apos;t been analyzed yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {selectedProductIds.length < 2 && (
        <div className="text-center py-16 text-base-content/50">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto mb-4 opacity-50">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
          <p className="text-lg font-medium mb-2">Select at least 2 products</p>
          <p className="text-sm">to analyze their compatibility</p>
        </div>
      )}

      {/* Link to build setup */}
      <div className="mt-8 text-center">
        <Link href="/dashboard/setups" className="btn btn-outline btn-primary">
          Build Your Full Stack
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>
    </div>
    </main>
    <Footer />
    </>
  );
}
