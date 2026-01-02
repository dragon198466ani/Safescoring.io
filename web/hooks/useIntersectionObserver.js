"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Custom hook for Intersection Observer
 * Optimized for lazy loading and viewport-based rendering
 *
 * @param {Object} options
 * @param {number} options.threshold - Visibility threshold (0-1)
 * @param {string} options.rootMargin - Margin around root (e.g., "100px")
 * @param {boolean} options.triggerOnce - Only trigger once when visible
 * @param {boolean} options.enabled - Enable/disable observer
 */
export function useIntersectionObserver({
  threshold = 0,
  rootMargin = "100px",
  triggerOnce = true,
  enabled = true,
} = {}) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const elementRef = useRef(null);
  const observerRef = useRef(null);

  const cleanup = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Skip if disabled or already triggered (for triggerOnce)
    if (!enabled || (triggerOnce && hasBeenVisible)) {
      return;
    }

    // Check for SSR
    if (typeof window === "undefined" || !window.IntersectionObserver) {
      setIsVisible(true);
      setHasBeenVisible(true);
      return;
    }

    const element = elementRef.current;
    if (!element) return;

    cleanup();

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setIsVisible(visible);

        if (visible) {
          setHasBeenVisible(true);
          if (triggerOnce) {
            cleanup();
          }
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observerRef.current.observe(element);

    return cleanup;
  }, [threshold, rootMargin, triggerOnce, enabled, hasBeenVisible, cleanup]);

  return {
    ref: elementRef,
    isVisible,
    hasBeenVisible,
  };
}

/**
 * Wrapper component for lazy loading content when visible
 */
export function LazyLoad({
  children,
  placeholder = null,
  threshold = 0,
  rootMargin = "200px",
  className = "",
  minHeight = "auto",
}) {
  const { ref, hasBeenVisible } = useIntersectionObserver({
    threshold,
    rootMargin,
    triggerOnce: true,
  });

  return (
    <div ref={ref} className={className} style={{ minHeight }}>
      {hasBeenVisible ? children : placeholder}
    </div>
  );
}

/**
 * Hook for tracking multiple elements visibility
 * Useful for virtualized lists or analytics
 */
export function useVisibilityTracker(elementIds = []) {
  const [visibleElements, setVisibleElements] = useState(new Set());
  const observerRef = useRef(null);
  const elementsRef = useRef(new Map());

  useEffect(() => {
    if (typeof window === "undefined" || !window.IntersectionObserver) {
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        setVisibleElements((prev) => {
          const next = new Set(prev);
          entries.forEach((entry) => {
            const id = entry.target.dataset.trackId;
            if (entry.isIntersecting) {
              next.add(id);
            } else {
              next.delete(id);
            }
          });
          return next;
        });
      },
      {
        threshold: 0.1,
        rootMargin: "50px",
      }
    );

    // Observe all registered elements
    elementsRef.current.forEach((element) => {
      if (element) {
        observerRef.current.observe(element);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const registerElement = useCallback((id, element) => {
    if (element) {
      element.dataset.trackId = id;
      elementsRef.current.set(id, element);
      if (observerRef.current) {
        observerRef.current.observe(element);
      }
    } else {
      const existing = elementsRef.current.get(id);
      if (existing && observerRef.current) {
        observerRef.current.unobserve(existing);
      }
      elementsRef.current.delete(id);
    }
  }, []);

  return {
    visibleElements,
    registerElement,
    isVisible: (id) => visibleElements.has(id),
  };
}

export default useIntersectionObserver;
