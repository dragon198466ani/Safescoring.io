"use client";

import { createContext, useContext } from "react";
import en from "./locales/en";

const I18nContext = createContext({ locale: "en", translations: en });

function getNestedValue(obj, path, params) {
  const value = path.split(".").reduce((acc, key) => acc?.[key], obj);
  if (typeof value !== "string") return path;
  if (!params) return value;
  return Object.entries(params).reduce(
    (str, [key, val]) => str.replace(new RegExp(`\\{${key}\\}`, "g"), val),
    value
  );
}

export function useTranslation() {
  const { locale, translations } = useContext(I18nContext);
  const t = (key, params) => getNestedValue(translations, key, params);
  return { t, locale };
}

export function LanguageProvider({ children, locale = "en", translations = en }) {
  return (
    <I18nContext.Provider value={{ locale, translations }}>
      {children}
    </I18nContext.Provider>
  );
}

export default LanguageProvider;
