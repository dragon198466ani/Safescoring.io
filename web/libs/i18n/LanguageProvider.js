"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import en from "./locales/en";
import { detectLanguage, getTranslations, languages, saveLanguage } from "./index";

const I18nContext = createContext({
  locale: "en",
  translations: en,
  setLocale: () => {},
});

function getNestedValue(obj, path, params) {
  const value = path.split(".").reduce((acc, key) => acc?.[key], obj);
  // Fallback to English if key not found in current locale
  if (typeof value !== "string") {
    const fallback = path.split(".").reduce((acc, key) => acc?.[key], en);
    if (typeof fallback !== "string") return path;
    if (!params) return fallback;
    return Object.entries(params).reduce(
      (str, [key, val]) => str.replace(new RegExp(`\\{${key}\\}`, "g"), val),
      fallback
    );
  }
  if (!params) return value;
  return Object.entries(params).reduce(
    (str, [key, val]) => str.replace(new RegExp(`\\{${key}\\}`, "g"), val),
    value
  );
}

export function useTranslation() {
  const { locale, translations, setLocale } = useContext(I18nContext);
  const t = useCallback(
    (key, params) => getNestedValue(translations, key, params),
    [translations]
  );
  return { t, locale, setLocale };
}

/**
 * Auto-detecting LanguageProvider
 * Detects user language on mount, allows manual override via setLocale
 */
export function LanguageProvider({ children, locale: initialLocale, translations: initialTranslations }) {
  const [locale, setLocaleState] = useState(initialLocale || "en");
  const [translations, setTranslations] = useState(initialTranslations || en);

  // Auto-detect language on mount (client-side only)
  useEffect(() => {
    if (!initialLocale) {
      try {
        const detected = detectLanguage();
        if (detected && detected !== locale) {
          setLocaleState(detected);
          setTranslations(getTranslations(detected));
        }
      } catch {
        // Keep default English
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setLocale = useCallback((newLocale) => {
    if (languages[newLocale]) {
      setLocaleState(newLocale);
      setTranslations(getTranslations(newLocale));
      saveLanguage(newLocale);
    }
  }, []);

  return (
    <I18nContext.Provider value={{ locale, translations, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export default LanguageProvider;
