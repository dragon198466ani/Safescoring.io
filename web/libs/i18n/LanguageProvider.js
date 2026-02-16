"use client";

import { createContext, useContext, useState, useCallback, useMemo } from "react";
import en from "./locales/en";

// Lazy-load additional locales to keep bundle small
const LOCALES = { en };
const localeLoaders = {
  fr: () => import("./locales/fr"),
};

const LanguageContext = createContext(null);

/**
 * Resolve a dot-notation key from a translations object.
 * e.g. "productsPage.title" → translations.productsPage.title
 */
function resolve(obj, path) {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

/**
 * Interpolate {placeholders} in a translated string.
 * e.g. t("page.desc", { count: 42 }) → "Browse 42 products"
 */
function interpolate(str, vars) {
  if (!vars || typeof str !== "string") return str;
  return str.replace(/\{(\w+)\}/g, (_, key) => (vars[key] != null ? vars[key] : `{${key}}`));
}

export function LanguageProvider({ children, defaultLocale = "en" }) {
  const [locale, setLocale] = useState(defaultLocale);
  const [translations, setTranslations] = useState(LOCALES[defaultLocale] || en);

  const changeLocale = useCallback(async (newLocale) => {
    if (LOCALES[newLocale]) {
      setLocale(newLocale);
      setTranslations(LOCALES[newLocale]);
      return;
    }
    if (localeLoaders[newLocale]) {
      try {
        const mod = await localeLoaders[newLocale]();
        LOCALES[newLocale] = mod.default;
        setLocale(newLocale);
        setTranslations(mod.default);
      } catch {
        console.warn(`Failed to load locale "${newLocale}", falling back to en`);
      }
    }
  }, []);

  const t = useCallback(
    (key, vars) => {
      const value = resolve(translations, key) ?? resolve(en, key) ?? key;
      return interpolate(value, vars);
    },
    [translations]
  );

  const value = useMemo(
    () => ({ locale, t, changeLocale }),
    [locale, t, changeLocale]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook to access translations.
 * Returns { t, locale, changeLocale }.
 * Falls back to a simple English-only resolver if used outside a Provider.
 */
export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (ctx) return ctx;

  // Fallback: work without provider (SSR safety / standalone usage)
  return {
    locale: "en",
    changeLocale: () => {},
    t: (key, vars) => {
      const value = resolve(en, key) ?? key;
      return interpolate(value, vars);
    },
  };
}
