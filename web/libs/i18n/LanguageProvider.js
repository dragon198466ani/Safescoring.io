"use client";

import { createContext, useContext } from "react";

const LanguageContext = createContext({
  locale: "en",
  t: (key) => key,
});

export function LanguageProvider({ children, locale = "en" }) {
  const t = (key) => key;

  return (
    <LanguageContext.Provider value={{ locale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}

export default LanguageProvider;
