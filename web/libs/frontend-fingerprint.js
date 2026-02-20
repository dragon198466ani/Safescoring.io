/**
 * Frontend DOM Fingerprinting System
 *
 * Injects invisible, traceable markers into the DOM to detect:
 * 1. Screenshot scraping (visual fingerprints)
 * 2. Copy-paste operations (clipboard fingerprints)
 * 3. DOM scraping (invisible character patterns)
 *
 * Works alongside steganographic-fingerprint.js (API) and device-fingerprint.js (session)
 */

// Zero-width characters for invisible text fingerprinting
const ZERO_WIDTH_CHARS = [
  '\u200B', // Zero-width space
  '\u200C', // Zero-width non-joiner
  '\u200D', // Zero-width joiner
  '\uFEFF', // Zero-width no-break space
];

// Generate session-unique fingerprint seed
function generateSessionSeed() {
  // Use existing session or create new
  if (typeof window !== 'undefined') {
    let seed = sessionStorage.getItem('ss_fp_seed');
    if (!seed) {
      seed = Math.random().toString(36).substring(2, 15) +
             Date.now().toString(36);
      sessionStorage.setItem('ss_fp_seed', seed);
    }
    return seed;
  }
  return 'server';
}

/**
 * Encode a fingerprint into zero-width characters
 * Each 2-bit pair maps to one zero-width character
 */
function encodeFingerprint(fingerprint) {
  let result = '';
  for (let i = 0; i < fingerprint.length; i++) {
    const charCode = fingerprint.charCodeAt(i);
    // Encode each byte as 4 zero-width characters (2 bits each)
    for (let j = 3; j >= 0; j--) {
      const bits = (charCode >> (j * 2)) & 0x03;
      result += ZERO_WIDTH_CHARS[bits];
    }
  }
  return result;
}

/**
 * Decode zero-width characters back to fingerprint
 */
function decodeFingerprint(encoded) {
  let result = '';
  for (let i = 0; i < encoded.length; i += 4) {
    let charCode = 0;
    for (let j = 0; j < 4; j++) {
      const zwc = encoded[i + j];
      const bits = ZERO_WIDTH_CHARS.indexOf(zwc);
      if (bits === -1) continue;
      charCode = (charCode << 2) | bits;
    }
    if (charCode > 0) {
      result += String.fromCharCode(charCode);
    }
  }
  return result;
}

/**
 * Inject invisible fingerprint into text content
 * The fingerprint is invisible but will be copied with the text
 */
export function fingerprintText(text, fingerprintId) {
  if (!text || typeof text !== 'string') return text;

  const seed = fingerprintId || generateSessionSeed();
  const encoded = encodeFingerprint(seed.substring(0, 8));

  // Insert fingerprint at strategic positions
  const insertPoints = [
    Math.floor(text.length * 0.25),
    Math.floor(text.length * 0.5),
    Math.floor(text.length * 0.75),
  ];

  let result = text;
  let offset = 0;

  for (const point of insertPoints) {
    const insertPos = point + offset;
    if (insertPos < result.length) {
      result = result.slice(0, insertPos) + encoded + result.slice(insertPos);
      offset += encoded.length;
    }
  }

  return result;
}

/**
 * Extract fingerprint from copied text
 * Returns null if no fingerprint found
 */
export function extractFingerprint(text) {
  if (!text) return null;

  // Find sequences of zero-width characters
  const zwcPattern = new RegExp(`[${ZERO_WIDTH_CHARS.join('')}]{8,}`, 'g');
  const matches = text.match(zwcPattern);

  if (!matches || matches.length === 0) return null;

  // Decode the first match
  return decodeFingerprint(matches[0]);
}

/**
 * Monitor copy events and log fingerprinted copies
 */
export function setupCopyMonitoring(onCopyDetected) {
  if (typeof window === 'undefined') return;

  document.addEventListener('copy', (e) => {
    const selection = window.getSelection();
    if (!selection) return;

    const copiedText = selection.toString();
    const fingerprint = extractFingerprint(copiedText);

    if (fingerprint) {
      // Log the copy event
      const event = {
        type: 'copy_detected',
        fingerprint,
        timestamp: new Date().toISOString(),
        textLength: copiedText.length,
        url: window.location.href,
      };

      if (onCopyDetected) {
        onCopyDetected(event);
      }

      // Send to analytics (non-blocking)
      navigator.sendBeacon?.('/api/track/copy', JSON.stringify(event));
    }
  });
}

/**
 * Apply visual micro-variations to numbers
 * Creates subtle, unique visual patterns per session
 */
export function applyScoreVariation(score, elementId) {
  if (typeof score !== 'number') return score;

  const seed = generateSessionSeed();
  const hash = simpleHash(`${seed}:${elementId}:${score}`);

  // Apply micro-variation: ±0.01 (imperceptible but traceable)
  const variation = ((hash % 21) - 10) / 1000;
  return Math.round((score + variation) * 100) / 100;
}

/**
 * Simple hash function for deterministic variations
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Create CSS-based visual fingerprint
 * Adds imperceptible but unique styling per session
 */
export function generateCSSFingerprint() {
  if (typeof window === 'undefined') return '';

  const seed = generateSessionSeed();
  const hash = simpleHash(seed);

  // Generate micro-variations in CSS
  const letterSpacing = 0.001 + (hash % 10) * 0.0001;
  const wordSpacing = 0.001 + ((hash >> 4) % 10) * 0.0001;
  const opacity = 0.999 + ((hash >> 8) % 10) * 0.0001;

  return `
    .ss-fingerprinted {
      letter-spacing: ${letterSpacing}em;
      word-spacing: ${wordSpacing}em;
      opacity: ${opacity};
    }
  `;
}

