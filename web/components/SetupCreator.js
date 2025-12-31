"use client";

import { useState, useEffect } from "react";
import ProductLogo from "@/components/ProductLogo";

/**
 * SetupCreator - Modal for creating/editing crypto setups
 */

const ROLES = [
  { id: "wallet", label: "Wallet", description: "Primary wallet (2x weight)" },
  { id: "exchange", label: "Exchange", description: "Trading platform" },
  { id: "defi", label: "DeFi", description: "DeFi protocol" },
  { id: "other", label: "Other", description: "Other product" },
];

export default function SetupCreator({ isOpen, onClose, onSave, existingSetup = null }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Reset form when opening/closing or when existingSetup changes
  useEffect(() => {
    if (isOpen) {
      if (existingSetup) {
        setName(existingSetup.name || "");
        setDescription(existingSetup.description || "");
        setSelectedProducts(
          existingSetup.products?.map(p => ({
            product_id: p.product_id,
            role: p.role || "other",
            name: existingSetup.productDetails?.find(pd => pd.id === p.product_id)?.name || "Unknown",
            slug: existingSetup.productDetails?.find(pd => pd.id === p.product_id)?.slug || "",
          })) || []
        );
      } else {
        setName("");
        setDescription("");
        setSelectedProducts([]);
      }
      setSearchQuery("");
      setSearchResults([]);
      setError(null);
    }
  }, [isOpen, existingSetup]);

  // Search products
  useEffect(() => {
    const searchProducts = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        const response = await fetch(`/api/products?search=${encodeURIComponent(searchQuery)}&limit=10`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.products || []);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setSearching(false);
      }
    };

    const debounce = setTimeout(searchProducts, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const addProduct = (product) => {
    if (selectedProducts.find(p => p.product_id === product.id)) return;

    setSelectedProducts([
      ...selectedProducts,
      {
        product_id: product.id,
        role: "other",
        name: product.name,
        slug: product.slug,
      }
    ]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter(p => p.product_id !== productId));
  };

  const updateProductRole = (productId, role) => {
    setSelectedProducts(selectedProducts.map(p =>
      p.product_id === productId ? { ...p, role } : p
    ));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Please enter a setup name");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        products: selectedProducts.map(p => ({
          product_id: p.product_id,
          role: p.role,
        })),
      };

      await onSave(payload, existingSetup?.id);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save setup");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-base-200 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-base-300">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">
              {existingSetup ? "Edit Setup" : "Create Setup"}
            </h2>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm btn-circle"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-base-content/60 mt-1">
            Combine crypto products to see your overall security score
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
          {/* Error message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Name input */}
          <div>
            <label className="block text-sm font-medium mb-2">Setup Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My DeFi Setup, Cold Storage"
              className="input input-bordered w-full bg-base-100"
              maxLength={50}
            />
          </div>

          {/* Description input */}
          <div>
            <label className="block text-sm font-medium mb-2">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this setup"
              className="input input-bordered w-full bg-base-100"
              maxLength={100}
            />
          </div>

          {/* Product search */}
          <div>
            <label className="block text-sm font-medium mb-2">Add Products</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="input input-bordered w-full bg-base-100 pr-10"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <span className="loading loading-spinner loading-sm"></span>
                </div>
              )}
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="mt-2 bg-base-100 rounded-lg border border-base-300 max-h-48 overflow-y-auto">
                {searchResults.map((product) => {
                  const isSelected = selectedProducts.find(p => p.product_id === product.id);
                  return (
                    <button
                      key={product.id}
                      onClick={() => addProduct(product)}
                      disabled={isSelected}
                      className={`w-full flex items-center gap-3 p-3 text-left hover:bg-base-200 transition-colors ${
                        isSelected ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <ProductLogo
                        logoUrl={product.logoUrl}
                        name={product.name}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{product.name}</div>
                        <div className="text-xs text-base-content/50">{product.type}</div>
                      </div>
                      {isSelected && (
                        <span className="text-xs text-green-400">Added</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected products */}
          {selectedProducts.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Products in Setup ({selectedProducts.length})
              </label>
              <div className="space-y-2">
                {selectedProducts.map((product) => (
                  <div
                    key={product.product_id}
                    className="flex items-center gap-3 p-3 bg-base-100 rounded-lg border border-base-300"
                  >
                    <ProductLogo
                      logoUrl={product.slug ? `https://www.google.com/s2/favicons?domain=${product.slug}.com&sz=128` : null}
                      name={product.name}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{product.name}</div>
                    </div>
                    <select
                      value={product.role}
                      onChange={(e) => updateProductRole(product.product_id, e.target.value)}
                      className="select select-bordered select-sm bg-base-200"
                    >
                      {ROLES.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeProduct(product.product_id)}
                      className="btn btn-ghost btn-sm btn-circle text-red-400"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-base-content/50 mt-2">
                Wallets have 2x weight in the combined score calculation
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-base-300 flex items-center justify-end gap-3">
          <button onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="btn btn-primary"
          >
            {saving ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : existingSetup ? (
              "Save Changes"
            ) : (
              "Create Setup"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
