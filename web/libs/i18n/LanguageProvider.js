"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import en from "./locales/en";
import fr from "./locales/fr";

const LOCALES = { en, fr };
const SUPPORTED_LOCALES = ["en", "fr"];
const DEFAULT_LOCALE = "en";
const STORAGE_KEY = "safescoring-locale";

/**
 * Detect the best locale from:
 * 1. localStorage (user's explicit choice)
 * 2. navigator.language (browser setting)
 * 3. Default: "en"
 */
function detectLocale() {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  // 1. Check localStorage for user's explicit choice
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LOCALES.includes(stored)) return stored;
  } catch {
    // localStorage may be blocked
  }

  // 2. Check browser language
  try {
    const browserLang = navigator.language?.split("-")[0];
    if (browserLang && SUPPORTED_LOCALES.includes(browserLang)) return browserLang;
  } catch {
    // navigator may not be available
  }

  return DEFAULT_LOCALE;
}

// Context for language state
const LanguageContext = createContext({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

/**
 * LanguageProvider — wraps the app to provide locale context.
 * Place this inside SessionProvider in LayoutClient.js.
 */
export function LanguageProvider({ children }) {
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);

  // Detect locale on mount (client-side only)
  useEffect(() => {
    setLocaleState(detectLocale());
  }, []);

  const setLocale = useCallback((newLocale) => {
    if (!SUPPORTED_LOCALES.includes(newLocale)) return;
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {
      // ignore
    }
    // Update <html lang> attribute
    document.documentElement.lang = newLocale;
  }, []);

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * useTranslation hook.
 * Returns:
 * - t(key, params?) — resolve a dot-notation key with optional interpolation
 * - locale — current locale ("en" | "fr")
 * - setLocale — switch locale
 */
export function useTranslation() {
  const { locale, setLocale } = useContext(LanguageContext);
  const translations = LOCALES[locale] || LOCALES[DEFAULT_LOCALE];

  const t = useCallback(
    (key, params) => {
      const keys = key.split(".");
      let value = translations;
      for (const k of keys) {
        value = value?.[k];
        if (value === undefined) {
          // Fallback to English if key missing in current locale
          let fallback = LOCALES[DEFAULT_LOCALE];
          for (const fk of keys) {
            fallback = fallback?.[fk];
            if (fallback === undefined) return key;
          }
          value = fallback;
          break;
        }
      }
      // Return non-string values directly (arrays, objects, numbers)
      if (typeof value !== "string") {
        return value !== undefined && value !== null ? value : key;
      }
      if (!params) return value;
      return value.replace(/\{(\w+)\}/g, (_, name) =>
        params[name] !== undefined ? String(params[name]) : `{${name}}`
      );
    },
    [translations]
  );

  return { t, locale, setLocale };
}
