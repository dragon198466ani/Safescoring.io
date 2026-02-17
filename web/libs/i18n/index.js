/**
 * i18n - Internationalization Module
 *
 * Automatic language detection based on:
 * 1. User preference (localStorage)
 * 2. Browser language
 * 3. Geographic location (timezone)
 * 4. Default: English
 */

import en from "./locales/en";
import fr from "./locales/fr";
import pt from "./locales/pt";
import de from "./locales/de";
import es from "./locales/es";
import ja from "./locales/ja";
import it from "./locales/it";
import nl from "./locales/nl";
import ko from "./locales/ko";
import zh from "./locales/zh";
import ru from "./locales/ru";
import ar from "./locales/ar";
import tr from "./locales/tr";
import pl from "./locales/pl";
import hi from "./locales/hi";

// Available languages (15 languages for maximum international SEO coverage)
export const languages = {
  en: { name: "English", locale: en, flag: "🇬🇧" },
  fr: { name: "Français", locale: fr, flag: "🇫🇷" },
  de: { name: "Deutsch", locale: de, flag: "🇩🇪" },
  es: { name: "Español", locale: es, flag: "🇪🇸" },
  pt: { name: "Português", locale: pt, flag: "🇧🇷" },
  ja: { name: "日本語", locale: ja, flag: "🇯🇵" },
  it: { name: "Italiano", locale: it, flag: "🇮🇹" },
  nl: { name: "Nederlands", locale: nl, flag: "🇳🇱" },
  ko: { name: "한국어", locale: ko, flag: "🇰🇷" },
  zh: { name: "中文", locale: zh, flag: "🇨🇳" },
  ru: { name: "Русский", locale: ru, flag: "🇷🇺" },
  ar: { name: "العربية", locale: ar, flag: "🇸🇦", dir: "rtl" },
  tr: { name: "Türkçe", locale: tr, flag: "🇹🇷" },
  pl: { name: "Polski", locale: pl, flag: "🇵🇱" },
  hi: { name: "हिन्दी", locale: hi, flag: "🇮🇳" },
};

export const supportedLanguages = Object.keys(languages);
export const defaultLanguage = "en";

const LANGUAGE_KEY = "user_language";

/**
 * Detect language from timezone
 */
