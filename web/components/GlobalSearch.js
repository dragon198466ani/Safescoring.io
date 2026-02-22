"use client";

import { useState, useEffect, useRef, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
import { Dialog, Transition } from "@headlessui/react";
import { getScoreColor } from "@/libs/score-utils";

/**
 * GlobalSearch - Command palette style product search (Cmd+K / Ctrl+K)
 *
 * Features:
 * - Keyboard shortcut to open (Cmd+K / Ctrl+K)
 * - Debounced search (300ms)
 * - Shows product name, type, and SAFE score
 * - Keyboard navigation (arrow keys + Enter)
 * - Auto-focus trap via headlessui Dialog
 */
export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const router = useRouter();
  const debounceRef = useRef(null);

  // Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounced search
  const search = useCallback(async (q) => {
    if (!q || q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(q)}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.products || data || []);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle query change with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  // Reset on close
  const handleClose = () => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
    setSelectedIndex(0);
  };

  // Navigate to product
  const goToProduct = (slug) => {
    handleClose();
    router.push(`/products/${slug}`);
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      goToProduct(results[selectedIndex].slug);
    }
  };

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-base-200/80 border border-base-content/10 text-sm text-base-content/50 hover:text-base-content/70 hover:border-base-content/20 transition-all cursor-pointer"
        aria-label="Search products"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <span>Search...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-base-300/80 text-[10px] font-mono text-base-content/40">
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </button>

      {/* Mobile search button (icon only) */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden p-2 rounded-lg hover:bg-base-200 transition-colors"
        aria-label="Search products"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
      </button>

      {/* Search modal */}
      <Transition show={isOpen} as={Fragment}>
        <Dialog onClose={handleClose} className="relative z-[60]">
          {/* Backdrop */}
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
          </Transition.Child>

          {/* Panel */}
          <div className="fixed inset-0 flex items-start justify-center pt-[15vh] px-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg bg-base-100 rounded-2xl border border-base-content/10 shadow-2xl overflow-hidden">
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-base-content/10">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-base-content/40 shrink-0" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setSelectedIndex(0);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Search crypto products..."
                    className="flex-1 bg-transparent text-base outline-none placeholder:text-base-content/40"
                    autoFocus
                  />
                  {loading && (
                    <span className="loading loading-spinner loading-sm text-base-content/40" />
                  )}
                  <kbd
                    className="px-1.5 py-0.5 rounded bg-base-200 text-[10px] font-mono text-base-content/40 cursor-pointer"
                    onClick={handleClose}
                  >
                    ESC
                  </kbd>
                </div>

                {/* Results */}
                <div className="max-h-80 overflow-y-auto">
                  {results.length > 0 ? (
                    <ul className="py-2" role="listbox">
                      {results.map((product, i) => (
                        <li
                          key={product.id || product.slug}
                          role="option"
                          aria-selected={i === selectedIndex}
                        >
                          <button
                            onClick={() => goToProduct(product.slug)}
                            onMouseEnter={() => setSelectedIndex(i)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                              i === selectedIndex
                                ? "bg-primary/10 text-base-content"
                                : "text-base-content/70 hover:bg-base-200/50"
                            }`}
                          >
                            {/* Product initial */}
                            <div className="w-9 h-9 rounded-lg bg-base-300 flex items-center justify-center font-bold text-sm text-primary shrink-0">
                              {product.name?.charAt(0) || "?"}
                            </div>
                            {/* Product info */}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{product.name}</div>
                              <div className="text-xs text-base-content/50 truncate">
                                {product.type_name || product.type || "Product"}
                              </div>
                            </div>
                            {/* Score */}
                            {product.score != null && (
                              <span className={`text-sm font-bold shrink-0 ${getScoreColor(product.score)}`}>
                                {Math.round(product.score)}
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : query.length >= 2 && !loading ? (
                    <div className="px-4 py-8 text-center text-sm text-base-content/50">
                      No products found for &ldquo;{query}&rdquo;
                    </div>
                  ) : !query ? (
                    <div className="px-4 py-6 text-center text-sm text-base-content/40">
                      Type to search 1,500+ crypto products
                    </div>
                  ) : null}
                </div>

                {/* Footer hint */}
                {results.length > 0 && (
                  <div className="flex items-center gap-4 px-4 py-2 border-t border-base-content/10 text-[11px] text-base-content/40">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 py-0.5 rounded bg-base-200 font-mono">&#8593;&#8595;</kbd>
                      navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 py-0.5 rounded bg-base-200 font-mono">&#9166;</kbd>
                      select
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 py-0.5 rounded bg-base-200 font-mono">esc</kbd>
                      close
                    </span>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
