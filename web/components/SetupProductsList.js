"use client";

import { useState, useCallback, memo } from "react";
import Link from "next/link";
import ProductLogo from "@/components/ProductLogo";
import { getScoreColor } from "@/components/ScoreCircle";
import { useAnimatedScore } from "@/hooks/useSetupScores";

/**
 * Role configuration
 */
const ROLES = {
  wallet: {
    label: "Wallet",
    color: "bg-purple-500/20 text-purple-400",
    weight: "2x",
  },
  exchange: {
    label: "Exchange",
    color: "bg-blue-500/20 text-blue-400",
    weight: "1x",
  },
  defi: { label: "DeFi", color: "bg-green-500/20 text-green-400", weight: "1x" },
  other: {
    label: "Other",
    color: "bg-base-300 text-base-content/60",
    weight: "1x",
  },
};

/**
 * Animated score badge for real-time updates
 */
const AnimatedScoreBadge = memo(function AnimatedScoreBadge({ score }) {
  const animatedScore = useAnimatedScore(score, 600);
  return (
    <div className={`text-sm font-bold ${getScoreColor(animatedScore)}`}>
      {animatedScore}
    </div>
  );
});

/**
 * Single product item in the setup with optimistic removal
 */
const ProductItem = memo(function ProductItem({
  product,
  role,
  onRemove,
  onRoleChange,
  editable = false,
  isRemoving = false,
}) {
  const roleInfo = ROLES[role] || ROLES.other;
  const score = product.scores?.note_finale || product.score;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl bg-base-300/50 border border-base-content/5 group transition-all duration-300 ${
        isRemoving
          ? "opacity-0 scale-95 -translate-x-4"
          : "opacity-100 scale-100 translate-x-0"
      }`}
    >
      <ProductLogo
        logoUrl={
          product.logo_url ||
          (product.slug
            ? `https://www.google.com/s2/favicons?domain=${product.slug}.com&sz=128`
            : null)
        }
        name={product.name}
        size="sm"
      />

      <div className="flex-1 min-w-0">
        <Link
          href={`/products/${product.slug}`}
          className="font-medium text-sm hover:text-primary transition-colors truncate block"
        >
          {product.name}
        </Link>

        {editable ? (
          <select
            value={role}
            onChange={(e) => onRoleChange?.(product.id, e.target.value)}
            className="select select-ghost select-xs mt-0.5 -ml-2 text-xs"
          >
            {Object.entries(ROLES).map(([key, info]) => (
              <option key={key} value={key}>
                {info.label} ({info.weight})
              </option>
            ))}
          </select>
        ) : (
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs px-1.5 py-0.5 rounded ${roleInfo.color}`}>
              {roleInfo.label}
            </span>
            <span className="text-xs text-base-content/40">
              {product.product_types?.name || product.type_name || ""}
            </span>
          </div>
        )}
      </div>

      {/* Animated Score */}
      {score && <AnimatedScoreBadge score={score} />}

      {/* Remove button (editable mode) */}
      {editable && onRemove && (
        <button
          onClick={() => onRemove(product.id)}
          disabled={isRemoving}
          className="btn btn-ghost btn-xs btn-circle text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
          title="Remove from stack"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
});

/**
 * Products list component for setup detail
 * With optimistic removal and real-time updates
 */
function SetupProductsList({
  products = [],
  onRemove,
  onRoleChange,
  editable = false,
  maxHeight = "400px",
  isLoading = false,
}) {
  const [removingIds, setRemovingIds] = useState(new Set());
  const [confirmRemove, setConfirmRemove] = useState(null);

  // Handle optimistic removal with animation
  const handleRemove = useCallback(
    async (productId) => {
      // Add to removing set for animation
      setRemovingIds((prev) => new Set([...prev, productId]));

      // Wait for animation
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Call actual remove handler
      if (onRemove) {
        try {
          await onRemove(productId);
        } catch (error) {
          // On error, remove from removing set (rollback)
          setRemovingIds((prev) => {
            const next = new Set(prev);
            next.delete(productId);
            return next;
          });
          console.error("Failed to remove product:", error);
        }
      }

      setConfirmRemove(null);
    },
    [onRemove]
  );

  // Show confirmation for removal
  const handleRemoveClick = useCallback((productId) => {
    setConfirmRemove(productId);
  }, []);

  // Cancel removal confirmation
  const handleCancelRemove = useCallback(() => {
    setConfirmRemove(null);
  }, []);

  if (products.length === 0) {
    return (
      <div className="bg-base-200 rounded-xl p-6 border border-base-300 text-center">
        <div className="w-12 h-12 rounded-full bg-base-300 flex items-center justify-center mx-auto mb-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6 text-base-content/40"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
            />
          </svg>
        </div>
        <p className="text-sm text-base-content/60">No products in this stack</p>
        <p className="text-xs text-base-content/40 mt-1">
          Add products from the catalog
        </p>
      </div>
    );
  }

  // Filter out products that are fully removed
  const visibleProducts = products.filter(
    (item) => !removingIds.has((item.product || item).id) || removingIds.has((item.product || item).id)
  );

  return (
    <div className="bg-base-200 rounded-xl border border-base-300 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-base-300 flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5 text-primary"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
            />
          </svg>
          Products
        </h3>
        <div className="flex items-center gap-2">
          {isLoading && (
            <span className="loading loading-spinner loading-xs text-primary" />
          )}
          <span className="text-sm text-base-content/50">{products.length}</span>
        </div>
      </div>

      {/* Products list */}
      <div className="p-3 space-y-2 overflow-y-auto" style={{ maxHeight }}>
        {visibleProducts.map((item) => {
          const product = item.product || item;
          const role = item.role || "other";
          const isRemoving = removingIds.has(product.id);
          const isConfirming = confirmRemove === product.id;

          return (
            <div key={product.id} className="relative">
              <ProductItem
                product={product}
                role={role}
                onRemove={editable ? handleRemoveClick : undefined}
                onRoleChange={onRoleChange}
                editable={editable}
                isRemoving={isRemoving}
              />

              {/* Confirmation overlay */}
              {isConfirming && (
                <div className="absolute inset-0 bg-base-300/95 backdrop-blur-sm rounded-xl flex items-center justify-center gap-2 z-10">
                  <span className="text-xs text-base-content/60 mr-2">
                    Remove?
                  </span>
                  <button
                    onClick={() => handleRemove(product.id)}
                    className="btn btn-xs btn-error"
                  >
                    Yes
                  </button>
                  <button
                    onClick={handleCancelRemove}
                    className="btn btn-xs btn-ghost"
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Weight explanation */}
      <div className="px-4 py-2 bg-base-100/50 border-t border-base-content/5 text-xs text-base-content/40">
        Wallets count 2x in score calculation
      </div>
    </div>
  );
}

export default memo(SetupProductsList);
export { ProductItem, ROLES };