/**
 * Inject fingerprint styles into page
 */
export function injectFingerprintStyles() {
  if (typeof window === 'undefined') return;

  const existingStyle = document.getElementById('ss-fp-styles');
  if (existingStyle) return;

  const style = document.createElement('style');
  style.id = 'ss-fp-styles';
  style.textContent = generateCSSFingerprint();
  document.head.appendChild(style);
}

/**
 * React hook for frontend fingerprinting
 */
export function useFrontendFingerprint() {
  if (typeof window === 'undefined') {
    return {
      fingerprintText: (t) => t,
      sessionId: 'server',
      applyVariation: (s) => s,
    };
  }

  const sessionId = generateSessionSeed();

  return {
    fingerprintText: (text) => fingerprintText(text, sessionId),
    sessionId,
    applyVariation: (score, elementId) => applyScoreVariation(score, elementId),
    extractFingerprint,
  };
}

/**
 * Detect if page is being rendered by headless browser (scraper)
 */
export function detectHeadlessBrowser() {
  if (typeof window === 'undefined') return { isHeadless: false, signals: [] };

  const signals = [];

  // Check for common headless indicators
  if (navigator.webdriver) {
    signals.push('webdriver');
  }

  if (!window.chrome && navigator.userAgent.includes('Chrome')) {
    signals.push('fake_chrome');
  }

  if (navigator.plugins.length === 0) {
    signals.push('no_plugins');
  }

  if (navigator.languages.length === 0) {
    signals.push('no_languages');
  }

  // Check for automation-specific properties
  if (window._phantom || window.__nightmare || window.callPhantom) {
    signals.push('automation_framework');
  }

  // Check for missing features
  if (!window.speechSynthesis) {
    signals.push('no_speech_synthesis');
  }

  // Check screen dimensions
  if (window.outerWidth === 0 || window.outerHeight === 0) {
    signals.push('zero_dimensions');
  }

  return {
    isHeadless: signals.length >= 2,
    signals,
    score: signals.length,
  };
}

/**
 * Monitor for suspicious scraping behavior
 */
export function setupScrapingDetection(onSuspiciousActivity) {
  if (typeof window === 'undefined') return;

  let rapidScrollCount = 0;
  let lastScrollTime = 0;
  let noInteractionTime = 0;
  let pageViewCount = 0;

  // Track page views in session
  pageViewCount = parseInt(sessionStorage.getItem('ss_page_views') || '0') + 1;
  sessionStorage.setItem('ss_page_views', pageViewCount.toString());

  // Detect rapid scrolling (bot-like behavior)
  window.addEventListener('scroll', () => {
    const now = Date.now();
    if (now - lastScrollTime < 50) {
      rapidScrollCount++;
    } else {
      rapidScrollCount = Math.max(0, rapidScrollCount - 1);
    }
    lastScrollTime = now;

    if (rapidScrollCount > 20) {
      onSuspiciousActivity?.({
        type: 'rapid_scroll',
        count: rapidScrollCount,
      });
    }
  }, { passive: true });

  // Track interaction (or lack thereof)
  const interactionEvents = ['click', 'mousemove', 'keydown', 'touchstart'];
  let hasInteracted = false;

  const interactionHandler = () => {
    hasInteracted = true;
    noInteractionTime = 0;
  };

  interactionEvents.forEach(event => {
    window.addEventListener(event, interactionHandler, { passive: true, once: true });
  });

  // Check for lack of interaction after page load
  setTimeout(() => {
    if (!hasInteracted && pageViewCount > 5) {
      onSuspiciousActivity?.({
        type: 'no_interaction',
        pageViews: pageViewCount,
      });
    }
  }, 10000);

  // Alert on high page view count without interaction
  if (pageViewCount > 50) {
    const headlessCheck = detectHeadlessBrowser();
    if (headlessCheck.signals.length > 0) {
      onSuspiciousActivity?.({
        type: 'suspected_bot',
        pageViews: pageViewCount,
        headlessSignals: headlessCheck.signals,
      });
    }
  }
}

/**
 * Initialize all frontend fingerprinting protections
 */
export function initFrontendProtection(options = {}) {
  if (typeof window === 'undefined') return;

  const {
    enableCopyMonitoring = true,
    enableScrapingDetection = true,
    enableStyles = true,
    onSuspiciousActivity = null,
    onCopyDetected = null,
  } = options;

  // Inject CSS fingerprint
  if (enableStyles) {
    injectFingerprintStyles();
  }

  // Setup copy monitoring
  if (enableCopyMonitoring) {
    setupCopyMonitoring(onCopyDetected);
  }

  // Setup scraping detection
  if (enableScrapingDetection) {
    setupScrapingDetection(onSuspiciousActivity);
  }

  // Check for headless browser on load
  const headlessCheck = detectHeadlessBrowser();
  if (headlessCheck.isHeadless) {
    onSuspiciousActivity?.({
      type: 'headless_browser',
      signals: headlessCheck.signals,
    });
  }

  return {
    sessionId: generateSessionSeed(),
    fingerprintText,
    extractFingerprint,
    applyScoreVariation,
  };
}

export default {
  fingerprintText,
  extractFingerprint,
  setupCopyMonitoring,
  applyScoreVariation,
  generateCSSFingerprint,
  injectFingerprintStyles,
  useFrontendFingerprint,
  detectHeadlessBrowser,
  setupScrapingDetection,
  initFrontendProtection,
};
