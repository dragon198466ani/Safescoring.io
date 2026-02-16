/**
 * Server-side i18n helper
 * Import this in Server Components (async pages) instead of useTranslation().
 * For now defaults to English. When we add server-side locale detection
 * (cookie / Accept-Language), this will resolve the correct locale.
 */
import en from "./locales/en";

function resolve(obj, path) {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

function interpolate(str, vars) {
  if (!vars || typeof str !== "string") return str;
  return str.replace(/\{(\w+)\}/g, (_, key) => (vars[key] != null ? vars[key] : `{${key}}`));
}

/**
 * Server-side translation function.
 * Usage: const t = getT();  t("product.securityInsights")
 */
export function getT(locale = "en") {
  const translations = en; // TODO: load locale dynamically when needed
  return (key, vars) => {
    const value = resolve(translations, key) ?? key;
    return interpolate(value, vars);
  };
}
