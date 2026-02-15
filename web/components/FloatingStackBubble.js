"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

/**
 * FloatingStackBubble - Floating bubble showing user's product stack
 */
export default function FloatingStackBubble({ products = [], pendingAddProduct, onProductAdded }) {
  const [stackIds, setStackIds] = useState(new Set());
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (pendingAddProduct && !stackIds.has(pendingAddProduct.id)) {
      setStackIds((prev) => new Set([...prev, pendingAddProduct.id]));
      if (onProductAdded) onProductAdded(pendingAddProduct);
    }
  }, [pendingAddProduct, stackIds, onProductAdded]);

  const stackCount = stackIds.size;

  if (stackCount === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="btn btn-primary btn-circle shadow-lg"
      >
        {stackCount}
      </button>
      {isExpanded && (
        <div className="absolute bottom-16 right-0 w-64 rounded-xl bg-base-200 border border-base-300 shadow-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm">My Stack ({stackCount})</span>
            <Link href="/stack-audit" className="text-xs text-primary hover:underline">
              View
            </Link>
          </div>
          <p className="text-xs text-base-content/50">
            {stackCount} product{stackCount > 1 ? "s" : ""} in your stack
          </p>
        </div>
      )}
    </div>
  );
}
