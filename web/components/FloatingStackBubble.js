"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

/**
 * Floating bubble showing the user's current product stack
 * Supports drag-and-drop from product cards
 */
export default function FloatingStackBubble({
  pendingAddProduct,
  onProductAdded,
  onProductRemoved,
}) {
  const [stackProducts, setStackProducts] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Handle pending add from quick-add button
  useEffect(() => {
    if (pendingAddProduct && !stackProducts.find(p => p.id === pendingAddProduct.id)) {
      setStackProducts(prev => [...prev, pendingAddProduct]);
      onProductAdded?.(pendingAddProduct);
    }
  }, [pendingAddProduct]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      if (data?.id && !stackProducts.find(p => p.id === data.id)) {
        setStackProducts(prev => [...prev, data]);
        onProductAdded?.(data);
      }
    } catch {
      // Invalid drop data
    }
  };

  const handleRemove = (product) => {
    setStackProducts(prev => prev.filter(p => p.id !== product.id));
    onProductRemoved?.(product);
  };

  if (stackProducts.length === 0 && !isDragOver) return null;

  return (
    <div
      className={`fixed bottom-6 left-6 z-40 transition-all duration-300 ${isDragOver ? "scale-110" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {isExpanded ? (
        <div className="bg-base-100 rounded-2xl shadow-2xl border border-base-300 p-4 w-72 max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">My Stack ({stackProducts.length})</h3>
            <button onClick={() => setIsExpanded(false)} className="btn btn-ghost btn-xs btn-circle">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-2">
            {stackProducts.map(p => (
              <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-base-200">
                <span className="text-sm font-medium flex-1 truncate">{p.name}</span>
                <button onClick={() => handleRemove(p)} className="btn btn-ghost btn-xs text-error">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <Link href="/stack-builder" className="btn btn-primary btn-sm w-full mt-3">
            Open Stack Builder
          </Link>
        </div>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          className={`btn btn-circle btn-lg shadow-lg ${isDragOver ? "btn-primary animate-pulse" : "btn-neutral"}`}
        >
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L12 12.75 6.43 9.75m11.14 0l4.179 2.25L12 17.25 2.25 12l4.179-2.25m11.142 0l4.179 2.25-9.75 5.25-9.75-5.25 4.179-2.25" />
            </svg>
            {stackProducts.length > 0 && (
              <span className="absolute -top-2 -right-2 badge badge-primary badge-xs">{stackProducts.length}</span>
            )}
          </div>
        </button>
      )}
    </div>
  );
}
