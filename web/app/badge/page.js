"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function BadgePage() {
  const [productSlug, setProductSlug] = useState("ledger-nano-x");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [style, setStyle] = useState("rounded");
  const [theme, setTheme] = useState("dark");
  const [copied, setCopied] = useState(null);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  const badgeUrl = `https://safescoring.io/api/badge/${productSlug}?style=${style}&theme=${theme}`;
  const productUrl = `https://safescoring.io/products/${productSlug}`;

  const htmlCode = `<a href="${productUrl}" target="_blank" rel="noopener">
  <img src="${badgeUrl}" alt="SafeScore" />
</a>`;

  const markdownCode = `[![SafeScore](${badgeUrl})](${productUrl})`;

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-amber-400";
    return "text-red-400";
  };

  // Debounced product search
  const searchProducts = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch {
      // Silently fail
    }
    setSearching(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchProducts(searchQuery);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, searchProducts]);

  const selectProduct = (product) => {
    setSelectedProduct(product);
    setProductSlug(product.slug);
    setSearchQuery("");
    setShowDropdown(false);
  };

  const clearSelection = () => {
    setSelectedProduct(null);
    setProductSlug("");
    setSearchQuery("");
  };

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 px-6 hero-bg">
        <div className="max-w-4xl mx-auto">
          <Breadcrumbs items={[
            { label: "Home", href: "/" },
            { label: "Badge / Widget" },
          ]} />

          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              SafeScore Badge
            </h1>
            <p className="text-base-content/60 max-w-2xl mx-auto">
              Display your product&apos;s security evaluation on your website. Build transparency with your users by showing your methodology-based assessment.
            </p>
            <p className="text-xs text-base-content/40 max-w-2xl mx-auto mt-3">
              The SafeScore badge reflects SafeScoring&apos;s evaluation methodology. It does not constitute a security guarantee, certification, or endorsement. Not financial or investment advice.
            </p>
          </div>

          {/* Badge Preview */}
          <div className="rounded-xl bg-base-200 border border-base-300 p-8 mb-8">
            <h2 className="text-xl font-bold mb-6">Preview</h2>

            <div className="flex justify-center mb-8 p-8 rounded-lg bg-base-300">
              {productSlug ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/badge/${productSlug}?style=${style}&theme=${theme}`}
                  alt="SafeScore Badge Preview"
                  className="max-w-full"
                />
              ) : (
                <div className="text-base-content/40 text-sm">
                  Select a product to see badge preview
                </div>
              )}
            </div>

            {/* Options */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Product search */}
              <div className="relative" ref={searchRef}>
                <label className="block text-sm font-medium mb-2">Product</label>
                {selectedProduct ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-base-300 border border-base-content/10">
                    {selectedProduct.logoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedProduct.logoUrl}
                        alt=""
                        className="w-6 h-6 rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{selectedProduct.name}</div>
                      {selectedProduct.score != null && (
                        <span className={`text-xs font-bold ${getScoreColor(selectedProduct.score)}`}>
                          Score: {selectedProduct.score}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={clearSelection}
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
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                      placeholder="Search products..."
                      className="input input-bordered w-full"
                    />
                    {searching && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 loading loading-spinner loading-xs"></span>
                    )}
                    {showDropdown && searchResults.length > 0 && (
                      <div className="absolute z-50 top-full mt-1 w-full bg-base-100 border border-base-300 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                        {searchResults.map((product) => (
                          <button
                            key={product.slug}
                            onMouseDown={() => selectProduct(product)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-base-200 transition-colors text-left"
                          >
                            {product.logoUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={product.logoUrl}
                                alt=""
                                className="w-6 h-6 rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{product.name}</div>
                              <div className="text-xs text-base-content/50">{product.type}</div>
                            </div>
                            {product.score != null && (
                              <span className={`text-sm font-bold ${getScoreColor(product.score)}`}>
                                {product.score}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {showDropdown && searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                      <div className="absolute z-50 top-full mt-1 w-full bg-base-100 border border-base-300 rounded-xl shadow-2xl p-4 text-sm text-base-content/50 text-center">
                        No products found
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Style */}
              <div>
                <label className="block text-sm font-medium mb-2">Style</label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="select select-bordered w-full"
                >
                  <option value="rounded">Rounded</option>
                  <option value="flat">Flat</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>

              {/* Theme */}
              <div>
                <label className="block text-sm font-medium mb-2">Theme</label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="select select-bordered w-full"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </div>
            </div>
          </div>

          {/* Embed codes */}
          <div className="rounded-xl bg-base-200 border border-base-300 p-8 mb-8">
            <h2 className="text-xl font-bold mb-6">Embed Code</h2>

            {/* HTML */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">HTML</label>
                <button
                  onClick={() => copyToClipboard(htmlCode, 'html')}
                  className="btn btn-xs btn-ghost"
                >
                  {copied === 'html' ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="bg-base-300 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{htmlCode}</code>
              </pre>
            </div>

            {/* Markdown */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Markdown (GitHub, GitLab, etc.)</label>
                <button
                  onClick={() => copyToClipboard(markdownCode, 'markdown')}
                  className="btn btn-xs btn-ghost"
                >
                  {copied === 'markdown' ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="bg-base-300 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{markdownCode}</code>
              </pre>
            </div>
          </div>

          {/* Benefits */}
          <div className="rounded-xl bg-gradient-to-br from-primary/20 to-base-200 border border-base-300 p-8 mb-8">
            <h2 className="text-xl font-bold mb-6">Why Add the SafeScore Badge?</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex gap-4">
                <div className="text-2xl">🛡️</div>
                <div>
                  <h3 className="font-semibold">Build Trust</h3>
                  <p className="text-sm text-base-content/70">Show users your product has been evaluated using a methodology-based security assessment.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-2xl">📈</div>
                <div>
                  <h3 className="font-semibold">Increase Conversions</h3>
                  <p className="text-sm text-base-content/70">Security-conscious users are more likely to trust evaluated products.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-2xl">🔄</div>
                <div>
                  <h3 className="font-semibold">Always Up-to-Date</h3>
                  <p className="text-sm text-base-content/70">The badge automatically updates when your score changes.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-2xl">🆓</div>
                <div>
                  <h3 className="font-semibold">Free Forever</h3>
                  <p className="text-sm text-base-content/70">No cost to display your SafeScore badge on your website.</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <p className="text-base-content/60 mb-4">
              Don&apos;t see your product? Get it evaluated.
            </p>
            <Link href="/submit" className="btn btn-primary">
              Submit Your Product
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
