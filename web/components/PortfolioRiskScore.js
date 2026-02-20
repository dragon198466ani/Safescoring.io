"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getScoreColor } from "@/libs/design-tokens";

/**
 * PortfolioRiskScore - Calculate and display portfolio security risk
 * Based on SAFE scores of products in user's setup
 */
export default function PortfolioRiskScore({
  setupId = null,
  products = null,
  variant = "default",
  className = "",
}) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [manualProducts, setManualProducts] = useState([
    { productSlug: "", allocation: 1 },
  ]);

  useEffect(() => {
    if (setupId) {
      analyzeSetup(setupId);
    } else if (products && products.length > 0) {
      analyzeManual(products);
    }
  }, [setupId, products]);

  const analyzeSetup = async (id) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/portfolio/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupId: id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setAnalysis(data.portfolioRisk);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const analyzeManual = async (productList) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/portfolio/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manual: productList }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setAnalysis(data.portfolioRisk);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualAnalyze = () => {
    const validProducts = manualProducts.filter(p => p.productSlug.trim());
    if (validProducts.length > 0) {
      analyzeManual(validProducts);
    }
  };

  const addManualProduct = () => {
    setManualProducts([...manualProducts, { productSlug: "", allocation: 1 }]);
  };

  const updateManualProduct = (index, field, value) => {
    const updated = [...manualProducts];
    updated[index][field] = value;
    setManualProducts(updated);
  };

  const removeManualProduct = (index) => {
    setManualProducts(manualProducts.filter((_, i) => i !== index));
  };

  const getRiskLevelColor = (level) => {
    switch (level) {
      case "low": return "text-green-400";
      case "medium": return "text-amber-400";
      case "high": return "text-orange-400";
      case "critical": return "text-red-400";
      default: return "text-base-content/60";
    }
  };

  const getRiskLevelBg = (level) => {
    switch (level) {
      case "low": return "bg-green-500/20 border-green-500/30";
      case "medium": return "bg-amber-500/20 border-amber-500/30";
      case "high": return "bg-orange-500/20 border-orange-500/30";
      case "critical": return "bg-red-500/20 border-red-500/30";
      default: return "bg-base-300 border-base-300";
    }
  };

  // Compact variant for widgets
  if (variant === "compact" && analysis) {
    return (
      <div className={`rounded-xl border p-4 ${getRiskLevelBg(analysis.riskLevel)} ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Portfolio Risk</span>
          <span className={`badge ${
            analysis.riskLevel === "low" ? "badge-success" :
            analysis.riskLevel === "medium" ? "badge-warning" :
            "badge-error"
          }`}>
            {analysis.riskLevel}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-bold ${getRiskLevelColor(analysis.riskLevel)}`}>
            {analysis.score}
          </span>
          <span className="text-base-content/50">/100</span>
        </div>
        {analysis.weakestLink && (
          <p className="text-xs text-base-content/60 mt-2">
            Weakest: {analysis.weakestLink.name} ({analysis.weakestLink.score})
          </p>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className={`rounded-xl bg-base-200 border border-base-300 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-base-300">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-purple-400">
            <path fillRule="evenodd" d="M10 1a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 1zM5.05 3.05a.75.75 0 011.06 0l1.062 1.06A.75.75 0 116.11 5.173L5.05 4.11a.75.75 0 010-1.06zm9.9 0a.75.75 0 010 1.06l-1.06 1.062a.75.75 0 01-1.062-1.061l1.061-1.06a.75.75 0 011.06 0zM3 8a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 013 8zm11 0a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 0114 8zm-6.828 2.828a.75.75 0 010 1.061L6.11 12.95a.75.75 0 01-1.06-1.06l1.06-1.06a.75.75 0 011.061 0zm6.594.001a.75.75 0 011.06 0l1.06 1.06a.75.75 0 01-1.06 1.06l-1.06-1.06a.75.75 0 010-1.06zM10 11.25a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5a.75.75 0 01.75-.75zm-5 4.25a.75.75 0 01.75-.75h8.5a.75.75 0 010 1.5h-8.5a.75.75 0 01-.75-.75z" clipRule="evenodd" />
          </svg>
          <h2 className="font-semibold">Portfolio Risk Score</h2>
        </div>
        <p className="text-sm text-base-content/60 mt-1">
          Weighted security score based on your crypto products
        </p>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="p-8 text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-sm text-base-content/60 mt-2">Analyzing portfolio...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4">
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Results */}
      {analysis && !loading && (
        <div className="p-4 space-y-6">
          {/* Main score */}
          <div className={`rounded-xl border p-6 text-center ${getRiskLevelBg(analysis.riskLevel)}`}>
            <div className="flex items-center justify-center gap-4">
              <div>
                <div className={`text-5xl font-bold ${getRiskLevelColor(analysis.riskLevel)}`}>
                  {analysis.score}
                </div>
                <div className="text-sm text-base-content/60 mt-1">Portfolio Score</div>
              </div>
              <div className="h-16 w-px bg-base-content/20"></div>
              <div>
                <div className={`text-2xl font-semibold capitalize ${getRiskLevelColor(analysis.riskLevel)}`}>
                  {analysis.riskLevel}
                </div>
                <div className="text-sm text-base-content/60 mt-1">Risk Level</div>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          {analysis.breakdown && analysis.breakdown.length > 0 && (
            <div>
              <h3 className="font-medium mb-3">Product Breakdown</h3>
              <div className="space-y-2">
                {analysis.breakdown.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-base-300/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-base-300 flex items-center justify-center text-xs font-bold">
                        {item.name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <Link
                          href={`/products/${item.slug}`}
                          className="font-medium hover:text-primary text-sm"
                        >
                          {item.name}
                        </Link>
                        <div className="text-xs text-base-content/50">{item.type}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={`font-semibold ${getScoreColor(item.safeScore || 0)}`}>
                          {item.safeScore ?? "-"}
                        </div>
                        <div className="text-xs text-base-content/50">SAFE</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{item.weight}%</div>
                        <div className="text-xs text-base-content/50">Weight</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weakest Link */}
          {analysis.weakestLink && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-400">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <span className="font-medium text-amber-400">Weakest Link</span>
              </div>
              <p className="text-sm text-base-content/70">
                <Link href={`/products/${analysis.weakestLink.slug}`} className="font-semibold hover:text-primary">
                  {analysis.weakestLink.name}
                </Link>
                {" "}has the lowest score ({analysis.weakestLink.score}). Consider upgrading to a more secure alternative.
              </p>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <div>
              <h3 className="font-medium mb-3">Recommendations</h3>
              <div className="space-y-2">
                {analysis.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      rec.priority === "high"
                        ? "bg-red-500/10 border-red-500/20"
                        : "bg-amber-500/10 border-amber-500/20"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {rec.priority === "high" ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-400 shrink-0 mt-0.5">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-400 shrink-0 mt-0.5">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                        </svg>
                      )}
                      <p className="text-sm text-base-content/80">{rec.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Diversification */}
          {analysis.diversification && (
            <div className="flex items-center justify-between p-4 rounded-lg bg-base-300/50">
              <div>
                <div className="text-sm font-medium">Diversification</div>
                <div className="text-xs text-base-content/50">
                  {analysis.diversification.uniqueTypes} product type(s)
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-base-300 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${analysis.diversification.score}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{analysis.diversification.score}%</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual input form when no setupId or products provided */}
      {!setupId && !products && !analysis && !loading && (
        <div className="p-4 space-y-4">
          <p className="text-sm text-base-content/60">
            Enter products manually or select from your setups to calculate risk score.
          </p>

          {manualProducts.map((p, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={p.productSlug}
                onChange={(e) => updateManualProduct(idx, "productSlug", e.target.value)}
                placeholder="Product slug (e.g., ledger-nano-x)"
                className="input input-bordered input-sm flex-1"
              />
              <input
                type="number"
                min="1"
                max="10"
                value={p.allocation}
                onChange={(e) => updateManualProduct(idx, "allocation", parseInt(e.target.value) || 1)}
                className="input input-bordered input-sm w-20"
                title="Weight (1-10)"
              />
              {manualProducts.length > 1 && (
                <button
                  onClick={() => removeManualProduct(idx)}
                  className="btn btn-ghost btn-sm btn-square"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              )}
            </div>
          ))}

          <div className="flex items-center gap-2">
            <button onClick={addManualProduct} className="btn btn-ghost btn-sm gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              Add Product
            </button>
            <button
              onClick={handleManualAnalyze}
              disabled={!manualProducts.some(p => p.productSlug.trim())}
              className="btn btn-primary btn-sm ml-auto"
            >
              Analyze
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
