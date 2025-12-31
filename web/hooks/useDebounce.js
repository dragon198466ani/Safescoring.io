"use client";

import { useState, useEffect } from "react";

/**
 * Hook pour debouncer une valeur
 * Utile pour éviter trop de requêtes API lors de la saisie
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
