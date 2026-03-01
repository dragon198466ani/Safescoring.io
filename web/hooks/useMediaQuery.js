"use client";

import { useState, useEffect } from "react";

/**
 * useMediaQuery — Subscribe to a CSS media query match state.
 *
 * @param {string} query - CSS media query string, e.g. "(min-width: 768px)"
 * @returns {boolean} Whether the query currently matches
 *
 * @example
 * const isTablet = useMediaQuery("(min-width: 768px)");
 * const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    const handler = (e) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
