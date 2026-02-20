"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { getSupabase } from "@/libs/supabase";

// Dynamically import map to avoid SSR issues
const ProductsMap = dynamic(() => import("@/components/ProductsMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-base-300">
      <div className="text-center">
        <div className="loading loading-spinner loading-lg text-primary"></div>
        <p className="mt-4 text-base-content">Loading Products Map...</p>
      </div>
    </div>
  ),
});

export default function ProductsMapPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLegalCountries, setShowLegalCountries] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      // Load products with geography data from optimized view
      const { data, error } = await supabase
        .from("v_product_legal_countries")
        .select("product_id, slug, name, country_origin, countries_operating, legal_countries, legal_country_count")
        .not("country_origin", "is", null)
        .order("name");

      if (error) throw error;

      setProducts(data || []);

      // Calculate stats
      if (data) {
        const countries = new Set(data.map(p => p.country_origin).filter(Boolean));
        const totalLegalCountries = data.reduce((sum, p) => {
          return sum + (p.legal_country_count || 0);
        }, 0);

        setStats({
          totalProducts: data.length,
          totalCountries: countries.size,
          avgLegalCountries: Math.round(totalLegalCountries / data.length),
          mostGlobalProduct: data.reduce((max, p) => {
            const len = p.legal_country_count || 0;
            return len > (max.legal_country_count || 0) ? p : max;
          }, data[0]),
        });
      }
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    if (filterType === "all") return true;

    const desc = (p.description || "").toLowerCase();
    if (filterType === "hardware") return desc.includes("hardware") || desc.includes("wallet");
    if (filterType === "software") return desc.includes("software") || desc.includes("wallet");
    if (filterType === "exchange") return desc.includes("exchange");
    if (filterType === "defi") return desc.includes("defi") || desc.includes("protocol");
    if (filterType === "layer2") return desc.includes("layer") || desc.includes("l2");

    return true;
  });

  return (
    <main className="min-h-screen bg-base-200">
      {/* Header */}
      <div className="bg-base-100 border-b border-base-300">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-base-content mb-2">
                🌍 Global Products Map
              </h1>
              <p className="text-base-content/70">
                Explore crypto products by country of origin and legal availability
              </p>
            </div>

            {stats && (
              <div className="stats shadow bg-base-200">
                <div className="stat py-2 px-4">
                  <div className="stat-title text-xs">Products</div>
                  <div className="stat-value text-2xl text-primary">{stats.totalProducts}</div>
                </div>
                <div className="stat py-2 px-4">
                  <div className="stat-title text-xs">Countries</div>
                  <div className="stat-value text-2xl text-accent">{stats.totalCountries}</div>
                </div>
                <div className="stat py-2 px-4">
                  <div className="stat-title text-xs">Avg. Legal</div>
                  <div className="stat-value text-2xl text-success">{stats.avgLegalCountries}</div>
                  <div className="stat-desc text-xs">countries</div>
                </div>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 mt-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-base-content">Filter:</span>
              <div className="join">
                <button
                  className={`join-item btn btn-sm ${filterType === "all" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setFilterType("all")}
                >
                  All ({products.length})
                </button>
                <button
                  className={`join-item btn btn-sm ${filterType === "hardware" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setFilterType("hardware")}
                >
                  🔐 Hardware
                </button>
                <button
                  className={`join-item btn btn-sm ${filterType === "software" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setFilterType("software")}
                >
                  💻 Software
                </button>
                <button
                  className={`join-item btn btn-sm ${filterType === "exchange" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setFilterType("exchange")}
                >
                  🏦 Exchange
                </button>
                <button
                  className={`join-item btn btn-sm ${filterType === "defi" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setFilterType("defi")}
                >
                  🌐 DeFi
                </button>
              </div>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer gap-2">
                <span className="label-text">Show Legal Countries</span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={showLegalCountries}
                  onChange={(e) => setShowLegalCountries(e.target.checked)}
                />
              </label>
            </div>

            <button
              className="btn btn-sm btn-outline btn-accent"
              onClick={loadProducts}
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="card bg-base-100 shadow-xl h-[600px] flex items-center justify-center">
            <div className="text-center">
              <div className="loading loading-spinner loading-lg text-primary"></div>
              <p className="mt-4 text-base-content">Loading geography data...</p>
              <p className="text-sm text-base-content/60 mt-2">
                Fetching {products.length} products from Supabase
              </p>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="card bg-base-100 shadow-xl h-[600px] flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🌍</div>
              <h3 className="text-xl font-bold mb-2">No Products Found</h3>
              <p className="text-base-content/70">
                No products with geography data match your filters
              </p>
              <button
                className="btn btn-primary mt-4"
                onClick={() => setFilterType("all")}
              >
                Show All Products
              </button>
            </div>
          </div>
        ) : (
          <div className="card bg-base-100 shadow-xl h-[600px] overflow-hidden">
            <ProductsMap
              products={filteredProducts}
              showLegalCountries={showLegalCountries}
            />
          </div>
        )}

        {/* Legend */}
        <div className="card bg-base-100 shadow-xl mt-4 p-6">
          <h3 className="text-lg font-bold mb-4">Map Legend</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-xl shadow-lg">
                🔐
              </div>
              <div>
                <div className="font-semibold">Hardware Wallets</div>
                <div className="text-xs text-base-content/70">Physical devices</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xl shadow-lg">
                💻
              </div>
              <div>
                <div className="font-semibold">Software Wallets</div>
                <div className="text-xs text-base-content/70">Apps & extensions</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-xl shadow-lg">
                🏦
              </div>
              <div>
                <div className="font-semibold">Exchanges</div>
                <div className="text-xs text-base-content/70">Trading platforms</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-xl shadow-lg">
                🌐
              </div>
              <div>
                <div className="font-semibold">DeFi Protocols</div>
                <div className="text-xs text-base-content/70">Decentralized finance</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-xl shadow-lg">
                ⚡
              </div>
              <div>
                <div className="font-semibold">Layer 2</div>
                <div className="text-xs text-base-content/70">Scaling solutions</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-xl shadow-lg">
                ⛓️
              </div>
              <div>
                <div className="font-semibold">Blockchains</div>
                <div className="text-xs text-base-content/70">Base layer</div>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="mt-6 p-4 bg-info/10 rounded-lg border border-info/20">
            <div className="flex items-start gap-3">
              <div className="text-2xl">💡</div>
              <div className="flex-1">
                <h4 className="font-semibold text-info mb-1">How to use</h4>
                <ul className="text-sm space-y-1 text-base-content/80">
                  <li>🖱️ <strong>Click markers</strong> to see all products from that country</li>
                  <li>🌍 <strong>Toggle "Legal Countries"</strong> to see where products can be used</li>
                  <li>🔍 <strong>Use filters</strong> to narrow down by product type</li>
                  <li>📊 <strong>View stats</strong> to see global coverage at a glance</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Most global product */}
          {stats?.mostGlobalProduct && (
            <div className="mt-4 p-4 bg-success/10 rounded-lg border border-success/20">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🏆</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-success mb-1">Most Global Product</h4>
                  <p className="text-sm text-base-content/80">
                    <strong>{stats.mostGlobalProduct.name}</strong> is legally available in{" "}
                    <span className="text-success font-bold">
                      {stats.mostGlobalProduct.legal_country_count || 0} countries
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
