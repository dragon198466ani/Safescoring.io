"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useTranslation } from "@/libs/i18n/LanguageProvider";

const STACK_STORAGE_KEY = "safescoring_stack";
const MAX_STACK_SIZE = 10;

/**
 * FloatingStackBubble — Drag-and-drop stack builder for product comparison.
 * Floats at bottom-right of the screen. Users can drag ProductCards onto it
 * or use the quick-add button to build a comparison stack.
 */
export default function FloatingStackBubble({
  products = [],
  pendingAddProduct,
  onProductAdded,
  onProductRemoved,
}) {
  const { t } = useTranslation();
  const [stack, setStack] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const bubbleRef = useRef(null);

  // Load stack from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STACK_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setStack(parsed.slice(0, MAX_STACK_SIZE));
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Save stack to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STACK_STORAGE_KEY, JSON.stringify(stack));
    } catch {
      // Ignore storage errors
    }
  }, [stack]);

  // Handle pending add from quick-add button
  useEffect(() => {
    if (pendingAddProduct) {
      addToStack(pendingAddProduct);
    }
  }, [pendingAddProduct]);

  const addToStack = useCallback((product) => {
    setStack((prev) => {
      // Don't add duplicates
      if (prev.some((p) => p.id === product.id)) return prev;
      if (prev.length >= MAX_STACK_SIZE) return prev;

      const newItem = {
        id: product.id,
        name: product.name,
        slug: product.slug,
        logoUrl: product.logoUrl,
        scores: product.scores,
      };

      const newStack = [...prev, newItem];
      onProductAdded?.(product);
      return newStack;
    });
  }, [onProductAdded]);

  const removeFromStack = useCallback((productId) => {
    setStack((prev) => {
      const product = prev.find((p) => p.id === productId);
      const newStack = prev.filter((p) => p.id !== productId);
      if (product) {
        onProductRemoved?.(product);
      }
      return newStack;
    });
  }, [onProductRemoved]);

  const clearStack = useCallback(() => {
    stack.forEach((p) => onProductRemoved?.(p));
    setStack([]);
    setIsExpanded(false);
  }, [stack, onProductRemoved]);

  // Drag handlers for the bubble drop zone
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      if (data?.id) {
        addToStack(data);
      }
    } catch {
      // Invalid drag data
    }
  };

  // Don't render if stack is empty and not dragging
  if (stack.length === 0 && !isDragOver) {
    return (
      <div
        className="fixed bottom-6 right-6 z-50 opacity-0 hover:opacity-100 transition-opacity"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="w-14 h-14 rounded-full bg-base-300/50 border-2 border-dashed border-base-content/20 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-base-content/30">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </div>
      </div>
    );
  }

  // Build compare URL from stack slugs
  const compareUrl = stack.length >= 2
    ? `/compare/${stack.map((p) => p.slug).join("/")}`
    : null;

  return (
    <div
      ref={bubbleRef}
      className="fixed bottom-6 right-6 z-50"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Expanded panel */}
      {isExpanded && (
        <div className="mb-3 w-72 bg-base-200 rounded-2xl border border-base-300 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
          <div className="p-4 border-b border-base-300 flex items-center justify-between">
            <span className="font-semibold text-sm">{t("stackBubble.compareStack")}</span>
            <button onClick={clearStack} className="btn btn-ghost btn-xs text-error">
              {t("stackBubble.clear")}
            </button>
          </div>
          <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
            {stack.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-base-100 border border-base-300"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{product.name}</div>
                  {product.scores?.total != null && (
                    <div className="text-xs text-base-content/50">
                      {t("stackBubble.score", { score: product.scores.total })}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeFromStack(product.id)}
                  className="btn btn-ghost btn-xs btn-circle"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          {compareUrl && (
            <div className="p-3 border-t border-base-300">
              <Link
                href={compareUrl}
                className="btn btn-primary btn-sm w-full"
              >
                {t("stackBubble.compareProducts", { count: stack.length })}
              </Link>
            </div>
          )}
          {stack.length < 2 && (
            <div className="p-3 border-t border-base-300">
              <p className="text-xs text-base-content/50 text-center">
                {t("stackBubble.addAtLeast2")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bubble button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-14 h-14 rounded-full shadow-lg flex items-center justify-center relative
          transition-all duration-200
          ${isDragOver
            ? "bg-primary scale-110 ring-4 ring-primary/30"
            : "bg-base-200 border border-base-300 hover:bg-base-300"
          }
        `}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
        {/* Badge count */}
        {stack.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-content text-xs font-bold flex items-center justify-center">
            {stack.length}
          </span>
        )}
      </button>
    </div>
  );
}
