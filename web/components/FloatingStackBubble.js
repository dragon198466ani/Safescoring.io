"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * FloatingStackBubble - Floating drag-and-drop target for building product stacks
 * Accepts products dragged from the products grid
 */
export default function FloatingStackBubble({
  pendingAddProduct,
  onProductAdded,
  onProductRemoved,
}) {
  const [stackProducts, setStackProducts] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Handle pending add from quick-add button
  useEffect(() => {
    if (pendingAddProduct && !stackProducts.find((p) => p.id === pendingAddProduct.id)) {
      setStackProducts((prev) => [...prev, pendingAddProduct]);
      onProductAdded?.(pendingAddProduct);
    }
  }, [pendingAddProduct, stackProducts, onProductAdded]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragOver(false);
      try {
        const data = JSON.parse(e.dataTransfer.getData("application/json"));
        if (data?.id && !stackProducts.find((p) => p.id === data.id)) {
          setStackProducts((prev) => [...prev, data]);
          onProductAdded?.(data);
        }
      } catch {
        // Invalid drag data
      }
    },
    [stackProducts, onProductAdded]
  );

  const removeProduct = useCallback(
    (product) => {
      setStackProducts((prev) => prev.filter((p) => p.id !== product.id));
      onProductRemoved?.(product);
    },
    [onProductRemoved]
  );

  if (stackProducts.length === 0 && !isDragOver) return null;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`fixed bottom-[5.5rem] sm:bottom-24 right-4 sm:right-6 z-40 transition-all duration-300 ${
        isDragOver ? "scale-110" : ""
      }`}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 ${
          isDragOver
            ? "bg-primary text-primary-content ring-4 ring-primary/30"
            : "bg-base-200 text-base-content border border-base-300 hover:bg-base-300"
        }`}
        aria-label={`My stack: ${stackProducts.length} products`}
      >
        <span className="text-lg font-bold">{stackProducts.length}</span>
      </button>

      {/* Ready to analyze banner - shown when 2+ products */}
      {stackProducts.length >= 2 && !isExpanded && (
        <a
          href="/dashboard/setups"
          className="absolute bottom-16 right-0 w-48 bg-primary text-primary-content rounded-xl shadow-lg p-3 text-center animate-pulse hover:animate-none hover:scale-105 transition-transform"
        >
          <div className="text-xs font-bold mb-0.5">Ready to analyze!</div>
          <div className="text-[10px] opacity-80">{stackProducts.length} products in stack</div>
          <div className="text-xs font-semibold mt-1">Go to Setup Builder &rarr;</div>
        </a>
      )}

      {isExpanded && stackProducts.length > 0 && (
        <div className="absolute bottom-16 right-0 w-64 bg-base-100 border border-base-300 rounded-xl shadow-2xl p-3 max-h-64 overflow-y-auto">
          <h4 className="text-xs font-semibold text-base-content/60 mb-2">My Stack</h4>
          {stackProducts.map((product) => (
            <div key={product.id} className="flex items-center justify-between py-1.5">
              <span className="text-sm truncate flex-1">{product.name}</span>
              <button
                onClick={() => removeProduct(product)}
                className="btn btn-ghost btn-sm min-h-[44px] min-w-[44px] text-error"
                aria-label={`Remove ${product.name}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          ))}
          {stackProducts.length >= 2 && (
            <a
              href="/dashboard/setups"
              className="block mt-2 pt-2 border-t border-base-300 text-center text-sm font-semibold text-primary hover:underline"
            >
              Analyze Stack &rarr;
            </a>
          )}
        </div>
      )}
    </div>
  );
}
