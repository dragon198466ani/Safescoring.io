"use client";

import { useEffect, useCallback, useRef } from "react";

/**
 * Web Vitals Monitoring Hook
 * Tracks Core Web Vitals (LCP, FID, CLS) and custom performance metrics
 *
 * @param {Object} options
 * @param {boolean} options.enabled - Enable/disable tracking
 * @param {boolean} options.debug - Log metrics to console
 * @param {Function} options.onMetric - Callback for each metric
 */
export function useWebVitals({
  enabled = true,
  debug = false,
  onMetric = null,
} = {}) {
  const metricsRef = useRef({});

  const reportMetric = useCallback(
    (metric) => {
      metricsRef.current[metric.name] = metric;

      if (debug) {
        console.log(`[WebVitals] ${metric.name}:`, metric.value.toFixed(2), metric.rating || "");
      }

      if (onMetric) {
        onMetric(metric);
      }

      // Send to analytics (if configured)
      if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", metric.name, {
          event_category: "Web Vitals",
          value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
          event_label: metric.id,
          non_interaction: true,
        });
      }
    },
    [debug, onMetric]
  );

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let cleanup = [];

    // Dynamic import web-vitals library
    import("web-vitals")
      .then(({ onCLS, onFID, onLCP, onFCP, onTTFB, onINP }) => {
        // Core Web Vitals
        onCLS(reportMetric);
        onFID(reportMetric);
        onLCP(reportMetric);

        // Additional metrics
        onFCP(reportMetric);
        onTTFB(reportMetric);

        // Interaction to Next Paint (newer metric)
        if (onINP) {
          onINP(reportMetric);
        }
      })
      .catch(() => {
        // web-vitals not installed, use fallback
        measureWithPerformanceObserver(reportMetric, cleanup);
      });

    return () => {
      cleanup.forEach((observer) => observer.disconnect?.());
    };
  }, [enabled, reportMetric]);

  return {
    metrics: metricsRef.current,
    getMetric: (name) => metricsRef.current[name],
  };
}

/**
 * Fallback measurement using PerformanceObserver
 */
function measureWithPerformanceObserver(reportMetric, cleanup) {
  if (typeof PerformanceObserver === "undefined") return;

  // Largest Contentful Paint
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      reportMetric({
        name: "LCP",
        value: lastEntry.startTime,
        rating: lastEntry.startTime < 2500 ? "good" : lastEntry.startTime < 4000 ? "needs-improvement" : "poor",
      });
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
    cleanup.push(lcpObserver);
  } catch (e) {
    // Not supported
  }

  // First Input Delay
  try {
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const firstEntry = entries[0];
      if (firstEntry) {
        const value = firstEntry.processingStart - firstEntry.startTime;
        reportMetric({
          name: "FID",
          value,
          rating: value < 100 ? "good" : value < 300 ? "needs-improvement" : "poor",
        });
      }
    });
    fidObserver.observe({ type: "first-input", buffered: true });
    cleanup.push(fidObserver);
  } catch (e) {
    // Not supported
  }

  // Cumulative Layout Shift
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      reportMetric({
        name: "CLS",
        value: clsValue,
        rating: clsValue < 0.1 ? "good" : clsValue < 0.25 ? "needs-improvement" : "poor",
      });
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });
    cleanup.push(clsObserver);
  } catch (e) {
    // Not supported
  }

  // First Contentful Paint
  try {
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcpEntry = entries.find((e) => e.name === "first-contentful-paint");
      if (fcpEntry) {
        reportMetric({
          name: "FCP",
          value: fcpEntry.startTime,
          rating: fcpEntry.startTime < 1800 ? "good" : fcpEntry.startTime < 3000 ? "needs-improvement" : "poor",
        });
      }
    });
    fcpObserver.observe({ type: "paint", buffered: true });
    cleanup.push(fcpObserver);
  } catch (e) {
    // Not supported
  }
}

/**
 * Custom performance mark/measure utilities
 */
export function markStart(name) {
  if (typeof performance !== "undefined") {
    performance.mark(`${name}-start`);
  }
}

export function markEnd(name) {
  if (typeof performance !== "undefined") {
    performance.mark(`${name}-end`);
    try {
      performance.measure(name, `${name}-start`, `${name}-end`);
      const measures = performance.getEntriesByName(name);
      return measures[measures.length - 1]?.duration;
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * Track component render time
 */
export function useRenderTime(componentName, enabled = true) {
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    if (startTimeRef.current === null) {
      startTimeRef.current = performance.now();
    }

    return () => {
      if (startTimeRef.current !== null) {
        const renderTime = performance.now() - startTimeRef.current;
        if (renderTime > 100) {
          console.warn(`[Performance] ${componentName} slow render: ${renderTime.toFixed(2)}ms`);
        }
      }
    };
  }, [componentName, enabled]);
}

export default useWebVitals;
