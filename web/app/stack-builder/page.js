"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getCountryName } from "@/libs/country-coordinates";

// Fixed: Use explicit class mappings instead of dynamic template strings
const getComplianceColorClass = (status) => {
  const map = {
    compliant: "text-success",
    restricted: "text-warning",
    risky: "text-error",
    illegal: "text-error",
  };
  return map[status] || "text-base-content";
};

const getRiskColorClass = (risk) => {
  const map = {
    low: "text-success",
    medium: "text-warning",
    high: "text-error",
    very_high: "text-error",
    critical: "text-error",
  };
  return map[risk] || "text-base-content";
};

const getComplianceBadgeClass = (status) => {
  const map = {
    compliant: "badge-success",
    restricted: "badge-warning",
    risky: "badge-error",
    illegal: "badge-error",
  };
  return map[status] || "badge-ghost";
};

const getRiskBadgeClass = (risk) => {
  const map = {
    low: "badge-success",
    medium: "badge-warning",
    high: "badge-error",
    very_high: "badge-error",
    critical: "badge-error",
  };
  return map[risk] || "badge-ghost";
};

export default function StackBuilderPage() {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState("US");
  const [countries, setCountries] = useState([]);
  const [products, setProducts] = useState([]);
  const [complianceReport, setComplianceReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    fetchCountries();
    fetchProducts();
  }, []);

  const fetchCountries = async () => {
    try {
      const response = await fetch("/api/stack/compliance");
      const data = await response.json();
      if (data.success) {
        setCountries(data.countries);
      }
    } catch (error) {
      console.error("Error fetching countries:", error);
    }
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const response = await fetch("/api/products?limit=100");
      const data = await response.json();
      if (data.products) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const toggleProduct = (productId) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter((id) => id !== productId));
    } else {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };

  const checkCompliance = async () => {
    if (selectedProducts.length === 0) {
      alert("Please select at least one product");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/stack/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: selectedProducts,
          countryCode: selectedCountry,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setComplianceReport(data);
      } else {
        alert(data.error || "Failed to check compliance");
      }
    } catch (error) {
      console.error("Error checking compliance:", error);
      alert("Failed to check compliance");
    } finally {
      setLoading(false);
    }
  };

  const clearStack = () => {
    setSelectedProducts([]);
    setComplianceReport(null);
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-base-100 pt-20">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 via-base-100 to-secondary/10 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="breadcrumbs text-sm mb-4">
              <ul>
                <li>
                  <Link href="/">Home</Link>
                </li>
                <li>Stack Builder</li>
              </ul>
            </div>

            <h1 className="text-5xl font-bold mb-4">
              Crypto Stack Builder
              <span className="block text-primary mt-2">Legal Compliance Checker</span>
            </h1>
            <p className="text-xl text-base-content/70 mb-6">
              Build your crypto stack and instantly check if it's legal in your country. Get
              personalized recommendations based on local regulations.
            </p>

            <div className="alert alert-info">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="stroke-current shrink-0 w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <span>
                This tool is for informational purposes only and does not constitute legal advice.
                Always consult with a qualified legal professional.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Stack Builder */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Product Selection */}
              <div className="lg:col-span-2 space-y-6">
                {/* Country Selection */}
                <div className="card bg-base-200 shadow-xl">
                  <div className="card-body">
                    <h2 className="card-title">1. Select Your Country</h2>
                    <select
                      className="select select-bordered w-full"
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                    >
                      {countries.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name} ({country.stance}) - Score: {country.overallScore}/100
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Product Selection */}
                <div className="card bg-base-200 shadow-xl">
                  <div className="card-body">
                    <h2 className="card-title mb-4">2. Build Your Stack</h2>
                    <p className="text-sm text-base-content/70 mb-4">
                      Select products you want to use in your crypto stack:
                    </p>

                    {loadingProducts ? (
                      <div className="flex justify-center py-8">
                        <span className="loading loading-spinner loading-lg"></span>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {products.map((product) => (
                          <label
                            key={product.id}
                            className="flex items-center gap-3 p-3 hover:bg-base-300 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              className="checkbox checkbox-primary"
                              checked={selectedProducts.includes(product.id)}
                              onChange={() => toggleProduct(product.id)}
                            />
                            <div className="flex-1">
                              <div className="font-semibold">{product.name}</div>
                              {product.shortDescription && (
                                <div className="text-xs text-base-content/60">
                                  {product.shortDescription}
                                </div>
                              )}
                            </div>
                            {product.safeScore && (
                              <div className="badge badge-primary">
                                SAFE: {product.safeScore}/100
                              </div>
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Current Stack */}
              <div className="space-y-6">
                {/* Current Stack */}
                <div className="card bg-base-200 shadow-xl sticky top-4">
                  <div className="card-body">
                    <h3 className="card-title">Your Stack</h3>
                    <div className="divider my-0"></div>

                    {selectedProducts.length === 0 ? (
                      <p className="text-sm text-base-content/60">
                        No products selected yet
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {selectedProducts.map((productId) => {
                          const product = products.find((p) => p.id === productId);
                          if (!product) return null;
                          return (
                            <div
                              key={productId}
                              className="flex items-center justify-between p-2 bg-base-100 rounded"
                            >
                              <span className="text-sm">{product.name}</span>
                              <button
                                onClick={() => toggleProduct(productId)}
                                className="btn btn-xs btn-ghost"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="divider my-2"></div>

                    <div className="flex gap-2">
                      <button
                        onClick={checkCompliance}
                        disabled={selectedProducts.length === 0 || loading}
                        className="btn btn-primary flex-1"
                      >
                        {loading ? (
                          <span className="loading loading-spinner"></span>
                        ) : (
                          "Check Compliance"
                        )}
                      </button>
                      <button
                        onClick={clearStack}
                        disabled={selectedProducts.length === 0}
                        className="btn btn-ghost"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Compliance Report */}
            {complianceReport && (
              <div className="mt-8 space-y-6">
                {/* Overall Status */}
                <div className="card bg-base-200 shadow-xl">
                  <div className="card-body">
                    <h2 className="card-title">
                      Compliance Report for {complianceReport.country.name}
                    </h2>

                    <div className="stats stats-vertical sm:stats-horizontal shadow bg-base-100 w-full mt-4">
                      <div className="stat">
                        <div className="stat-title">Overall Status</div>
                        <div
                          className={`stat-value ${getComplianceColorClass(complianceReport.stackAnalysis.overallStatus)}`}
                        >
                          {complianceReport.stackAnalysis.overallStatus.toUpperCase()}
                        </div>
                        <div className="stat-desc">
                          {complianceReport.stackAnalysis.canUseStack
                            ? "You can use this stack"
                            : "This stack cannot be used legally"}
                        </div>
                      </div>

                      <div className="stat">
                        <div className="stat-title">Regulatory Risk</div>
                        <div
                          className={`stat-value ${getRiskColorClass(complianceReport.stackAnalysis.overallRisk)}`}
                        >
                          {complianceReport.stackAnalysis.overallRisk.toUpperCase()}
                        </div>
                        <div className="stat-desc">
                          Country Score: {complianceReport.country.overallScore}/100
                        </div>
                      </div>

                      <div className="stat">
                        <div className="stat-title">Country Stance</div>
                        <div className="stat-value text-sm">
                          {complianceReport.country.cryptoStance.replace("_", " ").toUpperCase()}
                        </div>
                        <div className="stat-desc">{complianceReport.country.regulatoryBody}</div>
                      </div>
                    </div>

                    {/* Blockers */}
                    {complianceReport.stackAnalysis.blockers.length > 0 && (
                      <div className="alert alert-error mt-4">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="stroke-current shrink-0 h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <div>
                          <h3 className="font-bold">Legal Blockers</h3>
                          <ul className="list-disc list-inside">
                            {complianceReport.stackAnalysis.blockers.map((blocker, idx) => (
                              <li key={idx}>{blocker}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Warnings */}
                    {complianceReport.stackAnalysis.warnings.length > 0 && (
                      <div className="alert alert-warning mt-4">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="stroke-current shrink-0 h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                        <div>
                          <h3 className="font-bold">Warnings</h3>
                          <ul className="list-disc list-inside">
                            {complianceReport.stackAnalysis.warnings.map((warning, idx) => (
                              <li key={idx}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    <div className="alert alert-info mt-4">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        className="stroke-current shrink-0 w-6 h-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path>
                      </svg>
                      <div>
                        <h3 className="font-bold">Recommendations</h3>
                        <ul className="list-disc list-inside">
                          {complianceReport.stackAnalysis.recommendations.map((rec, idx) => (
                            <li key={idx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Product Details */}
                <div className="card bg-base-200 shadow-xl">
                  <div className="card-body">
                    <h3 className="card-title">Product-by-Product Analysis</h3>
                    <div className="overflow-x-auto">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Legal Status</th>
                            <th>Risk</th>
                            <th>Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {complianceReport.productReports.map((report) => (
                            <tr key={report.productId}>
                              <td>
                                <Link
                                  href={`/products/${report.productSlug}`}
                                  className="link link-primary"
                                >
                                  {report.productName}
                                </Link>
                              </td>
                              <td>
                                <span
                                  className={`badge ${
                                    report.legalStatus === "legal"
                                      ? "badge-success"
                                      : report.legalStatus === "illegal"
                                      ? "badge-error"
                                      : "badge-warning"
                                  }`}
                                >
                                  {report.legalStatus}
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${getRiskBadgeClass(report.regulatoryRisk)}`}>
                                  {report.regulatoryRisk}
                                </span>
                              </td>
                              <td>
                                {report.requirements.length > 0 && (
                                  <details className="collapse collapse-arrow bg-base-100">
                                    <summary className="collapse-title text-sm font-medium">
                                      View Details
                                    </summary>
                                    <div className="collapse-content">
                                      {report.requirements.length > 0 && (
                                        <div className="mb-2">
                                          <strong>Requirements:</strong>
                                          <ul className="list-disc list-inside text-xs">
                                            {report.requirements.map((req, i) => (
                                              <li key={i}>{req}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      {report.restrictions.length > 0 && (
                                        <div>
                                          <strong>Restrictions:</strong>
                                          <ul className="list-disc list-inside text-xs">
                                            {report.restrictions.map((res, i) => (
                                              <li key={i}>{res}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  </details>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Tax Information */}
                {complianceReport.taxInfo.isTaxable && (
                  <div className="card bg-base-200 shadow-xl">
                    <div className="card-body">
                      <h3 className="card-title">Tax Implications</h3>
                      <div className="space-y-2">
                        {complianceReport.taxInfo.taxNotes.map((note, idx) => (
                          <div key={idx} className="alert alert-warning">
                            <span>💰 {note}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Relevant Laws */}
                {complianceReport.relevantLaws && complianceReport.relevantLaws.length > 0 && (
                  <div className="card bg-base-200 shadow-xl">
                    <div className="card-body">
                      <h3 className="card-title">Relevant Legislation</h3>
                      <div className="space-y-3">
                        {complianceReport.relevantLaws.map((law, idx) => (
                          <div key={idx} className="card bg-base-100">
                            <div className="card-body p-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-bold">{law.title}</h4>
                                  <p className="text-sm text-base-content/70 mt-1">
                                    {law.description}
                                  </p>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <span className={`badge badge-${law.severity === "critical" ? "error" : law.severity === "high" ? "warning" : "info"}`}>
                                    {law.severity}
                                  </span>
                                  <span className="badge badge-outline">{law.category}</span>
                                </div>
                              </div>
                              {law.effectiveDate && (
                                <div className="text-xs text-base-content/60 mt-2">
                                  Effective: {new Date(law.effectiveDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-br from-primary/10 to-secondary/10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Need More Information?</h2>
            <p className="text-xl text-base-content/70 mb-8">
              Explore our interactive world map to see crypto regulations globally, or read our
              security guide for best practices.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/incidents/map" className="btn btn-primary btn-lg">
                🗺️ View World Map
              </Link>
              <Link href="/security-guide" className="btn btn-outline btn-lg">
                📚 Security Guide
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
    <Footer />
    </>
  );
}
