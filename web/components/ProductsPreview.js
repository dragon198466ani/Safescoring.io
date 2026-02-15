"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

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

const ScoreCircle = ({ score, size = 48, strokeWidth = 4 }) => {
  const validScore = score ?? 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (validScore / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`Score: ${score != null ? Math.round(score) : "N/A"} — ${score != null ? getScoreLabel(score) : "Not evaluated"}`} title={score != null ? `${Math.round(score)}/100 — ${getScoreLabel(score)}` : "Not evaluated"}>
      <svg className="score-circle" width={size} height={size} aria-hidden="true">
        <circle
          className="score-circle-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className="score-circle-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          stroke={validScore >= 80 ? "#22c55e" : validScore >= 60 ? "#f59e0b" : "#ef4444"}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-bold ${getScoreColor(validScore)}`}>
          {score != null ? Math.round(score) : "-"}
        </span>
      </div>
    </div>
  );
};

// Format the update date
const formatDate = (dateString) => {
  if (!dateString) return "Not evaluated";
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Skeleton loader for product cards
const ProductCardSkeleton = () => (
  <div className="p-6 rounded-xl bg-base-200 border border-base-300 animate-pulse">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-base-300" />
        <div>
          <div className="h-4 w-24 bg-base-300 rounded mb-2" />
          <div className="h-3 w-16 bg-base-300 rounded" />
        </div>
      </div>
      <div className="h-5 w-16 bg-base-300 rounded-full" />
    </div>
    <div className="flex items-center gap-6">
      <div className="w-14 h-14 rounded-full bg-base-300" />
      <div className="flex-1 grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="text-center">
            <div className="h-3 w-4 bg-base-300 rounded mx-auto mb-1" />
            <div className="h-4 w-6 bg-base-300 rounded mx-auto" />
          </div>
        ))}
      </div>
    </div>
    <div className="mt-4 pt-4 border-t border-base-300">
      <div className="h-3 w-32 bg-base-300 rounded" />
    </div>
  </div>
);

const ProductsPreview = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/products?sort=score-desc&limit=6");

        if (!response.ok) {
          throw new Error("Failed to load products");
        }

        const data = await response.json();
        // Filter only products with valid scores
        const validProducts = (data.products || []).filter(
          (p) => p.scores?.total != null && p.verified
        );
        setProducts(validProducts.slice(0, 6));
      } catch (err) {
        setError(err.message);
        if (process.env.NODE_ENV === "development") console.error("Error fetching products:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <section className="py-24 px-6 bg-base-200/30">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
          <div>
            <span className="inline-block px-4 py-1.5 mb-4 text-sm font-medium rounded-full bg-primary/10 text-primary">
              Latest Evaluations
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Top Rated Products
            </h2>
          </div>
          <Link
            href="/products"
            className="btn btn-outline btn-sm gap-2"
          >
            View All Products
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>

        {/* Error state */}
        {error && (
          <div className="text-center py-12">
            <p className="text-error mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-outline btn-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Products grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            // Skeleton loaders while loading
            [...Array(6)].map((_, i) => <ProductCardSkeleton key={i} />)
          ) : products.length === 0 && !error ? (
            <div className="col-span-full text-center py-12 text-base-content/50">
              No evaluated products yet
            </div>
          ) : (
            products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="product-card group block p-6 rounded-xl bg-base-200 border border-base-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {/* Placeholder logo */}
                  <div className="w-12 h-12 rounded-xl bg-base-300 flex items-center justify-center text-xl font-bold text-primary">
                    {product.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {(product.types && product.types.length > 0 ? product.types : [{ name: product.type }]).map((t, idx) => (
                        <span
                          key={t.code || idx}
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            t.isPrimary || idx === 0
                              ? 'bg-primary/20 text-primary'
                              : 'bg-base-300 text-base-content/60'
                          }`}
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                {product.verified && (
                  <span className="badge badge-sm badge-verified" title="This product has been evaluated using SafeScoring's methodology. This does not constitute an endorsement or security guarantee.">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 mr-1">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                    Scored
                  </span>
                )}
              </div>

              {/* Score display */}
              <div className="flex items-center gap-6">
                <ScoreCircle score={product.scores?.total} size={56} strokeWidth={5} />
                <div className="flex-1 grid grid-cols-4 gap-2">
                  {[
                    { code: "S", score: product.scores?.s, color: "#22c55e" },
                    { code: "A", score: product.scores?.a, color: "#f59e0b" },
                    { code: "F", score: product.scores?.f, color: "#3b82f6" },
                    { code: "E", score: product.scores?.e, color: "#8b5cf6" },
                  ].map((pillar) => (
                    <div key={pillar.code} className="text-center">
                      <div
                        className="text-xs font-bold mb-1"
                        style={{ color: pillar.color }}
                      >
                        {pillar.code}
                      </div>
                      <div className="text-sm font-medium text-base-content/80">
                        {pillar.score != null ? Math.round(pillar.score) : "-"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-4 border-t border-base-300 flex items-center justify-between text-xs text-base-content/50">
                <span>Updated {formatDate(product.lastUpdate)}</span>
                <span className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  View details
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </span>
              </div>
            </Link>
          ))
          )}
        </div>
      </div>
    </section>
  );
};

export default ProductsPreview;
