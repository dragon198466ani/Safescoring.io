"use client";

/**
 * i18n placeholder - returns key as fallback with param substitution
 */
export function useTranslation() {
  const t = (key, params) => {
    let result = key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        result = result.replace(`{${k}}`, String(v));
      });
    }
    return result;
  };

  return { t, locale: "en" };
}
