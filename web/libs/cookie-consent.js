/**
 * Cookie Consent Utilities
 *
 * GDPR/ePrivacy compliant cookie consent management.
 * Stores user preferences in localStorage (not a cookie — no irony).
 *
 * Consent levels:
 * - "all"       : User accepted all cookies (analytics, marketing, etc.)
 * - "essential"  : User only accepted essential cookies (auth, session)
 * - null         : User hasn't made a choice yet (show banner)
 *
 * Granular categories stored separately for GDPR compliance:
 * - essential   : Always true (auth, session, CSRF)
 * - analytics   : Usage analytics (e.g. Plausible, PostHog)
 * - marketing   : Marketing/advertising cookies
 */

const CONSENT_KEY = "cookie-consent";
const CONSENT_DATE_KEY = "cookie-consent-date";
const CONSENT_CATEGORIES_KEY = "cookie-consent-categories";

/**
 * Get current consent level.
 * @returns {"all" | "essential" | null} Current consent or null if not set
 */
export function getConsent() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}

/**
 * Set consent level and record the date.
 * Also stores granular category preferences for GDPR compliance.
 * @param {"all" | "essential"} level
 * @param {{ analytics?: boolean, marketing?: boolean }} [categories] - Optional granular overrides
 */
export function setConsent(level, categories) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CONSENT_KEY, level);
    localStorage.setItem(CONSENT_DATE_KEY, new Date().toISOString());

    // Store granular categories
    const cats = {
      essential: true, // always on
      analytics: level === "all" ? true : (categories?.analytics ?? false),
      marketing: level === "all" ? true : (categories?.marketing ?? false),
    };
    localStorage.setItem(CONSENT_CATEGORIES_KEY, JSON.stringify(cats));
  } catch {
    // localStorage blocked (private browsing, etc.)
  }
}

/**
 * Check if a specific category of cookies is allowed.
 * Essential cookies are always allowed.
 *
 * @param {"essential" | "analytics" | "marketing"} category
 * @returns {boolean}
 */
export function hasConsent(category) {
  if (category === "essential") return true;

  // Check granular categories first
  if (typeof window !== "undefined") {
    try {
      const cats = localStorage.getItem(CONSENT_CATEGORIES_KEY);
      if (cats) {
        const parsed = JSON.parse(cats);
        return parsed[category] === true;
      }
    } catch {
      // fall through
    }
  }

  return getConsent() === "all";
}

/**
 * Get the date consent was given (for GDPR record-keeping).
 * @returns {string | null} ISO date string or null
 */
export function getConsentDate() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(CONSENT_DATE_KEY);
  } catch {
    return null;
  }
}

/**
 * Reset consent (user wants to change their choice).
 */
export function resetConsent() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CONSENT_KEY);
    localStorage.removeItem(CONSENT_DATE_KEY);
    localStorage.removeItem(CONSENT_CATEGORIES_KEY);
  } catch {
    // ignore
  }
}