function getLanguageFromTimezone() {
  if (typeof window === "undefined") return null;

  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Japanese regions (APPI)
    if (timezone.includes("Asia/Tokyo")) {
      return "ja";
    }

    // German-speaking regions (DSGVO)
    if (
      timezone.includes("Europe/Berlin") ||
      timezone.includes("Europe/Vienna") ||
      timezone.includes("Europe/Zurich")
    ) {
      return "de";
    }

    // Spanish-speaking regions
    if (
      timezone.includes("Europe/Madrid") ||
      timezone.includes("America/Mexico_City") ||
      timezone.includes("America/Buenos_Aires") ||
      timezone.includes("America/Bogota") ||
      timezone.includes("America/Lima") ||
      timezone.includes("America/Santiago")
    ) {
      return "es";
    }

    // French-speaking regions (RGPD)
    if (
      timezone.includes("Europe/Paris") ||
      timezone.includes("Europe/Brussels") ||
      timezone.includes("Europe/Luxembourg") ||
      timezone.includes("Africa/Algiers") ||
      timezone.includes("Africa/Tunis") ||
      timezone.includes("Africa/Casablanca") ||
      timezone.includes("America/Montreal")
    ) {
      return "fr";
    }

    // Portuguese-speaking regions (LGPD - Brazil)
    if (
      timezone.includes("America/Sao_Paulo") ||
      timezone.includes("America/Rio_Branco") ||
      timezone.includes("America/Manaus") ||
      timezone.includes("America/Belem") ||
      timezone.includes("America/Fortaleza") ||
      timezone.includes("America/Recife") ||
      timezone.includes("America/Bahia") ||
      timezone.includes("America/Cuiaba") ||
      timezone.includes("America/Porto_Velho") ||
      timezone.includes("Europe/Lisbon")
    ) {
      return "pt";
    }

    // Italian-speaking regions
    if (timezone.includes("Europe/Rome")) {
      return "it";
    }

    // Dutch-speaking regions
    if (timezone.includes("Europe/Amsterdam")) {
      return "nl";
    }

    // Korean regions
    if (timezone.includes("Asia/Seoul")) {
      return "ko";
    }

    // Chinese regions
    if (
      timezone.includes("Asia/Shanghai") ||
      timezone.includes("Asia/Hong_Kong") ||
      timezone.includes("Asia/Taipei")
    ) {
      return "zh";
    }

    // Russian regions
    if (
      timezone.includes("Europe/Moscow") ||
      timezone.includes("Asia/Yekaterinburg") ||
      timezone.includes("Asia/Novosibirsk")
    ) {
      return "ru";
    }

    // Arabic-speaking regions
    if (
      timezone.includes("Asia/Riyadh") ||
      timezone.includes("Asia/Dubai") ||
      timezone.includes("Africa/Cairo")
    ) {
      return "ar";
    }

    // Turkish regions
    if (timezone.includes("Europe/Istanbul")) {
      return "tr";
    }

    // Polish regions
    if (timezone.includes("Europe/Warsaw")) {
      return "pl";
    }

    // Hindi-speaking regions (India)
    if (timezone.includes("Asia/Kolkata")) {
      return "hi";
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Detect language from browser settings and user content preferences
 * Analyzes multiple signals to determine the best language
 */
function getLanguageFromBrowser() {
  if (typeof window === "undefined") return null;

  try {
    const languageScores = {};

    // 1. Primary browser language (strongest signal)
    const primaryLang = navigator.language || navigator.userLanguage;
    if (primaryLang) {
      const code = primaryLang.split("-")[0].toLowerCase();
      if (supportedLanguages.includes(code)) {
        languageScores[code] = (languageScores[code] || 0) + 10;
      }
    }

    // 2. All browser language preferences (ordered by user preference)
    const browserLangs = navigator.languages || [];
    browserLangs.forEach((lang, index) => {
      const code = lang.split("-")[0].toLowerCase();
      if (supportedLanguages.includes(code)) {
        // Higher score for higher preference (first = most preferred)
        languageScores[code] = (languageScores[code] || 0) + (5 - Math.min(index, 4));
      }
    });

    // 3. Check document referrer language hints
    if (document.referrer) {
      try {
        const referrerUrl = new URL(document.referrer);
        const referrerHost = referrerUrl.hostname.toLowerCase();

        // Detect language from TLD or subdomain
        const tldLangMap = {
          ".fr": "fr", ".de": "de", ".es": "es", ".pt": "pt", ".br": "pt", ".jp": "ja",
          ".co.uk": "en", ".com.br": "pt", ".com.mx": "es", ".co.jp": "ja"
        };

        for (const [tld, lang] of Object.entries(tldLangMap)) {
          if (referrerHost.endsWith(tld)) {
            languageScores[lang] = (languageScores[lang] || 0) + 3;
            break;
          }
        }

        // Check for language in path (e.g., /fr/, /de/, /es/)
        const pathMatch = referrerUrl.pathname.match(/^\/([a-z]{2})\//);
        if (pathMatch && supportedLanguages.includes(pathMatch[1])) {
          languageScores[pathMatch[1]] = (languageScores[pathMatch[1]] || 0) + 2;
        }
      } catch {
        // Invalid referrer URL, ignore
      }
    }

    // 4. Check URL parameters (e.g., ?lang=fr, ?hl=de)
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get("lang") || urlParams.get("hl") || urlParams.get("locale");
    if (urlLang) {
      const code = urlLang.split("-")[0].toLowerCase();
      if (supportedLanguages.includes(code)) {
        languageScores[code] = (languageScores[code] || 0) + 8;
      }
    }

    // 5. Check current URL path for language prefix
    const currentPath = window.location.pathname;
    const currentPathMatch = currentPath.match(/^\/([a-z]{2})(\/|$)/);
    if (currentPathMatch && supportedLanguages.includes(currentPathMatch[1])) {
      languageScores[currentPathMatch[1]] = (languageScores[currentPathMatch[1]] || 0) + 7;
    }

    // 6. Check keyboard layout hints (if available)
    if (navigator.keyboard && navigator.keyboard.getLayoutMap) {
      // Note: This is async and may not be available immediately
      // We'll handle this separately in an effect if needed
    }

    // Return the language with the highest score
    let bestLang = null;
    let bestScore = 0;

    for (const [lang, score] of Object.entries(languageScores)) {
      if (score > bestScore) {
        bestScore = score;
        bestLang = lang;
      }
    }

    return bestLang;
  } catch {
    return null;
  }
}

/**
 * Advanced detection: Check user's content consumption patterns
 * Uses localStorage to track and learn from user behavior
 */
function getLanguageFromContentPatterns() {
  if (typeof window === "undefined") return null;

  try {
    // Check stored content language preferences
    const contentLangData = localStorage.getItem("content_language_stats");
    if (!contentLangData) return null;

    const stats = JSON.parse(contentLangData);

    // Find most consumed language content
    let topLang = null;
    let topCount = 0;

    for (const [lang, count] of Object.entries(stats)) {
      if (supportedLanguages.includes(lang) && count > topCount) {
        topCount = count;
        topLang = lang;
      }
    }

    // Only use if significant pattern detected (minimum 5 interactions)
    return topCount >= 5 ? topLang : null;
  } catch {
    return null;
  }
}

/**
 * Track content language consumption (call this when user views content)
 */
export function trackContentLanguage(lang) {
  if (typeof window === "undefined") return;
  if (!supportedLanguages.includes(lang)) return;

  try {
    const contentLangData = localStorage.getItem("content_language_stats");
    const stats = contentLangData ? JSON.parse(contentLangData) : {};

    stats[lang] = (stats[lang] || 0) + 1;

    // Decay old stats to prioritize recent behavior
    const now = Date.now();
    const lastDecay = localStorage.getItem("content_lang_decay") || 0;

    // Decay every 7 days
    if (now - lastDecay > 7 * 24 * 60 * 60 * 1000) {
      for (const key of Object.keys(stats)) {
        stats[key] = Math.floor(stats[key] * 0.8);
        if (stats[key] < 1) delete stats[key];
      }
      localStorage.setItem("content_lang_decay", now.toString());
    }

    localStorage.setItem("content_language_stats", JSON.stringify(stats));
  } catch {
    // Storage error, ignore
  }
}

/**
 * Get saved language preference
 */
export function getSavedLanguage() {
  if (typeof window === "undefined") return null;

  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (saved && supportedLanguages.includes(saved)) {
      return saved;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save language preference
 */
export function saveLanguage(lang) {
  if (typeof window === "undefined") return;

  try {
    if (supportedLanguages.includes(lang)) {
      localStorage.setItem(LANGUAGE_KEY, lang);
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Detect the best language for the user
 * Priority: 1. Saved preference, 2. Content patterns, 3. Browser language, 4. Timezone, 5. Default
 */
export function detectLanguage() {
  // 1. Check saved preference (explicit user choice)
  const saved = getSavedLanguage();
  if (saved) return saved;

  // 2. Check content consumption patterns (learned behavior)
  const contentLang = getLanguageFromContentPatterns();
  if (contentLang) return contentLang;

  // 3. Check browser language and referrer signals
  const browserLang = getLanguageFromBrowser();
  if (browserLang) return browserLang;

  // 4. Check timezone (geographic hint)
  const timezoneLang = getLanguageFromTimezone();
  if (timezoneLang) return timezoneLang;

  // 5. Default to English
  return defaultLanguage;
}

/**
 * Get translations for a language
 */
export function getTranslations(lang) {
  const language = languages[lang] || languages[defaultLanguage];
  return language.locale;
}

/**
 * Get value from nested object by key path
 */
function getNestedValue(obj, key) {
  const keys = key.split(".");
  let value = obj;

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = value[k];
    } else {
      return undefined;
    }
  }

  return value;
}

/**
 * Translate a key with nested path support and automatic English fallback
 * e.g., t("cookies.title") -> "Cookie Preferences"
 * If translation missing in current language, falls back to English
 */
export function translate(translations, key, params = {}) {
  // Try current language first
  let value = getNestedValue(translations, key);

  // Fallback to English if not found
  if (value === undefined) {
    value = getNestedValue(en, key);
    if (value === undefined) {
      // Key not found in any language
      if (typeof window !== "undefined") {
        console.warn(`Translation missing in all languages: ${key}`);
      }
      return key;
    }
  }

  // Handle string interpolation with {param} syntax
  if (typeof value === "string" && Object.keys(params).length > 0) {
    return value.replace(/\{(\w+)\}/g, (_, paramKey) => {
      return params[paramKey] !== undefined ? params[paramKey] : `{${paramKey}}`;
    });
  }

  return value;
}

/**
 * Get jurisdiction from language/location
 */
export function getJurisdictionFromLanguage(lang) {
  const jurisdictionMap = {
    pt: "LGPD",     // Brazil
    fr: "GDPR",     // France/EU (RGPD)
    de: "GDPR",     // Germany/EU (DSGVO)
    es: "GDPR",     // Spain/EU
    ja: "APPI",     // Japan
    en: "GDPR",     // Default to GDPR (strictest)
  };

  return jurisdictionMap[lang] || "GDPR";
}

export default {
  languages,
  supportedLanguages,
  defaultLanguage,
  detectLanguage,
  getTranslations,
  translate,
  saveLanguage,
  getSavedLanguage,
  getJurisdictionFromLanguage,
  trackContentLanguage,
};
